import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import dns from 'dns';
import logger from '../utils/logger.js';
import { getPHPFPMSocket } from '../utils/system.js';

const execAsync = promisify(exec);
const resolve4 = promisify(dns.resolve4);
const CERTBOT_PATH = process.env.CERTBOT_PATH || '/usr/bin/certbot';
const NGINX_RELOAD = process.env.NGINX_RELOAD_CMD || 'systemctl restart nginx';
const SSL_STAGING = process.env.SSL_STAGING === 'true' || process.env.SSL_STAGING === true;
const SSL_RETRY_ATTEMPTS = parseInt(process.env.SSL_RETRY_ATTEMPTS || '3');
const SSL_RETRY_DELAY = parseInt(process.env.SSL_RETRY_DELAY || '5000'); // 5 segundos

export class SSLService {
  /**
   * Verifica se o DNS do domínio está resolvendo corretamente
   */
  static async verifyDNS(domain, maxRetries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await resolve4(domain);
        logger.info('DNS verification successful', { domain, attempt });
        return true;
      } catch (error) {
        if (attempt < maxRetries) {
          logger.debug(`DNS verification failed, retrying...`, { domain, attempt, delay });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.warn('DNS verification failed after all retries', { domain, error: error.message });
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Verifica se o domínio está acessível via HTTP
   */
  static async verifyHTTPAccess(domain, maxRetries = 3, delay = 3000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Tentar fazer uma requisição HTTP simples usando curl
        const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://${domain} || echo "000"`);
        const statusCode = parseInt(stdout.trim());
        
        if (statusCode >= 200 && statusCode < 500) {
          logger.info('HTTP access verification successful', { domain, statusCode, attempt });
          return true;
        }
        
        if (attempt < maxRetries) {
          logger.debug(`HTTP access verification failed (status: ${statusCode}), retrying...`, { domain, attempt, delay });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.warn('HTTP access verification failed after all retries', { domain, statusCode });
          return false;
        }
      } catch (error) {
        if (attempt < maxRetries) {
          logger.debug(`HTTP access verification error, retrying...`, { domain, attempt, error: error.message, delay });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.warn('HTTP access verification failed after all retries', { domain, error: error.message });
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Aguarda um tempo para garantir que o DNS propagou
   */
  static async waitForDNSPropagation(domain, waitTime = 10000) {
    logger.info('Waiting for DNS propagation', { domain, waitTime });
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Verificar DNS após esperar
    const dnsOk = await this.verifyDNS(domain, 2, 2000);
    if (!dnsOk) {
      logger.warn('DNS may not be fully propagated, but continuing with SSL installation', { domain });
    }
  }

  static async installSSL(domain, email = null, options = {}) {
    const emailParam = email || process.env.SSL_EMAIL || `admin@${process.env.MAIN_DOMAIN || 'mozloja.online'}`;
    const skipDNSCheck = options.skipDNSCheck === true;
    const skipHTTPCheck = options.skipHTTPCheck === true;
    const waitForDNS = options.waitForDNS !== false; // Por padrão, aguarda
    
    try {
      // Check if certbot is available
      if (!existsSync(CERTBOT_PATH)) {
        throw new Error('Certbot not found. Please install certbot: sudo apt install certbot python3-certbot-nginx');
      }
      
      // Check if SSL already exists
      const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
      if (existsSync(certPath)) {
        logger.info('SSL certificate already exists', { domain });
        // Verificar se o certificado é válido
        const expiry = await this.getCertificateExpiry(domain);
        if (expiry) {
          return {
            domain,
            status: 'exists',
            path: certPath,
            expiresAt: expiry,
            message: 'SSL certificate already exists and is valid'
          };
        } else {
          logger.warn('Existing certificate found but invalid, will reinstall', { domain });
        }
      }
      
      // Aguardar propagação de DNS se necessário
      if (waitForDNS && !skipDNSCheck) {
        await this.waitForDNSPropagation(domain, 10000); // 10 segundos
      }
      
      // Verificar DNS antes de instalar
      if (!skipDNSCheck) {
        const dnsOk = await this.verifyDNS(domain, 3, 2000);
        if (!dnsOk) {
          logger.warn('DNS verification failed, but continuing with SSL installation', { domain });
        }
      }
      
      // Verificar acesso HTTP antes de instalar SSL
      if (!skipHTTPCheck) {
        const httpOk = await this.verifyHTTPAccess(domain, 3, 3000);
        if (!httpOk) {
          logger.warn('HTTP access verification failed, but continuing with SSL installation', { domain });
          logger.warn('Make sure the domain is accessible via HTTP before installing SSL', { domain });
        }
      }
      
      // Verificar se o Nginx está rodando e configurado
      try {
        await execAsync('nginx -t');
        logger.debug('Nginx configuration test passed before SSL installation');
      } catch (error) {
        logger.warn('Nginx configuration test failed before SSL installation', { error: error.message });
        throw new Error(`Nginx configuration is invalid. Please fix before installing SSL: ${error.message}`);
      }
      
      // Install SSL certificate com retry
      logger.info('Installing SSL certificate', { domain, email: emailParam, staging: SSL_STAGING });
      
      let lastError = null;
      for (let attempt = 1; attempt <= SSL_RETRY_ATTEMPTS; attempt++) {
        try {
          const stagingFlag = SSL_STAGING ? '--staging' : '';
          const command = `${CERTBOT_PATH} --nginx -d ${domain} --non-interactive --agree-tos --email ${emailParam} --redirect ${stagingFlag}`.trim();
          
          logger.debug(`SSL installation attempt ${attempt}/${SSL_RETRY_ATTEMPTS}`, { domain, command });
          
          const { stdout, stderr } = await execAsync(command, { timeout: 120000 }); // 2 minutos timeout
          
          // Verificar se o certificado foi realmente criado
          if (existsSync(certPath)) {
            logger.info('SSL certificate installed successfully', { domain, attempt, stdout: stdout.substring(0, 200) });
            
            // Verificar se o certificado é válido
            const expiry = await this.getCertificateExpiry(domain);
            if (!expiry) {
              throw new Error('Certificate was created but could not read expiry date');
            }
            
            // Restart Nginx após instalação bem-sucedida
            try {
              await execAsync(NGINX_RELOAD);
              logger.info('Nginx restarted after SSL installation');
            } catch (restartError) {
              logger.warn('Failed to restart Nginx after SSL installation', { error: restartError.message });
            }
            
            return {
              domain,
              status: 'installed',
              path: certPath,
              expiresAt: expiry,
              message: 'SSL certificate installed successfully',
              attempt
            };
          } else {
            throw new Error('Certificate file was not created after certbot command');
          }
        } catch (error) {
          lastError = error;
          logger.warn(`SSL installation attempt ${attempt} failed`, { 
            domain, 
            error: error.message,
            stderr: error.stderr?.substring(0, 500) 
          });
          
          if (attempt < SSL_RETRY_ATTEMPTS) {
            const delay = SSL_RETRY_DELAY * attempt; // Backoff exponencial
            logger.info(`Retrying SSL installation in ${delay}ms...`, { domain, attempt: attempt + 1 });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Se chegou aqui, todas as tentativas falharam
      throw new Error(`SSL installation failed after ${SSL_RETRY_ATTEMPTS} attempts: ${lastError?.message || 'Unknown error'}`);
      
    } catch (error) {
      logger.error('Failed to install SSL certificate', { 
        domain, 
        error: error.message,
        stderr: error.stderr?.substring(0, 500)
      });
      
      // Fornecer mensagens de erro mais úteis
      let errorMessage = error.message;
      if (error.message.includes('Connection refused') || error.message.includes('timeout')) {
        errorMessage = `Domain ${domain} is not accessible. Please ensure DNS is configured and the domain points to this server.`;
      } else if (error.message.includes('rate limit')) {
        errorMessage = `Rate limit exceeded for ${domain}. Please wait before trying again or use --staging flag for testing.`;
      } else if (error.message.includes('Invalid response')) {
        errorMessage = `Invalid response from ${domain}. Please ensure the domain is accessible via HTTP and Nginx is configured correctly.`;
      }
      
      throw new Error(`SSL installation failed: ${errorMessage}`);
    }
  }
  
  static async renewSSL(domain) {
    try {
      logger.info('Renewing SSL certificate', { domain });
      
      const command = `${CERTBOT_PATH} renew --cert-name ${domain} --quiet`;
      await execAsync(command);
      
      // Restart Nginx
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

