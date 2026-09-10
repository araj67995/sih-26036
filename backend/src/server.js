const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
const startServer = async () => {
  try {
    // Attempt database connection
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(` Legal Metrology Verification System API (SIH 26036)`);
      console.log(` Server running in [${process.env.NODE_ENV || 'development'}] mode on port ${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log('====================================================');
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error('[Unhandled Rejection Error]:', err.message);
    });

    // Handle Uncaught Exceptions
    process.on('uncaughtException', (err) => {
      console.error('[Uncaught Exception]:', err.message);
      process.exit(1);
    });

    // Graceful shutdown on SIGTERM / SIGINT
    const shutdown = () => {
      console.log('\nReceived kill signal, shutting down gracefully...');
      server.close(() => {
        console.log('Closed out remaining connections.');
        process.exit(0);
      });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Fatal Server Initialization Error:', error);
    process.exit(1);
  }
};

startServer();
