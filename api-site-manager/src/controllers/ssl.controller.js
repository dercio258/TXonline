import { SSLService } from '../services/ssl.service.js';
import logger from '../utils/logger.js';

export const installSSL = async (req, res, next) => {
  try {
    const { domain } = req.body;
    const { email } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required'
      });
    }
    
    const result = await SSLService.installSSL(domain, email);
    
    logger.info('SSL certificate installed via API', { domain });
    
    res.json({
      success: true,
      data: result,
      message: 'SSL certificate installed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const renewSSL = async (req, res, next) => {
  try {
    const { domain } = req.params;
    
    const result = await SSLService.renewSSL(domain);
    
    logger.info('SSL certificate renewed via API', { domain });
    
    res.json({
      success: true,
      data: result,
      message: 'SSL certificate renewed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getSSLInfo = async (req, res, next) => {
  try {
    const { domain } = req.params;
    
    const expiresAt = await SSLService.getCertificateExpiry(domain);
    
    res.json({
      success: true,
      data: {
        domain,
        installed: expiresAt !== null,
        expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

