import express from 'express';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

const router = express.Router();

// FNB Direct EFT
router.post('/fnb-eft', async (req, res) => {
  try {
    const { amount, reference, customer, items } = req.body;
    
    // Generate secure payment request
    const paymentData = {
      merchant_id: process.env.FNB_MERCHANT_ID,
      merchant_key: process.env.FNB_MERCHANT_KEY,
      return_url: `${process.env.BASE_URL}/payment/success`,
      cancel_url: `${process.env.BASE_URL}/payment/cancel`,
      amount: amount.toFixed(2),
      item_name: 'CareerBoost CV Services',
      custom_str1: reference,
      email_address: customer.email
    };

    // Generate signature for security
    const signature = generateFNBSignature(paymentData);
    paymentData.signature = signature;

    // Create payment record
    const payment = new Payment({
      userId: customer.userId,
      amount,
      currency: 'ZAR',
      paymentMethod: 'fnb_eft',
      status: 'pending',
      reference,
      items,
      paymentData: {
        merchantId: paymentData.merchant_id,
        amount: paymentData.amount,
        reference: paymentData.custom_str1
      }
    });

    await payment.save();

    res.json({
      success: true,
      paymentUrl: 'https://fnbpay.co.za/eng/process',
      paymentData,
      paymentId: payment._id
    });
  } catch (error) {
    console.error('FNB EFT payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// PayFast Integration
router.post('/payfast', async (req, res) => {
  try {
    const { amount, reference, customer, items } = req.body;
    
    const paymentData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: `${process.env.BASE_URL}/payment/success`,
      cancel_url: `${process.env.BASE_URL}/payment/cancel`,
      notify_url: `${process.env.BASE_URL}/api/payments/payfast/notify`,
      m_payment_id: reference,
      amount: amount.toFixed(2),
      item_name: 'CareerBoost Premium Services',
      item_description: 'CV Rewriting and Job Matching',
      email_address: customer.email,
      custom_str1: customer.userId
    };

    // Generate PayFast signature
    const signature = generatePayFastSignature(paymentData);
    paymentData.signature = signature;

    // Create payment record
    const payment = new Payment({
      userId: customer.userId,
      amount,
      currency: 'ZAR',
      paymentMethod: 'payfast',
      status: 'pending',
      reference,
      items,
      paymentData: {
        merchantId: paymentData.merchant_id,
        amount: paymentData.amount,
        reference: paymentData.m_payment_id
      }
    });

    await payment.save();

    res.json({
      success: true,
      paymentUrl: 'https://www.payfast.co.za/eng/process',
      paymentData,
      paymentId: payment._id
    });
  } catch (error) {
    console.error('PayFast payment error:', error);
    res.status(500).json({ error: 'PayFast processing failed' });
  }
});

// PayFast ITN (Instant Transaction Notification) handler
router.post('/payfast/notify', async (req, res) => {
  try {
    const data = req.body;
    
    // Verify PayFast signature
    const signature = generatePayFastSignature(data);
    if (signature !== data.signature) {
      return res.status(400).send('Invalid signature');
    }

    // Find payment
    const payment = await Payment.findOne({ reference: data.m_payment_id });
    if (!payment) {
      return res.status(404).send('Payment not found');
    }

    // Update payment status
    payment.status = data.payment_status === 'COMPLETE' ? 'completed' : 'failed';
    payment.processedAt = new Date();
    payment.transactionId = data.pf_payment_id;

    await payment.save();

    // If payment successful, activate user services
    if (payment.status === 'completed') {
      await User.findByIdAndUpdate(payment.userId, {
        $push: {
          services: {
            type: payment.items[0]?.type || 'premium',
            activatedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        }
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('PayFast ITN error:', error);
    res.status(500).send('Error processing ITN');
  }
});

// Payment success callback
router.get('/success/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        reference: payment.reference
      }
    });
  } catch (error) {
    console.error('Payment success callback error:', error);
    res.status(500).json({ error: 'Error processing payment success' });
  }
});

// Get payment history for user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const payments = await Payment.find({ userId })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments({ userId });

    res.json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

function generateFNBSignature(data) {
  const payload = `${data.merchant_id}${data.amount}${data.reference}`;
  return crypto.createHmac('sha512', process.env.FNB_SECRET_KEY)
    .update(payload)
    .digest('hex');
}

function generatePayFastSignature(data) {
  // Remove signature from data for generating new signature
  const { signature, ...dataWithoutSignature } = data;
  
  // Create parameter string
  const payload = Object.keys(dataWithoutSignature)
    .sort()
    .map(key => `${key}=${encodeURIComponent(dataWithoutSignature[key]).replace(/%20/g, '+')}`)
    .join('&');
  
  return crypto.createHash('md5').update(payload + `&passphrase=${process.env.PAYFAST_PASSPHRASE}`).digest('hex');
}

export default router;
