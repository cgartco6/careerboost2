import express from 'express';
import multer from 'multer';
import { CVProcessor } from '../../ai_services/cvProcessor.js';
import { SecurityManager } from '../security/encryption.js';
import User from '../models/User.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  }
});

const cvProcessor = new CVProcessor();

// Upload and process CV
router.post('/upload', upload.single('cv'), async (req, res) => {
  try {
    const { targetIndustry, userId } = req.body;
    const cvFile = req.file;

    if (!cvFile) {
      return res.status(400).json({ error: 'No CV file uploaded' });
    }

    if (!targetIndustry) {
      return res.status(400).json({ error: 'Target industry is required' });
    }

    // Extract text from PDF
    const extractedText = await cvProcessor.extractTextFromPDF(cvFile.buffer);
    
    // Encrypt sensitive data
    const encryptedOriginalCV = SecurityManager.encryptSensitiveData(extractedText);

    // Rewrite CV using AI
    const enhancedCV = await cvProcessor.rewriteCV(extractedText, targetIndustry);

    // Generate cover letter
    const coverLetter = await cvProcessor.generateCoverLetter(extractedText, targetIndustry);

    // Save to user's profile if userId provided
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        'cv.original': encryptedOriginalCV,
        'cv.enhanced': enhancedCV,
        'cv.coverLetter': coverLetter,
        'profile.preferredIndustry': targetIndustry
      });
    }

    res.json({
      success: true,
      enhancedCV,
      coverLetter,
      message: 'CV processed successfully'
    });
  } catch (error) {
    console.error('CV processing error:', error);
    res.status(500).json({ error: error.message || 'CV processing failed' });
  }
});

// Get user's CV documents
router.get('/documents/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('cv profile');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt original CV if exists
    let originalCV = null;
    if (user.cv.original) {
      originalCV = SecurityManager.decryptSensitiveData(user.cv.original);
    }

    res.json({
      enhancedCV: user.cv.enhanced,
      coverLetter: user.cv.coverLetter,
      originalCV: originalCV,
      industry: user.profile.preferredIndustry
    });
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
