import User from '../models/User.js';
import AuditLogger from '../security/auditLogger.js';

export const popiaConsent = async (req, res, next) => {
  try {
    // Skip for public routes
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/health'];
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    // If user is authenticated, check POPIA consent
    if (req.user) {
      const user = await User.findById(req.user._id);
      
      if (!user.popiaConsent || !user.popiaConsent.accepted) {
        await AuditLogger.logSecurityEvent('POPIA_CONSENT_MISSING', {
          userId: user._id,
          userEmail: user.email,
          ip: req.ip,
          path: req.path
        });

        return res.status(403).json({
          error: 'POPIA consent required',
          code: 'POPIA_CONSENT_REQUIRED',
          consentUrl: '/api/popia/consent'
        });
      }

      // Check if consent version is current
      const currentVersion = '1.0';
      if (user.popiaConsent.version !== currentVersion) {
        return res.status(403).json({
          error: 'Updated POPIA consent required',
          code: 'POPIA_CONSENT_OUTDATED',
          consentUrl: '/api/popia/consent'
        });
      }
    }

    next();
  } catch (error) {
    console.error('POPIA consent check error:', error);
    res.status(500).json({ 
      error: 'POPIA compliance check failed',
      code: 'POPIA_CHECK_FAILED'
    });
  }
};

export const validateDataRetention = (req, res, next) => {
  // POPIA requires data retention policies
  // This middleware ensures we don't keep data longer than necessary
  const retentionPeriods = {
    userData: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
    auditLogs: 1 * 365 * 24 * 60 * 60 * 1000, // 1 year
    jobListings: 90 * 24 * 60 * 60 * 1000, // 90 days
    temporaryFiles: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  req.dataRetention = retentionPeriods;
  next();
};

export const logDataAccess = (resourceType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log data access for POPIA compliance
      if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
        AuditLogger.log('DATA_ACCESS', {
          resource: resourceType,
          resourceId: req.params.id || req.query.id,
          userId: req.user._id,
          userEmail: req.user.email,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          url: req.originalUrl,
          metadata: {
            dataSize: JSON.stringify(data).length,
            timestamp: new Date().toISOString()
          }
        }).catch(console.error);
      }

      originalSend.call(this, data);
    };

    next();
  };
};

export const anonymizeSensitiveData = (req, res, next) => {
  // POPIA requires anonymization of sensitive data in certain contexts
  const sensitiveFields = [
    'password',
    'token',
    'creditCard',
    'cvv',
    'idNumber',
    'bankAccount'
  ];

  // Remove sensitive fields from response
  const originalJson = res.json;
  res.json = function(data) {
    if (data && typeof data === 'object') {
      const anonymize = (obj) => {
        if (Array.isArray(obj)) {
          return obj.map(anonymize);
        } else if (obj && typeof obj === 'object') {
          const result = {};
          for (const [key, value] of Object.entries(obj)) {
            if (sensitiveFields.includes(key)) {
              result[key] = '***REDACTED***';
            } else if (key === 'email' && req.path.includes('/public')) {
              // Anonymize email in public responses
              const [local, domain] = value.split('@');
              result[key] = `${local[0]}***@${domain}`;
            } else if (key === 'phone' && req.path.includes('/public')) {
              // Anonymize phone in public responses
              result[key] = value.replace(/\d(?=\d{4})/g, '*');
            } else {
              result[key] = anonymize(value);
            }
          }
          return result;
        }
        return obj;
      };

      data = anonymize(data);
    }

    originalJson.call(this, data);
  };

  next();
};

export const enforceDataMinimization = (allowedFields) => {
  return (req, res, next) => {
    // POPIA principle: Only collect data that is necessary
    if (req.body && allowedFields) {
      const minimizedBody = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          minimizedBody[field] = req.body[field];
        }
      });
      req.body = minimizedBody;
    }

    next();
  };
};

