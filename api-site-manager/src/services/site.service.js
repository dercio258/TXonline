import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import { SubdomainService } from './subdomain.service.js';
import { SiteModel } from '../models/site.model.js';
import { DatabaseService } from './database.service.js';
import { FTPService } from './ftp.service.js';

const execAsync = promisify(exec);
const BASE_DIR = process.env.BASE_DIR || '/var/www';

export class SiteService {
  static async createSite(siteData) {
    const { subdomain, type, storageLimit } = siteData;
    
    // Check if subdomain already exists
    const existing = await SiteModel.findBySubdomain(subdomain);
    if (existing) {
      throw new Error(`Site with subdomain ${subdomain} already exists`);
    }
    
    // Create site directory
    const sitePath = join(BASE_DIR, subdomain);
    
    if (existsSync(sitePath)) {
      throw new Error(`Directory ${sitePath} already exists`);
    }
    
    mkdirSync(sitePath, { recursive: true });
    logger.info('Site directory created', { path: sitePath });
    
    // Create subdomain in Nginx
    await SubdomainService.createSubdomain(subdomain);
    
    // Create site record in database
    const site = await SiteModel.create({
      subdomain,
      type: type || 'static',
      path: sitePath,
      storageLimit: (storageLimit || parseInt(process.env.DEFAULT_STORAGE_LIMIT || '1000')) * 1024 * 1024 // Convert MB to bytes
    });
    
    // Create FTP user for external editing
    const ftpCredentials = await FTPService.createFTPUser(site.id, subdomain, sitePath);
    
    // If WordPress, create database and container
    if (type === 'wordpress') {
      // Database will be created when WordPress is installed
      logger.info('WordPress site created, database will be created on install', { siteId: site.id });
    }
    
    logger.info('Site created successfully', { 
      siteId: site.id, 
      subdomain,
      ftpUser: ftpCredentials.username 
    });
    
    return {
      ...site,
      ftp: ftpCredentials
    };
  }
  
  static async getAllSites() {
    return await SiteModel.findAll();
  }
  
  static async getSiteById(id) {
    return await SiteModel.findById(id);
  }
  
  static async updateSite(id, updateData) {
    return await SiteModel.update(id, updateData);
  }
  
  static async deleteSite(id) {
    const site = await SiteModel.findById(id);
    if (!site) {
      throw new Error('Site not found');
    }
    
    // Stop and remove WordPress container if exists
    if (site.type === 'wordpress') {
      try {
        const { DockerService } = await import('./docker.service.js');
        const containerName = `wp-${site.subdomain}`;
        await DockerService.stopContainer(containerName);
        await DockerService.removeContainer(containerName);
        await DockerService.removeVolume(`wp-${site.subdomain}-data`);
        
        // Drop database
        const dbName = `wp_${site.subdomain}`;
        const { dropDatabase } = await import('../config/database.js');
        await dropDatabase(dbName);
      } catch (error) {
        logger.error('Error cleaning up WordPress resources', { error: error.message });
      }
    }
    
    // Delete FTP user
    try {
      await FTPService.deleteFTPUser(`ftp_${site.subdomain}`);
    } catch (error) {
      logger.error('Error deleting FTP user', { error: error.message });
    }
    
    // Delete subdomain from Nginx
    try {
      await SubdomainService.deleteSubdomain(site.subdomain);
    } catch (error) {
      logger.error('Error deleting subdomain', { error: error.message });
    }
    
    // Mark as deleted in database
    await SiteModel.delete(id);
    
    logger.info('Site deleted', { siteId: id });
    return true;
  }
}

