import Docker from 'dockerode';
import logger from '../utils/logger.js';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export class DockerService {
  static async createWordPressContainer(siteData) {
    const { subdomain, siteId, dbName, dbUser, dbPassword, storageLimit } = siteData;
    const containerName = `wp-${subdomain}`;
    const volumeName = `wp-${subdomain}-data`;
    
    try {
      // Create volume for WordPress files
      const volume = await docker.createVolume({
        Name: volumeName,
        Labels: {
          'txuna.site_id': siteId,
          'txuna.subdomain': subdomain
        }
      });
      
      logger.info('Volume created', { volumeName });
      
      // Calculate memory limit (default 512MB, can be configured)
      const memoryLimit = (storageLimit || 1073741824) / 2; // Half of storage limit, max 512MB
      const memoryBytes = Math.min(memoryLimit, 536870912); // Max 512MB
      
      // Create container
      const container = await docker.createContainer({
        Image: 'wordpress:latest',
        name: containerName,
        Env: [
          `WORDPRESS_DB_HOST=mysql`,
          `WORDPRESS_DB_NAME=${dbName}`,
          `WORDPRESS_DB_USER=${dbUser}`,
          `WORDPRESS_DB_PASSWORD=${dbPassword}`,
          `WORDPRESS_TABLE_PREFIX=wp_`,
          `WORDPRESS_DEBUG=0`
        ],
        HostConfig: {
          Binds: [
            `${volumeName}:/var/www/html`
          ],
          Memory: memoryBytes,
          MemorySwap: memoryBytes * 2,
          CpuShares: 512, // 50% of one CPU
          RestartPolicy: { Name: 'unless-stopped' },
          NetworkMode: 'txuna-network'
        },
        Labels: {
          'txuna.site_id': siteId,
          'txuna.subdomain': subdomain,
          'txuna.type': 'wordpress'
        }
      });
      
      // Start container
      await container.start();
      
      logger.info('WordPress container created and started', { 
        containerName, 
        siteId,
        memoryLimit: `${(memoryBytes / 1024 / 1024).toFixed(0)}MB`
      });
      
      return {
        containerId: container.id,
        containerName,
        volumeName,
        status: 'running'
      };
    } catch (error) {
      logger.error('Failed to create WordPress container', { 
        error: error.message, 
        subdomain 
      });
      throw error;
    }
  }
  
  static async getContainerStats(containerName) {
    try {
      const container = docker.getContainer(containerName);
      const stats = await container.stats({ stream: false });
      
      // Calculate memory usage
      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 0;
      const memoryPercent = memoryLimit > 0 
        ? ((memoryUsage / memoryLimit) * 100).toFixed(2) 
        : 0;
      
      // Calculate CPU usage
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
        (stats.precpu_stats?.cpu_usage?.total_usage || 0);
      const systemDelta = stats.cpu_stats.system_cpu_usage - 
        (stats.precpu_stats?.system_cpu_usage || 0);
      const cpuPercent = systemDelta > 0 
        ? ((cpuDelta / systemDelta) * 100).toFixed(2) 
        : 0;
      
      return {
        memory: {
          used: memoryUsage,
          usedMB: (memoryUsage / 1024 / 1024).toFixed(2),
          limit: memoryLimit,
          limitMB: (memoryLimit / 1024 / 1024).toFixed(2),
          percent: memoryPercent
        },
        cpu: {
          percent: cpuPercent
        },
        network: stats.networks || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get container stats', { error: error.message, containerName });
      return null;
    }
  }
  
  static async stopContainer(containerName) {
    try {
      const container = docker.getContainer(containerName);
      await container.stop();
      logger.info('Container stopped', { containerName });
      return true;
    } catch (error) {
      logger.error('Failed to stop container', { error: error.message, containerName });
      throw error;
    }
  }
  
  static async removeContainer(containerName) {
    try {
      const container = docker.getContainer(containerName);
      await container.stop();
      await container.remove();
      logger.info('Container removed', { containerName });
      return true;
    } catch (error) {
      logger.error('Failed to remove container', { error: error.message, containerName });
      throw error;
    }
  }
  
  static async removeVolume(volumeName) {
    try {
      const volume = docker.getVolume(volumeName);
      await volume.remove();
      logger.info('Volume removed', { volumeName });
      return true;
    } catch (error) {
      logger.error('Failed to remove volume', { error: error.message, volumeName });
      throw error;
    }
  }
  
  static async listContainers() {
    try {
      const containers = await docker.listContainers({ 
        all: true,
        filters: { label: ['txuna.type=wordpress'] }
      });
      return containers;
    } catch (error) {
      logger.error('Failed to list containers', { error: error.message });
      return [];
    }
  }
}

