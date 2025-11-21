import { createDatabase, createDatabaseUser, dropDatabase } from '../config/database.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

export class DatabaseService {
  static async createWordPressDatabase(subdomain) {
    const dbName = `wp_${subdomain}`;
    const dbUser = `wp_${subdomain}`;
    const dbPassword = this.generatePassword();
    
    try {
      // Create database
      await createDatabase(dbName);
      
      // Create dedicated user for this WordPress installation
      await createDatabaseUser(dbUser, dbPassword, dbName);
      
      logger.info('WordPress database created', { dbName, dbUser });
      
      return {
        dbName,
        dbUser,
        dbPassword,
        dbHost: process.env.DB_HOST || 'mysql',
        dbPort: parseInt(process.env.DB_PORT || '3306')
      };
    } catch (error) {
      logger.error('Failed to create WordPress database', { 
        error: error.message, 
        subdomain 
      });
      throw error;
    }
  }
  
  static async dropWordPressDatabase(subdomain) {
    const dbName = `wp_${subdomain}`;
    
    try {
      await dropDatabase(dbName);
      logger.info('WordPress database dropped', { dbName });
      return true;
    } catch (error) {
      logger.error('Failed to drop WordPress database', { 
        error: error.message, 
        subdomain 
      });
      throw error;
    }
  }
  
  static async getDatabaseSize(dbName) {
    const { getConnection } = await import('../config/database.js');
    const connection = await getConnection();
    
    try {
      const [rows] = await connection.query(
        `SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
        FROM information_schema.tables 
        WHERE table_schema = ?`,
        [dbName]
      );
      
      return {
        dbName,
        sizeMB: rows[0]?.size_mb || 0,
        sizeBytes: (rows[0]?.size_mb || 0) * 1024 * 1024
      };
    } catch (error) {
      logger.error('Failed to get database size', { error: error.message, dbName });
      return { dbName, sizeMB: 0, sizeBytes: 0 };
    }
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

