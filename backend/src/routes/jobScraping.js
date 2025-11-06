import express from 'express';
import { JobScraper } from '../../ai_services/jobScraper.js';
import Job from '../models/Job.js';
import User from '../models/User.js';

const router = express.Router();
const jobScraper = new JobScraper();

// Scrape jobs based on user preferences
router.post('/scrape-for-user', async (req, res) => {
  try {
    const { userId, keywords, location = 'South Africa' } = req.body;

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }

    // Use user preferences if available
    const searchKeywords = keywords || (user?.jobPreferences?.industries?.[0]) || 'software engineer';
    const searchLocation = location || (user?.jobPreferences?.locations?.[0]) || 'South Africa';

    // Scrape jobs
    const jobs = await jobScraper.scrapeJobs(searchKeywords, searchLocation);

    // Store jobs in database
    const jobPromises = jobs.map(async (jobData) => {
      const existingJob = await Job.findOne({
        title: jobData.title,
        company: jobData.company,
        location: jobData.location
      });

      if (!existingJob) {
        const job = new Job({
          title: jobData.title,
          company: jobData.company,
          description: jobData.summary || jobData.description,
          location: jobData.location,
          applicationUrl: jobData.link,
          source: {
            website: jobData.source,
            url: jobData.link
          },
          requirements: [], // Would be extracted from description
          metadata: {
            matchesCount: 0,
            applicationsCount: 0
          }
        });
        return job.save();
      }
      return existingJob;
    });

    await Promise.all(jobPromises);

    res.json({
      success: true,
      jobsFound: jobs.length,
      jobs: jobs.slice(0, 20) // Return first 20 jobs
    });
  } catch (error) {
    console.error('Job scraping error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get matching jobs for user
router.get('/match/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const skip = (page - 1) * limit;

    // Simple matching based on industry preference
    const industry = user.profile.preferredIndustry;
    let query = { isActive: true };

    if (industry) {
      query = {
        ...query,
        $or: [
          { title: { $regex: industry, $options: 'i' } },
          { description: { $regex: industry, $options: 'i' } }
        ]
      };
    }

    const jobs = await Job.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Job matching error:', error);
    res.status(500).json({ error: 'Failed to match jobs' });
  }
});

// Get all active jobs
router.get('/active', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const skip = (page - 1) * limit;
    let query = { isActive: true };

    if (search) {
      query = {
        ...query,
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const jobs = await Job.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Active jobs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Mark job as filled
router.patch('/:jobId/filled', async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findByIdAndUpdate(
      jobId,
      { 
        isActive: false,
        filledAt: new Date()
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      message: 'Job marked as filled',
      job
    });
  } catch (error) {
    console.error('Mark job filled error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

export default router;
