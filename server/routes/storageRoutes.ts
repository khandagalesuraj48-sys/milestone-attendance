import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest, requireAuth } from '../auth';
import { parseIncomingMultipart } from '../lib/multipartParser';
import { storageRepository } from '../repositories/storageRepository';
import { usersRepository } from '../repositories/usersRepository';
import { employeesRepository } from '../repositories/employeesRepository';
import { auditRepository } from '../repositories/auditRepository';
import { leavesRepository } from '../repositories/leavesRepository';

export const storageRouter = express.Router();

// Supported MIME types and extensions for general attachments
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/bmp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.bmp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
]);

function isAllowedFile(fileName: string, mimeType: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(mime) || mime.startsWith('image/');
}

// POST /api/v1/storage/upload - Upload file supporting attachments, documents, etc.
storageRouter.post('/upload', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  try {
    const contentType = req.headers['content-type'] || '';
    let fileBuffer: Buffer | null = null;
    let fileName = 'attachment';
    let fileType = 'application/octet-stream';
    let purpose: 'leave_attachment' | 'profile_photo' | 'general' = 'leave_attachment';

    if (contentType.includes('multipart/form-data')) {
      const parsed = await parseIncomingMultipart(req);
      if (!parsed.files || parsed.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_FILE_PROVIDED',
          message: 'No file was found in the upload payload.',
        });
      }
      const primaryFile = parsed.files[0];
      fileBuffer = primaryFile.buffer;
      fileName = primaryFile.fileName;
      fileType = primaryFile.fileType;
      if (parsed.fields.purpose) {
        purpose = parsed.fields.purpose as any;
      }
    } else if (req.body && typeof req.body === 'object') {
      // Base64 JSON fallback payload { fileData, fileName, fileType, purpose }
      const { fileData, fileName: rawName, fileType: rawType, purpose: rawPurpose } = req.body;
      if (!fileData || typeof fileData !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'NO_FILE_PROVIDED',
          message: 'No file data was provided for upload.',
        });
      }
      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        fileType = matches[1];
        fileBuffer = Buffer.from(matches[2], 'base64');
      } else {
        fileBuffer = Buffer.from(fileData, 'base64');
      }
      if (rawName) fileName = rawName;
      if (rawType) fileType = rawType;
      if (rawPurpose) purpose = rawPurpose;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'EMPTY_FILE',
        message: 'Uploaded file is empty.',
      });
    }

    if (fileBuffer.length > 50 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'Selected file exceeds maximum capacity (50 MB).',
      });
    }

    if (!isAllowedFile(fileName, fileType)) {
      return res.status(400).json({
        success: false,
        error: 'UNSUPPORTED_FORMAT',
        message: 'Unsupported file format. Please upload a valid document or image.',
      });
    }

    const saved = await storageRepository.saveFile({
      fileName,
      fileType,
      fileSize: fileBuffer.length,
      buffer: fileBuffer,
      uploadedBy: user.employeeId || user.uid,
      uploadedByName: user.fullName,
      uploadedByRole: user.role,
      purpose,
    });

    return res.json({
      success: true,
      message: 'File successfully uploaded.',
      file: {
        id: saved.id,
        fileName: saved.fileName,
        fileType: saved.fileType,
        fileSize: saved.fileSize,
        url: saved.url,
        purpose: saved.purpose,
        createdAt: saved.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Storage Upload Error]', err);
    return res.status(500).json({
      success: false,
      error: 'STORAGE_UPLOAD_ERROR',
      message: err.message || 'Unable to upload file. Please try again.',
    });
  }
});

