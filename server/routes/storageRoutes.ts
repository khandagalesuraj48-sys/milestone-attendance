import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest, requireAuth } from '../auth';
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

// Memory storage for parsing files up to 50MB before writing to dedicated repository
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(mime) || mime.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format (${ext || mime}). Please upload a valid document or image.`));
    }
  },
});

// POST /api/v1/storage/upload - Upload file supporting attachments, documents, etc.
storageRouter.post('/upload', requireAuth, (req: AuthenticatedRequest, res: Response, next) => {
  uploadMiddleware.single('file')(req as any, res as any, async (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'FILE_TOO_LARGE',
          message: 'Selected file exceeds maximum storage capacity (50 MB).',
        });
      }
      return res.status(400).json({
        success: false,
        error: 'UPLOAD_VALIDATION_ERROR',
        message: err.message || 'Unable to process uploaded file.',
      });
    }

    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE_PROVIDED',
        message: 'No file was received for upload.',
      });
    }

    const user = req.user!;
    const purpose = (req.body.purpose as any) || 'leave_attachment';

    try {
      const saved = await storageRepository.saveFile({
        fileName: file.originalname || 'document',
        fileType: file.mimetype || 'application/octet-stream',
        fileSize: file.size,
        buffer: file.buffer,
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
    } catch (saveErr: any) {
      console.error('[Storage Upload Error]', saveErr);
      return res.status(500).json({
        success: false,
        error: 'STORAGE_WRITE_ERROR',
        message: 'Attachment upload failed. Please try again.',
      });
    }
  });
});

// POST /api/v1/storage/profile-photo - Upload and update profile photo with multipart or direct data
storageRouter.post('/profile-photo', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  uploadMiddleware.single('file')(req as any, res as any, async (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: 'PHOTO_UPLOAD_ERROR',
        message: 'Unable to upload profile photo. Please try again.',
      });
    }

    const user = req.user!;
    const file = (req as any).file;

    try {
      let photoUrl = '';

      if (file) {
        // Multipart file upload
        const saved = await storageRepository.saveFile({
          fileName: file.originalname || 'profile.jpg',
          fileType: file.mimetype || 'image/jpeg',
          fileSize: file.size,
          buffer: file.buffer,
          uploadedBy: user.employeeId || user.uid,
          uploadedByName: user.fullName,
          uploadedByRole: user.role,
          purpose: 'profile_photo',
        });
        photoUrl = saved.url;
      } else if (req.body.photoUrl && typeof req.body.photoUrl === 'string') {
        const rawPhoto = req.body.photoUrl;
        if (rawPhoto.startsWith('data:image')) {
          // Convert data URL to buffer and store in storage repository
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
      } else {
        return res.status(400).json({
          success: false,
          error: 'NO_PHOTO_PROVIDED',
          message: 'Unable to upload profile photo. Please try again.',
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
    } catch (photoErr: any) {
      console.error('[Profile Photo Upload Error]', photoErr);
      return res.status(500).json({
        success: false,
        error: 'PROFILE_PHOTO_SAVE_ERROR',
        message: 'Unable to upload profile photo. Please try again.',
      });
    }
  });
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
      // Check if this file is attached to one of the user's leave requests
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

    // Check if physical file exists on disk
    if (fs.existsSync(fileMeta.diskPath)) {
      res.setHeader('Content-Type', fileMeta.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileMeta.fileName)}"`);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.sendFile(path.resolve(fileMeta.diskPath));
    }

    // Fallback: Buffer read
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
      message: 'File contents are no longer available on storage disk.',
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
