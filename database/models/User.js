import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    preferredIndustry: String
  },
  cv: {
    original: Buffer,
    enhanced: String,
    coverLetter: String
  },
  jobPreferences: {
    industries: [String],
    locations: [String],
    salaryRange: {
      min: Number,
      max: Number
    }
  },
  applications: [{
    jobId: mongoose.Schema.Types.ObjectId,
    appliedAt: Date,
    status: String
  }],
  popiaConsent: {
    accepted: Boolean,
    acceptedAt: Date,
    version: String
  }
}, {
  timestamps: true
});

// POPIA compliance: Automatic data expiration after 2 years
userSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

export default mongoose.model('User', userSchema);
