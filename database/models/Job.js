import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
    maxlength: 200
  },
  company: {
    type: String,
    required: true,
    trim: true,
    index: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  requirements: [{
    type: String,
    trim: true
  }],
  responsibilities: [{
    type: String,
    trim: true
  }],
  location: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
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
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'monthly'
    },
    isDisclosed: {
      type: Boolean,
      default: false
    }
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'remote', 'hybrid'],
    default: 'full-time'
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive', 'not-specified'],
    default: 'not-specified'
  },
  applicationUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(url) {
        return !url || /^https?:\/\/.+/.test(url);
      },
      message: 'Please enter a valid URL'
    }
  },
  source: {
    website: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    scrapedId: String
  },
  contact: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    person: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  filledAt: Date,
  expiresAt: {
    type: Date,
    index: true,
    expires: 0 // TTL index for automatic removal
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    matchesCount: {
      type: Number,
      default: 0
    },
    applicationsCount: {
      type: Number,
      default: 0
    },
    viewsCount: {
      type: Number,
      default: 0
    },
    lastMatched: Date,
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  categories: [{
    type: String,
    trim: true,
    index: true
  }],
  skills: [{
    type: String,
    trim: true
  }],
  benefits: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient querying
jobSchema.index({ title: 'text', description: 'text', company: 'text' });
jobSchema.index({ isActive: 1, location: 1 });
jobSchema.index({ isActive: 1, jobType: 1 });
jobSchema.index({ isActive: 1, experienceLevel: 1 });
jobSchema.index({ isActive: 1, 'salaryRange.min': 1 });
jobSchema.index({ isActive: 1, categories: 1 });
jobSchema.index({ 'metadata.qualityScore': -1 });

// TTL index for automatic removal of expired jobs (90 days)
jobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted salary
jobSchema.virtual('salaryRange.formatted').get(function() {
  if (!this.salaryRange.isDisclosed) {
    return 'Market Related';
  }
  
  const min = this.salaryRange.min.toLocaleString('en-ZA');
  const max = this.salaryRange.max.toLocaleString('en-ZA');
  const period = this.salaryRange.period;
  
  return `R ${min} - R ${max} per ${period}`;
});

// Virtual for job age in days
jobSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const created = new Date(this.scrapedAt);
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to mark job as filled
jobSchema.methods.markAsFilled = function() {
  this.isActive = false;
  this.filledAt = new Date();
  return this.save();
};

// Method to update applications count
jobSchema.methods.incrementApplications = function() {
  this.metadata.applicationsCount += 1;
  this.metadata.lastMatched = new Date();
  return this.save();
};

// Method to update matches count
jobSchema.methods.incrementMatches = function() {
  this.metadata.matchesCount += 1;
  this.metadata.lastMatched = new Date();
  return this.save();
};

// Static method to find active jobs
jobSchema.statics.findActive = function(query = {}) {
  return this.find({ ...query, isActive: true });
};

// Static method to find jobs by location and category
jobSchema.statics.findByLocationAndCategory = function(location, category, limit = 20) {
  return this.find({
    isActive: true,
    location: new RegExp(location, 'i'),
    categories: new RegExp(category, 'i')
  }).limit(limit);
};

// Static method to get job statistics
jobSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        avgSalary: { $avg: '$salaryRange.min' },
        byLocation: { $push: '$location' },
        byType: { $push: '$jobType' }
      }
    }
  ]);
};

// Pre-save middleware to set expiration date
jobSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiration to 90 days from now
    this.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }
  next();
});

export default mongoose.model('Job', jobSchema);
