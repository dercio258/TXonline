import express from 'express';
import { apiKeyAuth } from '../middleware/auth.js';
import siteRoutes from './site.routes.js';
import wordpressRoutes from './wordpress.routes.js';
import fileRoutes from './file.routes.js';
import monitoringRoutes from './monitoring.routes.js';
import ftpRoutes from './ftp.routes.js';
import subdomainRoutes from './subdomain.routes.js';
import communicationRoutes from './communication.routes.js';
import sslRoutes from './ssl.routes.js';

const router = express.Router();

// Apply API key authentication to all routes
router.use(apiKeyAuth);

// Route modules
router.use('/sites', siteRoutes);
router.use('/sites', wordpressRoutes);
router.use('/sites', fileRoutes);
router.use('/sites', monitoringRoutes);
router.use('/sites', ftpRoutes);
router.use('/sites', communicationRoutes);
router.use('/subdomains', subdomainRoutes);
router.use('/ssl', sslRoutes);

export default router;

