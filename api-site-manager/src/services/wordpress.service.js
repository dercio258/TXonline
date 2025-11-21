import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import logger from '../utils/logger.js';
import { SiteModel } from '../models/site.model.js';
import { DatabaseService } from './database.service.js';
import { DockerService } from './docker.service.js';

const execAsync = promisify(exec);
const BASE_DIR = process.env.BASE_DIR || '/var/www';
const WP_DB_PREFIX = process.env.WP_DB_PREFIX || 'wp_';

export class WordPressService {
  static async installWordPress(siteId, options) {
    const { adminEmail, adminUser, adminPassword } = options;
    
    // Get site info from database
    const site = await SiteModel.findById(siteId);
    if (!site) {
      throw new Error('Site not found');
    }
    
    if (site.type !== 'wordpress') {
      throw new Error('Site is not configured for WordPress');
    }
    
    // Create database dynamically
    logger.info('Creating WordPress database', { subdomain: site.subdomain });
    const dbConfig = await DatabaseService.createWordPressDatabase(site.subdomain);
    
    // Create WordPress container with Docker
    logger.info('Creating WordPress container', { subdomain: site.subdomain });
    const containerInfo = await DockerService.createWordPressContainer({
      subdomain: site.subdomain,
      siteId: site.id,
      dbName: dbConfig.dbName,
      dbUser: dbConfig.dbUser,
      dbPassword: dbConfig.dbPassword,
      storageLimit: site.storage_limit
    });
    
    // Wait for container to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Configure WordPress via WP-CLI inside container
    const containerName = containerInfo.containerName;
    const adminPasswordFinal = adminPassword || this.generatePassword();
    
    try {
      // Download WordPress (if not already done by image)
      await execAsync(`docker exec ${containerName} wp core download --allow-root --force`, {
        env: { ...process.env, WP_CLI_CACHE_DIR: '/tmp/wp-cli-cache' }
      });
      
      // Create wp-config.php
      await execAsync(
        `docker exec ${containerName} wp config create --dbname=${dbConfig.dbName} --dbuser=${dbConfig.dbUser} --dbpass=${dbConfig.dbPassword} --dbhost=${dbConfig.dbHost} --dbprefix=${WP_DB_PREFIX} --locale=pt_BR --allow-root --force`
      );
      
      // Install WordPress
      const siteUrl = `https://${site.subdomain}.${process.env.MAIN_DOMAIN || 'txunasites.com'}`;
      await execAsync(
        `docker exec ${containerName} wp core install --url=${siteUrl} --title="Site ${site.subdomain}" --admin_user=${adminUser || 'admin'} --admin_password=${adminPasswordFinal} --admin_email=${adminEmail || process.env.WP_ADMIN_EMAIL} --allow-root`
      );
      
      // Save WordPress install info to database
      const { getConnection } = await import('../config/database.js');
      const connection = await getConnection();
      await connection.query(
        `INSERT INTO wordpress_installs (site_id, version, db_name, db_user, db_host, admin_user, admin_email) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         version = VALUES(version),
         db_name = VALUES(db_name),
         db_user = VALUES(db_user),
         admin_user = VALUES(admin_user),
         admin_email = VALUES(admin_email)`,
        [
          siteId,
          'latest',
          dbConfig.dbName,
          dbConfig.dbUser,
          dbConfig.dbHost,
          adminUser || 'admin',
          adminEmail || process.env.WP_ADMIN_EMAIL
        ]
      );
      
      // Save credentials (encrypted in production)
      await connection.query(
        `INSERT INTO site_credentials (site_id, wp_admin_user, wp_admin_password_encrypted, db_password_encrypted) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         wp_admin_user = VALUES(wp_admin_user),
         wp_admin_password_encrypted = VALUES(wp_admin_password_encrypted),
         db_password_encrypted = VALUES(db_password_encrypted)`,
        [
          siteId,
          adminUser || 'admin',
          adminPasswordFinal, // TODO: Encrypt in production
          dbConfig.dbPassword // TODO: Encrypt in production
        ]
      );
      
      logger.info('WordPress installed successfully', { siteId, containerName });
      
      return {
        success: true,
        adminUser: adminUser || 'admin',
        adminPassword: adminPasswordFinal,
        adminEmail: adminEmail || process.env.WP_ADMIN_EMAIL,
        url: siteUrl,
        container: containerInfo,
        database: {
          name: dbConfig.dbName,
          user: dbConfig.dbUser
        }
      };
    } catch (error) {
      logger.error('Failed to configure WordPress', { error: error.message, siteId });
      // Cleanup on error
      try {
        await DockerService.stopContainer(containerName);
        await DockerService.removeContainer(containerName);
        await DatabaseService.dropWordPressDatabase(site.subdomain);
      } catch (cleanupError) {
        logger.error('Error during cleanup', { error: cleanupError.message });
      }
      throw error;
    }
  }
  
  static async getWordPressInfo(siteId) {
    // TODO: Get from database and filesystem
    return {
      version: 'latest',
      installed: false
    };
  }
  
  static async installPlugin(siteId, pluginName, version = null) {
    // TODO: Validate plugin against whitelist/blacklist
    // TODO: Check storage limits
    
    const site = { path: join(BASE_DIR, 'example') };
    
    const versionFlag = version ? `--version=${version}` : '';
    
    await execAsync(
      `cd ${site.path} && wp plugin install ${pluginName} ${versionFlag} --activate --allow-root`
    );
    
    logger.info('Plugin installed', { siteId, pluginName });
    
    return {
      plugin: pluginName,
      version,
      status: 'active'
    };
  }
  
  static async listPlugins(siteId) {
    const site = { path: join(BASE_DIR, 'example') };
    
    try {
      const { stdout } = await execAsync(
        `cd ${site.path} && wp plugin list --format=json --allow-root`
      );
      return JSON.parse(stdout);
    } catch (error) {
      logger.error('Failed to list plugins', { error: error.message });
      return [];
    }
  }
  
  static async removePlugin(siteId, pluginName) {
    const site = { path: join(BASE_DIR, 'example') };
    
    await execAsync(
      `cd ${site.path} && wp plugin deactivate ${pluginName} --allow-root && wp plugin delete ${pluginName} --allow-root`
    );
    
    logger.info('Plugin removed', { siteId, pluginName });
  }
  
  static async getCredentials(siteId) {
    // TODO: Get from secure storage
    return {
      adminUser: 'admin',
      adminEmail: 'admin@example.com',
      // Password should be retrieved from secure storage
    };
  }
  
  static generatePassword(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

