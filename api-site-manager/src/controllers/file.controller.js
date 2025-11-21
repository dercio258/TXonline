import { FileService } from '../services/file.service.js';
import logger from '../utils/logger.js';

export const uploadFiles = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files || [];
    
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }
    
    const result = await FileService.uploadFiles(id, files);
    
    logger.info('Files uploaded', { siteId: id, count: files.length });
    
    res.json({
      success: true,
      data: result,
      message: `${files.length} file(s) uploaded successfully`
    });
  } catch (error) {
    next(error);
  }
};

export const listFiles = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { path } = req.query;
    
    const files = await FileService.listFiles(id, path);
    
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filePath = req.params[0]; // Catch-all route
    
    await FileService.deleteFile(id, filePath);
    
    logger.info('File deleted', { siteId: id, path: filePath });
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deployFiles = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await FileService.deployFiles(id);
    
    logger.info('Files deployed', { siteId: id });
    
    res.json({
      success: true,
      data: result,
      message: 'Files deployed successfully'
    });
  } catch (error) {
    next(error);
  }
};

