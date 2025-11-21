import { SiteService } from '../services/site.service.js';
import logger from '../utils/logger.js';

export const createSite = async (req, res, next) => {
  try {
    const siteData = req.body;
    const site = await SiteService.createSite(siteData);
    
    logger.info('Site created successfully', { siteId: site.id, subdomain: site.subdomain });
    
    res.status(201).json({
      success: true,
      data: site,
      message: 'Site created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getSites = async (req, res, next) => {
  try {
    const sites = await SiteService.getAllSites();
    res.json({
      success: true,
      data: sites,
      count: sites.length
    });
  } catch (error) {
    next(error);
  }
};

export const getSite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const site = await SiteService.getSiteById(id);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }
    
    res.json({
      success: true,
      data: site
    });
  } catch (error) {
    next(error);
  }
};

export const updateSite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const site = await SiteService.updateSite(id, updateData);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }
    
    logger.info('Site updated', { siteId: id });
    
    res.json({
      success: true,
      data: site,
      message: 'Site updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSite = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await SiteService.deleteSite(id);
    
    logger.info('Site deleted', { siteId: id });
    
    res.json({
      success: true,
      message: 'Site deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