// POST /api/v1/storage/profile-photo - Upload and update profile photo
storageRouter.post('/profile-photo', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  try {
    const contentType = req.headers['content-type'] || '';
    let photoUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const parsed = await parseIncomingMultipart(req);
      if (parsed.files && parsed.files.length > 0) {
        const file = parsed.files[0];
        const saved = await storageRepository.saveFile({
          fileName: file.fileName || 'profile.jpg',
          fileType: file.fileType || 'image/jpeg',
          fileSize: file.fileSize,
          buffer: file.buffer,
          uploadedBy: user.employeeId || user.uid,
          uploadedByName: user.fullName,
          uploadedByRole: user.role,
          purpose: 'profile_photo',
        });
        photoUrl = saved.url;
      }
    } else if (req.body && typeof req.body === 'object' && req.body.photoUrl) {
      const rawPhoto = req.body.photoUrl;
      if (typeof rawPhoto === 'string' && rawPhoto.startsWith('data:image')) {
        const matches = rawPhoto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = mimeType.split('/')[1] || 'jpg';
          const saved = await storageRepository.saveFile({
            fileName: `avatar_${user.employeeId || user.uid}.${ext}`,
            fileType: mimeType,
            fileSize: buffer.length,
            buffer,
            uploadedBy: user.employeeId || user.uid,
            uploadedByName: user.fullName,
            uploadedByRole: user.role,
            purpose: 'profile_photo',
          });
          photoUrl = saved.url;
        } else {
          photoUrl = rawPhoto;
        }
      } else {
        photoUrl = rawPhoto;
      }
    }

    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        error: 'NO_PHOTO_PROVIDED',
        message: 'Unable to upload profile photo. Please select an image.',
      });
    }

    await usersRepository.update(user.uid, { photoUrl });
    if (user.employeeId) {
      await employeesRepository.update(user.employeeId, { photoUrl });
    }

    await auditRepository.log({
      actorId: user.employeeId || user.uid,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PROFILE_PHOTO_UPDATED',
      targetId: user.uid,
      details: { photoUrl, timestamp: new Date().toISOString() },
      ipAddress: req.ip || '127.0.0.1',
    });

    const updatedUser = await usersRepository.getByUid(user.uid);
    return res.json({
      success: true,
      message: 'Profile photo updated successfully.',
      photoUrl,
      user: updatedUser || { ...user, photoUrl },
    });
  } catch (err: any) {
    console.error('[Profile Photo Storage Error]', err);
    return res.status(500).json({
      success: false,
      error: 'PROFILE_PHOTO_ERROR',
      message: 'Unable to upload profile photo. Please try again.',
    });
  }
});

// GET /api/v1/storage/file/:fileId - Secure download/streaming of stored files
storageRouter.get('/file/:fileId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const user = req.user!;

  if (!fileId) {
    return res.status(400).json({ success: false, error: 'FILE_ID_REQUIRED' });
  }

  try {
    const fileMeta = await storageRepository.getById(fileId);
    if (!fileMeta) {
      return res.status(404).json({
        success: false,
        error: 'FILE_NOT_FOUND',
        message: 'The requested file could not be found.',
      });
    }

    // Authorization checks:
    // 1. Admin has access to all files
    // 2. Profile photos are accessible to all authenticated organization users
    // 3. User who uploaded the file has access
    // 4. Employee linked to the leave record has access
    const isOwner = fileMeta.uploadedBy === user.employeeId || fileMeta.uploadedBy === user.uid;
    const isAdmin = user.role === 'admin';
    const isPublicProfilePhoto = fileMeta.purpose === 'profile_photo';

    let hasLeaveAccess = false;
    if (!isOwner && !isAdmin && !isPublicProfilePhoto) {
      const userLeaves = await leavesRepository.getByEmployeeId(user.employeeId);
      hasLeaveAccess = userLeaves.some((l) => l.attachmentUrl?.includes(fileId));
    }

    if (!isAdmin && !isOwner && !isPublicProfilePhoto && !hasLeaveAccess) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'You do not have authorization to view this document.',
      });
    }

    // Attempt streaming from physical disk
    if (fileMeta.diskPath && fs.existsSync(fileMeta.diskPath)) {
      res.setHeader('Content-Type', fileMeta.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileMeta.fileName)}"`);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.sendFile(path.resolve(fileMeta.diskPath));
    }

    // Fallback: Buffer read from Firestore data / chunks
    const buffer = await storageRepository.getFileBuffer(fileMeta);
    if (buffer) {
      res.setHeader('Content-Type', fileMeta.fileType || 'application/octet-stream');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileMeta.fileName)}"`);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.send(buffer);
    }

    return res.status(404).json({
      success: false,
      error: 'FILE_DATA_UNAVAILABLE',
      message: 'File contents are no longer available.',
    });
  } catch (err: any) {
    console.error('[Storage File Access Error]', err);
    return res.status(500).json({
      success: false,
      error: 'STORAGE_ERROR',
      message: 'Unable to retrieve file at this time.',
    });
  }
});
