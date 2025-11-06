import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { SecurityManager } from '../security/encryption.js';
import AuditLogger from '../security/auditLogger.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      await AuditLogger.logSecurityEvent('MISSING_TOKEN', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      await AuditLogger.logSecurityEvent('INVALID_TOKEN_USER', {
        ip: req.ip,
        userId: decoded.userId,
        path: req.path
      });
      return res.status(401).json({ 
        error: 'Invalid token - user not found',
        code: 'INVALID_TOKEN'
      });
    }

    if (!user.isActive) {
      await AuditLogger.logSecurityEvent('INACTIVE_USER_ACCESS', {
        ip: req.ip,
        userId: user._id,
        email: user.email,
        path: req.path
      });
      return res.status(401).json({ 
        error: 'Account deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Update last login if it's been more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!user.lastLogin || user.lastLogin < oneHourAgo) {
      user.lastLogin = new Date();
      await user.save();
    }

    req.user = user;
    
    await AuditLogger.log('USER_ACCESS', {
      resource: 'api',
      resourceId: req.path,
      userId: user._id,
      userEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    await AuditLogger.logSecurityEvent('AUTH_ERROR', {
      ip: req.ip,
      error: error.message,
      path: req.path
    });

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

    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      AuditLogger.logSecurityEvent('UNAUTHORIZED_ACCESS', {
        userId: req.user._id,
        userEmail: req.user.email,
        attemptedRole: roles,
        userRole: req.user.role,
        ip: req.ip,
        path: req.path
      });
      
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

export const requireService = (serviceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      const hasActiveService = req.user.hasActiveService();
      if (!hasActiveService) {
        return res.status(402).json({ 
          error: 'Active service subscription required',
          code: 'SERVICE_REQUIRED'
        });
      }

      if (serviceType) {
        const activeService = req.user.getActiveService();
        if (activeService.type !== serviceType && activeService.type !== 'premium') {
          return res.status(402).json({ 
            error: `${serviceType} service required`,
            code: 'UPGRADE_REQUIRED'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Service requirement check error:', error);
      res.status(500).json({ 
        error: 'Service check failed',
        code: 'SERVICE_CHECK_FAILED'
      });
    }
  };
};

export const rateLimitByUser = (windowMs = 900000, maxRequests = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    
    // Remove old requests outside the current window
    while (userRequests.length > 0 && userRequests[0] < windowStart) {
      userRequests.shift();
    }

    if (userRequests.length >= maxRequests) {
      AuditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        userId: req.user._id,
        userEmail: req.user.email,
        ip: req.ip,
        path: req.path,
        requests: userRequests.length,
        limit: maxRequests
      });

      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000),
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    userRequests.push(now);
    requests.set(userId, userRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      for (const [key, timestamps] of requests.entries()) {
        const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
        if (validTimestamps.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, validTimestamps);
        }
      }
    }

    next();
  };
};

export const validateOwnership = (resourceModel, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const userId = req.user._id;

      const resource = await resourceModel.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ 
          error: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Check if resource belongs to user or user is admin
      if (resource.userId && resource.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
        await AuditLogger.logSecurityEvent('OWNERSHIP_VIOLATION', {
          userId: req.user._id,
          userEmail: req.user.email,
          resourceId: resourceId,
          resourceType: resourceModel.modelName,
          ip: req.ip,
          path: req.path
        });

        return res.status(403).json({ 
          error: 'Access to this resource is denied',
          code: 'ACCESS_DENIED'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership validation error:', error);
      res.status(500).json({ 
        error: 'Ownership validation failed',
        code: 'VALIDATION_FAILED'
      });
    }
  };
};

export const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = SecurityManager.sanitizeInput(req.body[key]);
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = SecurityManager.sanitizeInput(req.query[key]);
      }
    });
  }

  // Sanitize URL parameters
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = SecurityManager.sanitizeInput(req.params[key]);
      }
    });
  }

  next();
};

export const checkMaintenanceMode = (req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true' && req.path !== '/api/health') {
    return res.status(503).json({
      error: 'Service temporarily unavailable for maintenance',
      estimatedRestoration: process.env.MAINTENANCE_UNTIL,
      code: 'MAINTENANCE_MODE'
    });
  }
  next();
};
