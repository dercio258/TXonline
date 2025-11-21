import { MonitoringService } from '../services/monitoring.service.js';

export const getStorageUsage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usage = await MonitoringService.getStorageUsage(id);
    
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    next(error);
  }
};

export const getRAMUsage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usage = await MonitoringService.getRAMUsage(id);
    
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    next(error);
  }
};

export const getSiteStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await MonitoringService.getSiteStats(id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getAllMonitoring = async (req, res, next) => {
  try {
    const monitoring = await MonitoringService.getAllMonitoring();
    
    res.json({
      success: true,
      data: monitoring
    });
  } catch (error) {
    next(error);
  }
};
