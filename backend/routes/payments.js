import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// FNB Direct EFT
router.post('/fnb-eft', async (req, res) => {
  try {
    const { amount, reference, customer } = req.body;
    
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

    res.json({
      success: true,
      paymentUrl: 'https://fnbpay.co.za/eng/process',
      paymentData
    });
  } catch (error) {
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// PayFast Integration
router.post('/payfast', async (req, res) => {
  try {
    const { amount, reference, customer } = req.body;
    
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

    res.json({
      success: true,
      paymentUrl: 'https://www.payfast.co.za/eng/process',
      paymentData
    });
  } catch (error) {
    res.status(500).json({ error: 'PayFast processing failed' });
  }
});

function generateFNBSignature(data) {
  const payload = `${data.merchant_id}${data.amount}${data.reference}`;
  return crypto.createHmac('sha512', process.env.FNB_SECRET_KEY)
    .update(payload)
    .digest('hex');
}

function generatePayFastSignature(data) {
  // PayFast signature generation logic
  const payload = Object.keys(data)
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');
  
  return crypto.createHash('md5').update(payload).digest('hex');
}

export default router;
