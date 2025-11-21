import express from 'express';
import multer from 'multer';
import { 
  uploadFiles, 
  listFiles, 
  deleteFile, 
  deployFiles 
} from '../controllers/file.controller.js';
import { validateFileUpload } from '../middleware/validation.js';

const router = express.Router({ mergeParams: true });

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/temp/',
  limits: { 
    fileSize: (process.env.MAX_UPLOAD_SIZE || 100) * 1024 * 1024 // MB to bytes
  }
});

router.post('/:id/files/upload', upload.array('files', 10), validateFileUpload, uploadFiles);
router.get('/:id/files', listFiles);
router.delete('/:id/files/*', deleteFile);
router.post('/:id/files/deploy', deployFiles);

export default router;

