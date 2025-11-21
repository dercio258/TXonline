import { FTPService } from '../services/ftp.service.js';
import { SiteModel } from '../models/site.model.js';
import logger from '../utils/logger.js';

export const getFTPCredentials = async (req, res, next) => {
  try {
    const { id } = req.params;
    const site = await SiteModel.findById(id);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }
    
    // Get FTP credentials from database
    const { getConnection } = await import('../config/database.js');
    const connection = await getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM site_credentials WHERE site_id = ?',
      [id]
    );
    
    if (!rows[0]) {
      // Create FTP user if doesn't exist
      const ftpCredentials = await FTPService.createFTPUser(id, site.subdomain, site.path);
      
      return res.json({
        success: true,
        data: {
          username: ftpCredentials.username,
          password: ftpCredentials.password,
          host: process.env.MAIN_DOMAIN || 'txunasites.com',
          port: 21,
          type: 'ftp',
          path: site.path
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        username: `ftp_${site.subdomain}`,
        host: process.env.MAIN_DOMAIN || 'txunasites.com',
        port: 21,
        type: 'ftp',
        path: site.path,
        note: 'Password stored securely. Use update endpoint to change password.'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateFTPPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const site = await SiteModel.findById(id);
    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }
    
    await FTPService.updateFTPPassword(id, password);
    
    logger.info('FTP password updated', { siteId: id });
    
    res.json({
      success: true,
      message: 'FTP password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

