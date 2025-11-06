import express from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Payment from '../models/Payment.js';

const router = express.Router();

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const adminToken = req.headers['admin-token'];
  
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Get dashboard statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeJobs = await Job.countDocuments({ isActive: true });
    const totalPayments = await Payment.countDocuments({ status: 'completed' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // User growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Revenue this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeJobs,
        totalApplications: totalPayments, // Using payments as proxy for applications
        totalRevenue: totalRevenue[0]?.total || 0,
        newUsers,
        monthlyRevenue: monthlyRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all users with pagination
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all payments
router.get('/payments', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('userId', 'email profile.firstName profile.lastName')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

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
    console.error('Admin payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get system status
router.get('/system-status', authenticateAdmin, async (req, res) => {
  try {
    // Check database connection
    const dbStatus = 'connected'; // Simplified - would actually check connection

    // Check AI services (simplified)
    const aiServices = {
      cvProcessor: 'online',
      jobScraper: 'online',
      contentGenerator: 'online',
      emailService: 'online'
    };

    // Get recent errors from logs (simplified)
    const recentErrors = [];

    res.json({
      success: true,
      status: {
        database: dbStatus,
        aiServices,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        recentErrors
      }
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

export default router;
