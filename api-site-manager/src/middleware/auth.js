import logger from '../utils/logger.js';

export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    logger.warn('API_KEY not configured in environment');
    return res.status(500).json({ 
      error: 'Server configuration error' 
    });
  }

  if (!apiKey || apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', { ip: req.ip });
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }

  next();
};

