import { CommunicationService } from '../services/communication.service.js';
import logger from '../utils/logger.js';

export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, type, metadata } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    const result = await CommunicationService.saveMessage(id, {
      message,
      type: type || 'general',
      metadata: metadata || {},
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    logger.info('Message sent', { siteId: id, messageId: result.id });
    
    res.json({
      success: true,
      data: result,
      message: 'Message sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, type } = req.query;
    
    const messages = await CommunicationService.getMessages(id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      type
    });
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

export const getSiteCommunication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await CommunicationService.getCommunicationStats(id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

