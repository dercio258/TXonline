import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import { SSLService } from './ssl.service.js';

// Verificar se está rodando em container Docker
const isDockerContainer = existsSync('/.dockerenv');

const execAsync = promisify(exec);
const NGINX_AVAILABLE = process.env.NGINX_SITES_AVAILABLE || '/etc/nginx/sites-available';
const NGINX_ENABLED = process.env.NGINX_SITES_ENABLED || '/etc/nginx/sites-enabled';
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || 'mozloja.online';
const BASE_DIR = process.env.BASE_DIR || '/var/www';
const NGINX_RELOAD = process.env.NGINX_RELOAD_CMD || 'systemctl reload nginx';
const USE_SSL = process.env.USE_SSL === 'true' || process.env.USE_SSL === true;

export class SubdomainService {
  static async createSubdomain(subdomain, options = {}) {
    const fullDomain = `${subdomain}.${MAIN_DOMAIN}`;
    const sitePath = join(BASE_DIR, subdomain);
    // Se installSSL for explicitamente true, instalar SSL
    // Se não especificado, usar USE_SSL do ambiente
    const installSSL = options.installSSL === true ? true : (options.installSSL !== false && USE_SSL);
    
    // Create Nginx configuration (HTTP first, SSL will be added after certificate)
    const nginxConfig = installSSL 
      ? this.generateNginxConfigHTTP(fullDomain, sitePath)
      : this.generateNginxConfig(fullDomain, sitePath);
    
    const configPath = join(NGINX_AVAILABLE, subdomain);
    
    writeFileSync(configPath, nginxConfig);
    logger.info('Nginx config created', { path: configPath });
    
    // Create symlink to enabled sites
    const enabledPath = join(NGINX_ENABLED, subdomain);
    if (!existsSync(enabledPath)) {
      await execAsync(`ln -s ${configPath} ${enabledPath}`);
      logger.info('Nginx site enabled', { subdomain });
    }
    
    // Test Nginx configuration
    // Se estiver em container Docker, pular validação (Nginx está no host)
    if (isDockerContainer) {
      logger.info('Skipping Nginx test in container (Nginx runs on host)');
      logger.warn('Nginx configuration should be tested manually on host: nginx -t');
    } else {
      // Executar normalmente no host
      try {
        await execAsync('nginx -t');
        logger.info('Nginx configuration test passed');
      } catch (error) {
        throw new Error(`Nginx configuration test failed: ${error.message}`);
      }
    }
    
    // Reload Nginx
    // Em container, não podemos recarregar Nginx diretamente
    // O usuário precisa recarregar manualmente ou usar um script no host
    if (isDockerContainer) {
      logger.warn('Nginx reload skipped in container. Please reload manually: systemctl reload nginx');
      logger.info('Nginx configuration created, manual reload required on host');
    } else {
      try {
        await execAsync(NGINX_RELOAD);
        logger.info('Nginx reloaded successfully');
      } catch (error) {
        logger.error('Failed to reload Nginx', { error: error.message });
        throw new Error(`Failed to reload Nginx: ${error.message}`);
      }
    }
    
    // Install SSL certificate if enabled
    let sslInfo = null;
    if (installSSL) {
      try {
        sslInfo = await SSLService.installSSL(fullDomain);
        logger.info('SSL certificate installed', { domain: fullDomain });
        
        // Update Nginx config with SSL
        const sslConfig = await SSLService.updateNginxSSLConfig(fullDomain, sitePath);
        writeFileSync(configPath, sslConfig);
        
        // Reload Nginx again (apenas se não estiver em container)
        if (!isDockerContainer) {
          await execAsync(NGINX_RELOAD);
          logger.info('Nginx reloaded with SSL configuration');
        } else {
          logger.warn('Nginx reload skipped in container. Please reload manually: systemctl reload nginx');
        }
      } catch (error) {
        logger.warn('SSL installation failed, continuing without SSL', { 
          domain: fullDomain, 
          error: error.message 
        });
        // Continue without SSL - can be installed later
      }
    }
    
    return {
      subdomain,
      domain: fullDomain,
      status: 'active',
      nginxConfig: configPath,
      ssl: sslInfo ? {
        installed: true,
        expiresAt: sslInfo.expiresAt
      } : {
        installed: false
      }
    };
  }
  
  static generateNginxConfig(domain, rootPath) {
    return `server {
    listen 80;
    server_name ${domain};
    
    root ${rootPath};
    index index.html index.php;
    
    # Logs
    access_log /var/log/nginx/${domain}-access.log;
    error_log /var/log/nginx/${domain}-error.log;
    
    # WordPress configuration (if applicable)
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
    
    location ~ \\.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Static files
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
`;
  }
  
  static generateNginxConfigHTTP(domain, rootPath) {
    // HTTP config for Let's Encrypt validation
    return `server {
    listen 80;
    server_name ${domain};
    
    root ${rootPath};
    index index.html index.php;
    
    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Logs
    access_log /var/log/nginx/${domain}-access.log;
    error_log /var/log/nginx/${domain}-error.log;
    
    # WordPress configuration (if applicable)
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
    
    location ~ \\.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Static files
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
`;
  }
  
  static async listSubdomains() {
    // TODO: List from database or filesystem
    return [];
  }
  
  static async deleteSubdomain(subdomain) {
    const configPath = join(NGINX_AVAILABLE, subdomain);
    const enabledPath = join(NGINX_ENABLED, subdomain);
    
    // Remove symlink
    if (existsSync(enabledPath)) {
      unlinkSync(enabledPath);
    }
    
    // Remove config file
    if (existsSync(configPath)) {
      unlinkSync(configPath);
    }
    
    // Reload Nginx (apenas se não estiver em container)
    if (!isDockerContainer) {
      try {
        await execAsync(NGINX_RELOAD);
        logger.info('Nginx reloaded after subdomain deletion');
      } catch (error) {
        logger.error('Failed to reload Nginx', { error: error.message });
      }
    } else {
      logger.warn('Nginx reload skipped in container. Please reload manually: systemctl reload nginx');
    }
    
    // TODO: Remove DNS records
    // TODO: Remove SSL certificates
  }
}

