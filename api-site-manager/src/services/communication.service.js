import { getConnection } from '../config/database.js';
import logger from '../utils/logger.js';

export class CommunicationService {
  static async saveMessage(siteId, messageData) {
    const connection = await getConnection();
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    try {
      await connection.query(
        `INSERT INTO site_messages (id, site_id, message, type, metadata, ip, user_agent, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          siteId,
          messageData.message,
          messageData.type,
          JSON.stringify(messageData.metadata),
          messageData.ip,
          messageData.userAgent
        ]
      );
      
      return {
        id,
        siteId,
        message: messageData.message,
        type: messageData.type,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to save message', { error: error.message, siteId });
      throw error;
    }
  }
  
  static async getMessages(siteId, options = {}) {
    const connection = await getConnection();
    const { limit = 50, offset = 0, type } = options;
    
    try {
      let query = 'SELECT * FROM site_messages WHERE site_id = ?';
      const params = [siteId];
      
      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const [rows] = await connection.query(query, params);
      
      return rows.map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));
    } catch (error) {
      logger.error('Failed to get messages', { error: error.message, siteId });
      return [];
    }
  }
  
  static async getCommunicationStats(siteId) {
    const connection = await getConnection();
    
    try {
      const [total] = await connection.query(
        'SELECT COUNT(*) as total FROM site_messages WHERE site_id = ?',
        [siteId]
      );
      
      const [byType] = await connection.query(
        'SELECT type, COUNT(*) as count FROM site_messages WHERE site_id = ? GROUP BY type',
        [siteId]
      );
      
      const [recent] = await connection.query(
        'SELECT * FROM site_messages WHERE site_id = ? ORDER BY created_at DESC LIMIT 10',
        [siteId]
      );
      
      return {
        total: total[0]?.total || 0,
        byType: byType.reduce((acc, row) => {
          acc[row.type] = row.count;
          return acc;
        }, {}),
        recent: recent.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        }))
      };
    } catch (error) {
      logger.error('Failed to get communication stats', { error: error.message, siteId });
      return {
        total: 0,
        byType: {},
        recent: []
      };
    }
  }
}

