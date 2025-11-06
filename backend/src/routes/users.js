import express from 'express';
import User from '../models/User.js';
import { SecurityManager } from '../security/encryption.js';

const router = express.Router();

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { profile, jobPreferences } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(profile && { profile }),
          ...(jobPreferences && { jobPreferences })
        }
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update job preferences
router.patch('/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const { industries, locations, salaryRange } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        jobPreferences: {
          industries: industries || [],
          locations: locations || [],
          salaryRange: salaryRange || { min: 0, max: 0 }
        }
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.jobPreferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user applications
router.get('/:userId/applications', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId).populate({
      path: 'applications.jobId',
      select: 'title company location'
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const applications = user.applications.slice().reverse();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);

    res.json({
      success: true,
      applications: applications.slice(startIndex, endIndex),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: applications.length,
        pages: Math.ceil(applications.length / limit)
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Delete user account (POPIA compliance)
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Instead of actually deleting, anonymize the data for POPIA compliance
    const user = await User.findByIdAndUpdate(
      userId,
      {
        email: `deleted_${userId}@careerboost.com`,
        password: 'deleted',
        profile: {
          firstName: 'Deleted',
          lastName: 'User',
          phone: ''
        },
        cv: {},
        jobPreferences: {},
        applications: [],
        isDeleted: true,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
