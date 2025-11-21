import express from 'express';
import { 
  sendMessage, 
  getMessages, 
  getSiteCommunication 
} from '../controllers/communication.controller.js';

const router = express.Router({ mergeParams: true });

// Communication endpoints for dynamic page interaction
router.post('/:id/communication/message', sendMessage);
router.get('/:id/communication/messages', getMessages);
router.get('/:id/communication', getSiteCommunication);

export default router;

