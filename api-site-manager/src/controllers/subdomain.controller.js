import { SubdomainService } from '../services/subdomain.service.js';
import logger from '../utils/logger.js';

export const createSubdomain = async (req, res, next) => {
  try {
    const { subdomain } = req.body;
    
    const result = await SubdomainService.createSubdomain(subdomain);
    
    logger.info('Subdomain created', { subdomain });
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Subdomain created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const listSubdomains = async (req, res, next) => {
  try {
    const subdomains = await SubdomainService.listSubdomains();
    
    res.json({
      success: true,
      data: subdomains
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubdomain = async (req, res, next) => {
  try {
    const { name } = req.params;
    
    await SubdomainService.deleteSubdomain(name);
    
    logger.info('Subdomain deleted', { subdomain: name });
    
    res.json({
      success: true,
      message: 'Subdomain deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

