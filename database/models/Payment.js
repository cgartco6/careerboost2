import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'ZAR',
    uppercase: true,
    enum: ['ZAR', 'USD', 'EUR'],
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['fnb_eft', 'payfast', 'credit_card', 'debit_card', 'bank_transfer']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  transactionId: {
    type: String,
    sparse: true,
    index: true
  },
  items: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: String,
      enum: ['cv_rewrite', 'cover_letter', 'job_matching', 'premium_package'],
      required: true
    }
  }],
  paymentData: {
    // Store payment gateway specific data
    merchantId: String,
    amount: String,
    reference: String,
    signature: String,
    gatewayResponse: mongoose.Schema.Types.Mixed
  },
  customer: {
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    firstName: String,
    lastName: String,
    phone: String
  },
  billingAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'South Africa'
    }
  },
  processedAt: Date,
  refundedAt: Date,
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundReason: String,
  metadata: {
    ipAddress: String,
    userAgent: String,
    riskScore: Number,
    gateway: String,
    version: {
      type: String,
      default: '1.0'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance and queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ reference: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ 'customer.email': 1 });
paymentSchema.index({ createdAt: 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `R ${this.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
});

// Virtual for total items count
paymentSchema.virtual('itemsCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for isRefundable
paymentSchema.virtual('isRefundable').get(function() {
  if (this.status !== 'completed') return false;
  if (this.refundedAt) return false;
  
  // Allow refunds within 14 days
  const paymentDate = this.processedAt || this.createdAt;
  const daysSincePayment = (Date.now() - paymentDate) / (1000 * 60 * 60 * 24);
  return daysSincePayment <= 14;
});

// Method to process payment completion
paymentSchema.methods.completePayment = function(transactionId, gatewayData = {}) {
  this.status = 'completed';
  this.transactionId = transactionId;
  this.processedAt = new Date();
  this.paymentData.gatewayResponse = gatewayData;
  return this.save();
};

// Method to fail payment
paymentSchema.methods.failPayment = function(reason = 'Payment failed') {
  this.status = 'failed';
  this.paymentData.gatewayResponse = { error: reason };
  return this.save();
};

// Method to process refund
paymentSchema.methods.processRefund = function(amount, reason = 'Customer request') {
  if (!this.isRefundable) {
    throw new Error('Payment is not refundable');
  }
  
  this.status = 'refunded';
  this.refundAmount = amount || this.amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  return this.save();
};

// Static method to get revenue statistics
paymentSchema.statics.getRevenueStats = function(startDate, endDate) {
  const matchStage = {
    status: 'completed',
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        averageTransaction: { $avg: '$amount' },
        byPaymentMethod: {
          $push: {
            method: '$paymentMethod',
            amount: '$amount'
          }
        }
      }
    },
    {
      $project: {
        totalRevenue: 1,
        totalTransactions: 1,
        averageTransaction: { $round: ['$averageTransaction', 2] },
        paymentMethods: {
          $arrayToObject: {
            $map: {
              input: '$byPaymentMethod',
              as: 'item',
              in: {
                k: '$$item.method',
                v: '$$item.amount'
              }
            }
          }
        }
      }
    }
  ]);
};

// Static method to find payments by date range
paymentSchema.statics.findByDateRange = function(startDate, endDate, status = 'completed') {
  return this.find({
    status,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

// Pre-save middleware to generate reference if not provided
paymentSchema.pre('save', function(next) {
  if (!this.reference) {
    this.reference = `CB${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
  }
  
  if (this.isNew) {
    this.metadata = {
      ...this.metadata,
      version: '1.0'
    };
  }
  
  next();
});

export default mongoose.model('Payment', jobSchema);
