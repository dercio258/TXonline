import { getConnection } from '../config/database.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

export class SiteModel {
  static async create(siteData) {
    const connection = await getConnection();
    const id = crypto.randomUUID();
    
    const [result] = await connection.query(
      `INSERT INTO sites (id, subdomain, type, path, storage_limit, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        siteData.subdomain,
        siteData.type || 'static',
        siteData.path,
        siteData.storageLimit || 1073741824, // 1GB default
        'active'
      ]
    );
    
    return await this.findById(id);
  }
  
  static async findById(id) {
    const connection = await getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM sites WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }
  
  static async findBySubdomain(subdomain) {
    const connection = await getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM sites WHERE subdomain = ?',
      [subdomain]
    );
    return rows[0] || null;
  }
  
  static async findAll() {
    const connection = await getConnection();
    const [rows] = await connection.query('SELECT * FROM sites WHERE status != ? ORDER BY created_at DESC', ['deleted']);
    return rows;
  }
  
  static async update(id, updateData) {
    const connection = await getConnection();
    
    const allowedFields = ['storage_limit', 'status', 'storage_used'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) {
      return await this.findById(id);
    }
    
    values.push(id);
    await connection.query(
      `UPDATE sites SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    
    return await this.findById(id);
  }
  
  static async delete(id) {
    const connection = await getConnection();
    await connection.query(
      'UPDATE sites SET status = ? WHERE id = ?',
      ['deleted', id]
    );
    return true;
  }
  
  static async updateStorageUsage(id, used) {
    const connection = await getConnection();
    await connection.query(
      'UPDATE sites SET storage_used = ? WHERE id = ?',
      [used, id]
    );
    return true;
  }
}

