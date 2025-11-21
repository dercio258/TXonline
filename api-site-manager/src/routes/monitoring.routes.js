import express from 'express';
import { 
  getStorageUsage, 
  getRAMUsage,
  getSiteStats, 
  getAllMonitoring 
} from '../controllers/monitoring.controller.js';

const router = express.Router({ mergeParams: true });

router.get('/:id/storage', getStorageUsage);
router.get('/:id/ram', getRAMUsage);
router.get('/:id/stats', getSiteStats);
router.get('/monitoring/all', getAllMonitoring);

export default router;
