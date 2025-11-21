import express from 'express';
import { 
  createSubdomain, 
  listSubdomains, 
  deleteSubdomain 
} from '../controllers/subdomain.controller.js';
import { validateSubdomain } from '../middleware/validation.js';

const router = express.Router();

router.post('/', validateSubdomain, createSubdomain);
router.get('/', listSubdomains);
router.delete('/:name', deleteSubdomain);

export default router;

