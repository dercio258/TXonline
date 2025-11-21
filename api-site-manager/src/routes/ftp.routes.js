import express from 'express';
import { getFTPCredentials, updateFTPPassword } from '../controllers/ftp.controller.js';

const router = express.Router({ mergeParams: true });

router.get('/:id/ftp', getFTPCredentials);
router.put('/:id/ftp/password', updateFTPPassword);

export default router;

