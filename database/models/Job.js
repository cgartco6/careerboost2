import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  company: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: [String],
  location: {
    type: String,
    required: true
  },
  salaryRange: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'ZAR'
    }
  },
  applicationUrl: String,
  source: {
    website: String,
    url: String
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  filledAt: Date,
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    matchesCount: Number,
    applicationsCount: Number
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ isActive: 1, location: 1 });

export default mongoose.model('Job', jobSchema);
