import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true,
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userEmail: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  method: String,
  url: String,
  requestBody: mongoose.Schema.Types.Mixed,
  responseStatus: Number,
  responseBody: mongoose.Schema.Types.Mixed,
  error: {
    message: String,
    stack: String,
    code: String
  },
  metadata: mongoose.Schema.Types.Mixed,
  duration: Number, // Request duration in ms
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for common query patterns
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export class AuditLogger {
  static async log(action, options = {}) {
    try {
      const logEntry = new AuditLog({
        action,
        resource: options.resource,
        resourceId: options.resourceId,
        userId: options.userId,
        userEmail: options.userEmail,
        ipAddress: options.ipAddress || 'unknown',
        userAgent: options.userAgent,
        method: options.method,
        url: options.url,
        requestBody: this.sanitizeRequestBody(options.requestBody),
        responseStatus: options.responseStatus,
        responseBody: this.sanitizeResponseBody(options.responseBody),
        error: options.error ? {
          message: options.error.message,
          stack: options.error.stack,
          code: options.error.code
        } : undefined,
        metadata: options.metadata,
        duration: options.duration,
        timestamp: options.timestamp || new Date()
      });

      await logEntry.save();
      
      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] ${action}:`, {
          user: options.userEmail,
          resource: options.resource,
          ip: options.ipAddress
        });
      }
      
      return logEntry;
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  static sanitizeRequestBody(body) {
    if (!body) return body;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'creditCard',
      'cvv',
      'apiKey',
      'secret',
      'authorization'
    ];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });
    
    return sanitized;
  }

  static sanitizeResponseBody(body) {
    if (!body) return body;
    
    // For responses, we might want to log only metadata, not entire response
    if (typeof body === 'object') {
      const sanitized = {};
      
      // Only include non-sensitive top-level fields
      const safeFields = ['success', 'message', 'id', 'count', 'status'];
      safeFields.forEach(field => {
        if (body[field] !== undefined) {
          sanitized[field] = body[field];
        }
      });
      
      return sanitized;
    }
    
    return '***RESPONSE_BODY***';
  }

  // Convenience methods for common actions
  static async logLogin(user, ipAddress, userAgent, success = true, error = null) {
    return this.log(success ? 'USER_LOGIN_SUCCESS' : 'USER_LOGIN_FAILED', {
      resource: 'user',
      resourceId: user?._id?.toString(),
      userId: user?._id,
      userEmail: user?.email,
      ipAddress,
      userAgent,
      metadata: { success },
      error: success ? null : error
    });
  }

  static async logLogout(user, ipAddress, userAgent) {
    return this.log('USER_LOGOUT', {
      resource: 'user',
      resourceId: user?._id?.toString(),
      userId: user?._id,
      userEmail: user?.email,
      ipAddress,
      userAgent
    });
  }

  static async logCvUpload(user, fileInfo, ipAddress) {
    return this.log('CV_UPLOAD', {
      resource: 'cv',
      userId: user?._id,
      userEmail: user?.email,
      ipAddress,
      metadata: {
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        mimeType: fileInfo.mimeType
      }
    });
  }

  static async logPayment(user, payment, ipAddress) {
    return this.log('PAYMENT_PROCESSED', {
      resource: 'payment',
      resourceId: payment._id?.toString(),
      userId: user?._id,
      userEmail: user?.email,
      ipAddress,
      metadata: {
        amount: payment.amount,
        currency: payment.currency,
        method: payment.paymentMethod,
        status: payment.status
      }
    });
  }

  static async logJobApplication(user, job, ipAddress) {
    return this.log('JOB_APPLICATION', {
      resource: 'job',
      resourceId: job._id?.toString(),
      userId: user?._id,
      userEmail: user?.email,
      ipAddress,
      metadata: {
        jobTitle: job.title,
        company: job.company,
        location: job.location
      }
    });
  }

  static async logAdminAction(adminUser, action, resource, resourceId, ipAddress) {
    return this.log(`ADMIN_${action.toUpperCase()}`, {
      resource,
      resourceId,
      userId: adminUser?._id,
      userEmail: adminUser?.email,
      ipAddress,
      metadata: {
        adminAction: true,
        action,
        resourceType: resource
      }
    });
  }

  static async logSecurityEvent(event, details, ipAddress = null) {
    return this.log(`SECURITY_${event.toUpperCase()}`, {
      resource: 'security',
      ipAddress,
      metadata: {
        securityEvent: true,
        ...details
      }
    });
  }

  // Query methods for retrieving logs
  static async getLogs(query = {}, options = {}) {
    const {
      page = 1,
      limit = 50,
      sort = { timestamp: -1 }
    } = options;

    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getLogsByUser(userId, options = {}) {
    return this.getLogs({ userId }, options);
  }

  static async getLogsByAction(action, options = {}) {
    return this.getLogs({ action }, options);
  }

  static async getLogsByDateRange(startDate, endDate, options = {}) {
    return this.getLogs({
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    }, options);
  }

  // Analytics methods
  static async getActionStats(startDate, endDate) {
    return AuditLog.aggregate([
      {
        $match: {
          timestamp: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          action: '$_id',
          count: 1,
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  }

  static async getSecurityEvents(startDate, endDate) {
    return this.getLogs({
      action: { $regex: /^SECURITY_/ },
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    });
  }

  // Cleanup old logs (retain for 2 years for POPIA compliance)
  static async cleanupOldLogs(retentionYears = 2) {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    return {
      deletedCount: result.deletedCount,
      cutoffDate
    };
  }
}

export default AuditLogger;
