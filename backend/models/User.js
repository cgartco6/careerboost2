import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  profile: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(phone) {
          if (!phone) return true; // Optional field
          return /^[\+]?[1-9][\d]{0,15}$/.test(phone);
        },
        message: 'Please enter a valid phone number'
      }
    },
    preferredIndustry: {
      type: String,
      trim: true
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive', null],
      default: null
    },
    currentPosition: {
      type: String,
      trim: true,
      maxlength: [100, 'Position title cannot exceed 100 characters']
    },
    location: {
      city: String,
      province: String,
      country: {
        type: String,
        default: 'South Africa'
      }
    }
  },
  cv: {
    original: {
      type: mongoose.Schema.Types.Mixed, // Encrypted data
      select: false
    },
    enhanced: {
      type: String,
      select: false
    },
    coverLetter: {
      type: String,
      select: false
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    }
  },
  jobPreferences: {
    industries: [{
      type: String,
      trim: true
    }],
    locations: [{
      type: String,
      trim: true
    }],
    salaryRange: {
      min: {
        type: Number,
        default: 0,
        min: 0
      },
      max: {
        type: Number,
        default: 0,
        min: 0
      },
      currency: {
        type: String,
        default: 'ZAR'
      }
    },
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'remote', 'hybrid'],
      default: 'full-time'
    }],
    experienceLevel: [{
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive']
    }],
    companies: [{
      type: String,
      trim: true
    }],
    skills: [{
      type: String,
      trim: true
    }]
  },
  applications: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'viewed', 'interview', 'rejected', 'offered', 'accepted'],
      default: 'applied'
    },
    coverLetterUsed: String,
    cvVersion: String,
    notes: String,
    followUpDate: Date,
    applicationMethod: {
      type: String,
      enum: ['auto', 'manual', 'assisted'],
      default: 'auto'
    }
  }],
  services: [{
    type: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      required: true
    },
    activatedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    features: [{
      type: String,
      enum: ['cv_rewrite', 'cover_letter', 'job_matching', 'auto_apply', 'priority_support']
    }]
  }],
  popiaConsent: {
    accepted: {
      type: Boolean,
      default: false
    },
    acceptedAt: Date,
    version: String,
    ipAddress: String,
    userAgent: String
  },
  marketingConsent: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  account: {
    emailVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastPasswordChange: {
      type: Date,
      default: Date.now
    }
  },
  statistics: {
    loginCount: {
      type: Number,
      default: 0
    },
    applicationCount: {
      type: Number,
      default: 0
    },
    jobSearchCount: {
      type: Number,
      default: 0
    },
    lastLogin: Date,
    lastActivity: Date
  },
  preferences: {
    notifications: {
      jobMatches: {
        type: Boolean,
        default: true
      },
      applicationUpdates: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: true
      },
      weeklyDigest: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      profileVisible: {
        type: Boolean,
        default: true
      },
      searchable: {
        type: Boolean,
        default: true
      },
      dataSharing: {
        type: Boolean,
        default: false
      }
    },
    communication: {
      language: {
        type: String,
        default: 'en'
      },
      timezone: {
        type: String,
        default: 'Africa/Johannesburg'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  lastDataExport: Date
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive information when converting to JSON
      delete ret.password;
      delete ret.cv.original;
      delete ret.account.verificationToken;
      delete ret.account.resetPasswordToken;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'profile.preferredIndustry': 1 });
userSchema.index({ 'profile.location.city': 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ 'services.isActive': 1 });
userSchema.index({ 'services.expiresAt': 1 });
userSchema.index({ 'statistics.lastActivity': 1 });
userSchema.index({ isDeleted: 1 });

// POPIA compliance: Automatic data expiration after 2 years of inactivity
userSchema.index({ 'statistics.lastActivity': 1 }, { 
  expireAfterSeconds: 63072000, // 2 years
  partialFilterExpression: { isDeleted: false }
});

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Virtual for active service
userSchema.virtual('hasActiveService').get(function() {
  return this.services.some(service => 
    service.isActive && service.expiresAt > new Date()
  );
});

// Virtual for account age
userSchema.virtual('accountAgeInDays').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

// Method to get current active service
userSchema.methods.getActiveService = function() {
  return this.services.find(service => 
    service.isActive && service.expiresAt > new Date()
  );
};

// Method to check if user has specific feature
userSchema.methods.hasFeature = function(feature) {
  const activeService = this.getActiveService();
  return activeService ? activeService.features.includes(feature) : false;
};

// Method to update last activity
userSchema.methods.updateLastActivity = function() {
  this.statistics.lastActivity = new Date();
  return this.save();
};

// Method to increment application count
userSchema.methods.incrementApplicationCount = function() {
  this.statistics.applicationCount += 1;
  return this.save();
};

// Method to verify password
userSchema.methods.verifyPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.account.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.account.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return resetToken;
};

// Method to accept POPIA consent
userSchema.methods.acceptPopiaConsent = function(ipAddress, userAgent) {
  this.popiaConsent = {
    accepted: true,
    acceptedAt: new Date(),
    version: '1.0',
    ipAddress: ipAddress,
    userAgent: userAgent
  };
  return this.save();
};

// Static method to find users by industry
userSchema.statics.findByIndustry = function(industry) {
  return this.find({ 
    'profile.preferredIndustry': new RegExp(industry, 'i'),
    isActive: true,
    isDeleted: false 
  });
};

// Static method to find users with expiring services
userSchema.statics.findWithExpiringServices = function(days = 7) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  
  return this.find({
    'services.isActive': true,
    'services.expiresAt': { $lte: expirationDate },
    isActive: true,
    isDeleted: false
  });
};

// Static method to get user statistics
userSchema.statics.getUserStatistics = function() {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeThisMonth: {
          $sum: {
            $cond: [
              { $gte: ['$statistics.lastActivity', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        },
        withActiveService: {
          $sum: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: '$services',
                        as: 'service',
                        cond: {
                          $and: [
                            { $eq: ['$$service.isActive', true] },
                            { $gt: ['$$service.expiresAt', new Date()] }
                          ]
                        }
                      }
                    }
                  },
                  0
                ]
              },
              1,
              0
            ]
          }
        },
        avgApplications: { $avg: '$statistics.applicationCount' }
      }
    }
  ]);
};

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Update last password change
    this.account.lastPasswordChange = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  if (this.isModified('preferences.notifications') || 
      this.isModified('preferences.privacy') ||
      this.isModified('marketingConsent')) {
    this.preferences.updatedAt = new Date();
  }
  next();
});

// Post-save middleware to log user creation
userSchema.post('save', function(doc) {
  if (doc.isNew) {
    const AuditLogger = require('../security/auditLogger.js');
    AuditLogger.log('USER_CREATED', {
      resource: 'user',
      resourceId: doc._id,
      userEmail: doc.email,
      metadata: {
        source: 'registration',
        industry: doc.profile.preferredIndustry
      }
    }).catch(console.error);
  }
});

export default mongoose.model('User', userSchema);
