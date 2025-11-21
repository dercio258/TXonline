import express from 'express';
import { createSite, getSites, getSite, updateSite, deleteSite } from '../controllers/site.controller.js';
import { validateCreateSite, validateUpdateSite } from '../middleware/validation.js';

const router = express.Router({ mergeParams: true });

router.post('/', validateCreateSite, createSite);
router.get('/', getSites);
router.get('/:id', getSite);
router.put('/:id', validateUpdateSite, updateSite);
router.delete('/:id', deleteSite);

export default router;

