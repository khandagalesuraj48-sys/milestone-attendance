import fs from 'fs';
import path from 'path';
import { adminDb, getAdminStorageBucket, storageBucketName } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';

const COLLECTION = 'uploadedFiles';

// Determine writeable local cache directory for temp caching
const isServerless = Boolean(process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isServerless ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[StorageRepository] Cache directory creation warning:', e);
}

export interface UploadedFileMetadata {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  diskPath?: string;
  storagePath?: string;
  storageBucket?: string;
  storageUrl?: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  purpose: 'leave_attachment' | 'profile_photo' | 'general';
  url: string;
  base64Data?: string; // Stored for small files / avatars <= 700KB as resilient instant fallback
  createdAt: string;
  updatedAt: string;
}

export const storageRepository = {
  /**
   * Save file buffer persistently to Firebase Cloud Storage bucket + Firestore metadata
   */
  async saveFile(params: {
    id?: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    buffer: Buffer;
    uploadedBy: string;
    uploadedByName?: string;
    uploadedByRole?: string;
    purpose?: 'leave_attachment' | 'profile_photo' | 'general';
  }): Promise<UploadedFileMetadata> {
    const fileId = params.id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const purpose = params.purpose || 'general';
    const employeeId = params.uploadedBy || 'system';
    const storagePath = `uploads/${purpose}/${employeeId}/${fileId}-${sanitizedName}`;
    const diskFileName = `${fileId}_${sanitizedName}`;
    const diskPath = path.join(UPLOADS_DIR, diskFileName);

    let storageUrl = `/api/v1/storage/file/${fileId}`;
    let isCloudUploaded = false;

    // 1. Upload directly to Firebase Cloud Storage bucket
    try {
      const bucket = getAdminStorageBucket();
      const bucketFile = bucket.file(storagePath);

      await bucketFile.save(params.buffer, {
        contentType: params.fileType || 'application/octet-stream',
        metadata: {
          contentType: params.fileType || 'application/octet-stream',
          metadata: {
            originalName: params.fileName,
            uploadedBy: params.uploadedBy,
            purpose,
            fileId,
          },
        },
      });

      isCloudUploaded = true;
      console.log(`[StorageRepository] File successfully saved to Firebase Storage bucket at ${storagePath}`);

      // Attempt to make public or get public URL if profile photo
      if (purpose === 'profile_photo') {
        try {
          await bucketFile.makePublic();
          storageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        } catch (pubErr) {
          try {
            const [signedUrl] = await bucketFile.getSignedUrl({
              action: 'read',
              expires: Date.now() + 1000 * 60 * 60 * 24 * 365, // 1 year
            });
            storageUrl = signedUrl;
          } catch {
            storageUrl = `/api/v1/storage/file/${fileId}`;
          }
        }
      }
    } catch (gcsErr: any) {
      console.warn(`[StorageRepository] Firebase Storage bucket save warning (${gcsErr?.message}), ensuring fallback...`);
    }

    // 2. Cache locally to tmp / uploads
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      await fs.promises.writeFile(diskPath, params.buffer);
    } catch (fsWriteErr) {
      console.warn('[StorageRepository] Disk cache write warning:', fsWriteErr);
    }

    // 3. Construct authoritative metadata
    const metadata: UploadedFileMetadata = {
      id: fileId,
      fileName: params.fileName,
      fileType: params.fileType || 'application/octet-stream',
      fileSize: params.fileSize,
      diskPath,
      storagePath: isCloudUploaded ? storagePath : undefined,
      storageBucket: isCloudUploaded ? storageBucketName : undefined,
      storageUrl,
      uploadedBy: params.uploadedBy,
      uploadedByName: params.uploadedByName || 'Unknown',
      uploadedByRole: params.uploadedByRole || 'employee',
      purpose,
      url: `/api/v1/storage/file/${fileId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (params.buffer.length <= 700 * 1024) {
      metadata.base64Data = params.buffer.toString('base64');
    }

    storageEngine.setDoc(COLLECTION, fileId, metadata);

    // 4. Save metadata and fallback data in Firestore if active
    if (isRemoteFirestoreActive()) {
      try {
        const docPayload: any = { ...metadata };
        await adminDb.collection(COLLECTION).doc(fileId).set(docPayload);

        // If cloud upload wasn't available and file is > 700KB, store chunks in Firestore sub-collection
        if (!isCloudUploaded && params.buffer.length > 700 * 1024) {
          const chunkSize = 500 * 1024; // 500KB per chunk
          const totalChunks = Math.ceil(params.buffer.length / chunkSize);
          const batch = adminDb.batch();
          for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, params.buffer.length);
            const chunkBuffer = params.buffer.subarray(start, end);
            const chunkRef = adminDb.collection(COLLECTION).doc(fileId).collection('chunks').doc(String(i));
            batch.set(chunkRef, {
              chunkIndex: i,
              totalChunks,
              data: chunkBuffer.toString('base64'),
            });
          }
          await batch.commit();
        }
      } catch (dbErr: any) {
        if (isFirestorePermissionOrNetworkError(dbErr)) {
          markFirestoreUnavailable(dbErr);
        }
      }
    }

    return metadata;
  },

  async createSignedUploadUrl(params: {
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    purpose?: 'leave_attachment' | 'profile_photo' | 'general';
  }): Promise<{
    fileId: string;
    storagePath: string;
    uploadUrl: string;
    downloadUrl: string;
  } | null> {
    try {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const purpose = params.purpose || 'general';
      const employeeId = params.uploadedBy || 'system';
      const storagePath = `uploads/${purpose}/${employeeId}/${fileId}-${sanitizedName}`;

      const bucket = getAdminStorageBucket();
      const bucketFile = bucket.file(storagePath);

      const [uploadUrl] = await bucketFile.getSignedUrl({
        action: 'write',
        expires: Date.now() + 20 * 60 * 1000, // 20 minutes
        contentType: params.fileType || 'application/octet-stream',
      });

      return {
        fileId,
        storagePath,
        uploadUrl,
        downloadUrl: `/api/v1/storage/file/${fileId}`,
      };
    } catch (err) {
      console.warn('[StorageRepository] createSignedUploadUrl warning:', err);
      return null;
    }
  },

  async commitDirectUpload(params: {
    fileId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storagePath: string;
    uploadedBy: string;
    uploadedByName?: string;
    uploadedByRole?: string;
    purpose?: 'leave_attachment' | 'profile_photo' | 'general';
  }): Promise<UploadedFileMetadata> {
    const metadata: UploadedFileMetadata = {
      id: params.fileId,
      fileName: params.fileName,
      fileType: params.fileType || 'application/octet-stream',
      fileSize: params.fileSize,
      storagePath: params.storagePath,
      storageBucket: storageBucketName,
      uploadedBy: params.uploadedBy,
      uploadedByName: params.uploadedByName || 'Unknown',
      uploadedByRole: params.uploadedByRole || 'employee',
      purpose: params.purpose || 'general',
      url: `/api/v1/storage/file/${params.fileId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageEngine.setDoc(COLLECTION, params.fileId, metadata);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(params.fileId).set(metadata);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return metadata;
  },

  async getById(id: string): Promise<UploadedFileMetadata | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(COLLECTION).doc(id).get();
        if (doc.exists) {
          const meta = { ...doc.data(), id: doc.id } as UploadedFileMetadata;
          storageEngine.setDoc(COLLECTION, id, meta);
          return meta;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<UploadedFileMetadata>(COLLECTION, id);
    if (local) return local;

    // Disk lookup fallback
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const files = await fs.promises.readdir(UPLOADS_DIR);
        const match = files.find((f) => f.startsWith(`${id}_`));
        if (match) {
          const fullPath = path.join(UPLOADS_DIR, match);
          const stats = await fs.promises.stat(fullPath);
          const originalName = match.substring(`${id}_`.length);
          const ext = path.extname(originalName).toLowerCase();
          let mimeType = 'application/octet-stream';
          if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
          else if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.webp') mimeType = 'image/webp';
          else if (ext === '.gif') mimeType = 'image/gif';
          else if (ext === '.pdf') mimeType = 'application/pdf';

          const item: UploadedFileMetadata = {
            id,
            fileName: originalName,
            fileType: mimeType,
            fileSize: stats.size,
            diskPath: fullPath,
            uploadedBy: 'system',
            purpose: 'general',
            url: `/api/v1/storage/file/${id}`,
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
          };
          storageEngine.setDoc(COLLECTION, id, item);
          return item;
        }
      }
    } catch (fsErr) {
      console.error('[StorageRepository] Disk fallback error:', fsErr);
    }

    return null;
  },

  async getFileBuffer(metadata: UploadedFileMetadata): Promise<Buffer | null> {
    // 1. Download from Firebase Cloud Storage Bucket if storagePath exists
    if (metadata.storagePath) {
      try {
        const bucket = getAdminStorageBucket();
        const bucketFile = bucket.file(metadata.storagePath);
        const [exists] = await bucketFile.exists();
        if (exists) {
          const [downloadedBuffer] = await bucketFile.download();
          try {
            if (metadata.diskPath) {
              await fs.promises.writeFile(metadata.diskPath, downloadedBuffer);
            }
          } catch {}
          return downloadedBuffer;
        }
      } catch (gcsDownloadErr: any) {
        console.warn(`[StorageRepository] Firebase Storage download warning (${gcsDownloadErr?.message}), checking fallbacks...`);
      }
    }

    // 2. Check local disk/tmp cache
    try {
      if (metadata.diskPath && fs.existsSync(metadata.diskPath)) {
        return await fs.promises.readFile(metadata.diskPath);
      }
    } catch (diskErr) {
      console.warn('[StorageRepository] Disk read warning:', diskErr);
    }

    // 3. Check embedded base64Data in metadata
    if (metadata.base64Data) {
      try {
        return Buffer.from(metadata.base64Data, 'base64');
      } catch (decodeErr) {
        console.error('[StorageRepository] Base64 decode error:', decodeErr);
      }
    }

    // 4. Check Firestore chunks for large files if active
    if (isRemoteFirestoreActive()) {
      try {
        const chunksSnap = await adminDb
          .collection(COLLECTION)
          .doc(metadata.id)
          .collection('chunks')
          .orderBy('chunkIndex')
          .get();

        if (!chunksSnap.empty) {
          const buffers: Buffer[] = [];
          chunksSnap.forEach((doc) => {
            const chunkData = doc.data();
            if (chunkData.data) {
              buffers.push(Buffer.from(chunkData.data, 'base64'));
            }
          });
          const combined = Buffer.concat(buffers);
          return combined;
        }
      } catch (chunksErr: any) {
        if (isFirestorePermissionOrNetworkError(chunksErr)) {
          markFirestoreUnavailable(chunksErr);
        }
      }
    }

    return null;
  },

  async deleteById(id: string): Promise<boolean> {
    try {
      const meta = await this.getById(id);
      if (meta?.storagePath) {
        try {
          const bucket = getAdminStorageBucket();
          await bucket.file(meta.storagePath).delete({ ignoreNotFound: true });
        } catch (e) {}
      }
      if (meta && meta.diskPath && fs.existsSync(meta.diskPath)) {
        try {
          await fs.promises.unlink(meta.diskPath);
        } catch (e) {}
      }

      storageEngine.deleteDoc(COLLECTION, id);

      if (isRemoteFirestoreActive()) {
        try {
          await adminDb.collection(COLLECTION).doc(id).delete();
        } catch (err: any) {
          if (isFirestorePermissionOrNetworkError(err)) {
            markFirestoreUnavailable(err);
          }
        }
      }
      return true;
    } catch (err) {
      console.error('[StorageRepository] Delete file error:', err);
      return false;
    }
  },
};
