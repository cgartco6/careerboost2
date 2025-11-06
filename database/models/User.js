import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(phone) {
          return !phone || /^[\+]?[1-9][\d]{0,15}$/.test(phone);
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
      enum: ['entry', 'mid', 'senior', 'executive'],
      default: 'mid'
    }
  },
  cv: {
    original: {
      type: mongoose.Schema.Types.Mixed, // Encrypted data
      select: false
    },
    enhanced: String,
    coverLetter: String,
    lastUpdated: {
      type: Date,
      default: Date.now
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
        default: 0
      },
      max: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'ZAR'
      }
    },
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'remote', 'hybrid'],
      default: 'full-time'
    }]
  },
  applications: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'viewed', 'interview', 'rejected', 'offered'],
      default: 'applied'
    },
    coverLetterUsed: String,
    cvVersion: String
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
    }
  }],
  popiaConsent: {
    accepted: {
      type: Boolean,
      default: false
    },
    acceptedAt: Date,
    version: String,
    ipAddress: String
  },
  marketingConsent: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'profile.preferredIndustry': 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ 'services.isActive': 1 });

// POPIA compliance: Automatic data expiration after 2 years of inactivity
userSchema.index({ lastLogin: 1 }, { 
  expireAfterSeconds: 63072000, // 2 years
  partialFilterExpression: { isDeleted: false }
});

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Method to check if user has active service
userSchema.methods.hasActiveService = function() {
  return this.services.some(service => 
    service.isActive && service.expiresAt > new Date()
  );
};

// Method to get current active service
userSchema.methods.getActiveService = function() {
  return this.services.find(service => 
    service.isActive && service.expiresAt > new Date()
  );
};

// Static method to find users by industry
userSchema.statics.findByIndustry = function(industry) {
  return this.find({ 'profile.preferredIndustry': new RegExp(industry, 'i') });
};

// Middleware to update lastLogin
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

export default mongoose.model('User', userSchema);
