import mysql from 'mysql2/promise';
import logger from '../utils/logger.js';

let pool = null;

export const createConnection = async () => {
  if (pool) {
    return pool;
  }

  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'txuna_sites',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    logger.info('Database connection established');
    return pool;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    throw error;
  }
};

export const getConnection = () => {
  if (!pool) {
    throw new Error('Database connection not initialized. Call createConnection() first.');
  }
  return pool;
};

export const createDatabase = async (dbName) => {
  const connection = await getConnection();
  
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    logger.info('Database created', { dbName });
    return true;
  } catch (error) {
    logger.error('Failed to create database', { dbName, error: error.message });
    throw error;
  }
};

export const dropDatabase = async (dbName) => {
  const connection = await getConnection();
  
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    logger.info('Database dropped', { dbName });
    return true;
  } catch (error) {
    logger.error('Failed to drop database', { dbName, error: error.message });
    throw error;
  }
};

export const createDatabaseUser = async (username, password, database) => {
  const connection = await getConnection();
  
  try {
    // Create user if not exists
    await connection.query(
      `CREATE USER IF NOT EXISTS '${username}'@'%' IDENTIFIED BY '${password}'`
    );
    
    // Grant privileges
    await connection.query(
      `GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${username}'@'%'`
    );
    
    await connection.query('FLUSH PRIVILEGES');
    
    logger.info('Database user created', { username, database });
    return true;
  } catch (error) {
    logger.error('Failed to create database user', { username, error: error.message });
    throw error;
  }
};

export const closeConnection = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection closed');
  }
};

