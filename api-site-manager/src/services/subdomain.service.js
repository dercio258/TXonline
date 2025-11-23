import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, existsSync, unlinkSync, readFileSync } from 'fs';
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
    // Em container, executar script no host via docker exec
    if (isDockerContainer) {
      try {
        // Tentar executar script no host via docker exec (se container tem acesso)
        // Usar o próprio container para executar no host
        const containerName = process.env.HOSTNAME || 'txuna-api';
        const scriptPath = '/var/www/mozloja.online/api-site-manager/scripts/reload-nginx.sh';
        
        // Tentar executar via nsenter (acessa namespace do host)
        try {
          // Obter PID do processo init do host (geralmente 1)
          await execAsync(`nsenter -t 1 -m -u -i -n -p sh -c "nginx -t && systemctl reload nginx"`);
          logger.info('Nginx reloaded successfully via nsenter');
        } catch (nsenterError) {
          // Fallback: tentar executar script mapeado (pode não funcionar se Nginx não está no container)
          const reloadScript = '/usr/local/bin/reload-nginx.sh';
          if (existsSync(reloadScript)) {
            await execAsync(`sh ${reloadScript}`);
            logger.info('Nginx reloaded successfully via script');
          } else {
            throw new Error('Could not reload Nginx: script not found and nsenter failed');
          }
        }
      } catch (error) {
        logger.warn('Failed to reload Nginx automatically, manual reload required', { 
          error: error.message 
        });
        logger.warn('Please reload manually: systemctl reload nginx');
        // Não lançar erro - site foi criado, apenas precisa reload manual
      }
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
        
        // Reload Nginx again (tentar múltiplos métodos)
        if (isDockerContainer) {
          let reloaded = false;
          const reloadMethods = [
            async () => {
              await execAsync(`nsenter -t 1 -m -u -i -n -p sh -c "nginx -t && systemctl reload nginx"`);
              return 'nsenter';
            },
            async () => {
              const reloadScript = '/usr/local/bin/reload-nginx.sh';
              if (existsSync(reloadScript)) {
                await execAsync(`sh ${reloadScript}`);
                return 'script';
              }
              throw new Error('Script not found');
            },
            async () => {
              await execAsync('nginx -t && systemctl reload nginx');
              return 'direct';
            }
          ];
          
          for (const method of reloadMethods) {
            try {
              const methodName = await method();
              logger.info(`Nginx reloaded with SSL configuration via ${methodName}`);
              reloaded = true;
              break;
            } catch (error) {
              logger.debug(`Reload method failed: ${error.message}`);
              continue;
            }
          }
          
          if (!reloaded) {
            logger.warn('Failed to reload Nginx after SSL, manual reload required');
          }
        } else {
          await execAsync(NGINX_RELOAD);
          logger.info('Nginx reloaded with SSL configuration');
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
    index index.html index.htm index.php;
    
    # Logs
    access_log /var/log/nginx/${domain}-access.log;
    error_log /var/log/nginx/${domain}-error.log;
    
    # Prevent 403 Forbidden - allow directory listing if no index file
    autoindex off;
    
    # Main location block
    location / {
        try_files $uri $uri/ /index.html /index.php?$args;
        # Allow access to all files
        allow all;
    }
    
    # PHP configuration (if applicable)
    location ~ \\.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Static files with caching
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Deny access to hidden files
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
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
    index index.html index.htm index.php;
    
    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Logs
    access_log /var/log/nginx/${domain}-access.log;
    error_log /var/log/nginx/${domain}-error.log;
    
    # Prevent 403 Forbidden
    autoindex off;
    
    # Main location block
    location / {
        try_files $uri $uri/ /index.html /index.php?$args;
        allow all;
    }
    
    # PHP configuration (if applicable)
    location ~ \\.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Static files with caching
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Deny access to hidden files
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
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
    
    // Reload Nginx (tentar automaticamente mesmo em container)
    if (isDockerContainer) {
      try {
        const reloadScript = '/usr/local/bin/reload-nginx.sh';
        if (existsSync(reloadScript)) {
          await execAsync(`sh ${reloadScript}`);
          logger.info('Nginx reloaded after subdomain deletion via script');
        } else {
          await execAsync('systemctl reload nginx');
          logger.info('Nginx reloaded after subdomain deletion');
        }
      } catch (error) {
        logger.warn('Failed to reload Nginx after deletion, manual reload required', { 
          error: error.message 
        });
      }
    } else {
      try {
        await execAsync(NGINX_RELOAD);
        logger.info('Nginx reloaded after subdomain deletion');
      } catch (error) {
        logger.error('Failed to reload Nginx', { error: error.message });
      }
    }
    
    // TODO: Remove DNS records
    // TODO: Remove SSL certificates
  }
  
}