export const handleDataSubjectRequest = async (req, res) => {
  try {
    const { requestType, userId } = req.body;

    if (!req.user && !userId) {
      return res.status(401).json({
        error: 'Authentication required for data subject requests',
        code: 'AUTH_REQUIRED'
      });
    }

    const targetUserId = userId || req.user._id;

    switch (requestType) {
      case 'access':
        // Provide all personal data
        await handleDataAccessRequest(targetUserId, res);
        break;

      case 'correction':
        // Correct inaccurate data
        await handleDataCorrectionRequest(targetUserId, req.body.corrections, res);
        break;

      case 'deletion':
        // Delete personal data (anonymize for POPIA compliance)
        await handleDataDeletionRequest(targetUserId, res);
        break;

      case 'restriction':
        // Restrict processing of personal data
        await handleProcessingRestrictionRequest(targetUserId, res);
        break;

      case 'portability':
        // Provide data in portable format
        await handleDataPortabilityRequest(targetUserId, res);
        break;

      default:
        return res.status(400).json({
          error: 'Invalid request type',
          code: 'INVALID_REQUEST_TYPE',
          validTypes: ['access', 'correction', 'deletion', 'restriction', 'portability']
        });
    }
  } catch (error) {
    console.error('Data subject request error:', error);
    res.status(500).json({
      error: 'Failed to process data subject request',
      code: 'REQUEST_PROCESSING_FAILED'
    });
  }
};

async function handleDataAccessRequest(userId, res) {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  // Log the data access for POPIA compliance
  await AuditLogger.log('DATA_SUBJECT_ACCESS', {
    resource: 'user',
    resourceId: userId,
    userId: userId,
    userEmail: user.email,
    metadata: {
      requestType: 'access',
      timestamp: new Date().toISOString()
    }
  });

  res.json({
    success: true,
    data: {
      profile: user.profile,
      preferences: user.jobPreferences,
      services: user.services,
      popiaConsent: user.popiaConsent,
      metadata: {
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        dataCategories: ['profile', 'preferences', 'services', 'consent']
      }
    }
  });
}

async function handleDataCorrectionRequest(userId, corrections, res) {
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  // Apply corrections
  if (corrections.profile) {
    user.profile = { ...user.profile, ...corrections.profile };
  }

  if (corrections.preferences) {
    user.jobPreferences = { ...user.jobPreferences, ...corrections.preferences };
  }

  await user.save();

  await AuditLogger.log('DATA_CORRECTION', {
    resource: 'user',
    resourceId: userId,
    userId: userId,
    userEmail: user.email,
    metadata: {
      corrections: corrections,
      timestamp: new Date().toISOString()
    }
  });

  res.json({
    success: true,
    message: 'Data corrected successfully',
    correctedFields: Object.keys(corrections)
  });
}

async function handleDataDeletionRequest(userId, res) {
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  // POPIA-compliant deletion (anonymization)
  user.email = `deleted_${userId}@careerboost.com`;
  user.password = 'deleted';
  user.profile = {
    firstName: 'Deleted',
    lastName: 'User',
    phone: ''
  };
  user.cv = {};
  user.jobPreferences = {};
  user.applications = [];
  user.isDeleted = true;
  user.deletedAt = new Date();

  await user.save();

  await AuditLogger.log('DATA_DELETION', {
    resource: 'user',
    resourceId: userId,
    userId: userId,
    userEmail: user.email,
    metadata: {
      deletionMethod: 'anonymization',
      timestamp: new Date().toISOString()
    }
  });

  res.json({
    success: true,
    message: 'Data deleted in compliance with POPIA regulations'
  });
}

async function handleProcessingRestrictionRequest(userId, res) {
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  user.marketingConsent = {
    email: false,
    sms: false
  };

  await user.save();

  await AuditLogger.log('PROCESSING_RESTRICTION', {
    resource: 'user',
    resourceId: userId,
    userId: userId,
    userEmail: user.email,
    metadata: {
      restrictions: ['marketing_emails', 'sms_notifications'],
      timestamp: new Date().toISOString()
    }
  });

  res.json({
    success: true,
    message: 'Data processing restricted as requested',
    restrictions: ['marketing_emails', 'sms_notifications']
  });
}

async function handleDataPortabilityRequest(userId, res) {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  const portableData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      profile: user.profile,
      preferences: user.jobPreferences,
      services: user.services.map(s => ({
        type: s.type,
        activatedAt: s.activatedAt,
        expiresAt: s.expiresAt
      })),
      applications: user.applications.length
    }
  };

  await AuditLogger.log('DATA_PORTABILITY', {
    resource: 'user',
    resourceId: userId,
    userId: userId,
    userEmail: user.email,
    metadata: {
      format: 'json',
      dataSize: JSON.stringify(portableData).length,
      timestamp: new Date().toISOString()
    }
  });

  // Set headers for file download
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="careerboost_data_${userId}.json"`);

  res.json(portableData);
}
