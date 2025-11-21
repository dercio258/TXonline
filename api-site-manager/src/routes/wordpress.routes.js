import express from 'express';
import { 
  installWordPress, 
  getWordPressInfo,
  installPlugin,
  listPlugins,
  removePlugin,
  getCredentials
} from '../controllers/wordpress.controller.js';

const router = express.Router({ mergeParams: true });

router.post('/:id/wordpress/install', installWordPress);
router.get('/:id/wordpress', getWordPressInfo);
router.post('/:id/wordpress/plugins', installPlugin);
router.get('/:id/wordpress/plugins', listPlugins);
router.delete('/:id/wordpress/plugins/:plugin', removePlugin);
router.get('/:id/wordpress/credentials', getCredentials);

export default router;

