const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/legal_metrology_db';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[MongoDB] Connection lost. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('[MongoDB] Reconnected successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Runtime connection error: ${err.message}`);
    });

    return conn;
  } catch (error) {
    isConnected = false;
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    console.warn('[MongoDB] Note: Please ensure MongoDB service is running or provide a valid MONGO_URI in .env');
    // In dev mode, we allow the server to remain alive so frontend/health API can report DB status
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

const getDbStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const stateCode = mongoose.connection.readyState;
  return {
    state: states[stateCode] || 'unknown',
    isConnected: stateCode === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

module.exports = { connectDB, getDbStatus };
