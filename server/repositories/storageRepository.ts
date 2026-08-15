import fs from 'fs';
import path from 'path';
import { adminDb } from '../firebaseAdmin';

const COLLECTION = 'uploadedFiles';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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

    // Save physical file to disk
    await fs.promises.writeFile(diskPath, params.buffer);

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

    // Save metadata to Firestore collection
    try {
      await adminDb.collection(COLLECTION).doc(fileId).set(metadata);
    } catch (dbErr) {
      console.warn('[StorageRepository] Firestore metadata save fallback warning:', dbErr);
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

    // Fallback: check disk directly if metadata not in DB
    try {
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
    } catch (fsErr) {
      console.error('[StorageRepository] Disk fallback lookup error:', fsErr);
    }

    return null;
  },

  async getFileBuffer(metadata: UploadedFileMetadata): Promise<Buffer | null> {
    try {
      if (fs.existsSync(metadata.diskPath)) {
        return await fs.promises.readFile(metadata.diskPath);
      }
    } catch (err) {
      console.error('[StorageRepository] Read buffer error:', err);
    }
    return null;
  },

  async deleteById(id: string): Promise<boolean> {
    try {
      const meta = await this.getById(id);
      if (meta && fs.existsSync(meta.diskPath)) {
        await fs.promises.unlink(meta.diskPath);
      }
      await adminDb.collection(COLLECTION).doc(id).delete();
      return true;
    } catch (err) {
      console.error('[StorageRepository] Delete file error:', err);
      return false;
    }
  },
};
