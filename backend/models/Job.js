import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    index: true,
    maxlength: [200, 'Job title cannot exceed 200 characters']
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    index: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
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
    required: [true, 'Job location is required'],
    trim: true,
    index: true
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
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
    default: 'full-time',
    index: true
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive', 'not-specified'],
    default: 'not-specified',
    index: true
  },
  education: {
    required: {
      type: String,
      enum: ['none', 'high-school', 'diploma', 'bachelors', 'masters', 'phd', 'not-specified'],
      default: 'not-specified'
    },
    preferred: [{
      type: String,
      enum: ['high-school', 'diploma', 'bachelors', 'masters', 'phd']
    }]
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
  applicationEmail: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return !email || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
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
    scrapedId: String,
    postedBy: String
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
      trim: true,
      maxlength: [100, 'Contact person name cannot exceed 100 characters']
    }
  },
  companyInfo: {
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+', 'not-specified'],
      default: 'not-specified'
    },
    industry: String,
    website: String,
    description: String
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
  isFeatured: {
    type: Boolean,
    default: false
  },
  isRemote: {
    type: Boolean,
    default: false,
    index: true
  },
  filledAt: Date,
  expiresAt: {
    type: Date,
    index: true,
    expires: 0 // TTL index for automatic removal
  },
  postedDate: {
    type: Date,
    default: Date.now
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
    savesCount: {
      type: Number,
      default: 0
    },
    lastMatched: Date,
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    scrapedAccuracy: {
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
  }],
  tags: [{
    type: String,
    trim: true,
    index: true
  }],
  requirementsAnalysis: {
    mustHave: [String],
    niceToHave: [String],
    yearsOfExperience: Number,
    technologies: [String],
    certifications: [String]
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove internal fields when converting to JSON
      delete ret.metadata.scrapedAccuracy;
      return ret;
    }
  }
});

// Compound indexes for efficient querying
jobSchema.index({ title: 'text', description: 'text', company: 'text', skills: 'text' });
jobSchema.index({ isActive: 1, location: 1 });
jobSchema.index({ isActive: 1, jobType: 1 });
jobSchema.index({ isActive: 1, experienceLevel: 1 });
jobSchema.index({ isActive: 1, 'salaryRange.min': 1 });
jobSchema.index({ isActive: 1, categories: 1 });
jobSchema.index({ isActive: 1, isRemote: 1 });
jobSchema.index({ 'metadata.qualityScore': -1 });
jobSchema.index({ postedDate: -1 });
jobSchema.index({ company: 1, title: 1 }, { unique: true });

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
  const posted = new Date(this.postedDate);
  const diffTime = Math.abs(now - posted);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for isNew (less than 7 days)
jobSchema.virtual('isNew').get(function() {
  return this.ageInDays <= 7;
});

// Virtual for isExpiring (less than 7 days left)
jobSchema.virtual('isExpiring').get(function() {
  if (!this.expiresAt) return false;
  const now = new Date();
  const expires = new Date(this.expiresAt);
  const diffTime = Math.abs(expires - now);
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return daysLeft <= 7;
});

// Virtual for application rate
jobSchema.virtual('applicationRate').get(function() {
  if (this.metadata.viewsCount === 0) return 0;
  return (this.metadata.applicationsCount / this.metadata.viewsCount) * 100;
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

// Method to update views count
jobSchema.methods.incrementViews = function() {
  this.metadata.viewsCount += 1;
  return this.save();
};

// Method to update matches count
jobSchema.methods.incrementMatches = function() {
  this.metadata.matchesCount += 1;
  this.metadata.lastMatched = new Date();
  return this.save();
};

// Method to update saves count
jobSchema.methods.incrementSaves = function() {
  this.metadata.savesCount += 1;
  return this.save();
};

// Method to calculate quality score
jobSchema.methods.calculateQualityScore = function() {
  let score = 0;
  
  // Base score for required fields
  if (this.title && this.company && this.description) score += 30;
  
  // Salary information
  if (this.salaryRange.isDisclosed) score += 20;
  
  // Detailed information
  if (this.requirements && this.requirements.length > 0) score += 15;
  if (this.responsibilities && this.responsibilities.length > 0) score += 15;
  if (this.benefits && this.benefits.length > 0) score += 10;
  
  // Contact information
  if (this.contact.email || this.contact.phone) score += 10;
  
  this.metadata.qualityScore = Math.min(score, 100);
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

// Static method to find similar jobs
jobSchema.statics.findSimilarJobs = function(jobId, limit = 10) {
  return this.aggregate([
    { $match: { _id: jobId } },
    {
      $lookup: {
        from: 'jobs',
        let: { 
          jobTitle: '$title',
          jobCompany: '$company',
          jobCategories: '$categories',
          jobSkills: '$skills'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ['$_id', jobId] },
                  { $eq: ['$isActive', true] },
                  {
                    $or: [
                      { $eq: ['$company', '$$jobCompany'] },
                      { $setIsSubset: ['$$jobCategories', '$categories'] },
                      { $setIsSubset: ['$$jobSkills', '$skills'] },
                      { $regexMatch: { input: '$title', regex: '$$jobTitle', options: 'i' } }
                    ]
                  }
                ]
              }
            }
          },
          { $limit: limit },
          { $project: { title: 1, company: 1, location: 1, salaryRange: 1, postedDate: 1 } }
        ],
        as: 'similarJobs'
      }
    }
  ]);
};

