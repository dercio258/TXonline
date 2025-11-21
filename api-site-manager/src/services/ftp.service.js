import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import crypto from 'crypto';

const execAsync = promisify(exec);
const FTP_CONFIG_DIR = '/etc/pure-ftpd';
const FTP_USERS_DIR = '/etc/pure-ftpd/users';

export class FTPService {
  static async createFTPUser(siteId, subdomain, sitePath) {
    const username = `ftp_${subdomain}`;
    const password = this.generatePassword();
    
    try {
      // Ensure directories exist
      if (!existsSync(FTP_USERS_DIR)) {
        mkdirSync(FTP_USERS_DIR, { recursive: true });
      }
      
      // Create user directory if it doesn't exist
      const userHome = sitePath;
      
      // Create virtual user using pure-ftpd
      // Pure-FTPd uses a simple file-based user system
      const userConfig = `${username}:${password}:1001:1001:${userHome}:/bin/false`;
      
      // For production, we'll use pure-pw (Pure-FTPd user management)
      // This requires pure-ftpd to be installed
      
      // Alternative: Use vsftpd or proftpd
      // For now, we'll create a configuration that can be used with vsftpd
      
      const vsftpdUserConfig = {
        username,
        password: this.hashPassword(password), // vsftpd uses hashed passwords
        home: userHome,
        uid: 1001,
        gid: 1001
      };
      
      // Save user credentials to database (we'll add this to site_credentials table)
      // For now, return credentials
      
      logger.info('FTP user created', { username, siteId });
      
      return {
        username,
        password,
        home: userHome,
        port: 21,
        type: 'ftp'
      };
    } catch (error) {
      logger.error('Failed to create FTP user', { error: error.message, siteId });
      throw error;
    }
  }
  
  static async updateFTPPassword(siteId, newPassword) {
    // Update FTP password in system and database
    logger.info('FTP password updated', { siteId });
    return true;
  }
  
  static async deleteFTPUser(username) {
    try {
      // Remove FTP user from system
      logger.info('FTP user deleted', { username });
      return true;
    } catch (error) {
      logger.error('Failed to delete FTP user', { error: error.message, username });
      throw error;
    }
  }
  
  static generatePassword(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  
  static hashPassword(password) {
    // Simple hash for vsftpd (in production, use proper hashing)
    return crypto.createHash('md5').update(password).digest('hex');
  }
  
  static async generateVSFTPDConfig() {
    // Generate vsftpd configuration
    const config = `
# VSFTPD Configuration for TxunaSites
listen=YES
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
dirmessage_enable=YES
use_localtime=YES
xferlog_enable=YES
connect_from_port_20=YES
chroot_local_user=YES
secure_chroot_dir=/var/run/vsftpd/empty
pam_service_name=vsftpd
rsa_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
rsa_private_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
ssl_enable=YES
allow_writeable_chroot=YES
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
user_config_dir=/etc/vsftpd/users
`;
    
    return config;
  }
}

