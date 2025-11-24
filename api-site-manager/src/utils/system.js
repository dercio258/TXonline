import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync } from 'fs';
import logger from './logger.js';

const execAsync = promisify(exec);

// Cache para versão do PHP detectada
let phpVersionCache = null;

/**
 * Detecta a versão do PHP instalada no sistema
 * Verifica /var/run/php/ para encontrar o socket do PHP-FPM
 * @returns {Promise<string>} Versão do PHP (ex: "8.3" ou "8.1")
 */
export async function detectPHPVersion() {
  // Se já foi detectado, retorna do cache
  if (phpVersionCache) {
    return phpVersionCache;
  }

  try {
    // Método 1: Verificar sockets PHP-FPM em /var/run/php/
    const phpRunDir = '/var/run/php';
    if (existsSync(phpRunDir)) {
      const files = readdirSync(phpRunDir);
      // Procurar por arquivos como php8.3-fpm.sock, php8.1-fpm.sock, etc
      const phpSockPattern = /^php(\d+\.\d+)-fpm\.sock$/;
      
      for (const file of files) {
        const match = file.match(phpSockPattern);
        if (match) {
          const version = match[1];
          logger.info('PHP version detected from socket', { version, socket: file });
          phpVersionCache = version;
          return version;
        }
      }
    }

    // Método 2: Executar php -v e extrair versão
    try {
      const { stdout } = await execAsync('php -v');
      // Exemplo: "PHP 8.3.0 (cli)" -> extrair "8.3"
      const versionMatch = stdout.match(/PHP (\d+\.\d+)/);
      if (versionMatch) {
        const version = versionMatch[1];
        logger.info('PHP version detected from php -v', { version });
        phpVersionCache = version;
        return version;
      }
    } catch (error) {
      logger.debug('Failed to detect PHP version via php -v', { error: error.message });
    }

    // Método 3: Verificar variável de ambiente
    if (process.env.PHP_VERSION) {
      logger.info('PHP version from environment variable', { version: process.env.PHP_VERSION });
      phpVersionCache = process.env.PHP_VERSION;
      return process.env.PHP_VERSION;
    }

    // Fallback: usar 8.3 como padrão (mais recente comum)
    logger.warn('Could not detect PHP version, using default 8.3');
    phpVersionCache = '8.3';
    return '8.3';
  } catch (error) {
    logger.error('Error detecting PHP version', { error: error.message });
    // Fallback seguro
    phpVersionCache = '8.3';
    return '8.3';
  }
}

/**
 * Obtém o caminho do socket PHP-FPM baseado na versão detectada
 * @returns {Promise<string>} Caminho do socket (ex: "/var/run/php/php8.3-fpm.sock")
 */
export async function getPHPFPMSocket() {
  const version = await detectPHPVersion();
  return `/var/run/php/php${version}-fpm.sock`;
}

/**
 * Verifica se um diretório existe e é acessível
 * @param {string} path - Caminho do diretório
 * @returns {Promise<boolean>} True se existe e é acessível
 */
export async function verifyDirectoryExists(path) {
  try {
    const { existsSync, readdirSync, statSync } = await import('fs');
    if (!existsSync(path)) {
      return false;
    }
    
    // Verificar se é um diretório
    const stats = statSync(path);
    if (!stats.isDirectory()) {
      return false;
    }
    
    // Tentar ler o diretório para verificar permissões
    readdirSync(path);
    return true;
  } catch (error) {
    logger.error('Directory verification failed', { path, error: error.message });
    return false;
  }
}

/**
 * Define permissões de um diretório/arquivo de forma robusta
 * Tenta múltiplos métodos até um funcionar
 * @param {string} path - Caminho do arquivo/diretório
 * @param {string} owner - Dono (ex: "www-data", "nginx", ou "33:33")
 * @param {string} permissions - Permissões (ex: "755", "644")
 * @returns {Promise<boolean>} True se conseguiu definir permissões
 */
export async function setPermissions(path, owner = 'www-data', permissions = '755') {
  const execAsync = promisify(exec);
  
  // Lista de métodos para tentar
  const methods = [
    // Método 1: www-data
    async () => {
      await execAsync(`chown -R www-data:www-data "${path}"`);
      await execAsync(`chmod -R ${permissions} "${path}"`);
      return 'www-data';
    },
    // Método 2: nginx
    async () => {
      await execAsync(`chown -R nginx:nginx "${path}"`);
      await execAsync(`chmod -R ${permissions} "${path}"`);
      return 'nginx';
    },
    // Método 3: UID 33 (www-data em alguns sistemas)
    async () => {
      await execAsync(`chown -R 33:33 "${path}"`);
      await execAsync(`chmod -R ${permissions} "${path}"`);
      return 'uid33';
    },
    // Método 4: Tentar com o owner especificado
    async () => {
      await execAsync(`chown -R ${owner} "${path}"`);
      await execAsync(`chmod -R ${permissions} "${path}"`);
      return owner;
    }
  ];

  for (const method of methods) {
    try {
      const methodName = await method();
      logger.info('Permissions set successfully', { path, method: methodName, permissions });
      return true;
    } catch (error) {
      logger.debug(`Permission method failed: ${error.message}`);
      continue;
    }
  }

  logger.error('All permission methods failed', { path });
  return false;
}

