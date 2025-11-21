import express from 'express';
import { installSSL, renewSSL, getSSLInfo } from '../controllers/ssl.controller.js';

const router = express.Router();

router.post('/install', installSSL);
router.post('/renew/:domain', renewSSL);
router.get('/info/:domain', getSSLInfo);

export default router;

