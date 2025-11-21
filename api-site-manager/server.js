import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createLogger } from './src/utils/logger.js';
import { createConnection } from './src/config/database.js';
import apiRoutes from './src/routes/api.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const logger = createLogger();
const PORT = process.env.PORT || 3000;

// Initialize database connection
let dbInitialized = false;
const initializeDatabase = async () => {
  try {
    await createConnection();
    dbInitialized = true;
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database', { error: error.message });
    // Don't exit, but log the error - database might not be available yet
  }
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'TxunaSites API Manager'
  });
});

// API Routes
app.use('/api', apiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error Handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  // Initialize database
  await initializeDatabase();
  
  app.listen(PORT, () => {
    logger.info(`🚀 TxunaSites API Manager running on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    
    if (!dbInitialized) {
      logger.warn('⚠️  Database not initialized - some features may not work');
    }
  });
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  const { closeConnection } = await import('./src/config/database.js');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  const { closeConnection } = await import('./src/config/database.js');
  await closeConnection();
  process.exit(0);
});

startServer().catch(error => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});

export default app;

