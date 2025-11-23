import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
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
    
    // Create default index.html for static sites
    if (type === 'static' || !type) {
      const indexHtml = this.generateDefaultIndexHtml(subdomain);
      const indexPath = join(sitePath, 'index.html');
      writeFileSync(indexPath, indexHtml, 'utf8');
      logger.info('Default index.html created', { path: indexPath });
    }
    
    // Create subdomain in Nginx with SSL (automatic)
    await SubdomainService.createSubdomain(subdomain, { installSSL: true });
    
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
  
  static generateDefaultIndexHtml(subdomain) {
    const siteName = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
    
    return `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${siteName} — Bem-vindo</title>
  <style>
    :root{--laranja:#ff7a00;--azul:#0066cc;font-family:system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial;}
    body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#fff;color:#222}
    .card{padding:22px 28px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.08);max-width:520px;text-align:left}
    h1{margin:0 0 8px;font-size:20px;color:var(--laranja)}
    p{margin:0 0 14px;color:#444}
    .cta{display:inline-block;padding:10px 14px;border-radius:8px;background:var(--azul);color:#fff;text-decoration:none;font-weight:600}
    small{display:block;margin-top:10px;color:#666}
  </style>
</head>
<body>
  <div class="card">
    <h1>Seja bem-vindo, ${siteName}!</h1>
    <p>Esta página foi criada automaticamente pelo <strong>Txuna Site</strong> para apresentar e configurar seu site de forma rápida e profissional.</p>
    <a class="cta" href="https://h.panel.txunasite.com" target="_blank" rel="noopener">Clique aqui para configurar</a>
    <small>As cores principais são laranja e azul — personalize o texto e substitua <code>${siteName}</code>.</small>
  </div>
</body>
</html>`;
  }
}

