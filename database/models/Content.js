import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: ['reel', 'blog', 'email', 'social_post', 'ad_copy', 'newsletter'],
    index: true
  },
  content: {
    type: String,
    required: true
  },
  script: {
    // For video content
    scenes: [{
      visual: String,
      audio: String,
      text: String,
      duration: Number
    }],
    totalDuration: Number,
    style: String
  },
  metadata: {
    targetAudience: [String],
    platforms: [{
      type: String,
      enum: ['instagram', 'tiktok', 'facebook', 'twitter', 'linkedin', 'email']
    }],
    hashtags: [String],
    keywords: [String],
    seoData: {
      title: String,
      description: String,
      slug: String
    },
    engagement: {
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      clickRate: { type: Number, default: 0 }
    },
    performanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'archived', 'rejected'],
    default: 'draft',
    index: true
  },
  schedule: {
    publishAt: Date,
    publishedAt: Date,
    archiveAt: Date
  },
  createdBy: {
    type: String,
    enum: ['ai', 'human', 'hybrid'],
    default: 'ai'
  },
  aiModel: {
    type: String,
    default: 'gpt-4'
  },
  version: {
    type: Number,
    default: 1
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  variations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],
  tags: [{
    type: String,
    trim: true,
    index: true
  }],
  category: {
    type: String,
    enum: ['career_tips', 'success_stories', 'product_updates', 'industry_news', 'promotional'],
    default: 'career_tips'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
contentSchema.index({ type: 1, status: 1 });
contentSchema.index({ 'schedule.publishAt': 1 });
contentSchema.index({ tags: 1 });
contentSchema.index({ category: 1 });
contentSchema.index({ 'metadata.performanceScore': -1 });
contentSchema.index({ createdAt: -1 });

// Text search index
contentSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
  'metadata.keywords': 'text'
});

// Virtual for isPublished
contentSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && this.schedule.publishedAt;
});

// Virtual for isScheduled
contentSchema.virtual('isScheduled').get(function() {
  return this.status === 'scheduled' && this.schedule.publishAt > new Date();
});

// Virtual for daysSincePublication
contentSchema.virtual('daysSincePublication').get(function() {
  if (!this.schedule.publishedAt) return null;
  const now = new Date();
  const published = new Date(this.schedule.publishedAt);
  return Math.floor((now - published) / (1000 * 60 * 60 * 24));
});

// Method to publish content
contentSchema.methods.publish = function() {
  this.status = 'published';
  this.schedule.publishedAt = new Date();
  return this.save();
};

// Method to schedule content
contentSchema.methods.scheduleFor = function(publishDate) {
  this.status = 'scheduled';
  this.schedule.publishAt = publishDate;
  return this.save();
};

// Method to update engagement metrics
contentSchema.methods.updateEngagement = function(metrics) {
  this.metadata.engagement = {
    ...this.metadata.engagement,
    ...metrics
  };
  
  // Recalculate performance score
  this.calculatePerformanceScore();
  return this.save();
};

// Method to calculate performance score
contentSchema.methods.calculatePerformanceScore = function() {
  const engagement = this.metadata.engagement;
  let score = 0;
  
  // Simple scoring algorithm (can be enhanced)
  if (engagement.views > 0) {
    score += Math.min(engagement.likes / engagement.views * 100, 25);
    score += Math.min(engagement.shares / engagement.views * 500, 25);
    score += Math.min(engagement.comments / engagement.views * 200, 25);
    score += Math.min(engagement.clickRate * 100, 25);
  }
  
  this.metadata.performanceScore = Math.round(score);
  return this.metadata.performanceScore;
};

// Static method to find content by status and type
contentSchema.statics.findByStatusAndType = function(status, type, limit = 10) {
  return this.find({ status, type })
    .sort({ 'schedule.publishAt': -1 })
    .limit(limit);
};

// Static method to get content calendar
contentSchema.statics.getContentCalendar = function(startDate, endDate) {
  return this.find({
    $or: [
      { 'schedule.publishAt': { $gte: startDate, $lte: endDate } },
      { 'schedule.publishedAt': { $gte: startDate, $lte: endDate } }
    ]
  }).sort({ 'schedule.publishAt': 1 });
};

// Static method to get performance analytics
contentSchema.statics.getPerformanceAnalytics = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'published',
        'schedule.publishedAt': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        totalContent: { $sum: 1 },
        avgPerformance: { $avg: '$metadata.performanceScore' },
        totalLikes: { $sum: '$metadata.engagement.likes' },
        totalShares: { $sum: '$metadata.engagement.shares' },
        totalViews: { $sum: '$metadata.engagement.views' },
        avgClickRate: { $avg: '$metadata.engagement.clickRate' }
      }
    },
    {
      $project: {
        type: '$_id',
        totalContent: 1,
        avgPerformance: { $round: ['$avgPerformance', 2] },
        totalLikes: 1,
        totalShares: 1,
        totalViews: 1,
        avgClickRate: { $round: ['$avgClickRate', 4] },
        engagementRate: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    { $add: ['$totalLikes', '$totalShares', '$totalViews'] },
                    '$totalViews'
                  ]
                },
                100
              ]
            },
            2
          ]
        }
      }
    }
  ]);
};

// Pre-save middleware to update performance score
contentSchema.pre('save', function(next) {
  if (this.isModified('metadata.engagement')) {
    this.calculatePerformanceScore();
  }
  next();
});

export default mongoose.model('Content', contentSchema);
