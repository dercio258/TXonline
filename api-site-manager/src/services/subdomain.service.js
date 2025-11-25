import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, existsSync, unlinkSync, readFileSync, mkdirSync, statSync } from 'fs';
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
const NGINX_RELOAD = process.env.NGINX_RELOAD_CMD || 'systemctl restart nginx';
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
        
        // Verificar se o diretório foi realmente criado
        if (!existsSync(sitePath)) {
          throw new Error(`Directory ${sitePath} was not created successfully`);
        }
        
        // Verificar se é realmente um diretório
        const stats = statSync(sitePath);
        if (!stats.isDirectory()) {
          throw new Error(`${sitePath} exists but is not a directory`);
        }
        
        // Definir permissões corretas ANTES de criar arquivos
        const permissionsSet = await setPermissions(sitePath, 'www-data', '755');
        if (!permissionsSet) {
          logger.error('Failed to set permissions for site directory', { path: sitePath });
          throw new Error(`Failed to set permissions for directory ${sitePath}. Nginx may not be able to access files.`);
        }
        
        // Verificar se o diretório é acessível após definir permissões
        const dirAccessible = await verifyDirectoryExists(sitePath);
        if (!dirAccessible) {
          logger.error('Directory is not accessible after setting permissions', { path: sitePath });
          throw new Error(`Directory ${sitePath} is not accessible. Check permissions.`);
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
        const filePermissionsSet = await setPermissions(indexPath, 'www-data', '644');
        if (!filePermissionsSet) {
          logger.warn('Failed to set permissions for index.html', { path: indexPath });
        }
      } catch (error) {
        logger.error('Failed to create index.html', { path: indexPath, error: error.message });
        // Não lançar erro - site pode funcionar sem index.html
      }
    }
    
    // Criar index.php padrão se não existir (para suporte PHP)
    const indexPhpPath = join(sitePath, 'index.php');
    if (!existsSync(indexPhpPath)) {
      try {
        const indexPhp = this.generateDefaultIndexPhp(subdomain);
        writeFileSync(indexPhpPath, indexPhp, 'utf8');
        logger.info('Default index.php created', { path: indexPhpPath });
        
        // Definir permissões do arquivo
        const filePermissionsSet = await setPermissions(indexPhpPath, 'www-data', '644');
        if (!filePermissionsSet) {
          logger.warn('Failed to set permissions for index.php', { path: indexPhpPath });
        }
      } catch (error) {
        logger.error('Failed to create index.php', { path: indexPhpPath, error: error.message });
        // Não lançar erro - site pode funcionar sem index.php
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
    
    // Restart Nginx - tentar múltiplas abordagens para garantir que funcione
    if (isDockerContainer) {
      let restarted = false;
      const restartMethods = [
        // Método 1: nsenter (mais confiável)
        async () => {
          await execAsync(`nsenter -t 1 -m -u -i -n -p sh -c "nginx -t && systemctl restart nginx"`);
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
          await execAsync('nginx -t && systemctl restart nginx');
          return 'direct';
        }
      ];
      
      for (const method of restartMethods) {
        try {
          const methodName = await method();
          logger.info(`Nginx restarted successfully via ${methodName}`);
          restarted = true;
          break;
        } catch (error) {
          logger.debug(`Restart method failed: ${error.message}`);
          continue;
        }
      }
      
      if (!restarted) {
        logger.warn('All Nginx restart methods failed, manual restart required');
        logger.warn('Please restart manually: systemctl restart nginx');
        // Não lançar erro - site foi criado, apenas precisa restart manual
      }
    } else {
      try {
        await execAsync(NGINX_RELOAD);
        logger.info('Nginx restarted successfully');
      } catch (error) {
        logger.error('Failed to restart Nginx', { error: error.message });
        throw new Error(`Failed to restart Nginx: ${error.message}`);
      }
    }
    
    // Install SSL certificate if enabled
    let sslInfo = null;
    if (installSSL) {
      try {
        // Aguardar um pouco para garantir que o site está acessível antes de instalar SSL
        logger.info('Waiting before SSL installation to ensure site is accessible', { domain: fullDomain });
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos
        
        // Instalar SSL com verificações automáticas
        sslInfo = await SSLService.installSSL(fullDomain, null, {
          skipDNSCheck: options.skipDNSCheck === true,
          skipHTTPCheck: options.skipHTTPCheck === true,
          waitForDNS: options.waitForDNS !== false
        });
        
        logger.info('SSL certificate installed successfully', { domain: fullDomain, sslInfo });
        
        // O certbot já atualiza a configuração do Nginx automaticamente
        // Mas vamos garantir que a configuração está correta
        const sslConfig = await SSLService.updateNginxSSLConfig(fullDomain, sitePath);
        writeFileSync(configPath, sslConfig);
        
        // Verificar configuração do Nginx antes de reiniciar
        try {
          await execAsync('nginx -t');
          logger.debug('Nginx configuration test passed after SSL installation');
        } catch (error) {
          logger.error('Nginx configuration test failed after SSL installation', { error: error.message });
          throw new Error(`Nginx configuration is invalid after SSL installation: ${error.message}`);
        }
        
        // Restart Nginx (tentar múltiplos métodos)
        if (isDockerContainer) {
          let restarted = false;
          const restartMethods = [
            async () => {
              await execAsync(`nsenter -t 1 -m -u -i -n -p sh -c "nginx -t && systemctl restart nginx"`);
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
              await execAsync('nginx -t && systemctl restart nginx');
              return 'direct';
            }
          ];
          
          for (const method of restartMethods) {
            try {
              const methodName = await method();
              logger.info(`Nginx restarted with SSL configuration via ${methodName}`);
              restarted = true;
              break;
            } catch (error) {
              logger.debug(`Restart method failed: ${error.message}`);
              continue;
            }
          }
          
          if (!restarted) {
            logger.warn('Failed to restart Nginx after SSL, manual restart required');
            logger.warn('Please restart manually: systemctl restart nginx');
          }
        } else {
          await execAsync(NGINX_RELOAD);
          logger.info('Nginx restarted with SSL configuration');
        }
        
        // Verificar se o certificado está realmente funcionando
        const certExists = existsSync(`/etc/letsencrypt/live/${fullDomain}/fullchain.pem`);
        if (!certExists) {
          logger.error('SSL certificate file not found after installation', { domain: fullDomain });
          throw new Error('SSL certificate was not created successfully');
        }
        
      } catch (error) {
        logger.error('SSL installation failed', { 
          domain: fullDomain, 
          error: error.message,
          stack: error.stack
        });
        
        // Se a instalação de SSL falhar, continuar sem SSL mas avisar
        logger.warn('Site created without SSL. SSL can be installed later manually.', { 
          domain: fullDomain,
          error: error.message
        });
        
        // Não lançar erro - site foi criado, apenas SSL falhou
        // O usuário pode instalar SSL depois manualmente
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
    
    // Restart Nginx (tentar automaticamente mesmo em container)
    if (isDockerContainer) {
      try {
        const reloadScript = '/usr/local/bin/reload-nginx.sh';
        if (existsSync(reloadScript)) {
          await execAsync(`sh ${reloadScript}`);
          logger.info('Nginx restarted after subdomain deletion via script');
        } else {
          await execAsync('systemctl restart nginx');
          logger.info('Nginx restarted after subdomain deletion');
        }
      } catch (error) {
        logger.warn('Failed to restart Nginx after deletion, manual restart required', { 
          error: error.message 
        });
      }
    } else {
      try {
        await execAsync(NGINX_RELOAD);
        logger.info('Nginx restarted after subdomain deletion');
      } catch (error) {
        logger.error('Failed to restart Nginx', { error: error.message });
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
  
  static generateDefaultIndexPhp(subdomain) {
    const siteName = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
    
    return `<?php
/**
 * Página inicial padrão - ${siteName}
 * Criada automaticamente pelo Txuna Site Manager
 */

// Informações do servidor
$phpVersion = phpversion();
$serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';
$serverName = $_SERVER['SERVER_NAME'] ?? '${subdomain}';

?>
<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title><?php echo htmlspecialchars($siteName); ?> — Bem-vindo</title>
  <style>
    :root{--laranja:#ff7a00;--azul:#0066cc;font-family:system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial;}
    body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;color:#222;padding:20px}
    .card{padding:22px 28px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.08);max-width:520px;text-align:left}
    h1{margin:0 0 8px;font-size:20px;color:var(--laranja)}
    p{margin:0 0 14px;color:#444}
    .cta{display:inline-block;padding:10px 14px;border-radius:8px;background:var(--azul);color:#fff;text-decoration:none;font-weight:600}
    small{display:block;margin-top:10px;color:#666}
    .info{background:#f5f5f5;padding:10px;border-radius:6px;margin-top:15px;font-size:12px;color:#666}
  </style>
</head>
<body>
  <div class="card">
    <h1>Seja bem-vindo, <?php echo htmlspecialchars($siteName); ?>!</h1>
    <p>Esta página foi criada automaticamente pelo <strong>Txuna Site</strong> para apresentar e configurar seu site de forma rápida e profissional.</p>
    <a class="cta" href="https://h.panel.txunasite.com" target="_blank" rel="noopener">Clique aqui para configurar</a>
    <small>As cores principais são laranja e azul — personalize o texto e substitua <code><?php echo htmlspecialchars($siteName); ?></code>.</small>
    <div class="info">
      <strong>Informações do Servidor:</strong><br>
      PHP: <?php echo htmlspecialchars($phpVersion); ?><br>
      Servidor: <?php echo htmlspecialchars($serverSoftware); ?><br>
      Domínio: <?php echo htmlspecialchars($serverName); ?>
    </div>
  </div>
</body>
</html>`;
  }
  
}

