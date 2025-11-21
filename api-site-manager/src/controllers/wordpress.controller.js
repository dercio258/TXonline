import { WordPressService } from '../services/wordpress.service.js';
import logger from '../utils/logger.js';

export const installWordPress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminEmail, adminUser, adminPassword } = req.body;
    
    const result = await WordPressService.installWordPress(id, {
      adminEmail: adminEmail || process.env.WP_ADMIN_EMAIL,
      adminUser: adminUser || process.env.WP_ADMIN_USER,
      adminPassword
    });
    
    logger.info('WordPress installed', { siteId: id });
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'WordPress installed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getWordPressInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { SiteModel } = await import('../models/site.model.js');
    const site = await SiteModel.findById(id);
    
    if (!site || site.type !== 'wordpress') {
      return res.status(404).json({
        success: false,
        error: 'WordPress site not found'
      });
    }
    
    const { getConnection } = await import('../config/database.js');
    const connection = await getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM wordpress_installs WHERE site_id = ?',
      [id]
    );
    
    const wpInfo = rows[0] || null;
    
    // Get container stats if running
    let containerStats = null;
    try {
      const { DockerService } = await import('../services/docker.service.js');
      containerStats = await DockerService.getContainerStats(`wp-${site.subdomain}`);
    } catch (error) {
      // Container might not exist yet
    }
    
    res.json({
      success: true,
      data: {
        installed: !!wpInfo,
        version: wpInfo?.version || null,
        database: wpInfo ? {
          name: wpInfo.db_name,
          user: wpInfo.db_user
        } : null,
        container: containerStats,
        url: `https://${site.subdomain}.${process.env.MAIN_DOMAIN || 'txunasites.com'}`
      }
    });
  } catch (error) {
    next(error);
  }
};

export const installPlugin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pluginName, pluginVersion } = req.body;
    
    const { SiteModel } = await import('../models/site.model.js');
    const site = await SiteModel.findById(id);
    
    if (!site || site.type !== 'wordpress') {
      return res.status(404).json({
        success: false,
        error: 'WordPress site not found'
      });
    }
    
    const containerName = `wp-${site.subdomain}`;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Check plugin whitelist/blacklist (TODO: implement)
    
    const versionFlag = pluginVersion ? `--version=${pluginVersion}` : '';
    
    await execAsync(
      `docker exec ${containerName} wp plugin install ${pluginName} ${versionFlag} --activate --allow-root`
    );
    
    // Save to database
    const { getConnection } = await import('../config/database.js');
    const connection = await getConnection();
    await connection.query(
      `INSERT INTO wordpress_plugins (site_id, plugin_name, plugin_version, status) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       plugin_version = VALUES(plugin_version),
       status = 'active'`,
      [id, pluginName, pluginVersion || 'latest', 'active']
    );
    
    logger.info('Plugin installed', { siteId: id, plugin: pluginName });
    
    res.json({
      success: true,
      data: {
        plugin: pluginName,
        version: pluginVersion || 'latest',
        status: 'active'
      },
      message: 'Plugin installed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const listPlugins = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { SiteModel } = await import('../models/site.model.js');
    const site = await SiteModel.findById(id);
    
    if (!site || site.type !== 'wordpress') {
      return res.status(404).json({
        success: false,
        error: 'WordPress site not found'
      });
    }
    
    const containerName = `wp-${site.subdomain}`;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync(
        `docker exec ${containerName} wp plugin list --format=json --allow-root`
      );
      const plugins = JSON.parse(stdout);
      
      res.json({
        success: true,
        data: plugins
      });
    } catch (error) {
      // If container doesn't exist or WP-CLI fails, get from database
      const { getConnection } = await import('../config/database.js');
      const connection = await getConnection();
      const [rows] = await connection.query(
        'SELECT * FROM wordpress_plugins WHERE site_id = ?',
        [id]
      );
      
      res.json({
        success: true,
        data: rows
      });
    }
  } catch (error) {
    next(error);
  }
};

export const removePlugin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plugin } = req.params;
    
    const { SiteModel } = await import('../models/site.model.js');
    const site = await SiteModel.findById(id);
    
    if (!site || site.type !== 'wordpress') {
      return res.status(404).json({
        success: false,
        error: 'WordPress site not found'
      });
    }
    
    const containerName = `wp-${site.subdomain}`;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync(
      `docker exec ${containerName} wp plugin deactivate ${plugin} --allow-root && docker exec ${containerName} wp plugin delete ${plugin} --allow-root`
    );
    
    // Remove from database
    const { getConnection } = await import('../config/database.js');
    const connection = await getConnection();
    await connection.query(
      'DELETE FROM wordpress_plugins WHERE site_id = ? AND plugin_name = ?',
      [id, plugin]
    );
    
    logger.info('Plugin removed', { siteId: id, plugin });
    
    res.json({
      success: true,
      message: 'Plugin removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getCredentials = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { SiteModel } = await import('../models/site.model.js');
    const site = await SiteModel.findById(id);
    
    if (!site || site.type !== 'wordpress') {
      return res.status(404).json({
        success: false,
        error: 'WordPress site not found'
      });
    }
    
    const { getConnection } = await import('../config/database.js');
    const connection = await getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM site_credentials WHERE site_id = ?',
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        error: 'Credentials not found. WordPress may not be installed yet.'
      });
    }
    
    res.json({
      success: true,
      data: {
        adminUser: rows[0].wp_admin_user,
        adminEmail: site.type === 'wordpress' ? (await connection.query(
          'SELECT admin_email FROM wordpress_installs WHERE site_id = ?',
          [id]
        ))[0][0]?.admin_email : null,
        url: `https://${site.subdomain}.${process.env.MAIN_DOMAIN || 'txunasites.com'}/wp-admin`,
        note: 'Password is stored securely. Contact administrator to reset.'
      }
    });
  } catch (error) {
    next(error);
  }
};

