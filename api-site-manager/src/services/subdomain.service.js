import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, existsSync, unlinkSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import { SSLService } from './ssl.service.js';
import { getPHPFPMSocket, setPermissions, verifyDirectoryExists } from '../utils/system.js';

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
    
    // Criar diretório do site se não existir
    if (!existsSync(sitePath)) {
      try {
        mkdirSync(sitePath, { recursive: true });
        logger.info('Site directory created', { path: sitePath });
        
        // Definir permissões corretas
        const permissionsSet = await setPermissions(sitePath, 'www-data', '755');
        if (!permissionsSet) {
          logger.warn('Failed to set permissions for site directory', { path: sitePath });
        }
      } catch (error) {
        logger.error('Failed to create site directory', { path: sitePath, error: error.message });
        throw new Error(`Failed to create directory ${sitePath}: ${error.message}`);
      }
    }
    
    // Criar index.html básico se não existir
    const indexPath = join(sitePath, 'index.html');
    if (!existsSync(indexPath)) {
      try {
        const indexHtml = this.generateDefaultIndexHtml(subdomain);
        writeFileSync(indexPath, indexHtml, 'utf8');
        logger.info('Default index.html created', { path: indexPath });
        
        // Definir permissões do arquivo
        await setPermissions(indexPath, 'www-data', '644');
      } catch (error) {
        logger.error('Failed to create index.html', { path: indexPath, error: error.message });
        // Não lançar erro - site pode funcionar sem index.html
      }
    }
    
    // Create Nginx configuration (HTTP first, SSL will be added after certificate)
    const nginxConfig = installSSL 
      ? await this.generateNginxConfigHTTP(fullDomain, sitePath)
      : await this.generateNginxConfig(fullDomain, sitePath);
    
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
    
    // Reload Nginx - tentar múltiplas abordagens para garantir que funcione
    if (isDockerContainer) {
      let reloaded = false;
      const reloadMethods = [
        // Método 1: nsenter (mais confiável)
        async () => {
          await execAsync(`nsenter -t 1 -m -u -i -n -p sh -c "nginx -t && systemctl reload nginx"`);
          return 'nsenter';
        },
        // Método 2: Script mapeado
        async () => {
          const reloadScript = '/usr/local/bin/reload-nginx.sh';
          if (existsSync(reloadScript)) {
            await execAsync(`sh ${reloadScript}`);
            return 'script';
          }
          throw new Error('Script not found');
        },
        // Método 3: Tentar diretamente (pode funcionar com privilégios)
        async () => {
          await execAsync('nginx -t && systemctl reload nginx');
          return 'direct';
        }
      ];
      
      for (const method of reloadMethods) {
        try {
          const methodName = await method();
          logger.info(`Nginx reloaded successfully via ${methodName}`);
          reloaded = true;
          break;
        } catch (error) {
          logger.debug(`Reload method failed: ${error.message}`);
          continue;
        }
      }
      
      if (!reloaded) {
        logger.warn('All Nginx reload methods failed, manual reload required');
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
  
  static async generateNginxConfig(domain, rootPath) {
    // Detectar versão do PHP automaticamente
    const phpSocket = await getPHPFPMSocket();
    
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
        fastcgi_pass unix:${phpSocket};
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
  
  static async generateNginxConfigHTTP(domain, rootPath) {
    // HTTP config for Let's Encrypt validation
    // Detectar versão do PHP automaticamente
    const phpSocket = await getPHPFPMSocket();
    
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
        fastcgi_pass unix:${phpSocket};
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