// Static method to get job statistics
jobSchema.statics.getJobStatistics = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        byLocation: {
          $push: {
            location: '$location',
            count: 1
          }
        },
        byType: {
          $push: '$jobType'
        },
        byExperience: {
          $push: '$experienceLevel'
        },
        avgSalary: { $avg: '$salaryRange.min' },
        totalApplications: { $sum: '$metadata.applicationsCount' },
        avgQualityScore: { $avg: '$metadata.qualityScore' }
      }
    },
    {
      $project: {
        totalJobs: 1,
        locationDistribution: {
          $arrayToObject: {
            $map: {
              input: '$byLocation',
              as: 'loc',
              in: {
                k: '$$loc.location',
                v: '$$loc.count'
              }
            }
          }
        },
        typeDistribution: {
          $arrayToObject: {
            $map: {
              input: {
                $reduce: {
                  input: '$byType',
                  initialValue: [],
                  in: { $concatArrays: ['$$value', '$$this'] }
                }
              },
              as: 'type',
              in: {
                k: '$$type',
                v: { $sum: 1 }
              }
            }
          }
        },
        experienceDistribution: {
          $arrayToObject: {
            $map: {
              input: {
                $reduce: {
                  input: '$byExperience',
                  initialValue: [],
                  in: { $concatArrays: ['$$value', '$$this'] }
                }
              },
              as: 'exp',
              in: {
                k: '$$exp',
                v: { $sum: 1 }
              }
            }
          }
        },
        avgSalary: { $round: ['$avgSalary', 2] },
        totalApplications: 1,
        avgQualityScore: { $round: ['$avgQualityScore', 2] }
      }
    }
  ]);
};

// Static method to find trending jobs
jobSchema.statics.findTrendingJobs = function(limit = 10) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return this.aggregate([
    {
      $match: {
        isActive: true,
        postedDate: { $gte: oneWeekAgo }
      }
    },
    {
      $addFields: {
        engagementScore: {
          $add: [
            { $multiply: ['$metadata.applicationsCount', 2] },
            '$metadata.viewsCount',
            { $multiply: ['$metadata.savesCount', 3] }
          ]
        }
      }
    },
    {
      $sort: { engagementScore: -1, postedDate: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        title: 1,
        company: 1,
        location: 1,
        salaryRange: 1,
        postedDate: 1,
        engagementScore: 1,
        metadata: {
          applicationsCount: 1,
          viewsCount: 1,
          savesCount: 1
        }
      }
    }
  ]);
};

// Pre-save middleware to set expiration date and calculate quality
jobSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiration to 90 days from now
    this.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }

  // Auto-detect remote jobs
  if (this.location && (
      this.location.toLowerCase().includes('remote') ||
      this.location.toLowerCase().includes('anywhere') ||
      this.location.toLowerCase().includes('virtual')
  )) {
    this.isRemote = true;
  }

  // Calculate quality score for new jobs or when relevant fields change
  const qualityFields = ['title', 'description', 'requirements', 'responsibilities', 'benefits', 'salaryRange'];
  if (this.isNew || qualityFields.some(field => this.isModified(field))) {
    this.calculateQualityScore();
  }

  next();
});

// Post-save middleware to log job creation
jobSchema.post('save', function(doc) {
  if (doc.isNew) {
    const AuditLogger = require('../security/auditLogger.js');
    AuditLogger.log('JOB_CREATED', {
      resource: 'job',
      resourceId: doc._id,
      metadata: {
        source: doc.source.website,
        company: doc.company,
        title: doc.title,
        qualityScore: doc.metadata.qualityScore
      }
    }).catch(console.error);
  }
});

export default mongoose.model('Job', jobSchema);
