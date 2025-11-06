import mongoose from 'mongoose';
import { SecurityManager } from '../security/encryption.js';

class Database {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    if (this.isConnected) {
      return this.connection;
    }

    try {
      const MONGODB_URI = process.env.MONGODB_URI;
      
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in environment variables');
      }

      // Enhanced connection options for security and performance
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        w: 'majority'
      };

      console.log('Connecting to MongoDB...');
      
      this.connection = await mongoose.connect(MONGODB_URI, options);
      this.isConnected = true;

      console.log('MongoDB connected successfully');

      // Set up connection event handlers
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        this.isConnected = true;
      });

      // Handle application termination
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      process.on('SIGTERM', this.gracefulShutdown.bind(this));

      return this.connection;

    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async gracefulShutdown() {
    console.log('Received shutdown signal, closing MongoDB connection...');
    
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error during MongoDB shutdown:', error);
      process.exit(1);
    }
  }

  async checkHealth() {
    try {
      // Simple ping to check database responsiveness
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        database: 'MongoDB',
        connected: this.isConnected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'MongoDB',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Method to get database statistics
  async getStats() {
    try {
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();
      const dbStats = await mongoose.connection.db.stats();

      return {
        connections: serverStatus.connections,
        memory: serverStatus.mem,
        network: serverStatus.network,
        operations: serverStatus.opcounters,
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexSize: dbStats.indexSize
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }
}

// Create and export singleton instance
const database = new Database();
export default database;
