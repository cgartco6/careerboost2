import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import cheerio from 'cheerio';
import axios from 'axios';
import { Job } from '../models/Job.js';
import { SecurityManager } from '../security/encryption.js';
import AuditLogger from '../security/auditLogger.js';

puppeteer.use(StealthPlugin());

export class ScrapingService {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
    this.scrapingStats = {
      totalJobsScraped: 0,
      lastScrapingRun: null,
      errors: 0,
      successRate: 0
    };
    
    // South Africa focused job sites
    this.jobSites = {
      indeed: {
        name: 'Indeed South Africa',
        url: 'https://www.indeed.co.za',
        searchPath: '/jobs',
        selectors: {
          jobCard: '.jobsearch-SerpJobCard',
          title: '.title a',
          company: '.company',
          location: '.location',
          salary: '.salary-snippet',
          summary: '.summary',
          date: '.date',
          link: '.title a'
        }
      },
      careerjet: {
        name: 'CareerJet South Africa',
        url: 'https://www.careerjet.co.za',
        searchPath: '/search/jobs',
        selectors: {
          jobCard: '.job',
          title: '.title a',
          company: '.company',
          location: '.location',
          salary: '.salary',
          summary: '.description',
          date: '.date',
          link: '.title a'
        }
      },
      pnet: {
        name: 'PNet South Africa',
        url: 'https://www.pnet.co.za',
        searchPath: '/jobs.html',
        selectors: {
          jobCard: '.job-element',
          title: '.job-title a',
          company: '.company',
          location: '.location',
          salary: '.salary',
          summary: '.description',
          date: '.date',
          link: '.job-title a'
        }
      },
      careers24: {
        name: 'Careers24',
        url: 'https://www.careers24.com',
        searchPath: '/jobs',
        selectors: {
          jobCard: '.job-card',
          title: '.job-title a',
          company: '.company-name',
          location: '.job-location',
          salary: '.salary',
          summary: '.job-description',
          date: '.post-date',
          link: '.job-title a'
        }
      }
    };
  }

  async initialize() {
    if (this.isInitialized && this.browser) {
      return this.browser;
    }

    try {
      console.log('Initializing scraping service...');
      
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=site-per-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        defaultViewport: {
          width: 1366,
          height: 768
        }
      });

      this.isInitialized = true;
      console.log('Scraping service initialized successfully');
      
      return this.browser;
    } catch (error) {
      console.error('Failed to initialize scraping service:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
      console.log('Scraping service closed');
    }
  }

  async scrapeJobs(keywords, location = 'South Africa', limit = 50) {
    await this.initialize();
    
    const allJobs = [];
    const errors = [];
    
    try {
      console.log(`Starting job scraping for: "${keywords}" in ${location}`);
      
      const sitesToScrape = ['indeed', 'pnet', 'careerjet'];
      
      for (const site of sitesToScrape) {
        try {
          console.log(`Scraping from ${this.jobSites[site].name}...`);
          
          const siteJobs = await this.scrapeSite(
            site, 
            keywords, 
            location, 
            Math.ceil(limit / sitesToScrape.length)
          );
          
          allJobs.push(...siteJobs);
          console.log(`Found ${siteJobs.length} jobs from ${this.jobSites[site].name}`);
          
          // Be respectful to websites - add delay between requests
          await this.delay(2000 + Math.random() * 3000);
          
        } catch (siteError) {
          console.error(`Error scraping ${site}:`, siteError);
          errors.push({ site, error: siteError.message });
        }
      }

      // Deduplicate and process jobs
      const uniqueJobs = this.deduplicateJobs(allJobs);
      const processedJobs = await this.processAndStoreJobs(uniqueJobs.slice(0, limit));
      
      // Update statistics
      this.scrapingStats.totalJobsScraped += processedJobs.length;
      this.scrapingStats.lastScrapingRun = new Date();
      this.scrapingStats.errors = errors.length;
      this.scrapingStats.successRate = ((processedJobs.length / allJobs.length) * 100) || 0;

      await AuditLogger.log('JOB_SCRAPING_COMPLETED', {
        resource: 'scraping',
        metadata: {
          keywords,
          location,
          totalFound: allJobs.length,
          processed: processedJobs.length,
          errors: errors.length,
          sites: sitesToScrape,
          successRate: this.scrapingStats.successRate
        }
      });

      console.log(`Scraping completed: ${processedJobs.length} jobs processed, ${errors.length} errors`);
      
      return {
        success: true,
        jobsFound: processedJobs.length,
        jobs: processedJobs,
        errors: errors,
        statistics: this.scrapingStats
      };
      
    } catch (error) {
      console.error('Job scraping failed:', error);
      
      await AuditLogger.log('JOB_SCRAPING_FAILED', {
        resource: 'scraping',
        metadata: {
          keywords,
          location,
          error: error.message
        }
      });
      
      return {
        success: false,
        error: error.message,
        jobsFound: 0,
        jobs: [],
        errors: [error.message]
      };
    }
  }

  async scrapeSite(site, keywords, location, limit) {
    const siteConfig = this.jobSites[site];
    const jobs = [];
    
    try {
      const page = await this.browser.newPage();
      
      // Set realistic user agent and headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });

      // Build search URL
      const searchUrl = this.buildSearchUrl(siteConfig, keywords, location);
      console.log(`Navigating to: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for job listings to load
      await page.waitForSelector(siteConfig.selectors.jobCard, { timeout: 15000 });

      // Extract job data
      const siteJobs = await page.evaluate((config) => {
        const jobElements = document.querySelectorAll(config.selectors.jobCard);
        const jobList = [];

        jobElements.forEach(element => {
          try {
            const getText = (selector) => {
              const el = element.querySelector(selector);
              return el ? el.textContent.trim() : null;
            };

            const getHref = (selector) => {
              const el = element.querySelector(selector);
              return el ? el.href : null;
            };

            const title = getText(config.selectors.title);
            const company = getText(config.selectors.company);
            const location = getText(config.selectors.location);
            const salary = getText(config.selectors.salary);
            const summary = getText(config.selectors.summary);
            const date = getText(config.selectors.date);
            let link = getHref(config.selectors.link);

            // Make relative URLs absolute
            if (link && !link.startsWith('http')) {
              link = new URL(link, config.url).href;
            }

            if (title && company) {
              jobList.push({
                title,
                company,
                location: location || 'South Africa',
                salary,
                summary,
                datePosted: date || new Date().toISOString().split('T')[0],
                link,
                source: config.name,
                scrapedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error parsing job element:', error);
          }
        });

        return jobList;
      }, siteConfig);

      jobs.push(...siteJobs);
      
      await page.close();
      
    } catch (error) {
      console.error(`Error scraping ${site}:`, error);
      throw error;
    }
    
    return jobs.slice(0, limit);
  }

  buildSearchUrl(siteConfig, keywords, location) {
    const encodedKeywords = encodeURIComponent(keywords);
    const encodedLocation = encodeURIComponent(location);
    
    switch (siteConfig.name) {
      case 'Indeed South Africa':
        return `${siteConfig.url}${siteConfig.searchPath}?q=${encodedKeywords}&l=${encodedLocation}&sort=date`;
      
      case 'PNet South Africa':
        return `${siteConfig.url}${siteConfig.searchPath}?keywords=${encodedKeywords}&location=${encodedLocation}`;
      
      case 'CareerJet South Africa':
        return `${siteConfig.url}${siteConfig.searchPath}?s=${encodedKeywords}&l=${encodedLocation}`;
      
      case 'Careers24':
        return `${siteConfig.url}${siteConfig.searchPath}?keywords=${encodedKeywords}&location=${encodedLocation}`;
      
      default:
        return `${siteConfig.url}${siteConfig.searchPath}?q=${encodedKeywords}&l=${encodedLocation}`;
    }
  }

  async processAndStoreJobs(jobs) {
    const processedJobs = [];
    
    for (const jobData of jobs) {
      try {
        // Check if job already exists
        const existingJob = await Job.findOne({
          title: jobData.title,
          company: jobData.company,
          location: jobData.location
        });

        if (existingJob) {
          // Update existing job if needed
          if (existingJob.isActive) {
            processedJobs.push(existingJob);
          }
          continue;
        }

        // Enhance job data with additional processing
        const enhancedJob = await this.enhanceJobData(jobData);
        
        // Create new job record
        const job = new Job({
          title: enhancedJob.title,
          company: enhancedJob.company,
          description: enhancedJob.description || enhancedJob.summary || 'No description available',
          location: enhancedJob.location,
          salaryRange: this.parseSalary(enhancedJob.salary),
          jobType: this.detectJobType(enhancedJob),
          experienceLevel: this.detectExperienceLevel(enhancedJob),
          applicationUrl: enhancedJob.link,
          source: {
            website: enhancedJob.source,
            url: enhancedJob.link,
            scrapedId: this.generateScrapedId(enhancedJob)
          },
          isRemote: this.isRemoteJob(enhancedJob),
          categories: this.detectCategories(enhancedJob),
          skills: this.extractSkills(enhancedJob),
          postedDate: this.parseDate(enhancedJob.datePosted),
          metadata: {
            qualityScore: this.calculateQualityScore(enhancedJob),
            scrapedAccuracy: 85 // Default accuracy score
          }
        });

        await job.save();
        await job.calculateQualityScore(); // Recalculate with full data
        
        processedJobs.push(job);
        
      } catch (error) {
        console.error('Error processing job:', error);
        continue;
      }
    }
    
    return processedJobs;
  }

  async enhanceJobData(jobData) {
    // Basic enhancement - in production, you might use AI for this
    const enhanced = { ...jobData };
    
    // Clean up company name
    if (enhanced.company) {
      enhanced.company = enhanced.company.replace(/[\n\t]/g, ' ').trim();
    }
    
    // Extract additional information from summary
    if (enhanced.summary) {
      enhanced.description = enhanced.summary;
      
      // Simple skill extraction
      const skills = this.extractSkillsFromText(enhanced.summary);
      if (skills.length > 0) {
        enhanced.skills = skills;
      }
    }
    
    return enhanced;
  }

  parseSalary(salaryText) {
    if (!salaryText) {
      return {
        min: 0,
        max: 0,
        isDisclosed: false
      };
    }

    try {
      // Common salary formats in South Africa
      const formats = [
        /R\s*(\d+[\d,]*)\s*-\s*R\s*(\d+[\d,]*)/i, // R 20,000 - R 30,000
        /R\s*(\d+[\d,]*)\s*per\s*(month|year|annum)/i, // R 25,000 per month
        /(\d+[\d,]*)\s*-\s*(\d+[\d,]*)\s*ZAR/i // 20000 - 30000 ZAR
      ];

      for (const format of formats) {
        const match = salaryText.match(format);
        if (match) {
          const min = parseInt(match[1].replace(/,/g, '')) || 0;
          const max = parseInt(match[2]?.replace(/,/g, '')) || min;
          const period = salaryText.toLowerCase().includes('year') || salaryText.toLowerCase().includes('annum') ? 'yearly' : 'monthly';

          return {
            min: Math.min(min, max),
            max: Math.max(min, max),
            currency: 'ZAR',
            period: period,
            isDisclosed: true
          };
        }
      }
    } catch (error) {
      console.error('Error parsing salary:', error);
    }

    return {
      min: 0,
      max: 0,
      isDisclosed: false
    };
  }

  detectJobType(jobData) {
    const text = `${jobData.title} ${jobData.description}`.toLowerCase();
    
    if (text.includes('part-time') || text.includes('part time')) return 'part-time';
    if (text.includes('contract')) return 'contract';
    if (text.includes('temporary') || text.includes('temp')) return 'temporary';
    if (text.includes('intern') || text.includes('graduate')) return 'internship';
    if (text.includes('remote') || text.includes('work from home')) return 'remote';
    if (text.includes('hybrid')) return 'hybrid';
    
    return 'full-time';
  }

  detectExperienceLevel(jobData) {
    const text = `${jobData.title} ${jobData.description}`.toLowerCase();
    
    if (text.includes('junior') || text.includes('entry level') || text.includes('graduate')) return 'entry';
    if (text.includes('senior') || text.includes('lead') || text.includes('principal') || text.includes('head of')) return 'senior';
    if (text.includes('executive') || text.includes('director') || text.includes('vp') || text.includes('c-level')) return 'executive';
    if (text.includes('mid') || text.includes('intermediate')) return 'mid';
    
    return 'not-specified';
  }

  isRemoteJob(jobData) {
    const text = `${jobData.title} ${jobData.description} ${jobData.location}`.toLowerCase();
    return text.includes('remote') || 
           text.includes('work from home') || 
           text.includes('wfh') ||
           text.includes('virtual') ||
           text.includes('anywhere');
  }

  detectCategories(jobData) {
    const categories = [];
    const text = `${jobData.title} ${jobData.description}`.toLowerCase();
    
    // Common job categories in South Africa
    const categoryKeywords = {
      'IT': ['software', 'developer', 'programmer', 'IT', 'tech', 'engineer', 'system', 'network'],
      'Finance': ['finance', 'accounting', 'bank', 'financial', 'audit', 'tax'],
      'Marketing': ['marketing', 'digital', 'social media', 'brand', 'advertising'],
      'Sales': ['sales', 'account manager', 'business development'],
      'Healthcare': ['health', 'medical', 'nurse', 'doctor', 'hospital'],
      'Education': ['education', 'teacher', 'lecturer', 'academic', 'school'],
      'Engineering': ['engineer', 'technical', 'manufacturing', 'production']
    };
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        categories.push(category);
      }
    }
    
    return categories.length > 0 ? categories : ['General'];
  }

  extractSkills(jobData) {
    const skills = new Set();
    const text = `${jobData.title} ${jobData.description}`;
    
    // Common skills in South African job market
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'C#', 'PHP', 'SQL', 'React', 'Angular', 'Vue',
      'Node.js', 'Spring', 'Django', 'Laravel', 'AWS', 'Azure', 'Docker', 'Kubernetes',
      'Machine Learning', 'Data Analysis', 'Project Management', 'Agile', 'Scrum',
      'SEO', 'Digital Marketing', 'Social Media', 'Content Writing', 'Graphic Design',
      'Accounting', 'Financial Analysis', 'Risk Management', 'Sales', 'Negotiation',
      'Customer Service', 'Communication', 'Leadership', 'Teamwork', 'Problem Solving'
    ];
    
    for (const skill of commonSkills) {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        skills.add(skill);
      }
    }
    
    return Array.from(skills);
  }

  extractSkillsFromText(text) {
    const skills = [];
    // Simple keyword matching - in production, use more sophisticated NLP
    const skillKeywords = [
      'javascript', 'python', 'java', 'react', 'angular', 'node', 'sql', 'aws',
      'marketing', 'sales', 'management', 'analysis', 'development', 'design'
    ];
    
    skillKeywords.forEach(skill => {
      if (text.toLowerCase().includes(skill)) {
        skills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    });
    
    return skills;
  }

  parseDate(dateString) {
    if (!dateString) return new Date();
    
    try {
      // Handle relative dates like "2 days ago", "Just posted"
      if (dateString.includes('ago') || dateString.includes('today') || dateString.includes('just')) {
        return new Date();
      }
      
      // Handle specific date formats
      const parsed = new Date(dateString);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch (error) {
      return new Date();
    }
  }

  calculateQualityScore(jobData) {
    let score = 0;
    
    if (jobData.title && jobData.company) score += 30;
    if (jobData.description && jobData.description.length > 100) score += 25;
    if (jobData.salary) score += 20;
    if (jobData.skills && jobData.skills.length > 0) score += 15;
    if (jobData.categories && jobData.categories.length > 0) score += 10;
    
    return Math.min(score, 100);
  }

  generateScrapedId(jobData) {
    return SecurityManager.generateSignature(jobData, 'scraping_salt');
  }

  deduplicateJobs(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
      const key = `${job.title}-${job.company}-${job.location}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Continuous scraping for popular keywords
  async continuousScraping() {
    const popularKeywords = [
      'software developer',
      'data analyst',
      'project manager',
      'marketing specialist',
      'sales representative',
      'customer service',
      'accountant',
      'engineer',
      'teacher',
      'nurse',
      'graphic designer',
      'administrator'
    ];

    const locations = [
      'Johannesburg',
      'Cape Town',
      'Durban',
      'Pretoria',
      'Port Elizabeth',
      'Bloemfontein',
      'East London',
      'South Africa'
    ];

    const allJobs = [];
    const errors = [];

    for (const keyword of popularKeywords) {
      for (const location of locations) {
        try {
          console.log(`Continuous scraping: ${keyword} in ${location}`);
          
          const result = await this.scrapeJobs(keyword, location, 10);
          if (result.success) {
            allJobs.push(...result.jobs);
          } else {
            errors.push({ keyword, location, error: result.error });
          }
          
          // Longer delay for continuous scraping to be respectful
          await this.delay(10000 + Math.random() * 10000);
          
        } catch (error) {
          console.error(`Continuous scraping error for ${keyword} in ${location}:`, error);
          errors.push({ keyword, location, error: error.message });
        }
      }
    }

    await AuditLogger.log('CONTINUOUS_SCRAPING_COMPLETED', {
      resource: 'scraping',
      metadata: {
        totalJobs: allJobs.length,
        totalErrors: errors.length,
        keywordsScraped: popularKeywords.length,
        locationsScraped: locations.length
      }
    });

    return {
      totalJobs: allJobs.length,
      errors: errors,
      statistics: this.scrapingStats
    };
  }

  // Get scraping statistics
  getStatistics() {
    return {
      ...this.scrapingStats,
      isActive: this.isInitialized,
      uptime: process.uptime()
    };
  }

  // Health check
  async healthCheck() {
    try {
      await this.initialize();
      const page = await this.browser.newPage();
      await page.goto('https://www.google.com', { timeout: 10000 });
      await page.close();
      
      return {
        status: 'healthy',
        browser: 'connected',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Create and export singleton instance
const scrapingService = new ScrapingService();
export default scrapingService;
