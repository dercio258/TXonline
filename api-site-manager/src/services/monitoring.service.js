import { exec } from 'child_process';
import { promisify } from 'util';
import { statSync, readdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import { SiteModel } from '../models/site.model.js';
import { DockerService } from './docker.service.js';
import { DatabaseService } from './database.service.js';

const execAsync = promisify(exec);
const BASE_DIR = process.env.BASE_DIR || '/var/www';

export class MonitoringService {
  static async getStorageUsage(siteId) {
    const site = await SiteModel.findById(siteId);
    if (!site) {
      throw new Error('Site not found');
    }
    
    let size = 0;
    
    // Calculate filesystem size
    if (site.type === 'wordpress') {
      // For WordPress, get size from Docker volume
      try {
        const containerName = `wp-${site.subdomain}`;
        const { stdout } = await execAsync(
          `docker exec ${containerName} du -sb /var/www/html 2>/dev/null || echo "0"`
        );
        size = parseInt(stdout.split('\t')[0]) || 0;
      } catch (error) {
        // Fallback to filesystem calculation
        size = await this.calculateDirectorySize(site.path);
      }
    } else {
      size = await this.calculateDirectorySize(site.path);
    }
    
    // Add database size for WordPress
    let dbSize = 0;
    if (site.type === 'wordpress') {
      const dbInfo = await DatabaseService.getDatabaseSize(`wp_${site.subdomain}`);
      dbSize = dbInfo.sizeBytes;
    }
    
    const totalSize = size + dbSize;
    const limit = site.storage_limit || 1073741824; // 1GB default
    
    // Update in database
    await SiteModel.updateStorageUsage(siteId, totalSize);
    
    return {
      siteId,
      used: totalSize,
      usedMB: (totalSize / 1024 / 1024).toFixed(2),
      usedGB: (totalSize / 1024 / 1024 / 1024).toFixed(2),
      filesystemSize: size,
      databaseSize: dbSize,
      limit: limit,
      limitMB: (limit / 1024 / 1024).toFixed(2),
      limitGB: (limit / 1024 / 1024 / 1024).toFixed(2),
      percentage: ((totalSize / limit) * 100).toFixed(2),
      warning: (totalSize / limit) > 0.8,
      critical: (totalSize / limit) > 0.95
    };
  }
  
  static async getRAMUsage(siteId) {
    const site = await SiteModel.findById(siteId);
    if (!site) {
      throw new Error('Site not found');
    }
    
    if (site.type !== 'wordpress') {
      return {
        siteId,
        used: 0,
        usedMB: '0',
        limit: 0,
        limitMB: '0',
        percentage: '0',
        note: 'RAM monitoring only available for WordPress sites'
      };
    }
    
    const containerName = `wp-${site.subdomain}`;
    const stats = await DockerService.getContainerStats(containerName);
    
    if (!stats) {
      return {
        siteId,
        used: 0,
        usedMB: '0',
        limit: 0,
        limitMB: '0',
        percentage: '0',
        error: 'Container not found or not running'
      };
    }
    
    return {
      siteId,
      used: stats.memory.used,
      usedMB: stats.memory.usedMB,
      limit: stats.memory.limit,
      limitMB: stats.memory.limitMB,
      percentage: stats.memory.percent,
      cpuPercent: stats.cpu.percent,
      warning: parseFloat(stats.memory.percent) > 80,
      critical: parseFloat(stats.memory.percent) > 95,
      timestamp: stats.timestamp
    };
  }
  
  static async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      if (!readdirSync) {
        return 0;
      }
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        try {
          const stats = statSync(itemPath);
          
          if (stats.isDirectory()) {
            totalSize += await this.calculateDirectorySize(itemPath);
          } else {
            totalSize += stats.size;
          }
        } catch (err) {
          // Skip files we can't access
          continue;
        }
      }
    } catch (error) {
      logger.error('Error calculating directory size', { error: error.message, path: dirPath });
    }
    
    return totalSize;
  }
  
  static async getSiteStats(siteId) {
    const site = await SiteModel.findById(siteId);
    if (!site) {
      throw new Error('Site not found');
    }
    
    const storage = await this.getStorageUsage(siteId);
    const ram = await this.getRAMUsage(siteId);
    
    // Get WordPress info if applicable
    let wpInfo = null;
    if (site.type === 'wordpress') {
      const { getConnection } = await import('../config/database.js');
      const connection = await getConnection();
      const [rows] = await connection.query(
        'SELECT * FROM wordpress_installs WHERE site_id = ?',
        [siteId]
      );
      wpInfo = rows[0] || null;
      
      // Get plugin count
      const [plugins] = await connection.query(
        'SELECT COUNT(*) as count FROM wordpress_plugins WHERE site_id = ?',
        [siteId]
      );
      wpInfo.pluginCount = plugins[0]?.count || 0;
    }
    
    return {
      site: {
        id: site.id,
        subdomain: site.subdomain,
        type: site.type,
        status: site.status
      },
      storage,
      ram,
      wordpress: wpInfo,
      lastActivity: site.updated_at || site.created_at,
      timestamp: new Date().toISOString()
    };
  }
  
  static async getAllMonitoring() {
    const sites = await SiteModel.findAll();
    const monitoring = [];
    let totalStorage = 0;
    
    for (const site of sites) {
      try {
        const stats = await this.getSiteStats(site.id);
          monitoring.push(stats);
          totalStorage += parseInt(stats.storage.used);
      } catch (error) {
        logger.error('Error getting stats for site', { siteId: site.id, error: error.message });
      }
    }
    
    return {
      totalSites: sites.length,
      totalStorage,
      totalStorageMB: (totalStorage / 1024 / 1024).toFixed(2),
      totalStorageGB: (totalStorage / 1024 / 1024 / 1024).toFixed(2),
      sites: monitoring,
      timestamp: new Date().toISOString()
    };
  }
}

