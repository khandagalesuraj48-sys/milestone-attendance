import fs from 'fs';
import path from 'path';
import { adminDb } from '../firebaseAdmin';

const COLLECTION = 'uploadedFiles';
const CHUNKS_COLLECTION = 'uploadedFileChunks';

// Determine writeable uploads directory for both Container and AWS Lambda / Netlify Serverless environments
const isServerless = Boolean(process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isServerless ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[StorageRepository] Directory creation warning:', e);
}

export interface UploadedFileMetadata {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  diskPath: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  purpose: 'leave_attachment' | 'profile_photo' | 'general';
  url: string;
  base64Data?: string; // Stored for files <= 700KB for instant cross-serverless availability
  createdAt: string;
  updatedAt: string;
}

export const storageRepository = {
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
    const diskFileName = `${fileId}_${sanitizedName}`;
    const diskPath = path.join(UPLOADS_DIR, diskFileName);

    // Save physical file to disk/tmp
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      await fs.promises.writeFile(diskPath, params.buffer);
    } catch (fsWriteErr) {
      console.warn('[StorageRepository] Disk write warning (falling back to Firestore):', fsWriteErr);
    }

    const metadata: UploadedFileMetadata = {
      id: fileId,
      fileName: params.fileName,
      fileType: params.fileType || 'application/octet-stream',
      fileSize: params.fileSize,
      diskPath,
      uploadedBy: params.uploadedBy,
      uploadedByName: params.uploadedByName || 'Unknown',
      uploadedByRole: params.uploadedByRole || 'employee',
      purpose: params.purpose || 'general',
      url: `/api/v1/storage/file/${fileId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in Firestore for persistent multi-instance/serverless reliability
    try {
      const docPayload: any = { ...metadata };
      if (params.buffer.length <= 700 * 1024) {
        // Files <= 700KB stored directly in main doc
        docPayload.base64Data = params.buffer.toString('base64');
      }
      await adminDb.collection(COLLECTION).doc(fileId).set(docPayload);

      // For larger files > 700KB, store chunks in sub-documents
      if (params.buffer.length > 700 * 1024) {
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
    } catch (dbErr) {
      console.warn('[StorageRepository] Firestore metadata save warning:', dbErr);
    }

    return metadata;
  },

  async getById(id: string): Promise<UploadedFileMetadata | null> {
    try {
      const doc = await adminDb.collection(COLLECTION).doc(id).get();
      if (doc.exists) {
        return { ...doc.data(), id: doc.id } as UploadedFileMetadata;
      }
    } catch (err) {
      console.warn('[StorageRepository] Firestore fetch error:', err);
    }

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
          else if (['.doc', '.docx'].includes(ext)) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (['.xls', '.xlsx'].includes(ext)) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

          return {
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
        }
      }
    } catch (fsErr) {
      console.error('[StorageRepository] Disk fallback error:', fsErr);
    }

    return null;
  },

  async getFileBuffer(metadata: UploadedFileMetadata): Promise<Buffer | null> {
    // 1. Check local disk/tmp cache
    try {
      if (metadata.diskPath && fs.existsSync(metadata.diskPath)) {
        return await fs.promises.readFile(metadata.diskPath);
      }
    } catch (diskErr) {
      console.warn('[StorageRepository] Disk read warning:', diskErr);
    }

    // 2. Check embedded base64Data in metadata
    if (metadata.base64Data) {
      try {
        return Buffer.from(metadata.base64Data, 'base64');
      } catch (decodeErr) {
        console.error('[StorageRepository] Base64 decode error:', decodeErr);
      }
    }

    // 3. Check Firestore chunks for large files
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
        // Write back to disk cache
        try {
          if (metadata.diskPath) {
            await fs.promises.writeFile(metadata.diskPath, combined);
          }
        } catch (e) {}
        return combined;
      }
    } catch (chunksErr) {
      console.error('[StorageRepository] Chunks retrieve error:', chunksErr);
    }

    return null;
  },

  async deleteById(id: string): Promise<boolean> {
    try {
      const meta = await this.getById(id);
      if (meta && meta.diskPath && fs.existsSync(meta.diskPath)) {
        try {
          await fs.promises.unlink(meta.diskPath);
        } catch (e) {}
      }
      await adminDb.collection(COLLECTION).doc(id).delete();
      return true;
    } catch (err) {
      console.error('[StorageRepository] Delete file error:', err);
      return false;
    }
  },
};
