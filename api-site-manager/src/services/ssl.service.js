import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import logger from '../utils/logger.js';
import { getPHPFPMSocket } from '../utils/system.js';

const execAsync = promisify(exec);
const CERTBOT_PATH = process.env.CERTBOT_PATH || '/usr/bin/certbot';
const NGINX_RELOAD = process.env.NGINX_RELOAD_CMD || 'systemctl reload nginx';

export class SSLService {
  static async installSSL(domain, email = null) {
    const emailParam = email || process.env.SSL_EMAIL || `admin@${process.env.MAIN_DOMAIN || 'mozloja.online'}`;
    
    try {
      // Check if certbot is available
      if (!existsSync(CERTBOT_PATH)) {
        throw new Error('Certbot not found. Please install certbot: sudo apt install certbot python3-certbot-nginx');
      }
      
      // Check if SSL already exists
      const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
      if (existsSync(certPath)) {
        logger.info('SSL certificate already exists', { domain });
        return {
          domain,
          status: 'exists',
          path: certPath,
          expiresAt: await this.getCertificateExpiry(domain)
        };
      }
      
      // Install SSL certificate
      logger.info('Installing SSL certificate', { domain, email: emailParam });
      
      const command = `${CERTBOT_PATH} --nginx -d ${domain} --non-interactive --agree-tos --email ${emailParam} --redirect`;
      
      const { stdout, stderr } = await execAsync(command);
      
      logger.info('SSL certificate installed', { domain, stdout });
      
      // Get certificate expiry
      const expiresAt = await this.getCertificateExpiry(domain);
      
      return {
        domain,
        status: 'installed',
        path: certPath,
        expiresAt,
        message: 'SSL certificate installed successfully'
      };
    } catch (error) {
      logger.error('Failed to install SSL certificate', { 
        domain, 
        error: error.message,
        stderr: error.stderr 
      });
      throw new Error(`SSL installation failed: ${error.message}`);
    }
  }
  
  static async renewSSL(domain) {
    try {
      logger.info('Renewing SSL certificate', { domain });
      
      const command = `${CERTBOT_PATH} renew --cert-name ${domain} --quiet`;
      await execAsync(command);
      
      // Reload Nginx
      await execAsync(NGINX_RELOAD);
      
      logger.info('SSL certificate renewed', { domain });
      
      return {
        domain,
        status: 'renewed',
        expiresAt: await this.getCertificateExpiry(domain)
      };
    } catch (error) {
      logger.error('Failed to renew SSL certificate', { domain, error: error.message });
      throw error;
    }
  }
  
  static async getCertificateExpiry(domain) {
    try {
      const certPath = `/etc/letsencrypt/live/${domain}/cert.pem`;
      if (!existsSync(certPath)) {
        return null;
      }
      
      const { stdout } = await execAsync(`openssl x509 -enddate -noout -in ${certPath}`);
      const expiryDate = stdout.match(/notAfter=(.+)/)?.[1];
      
      return expiryDate ? new Date(expiryDate).toISOString() : null;
    } catch (error) {
      logger.error('Failed to get certificate expiry', { domain, error: error.message });
      return null;
    }
  }
  
  static async revokeSSL(domain) {
    try {
      logger.info('Revoking SSL certificate', { domain });
      
      const command = `${CERTBOT_PATH} delete --cert-name ${domain} --non-interactive`;
      await execAsync(command);
      
      logger.info('SSL certificate revoked', { domain });
      
      return {
        domain,
        status: 'revoked'
      };
    } catch (error) {
      logger.error('Failed to revoke SSL certificate', { domain, error: error.message });
      throw error;
    }
  }
  
  static async updateNginxSSLConfig(domain, sitePath) {
    const configPath = `/etc/nginx/sites-available/${domain}`;
    
    // Detectar versão do PHP automaticamente
    const phpSocket = await getPHPFPMSocket();
    
    // Read existing config or create new one
    const sslConfig = `
server {
    listen 80;
    server_name ${domain};
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain};
    
    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    root ${sitePath};
    index index.html index.php;
    
    # Logs
    access_log /var/log/nginx/${domain}-access.log;
    error_log /var/log/nginx/${domain}-error.log;
    
    # WordPress configuration (if applicable)
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
    
    location ~ \\.php$ {
        fastcgi_pass unix:${phpSocket};
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
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
`;
    
    return sslConfig;
  }
}

