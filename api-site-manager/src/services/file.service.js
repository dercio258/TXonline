import { renameSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';
import logger from '../utils/logger.js';
import { MonitoringService } from './monitoring.service.js';

const BASE_DIR = process.env.BASE_DIR || '/var/www';

export class FileService {
  static async uploadFiles(siteId, files) {
    // TODO: Get site path from database
    const sitePath = join(BASE_DIR, 'example', 'public');
    
    if (!existsSync(sitePath)) {
      mkdirSync(sitePath, { recursive: true });
    }
    
    // Check storage limits
    const storageUsage = await MonitoringService.getStorageUsage(siteId);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    // TODO: Check against site storage limit
    
    const uploadedFiles = [];
    
    for (const file of files) {
      const destPath = join(sitePath, file.originalname);
      const destDir = dirname(destPath);
      
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      
      renameSync(file.path, destPath);
      uploadedFiles.push({
        name: file.originalname,
        path: destPath,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
      
      logger.info('File uploaded', { siteId, file: file.originalname });
    }
    
    return {
      files: uploadedFiles,
      totalSize,
      count: uploadedFiles.length
    };
  }
  
  static async listFiles(siteId, relativePath = '') {
    const sitePath = join(BASE_DIR, 'example', 'public', relativePath);
    
    if (!existsSync(sitePath)) {
      return [];
    }
    
    const files = [];
    const items = readdirSync(sitePath);
    
    for (const item of items) {
      const itemPath = join(sitePath, item);
      const stats = statSync(itemPath);
      
      files.push({
        name: item,
        path: join(relativePath, item),
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modifiedAt: stats.mtime.toISOString()
      });
    }
    
    return files;
  }
  
  static async deleteFile(siteId, filePath) {
    const sitePath = join(BASE_DIR, 'example', 'public', filePath);
    
    if (!existsSync(sitePath)) {
      throw new Error('File not found');
    }
    
    const stats = statSync(sitePath);
    
    if (stats.isDirectory()) {
      rmdirSync(sitePath, { recursive: true });
    } else {
      unlinkSync(sitePath);
    }
    
    logger.info('File deleted', { siteId, path: filePath });
  }
  
  static async deployFiles(siteId) {
    // TODO: Implement deployment logic
    // This could involve:
    // - Building static sites
    // - Running build commands
    // - Copying files to public directory
    // - Clearing caches
    
    logger.info('Files deployed', { siteId });
    
    return {
      deployedAt: new Date().toISOString(),
      status: 'success'
    };
  }
}

