const { getDbStatus } = require('../config/db');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc   Check API server and database health status
 * @route  GET /api/health
 * @access Public
 */
const getHealthStatus = async (req, res) => {
  const dbStatus = getDbStatus();

  const healthData = {
    status: 'UP',
    system: 'Online Verification System for Weighing and Measuring Instruments',
    problemStatement: 'SIH 26036 - Legal Metrology',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus.state,
      connected: dbStatus.isConnected,
      host: dbStatus.host,
      databaseName: dbStatus.name,
    },
    nodeVersion: process.version,
    memoryUsage: {
      rssMB: (process.memoryUsage().rss / (1024 * 1024)).toFixed(2),
      heapUsedMB: (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2),
    },
  };

  return ApiResponse.success(res, healthData, 'System health operational', 200);
};

module.exports = { getHealthStatus };
