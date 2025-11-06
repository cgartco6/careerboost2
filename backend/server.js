import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import middleware
import { authenticateToken, authorize, rateLimitByUser, checkMaintenanceMode, sanitizeInput } from './middleware/auth.js';
import { popiaConsent, validateDataRetention, logDataAccess, anonymizeSensitiveData } from './middleware/popia.js';

// Import routes
import authRoutes from './routes/auth.js';
import cvRoutes from './routes/cvProcessing.js';
import jobRoutes from './routes/jobScraping.js';
import paymentRoutes from './routes/payments.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import popiaRoutes from './routes/popia.js';

// Import services
import aiService from './services/aiServices.js';
import scrapingService from './services/scrapingService.js';
import database from './database/connection.js';
import AuditLogger from './security/auditLogger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CareerBoostServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.isProduction = process.env.NODE_ENV === 'production';
    
    this.initializeServices();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  async initializeServices() {
    try {
      // Initialize database connection
      await database.connect();
      console.log('✅ Database connected successfully');

      // Initialize AI service health check
      const aiHealth = await aiService.healthCheck();
      console.log(`✅ AI Service: ${aiHealth.status}`);

      // Initialize scraping service
      const scrapingHealth = await scrapingService.healthCheck();
      console.log(`✅ Scraping Service: ${scrapingHealth.status}`);

      // Schedule periodic tasks
      this.schedulePeriodicTasks();

    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      process.exit(1);
    }
  }

  configureMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "https://api.openai.com"],
          frameSrc: ["'self'"]
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan(this.isProduction ? 'combined' : 'dev'));

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Global rate limiting
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(globalLimiter);

    // Maintenance mode check
    this.app.use(checkMaintenanceMode);

    // POPIA compliance middleware
    this.app.use(validateDataRetention);
    this.app.use(anonymizeSensitiveData);

    // Input sanitization
    this.app.use(sanitizeInput);

    // Static files (for uploaded files)
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Trust proxy for rate limiting and IP detection
    this.app.set('trust proxy', 1);
  }

  configureRoutes() {
    // Health check endpoint (public)
    this.app.get('/api/health', async (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          services: {
            database: await database.checkHealth(),
            ai: await aiService.healthCheck(),
            scraping: await scrapingService.healthCheck()
          },
          uptime: process.uptime(),
          memory: process.memoryUsage()
        };

        res.json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Public routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/popia', popiaRoutes);

    // Protected routes (require authentication)
    this.app.use('/api/cv', authenticateToken, popiaConsent, logDataAccess('cv'), cvRoutes);
    this.app.use('/api/jobs', authenticateToken, popiaConsent, rateLimitByUser(60000, 50), jobRoutes);
    this.app.use('/api/users', authenticateToken, popiaConsent, userRoutes);
    this.app.use('/api/payments', authenticateToken, popiaConsent, paymentRoutes);

    // Admin routes (require admin privileges)
    this.app.use('/api/admin', authenticateToken, authorize(['admin', 'moderator']), adminRoutes);

    // POPIA data subject requests
    this.app.post('/api/data-request', authenticateToken, popiaConsent, (req, res) => {
      const { handleDataSubjectRequest } = require('./middleware/popia.js');
      handleDataSubjectRequest(req, res);
    });

    // Serve frontend in production
    if (this.isProduction) {
      this.app.use(express.static(path.join(__dirname, '../../frontend/dist')));
      
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
      });
    }

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        error: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND'
      });
    });
  }

  configureErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Global error handler:', error);

      // Log error for auditing
      AuditLogger.log('SERVER_ERROR', {
        resource: 'server',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        }
      }).catch(console.error);

      // MongoDB duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          error: 'Resource already exists',
          code: 'DUPLICATE_RESOURCE'
        });
      }

      // MongoDB validation error
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
          code: 'VALIDATION_ERROR'
        });
      }

      // JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Default error response
      const statusCode = error.statusCode || error.status || 500;
      res.status(statusCode).json({
        error: this.isProduction && statusCode === 500 
          ? 'Internal server error' 
          : error.message,
        code: error.code || 'INTERNAL_ERROR',
        ...(this.isProduction ? {} : { stack: error.stack })
      });
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      
      AuditLogger.log('UNHANDLED_REJECTION', {
        resource: 'server',
        reason: reason?.message || reason,
        stack: reason?.stack
      }).catch(console.error);
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      
      AuditLogger.log('UNCAUGHT_EXCEPTION', {
        resource: 'server',
        error: error.message,
        stack: error.stack
      }).catch(console.error);
      
      // In production, you might want to exit and let process manager restart
      if (this.isProduction) {
        process.exit(1);
      }
    });
  }

  schedulePeriodicTasks() {
    // Clean up old audit logs (keep for 1 year)
    setInterval(async () => {
      try {
        const result = await AuditLogger.cleanupOldLogs(1);
        console.log(`Cleaned up ${result.deletedCount} old audit logs`);
      } catch (error) {
        console.error('Error cleaning audit logs:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily

    // Continuous job scraping (every 6 hours)
    setInterval(async () => {
      try {
        if (process.env.ENABLE_CONTINUOUS_SCRAPING === 'true') {
          console.log('Starting continuous job scraping...');
          const result = await scrapingService.continuousScraping();
          console.log(`Continuous scraping completed: ${result.totalJobs} jobs found`);
        }
      } catch (error) {
        console.error('Continuous scraping error:', error);
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    // AI service health monitoring (every 5 minutes)
    setInterval(async () => {
      try {
        const health = await aiService.healthCheck();
        if (health.status !== 'healthy') {
          console.warn('AI service health check failed:', health.error);
        }
      } catch (error) {
        console.error('AI health check error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async start() {
    try {
      // Start server
      this.server = this.app.listen(this.port, () => {
        console.log(`
🚀 CareerBoost Server Started!
📍 Port: ${this.port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}
🤖 AI Service: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}
🕒 Time: ${new Date().toISOString()}
        `);

        // Log server start
        AuditLogger.log('SERVER_STARTED', {
          resource: 'server',
          metadata: {
            port: this.port,
            environment: process.env.NODE_ENV,
            version: process.env.npm_package_version
          }
        }).catch(console.error);
      });

      // Graceful shutdown handler
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📭 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop accepting new requests
        this.server.close(() => {
          console.log('✅ HTTP server closed');
        });

        // Close database connection
        await database.gracefulShutdown();
        console.log('✅ Database connection closed');

        // Close scraping service
        await scrapingService.close();
        console.log('✅ Scraping service closed');

        // Log shutdown
        await AuditLogger.log('SERVER_SHUTDOWN', {
          resource: 'server',
          metadata: {
            signal: signal,
            timestamp: new Date().toISOString()
          }
        });

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }

  // Method for testing
  getApp() {
    return this.app;
  }
}

// Create and start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new CareerBoostServer();
  server.start();
}

export default CareerBoostServer;
