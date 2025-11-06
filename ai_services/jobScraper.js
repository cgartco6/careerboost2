import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());

export class JobScraper {
  constructor() {
    this.jobSites = {
      indeed: 'https://www.indeed.co.za',
      careerjet: 'https://www.careerjet.co.za',
      pnet: 'https://www.pnet.co.za',
      careers24: 'https://www.careers24.com'
    };
    this.browser = null;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeJobs(keywords, location = 'South Africa', limit = 50) {
    await this.initialize();
    
    const jobs = [];
    
    try {
      console.log(`Starting job scraping for: ${keywords} in ${location}`);

      // Scrape from multiple sources
      const indeedJobs = await this.scrapeIndeed(keywords, location, limit / 4);
      jobs.push(...indeedJobs);
      
      const pnetJobs = await this.scrapePnet(keywords, location, limit / 4);
      jobs.push(...pnetJobs);
      
      const careerjetJobs = await this.scrapeCareerJet(keywords, location, limit / 4);
      jobs.push(...careerjetJobs);

      console.log(`Total jobs found: ${jobs.length}`);
      
    } catch (error) {
      console.error('Scraping error:', error);
    } finally {
      await this.close();
    }
    
    return this.deduplicateJobs(jobs).slice(0, limit);
  }

  async scrapeIndeed(keywords, location, limit) {
    const jobs = [];
    
    try {
      const page = await this.browser.newPage();
      
      // Set realistic user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      
      const encodedKeywords = encodeURIComponent(keywords);
      const encodedLocation = encodeURIComponent(location);
      const url = `${this.jobSites.indeed}/jobs?q=${encodedKeywords}&l=${encodedLocation}&sort=date`;
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for job results to load
      await page.waitForSelector('.jobsearch-SerpJobCard', { timeout: 10000 });

      const indeedJobs = await page.evaluate((siteUrl) => {
        const jobElements = document.querySelectorAll('.jobsearch-SerpJobCard');
        const jobList = [];

        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('.title a');
            const companyElement = element.querySelector('.company');
            const locationElement = element.querySelector('.location');
            const summaryElement = element.querySelector('.summary');
            const salaryElement = element.querySelector('.salary-snippet');
            const dateElement = element.querySelector('.date');

            const title = titleElement?.textContent?.trim();
            const company = companyElement?.textContent?.trim();
            const location = locationElement?.textContent?.trim();
            const summary = summaryElement?.textContent?.trim();
            const salary = salaryElement?.textContent?.trim();
            const date = dateElement?.textContent?.trim();
            
            let link = titleElement?.href;
            if (link && !link.startsWith('http')) {
              link = new URL(link, siteUrl).href;
            }

            if (title && company) {
              jobList.push({
                title,
                company,
                location: location || 'South Africa',
                summary,
                salary,
                datePosted: date || new Date().toISOString().split('T')[0],
                link,
                source: 'Indeed',
                scrapedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error parsing job element:', error);
          }
        });

        return jobList;
      }, this.jobSites.indeed);

      jobs.push(...indeedJobs);
      
      await page.close();
      
    } catch (error) {
      console.error('Indeed scraping error:', error);
    }
    
    return jobs.slice(0, limit);
  }

  async scrapePnet(keywords, location, limit) {
    const jobs = [];
    
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const encodedKeywords = encodeURIComponent(keywords);
      const encodedLocation = encodeURIComponent(location);
      const url = `${this.jobSites.pnet}/jobs?keywords=${encodedKeywords}&location=${encodedLocation}`;
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await page.waitForSelector('.job-element', { timeout: 10000 });

      const pnetJobs = await page.evaluate((siteUrl) => {
        const jobElements = document.querySelectorAll('.job-element');
        const jobList = [];

        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('.job-title a');
            const companyElement = element.querySelector('.company');
            const locationElement = element.querySelector('.location');
            const summaryElement = element.querySelector('.description');

            const title = titleElement?.textContent?.trim();
            const company = companyElement?.textContent?.trim();
            const location = locationElement?.textContent?.trim();
            const summary = summaryElement?.textContent?.trim();
            
            let link = titleElement?.href;
            if (link && !link.startsWith('http')) {
              link = new URL(link, siteUrl).href;
            }

            if (title && company) {
              jobList.push({
                title,
                company,
                location: location || 'South Africa',
                summary,
                datePosted: new Date().toISOString().split('T')[0],
                link,
                source: 'PNet',
                scrapedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error parsing PNet job element:', error);
          }
        });

        return jobList;
      }, this.jobSites.pnet);

      jobs.push(...pnetJobs);
      
      await page.close();
      
    } catch (error) {
      console.error('PNet scraping error:', error);
    }
    
    return jobs.slice(0, limit);
  }

  async scrapeCareerJet(keywords, location, limit) {
    const jobs = [];
    
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const encodedKeywords = encodeURIComponent(keywords);
      const encodedLocation = encodeURIComponent(location);
      const url = `${this.jobSites.careerjet}/search/jobs?s=${encodedKeywords}&l=${encodedLocation}`;
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await page.waitForSelector('.job', { timeout: 10000 });

      const careerjetJobs = await page.evaluate((siteUrl) => {
        const jobElements = document.querySelectorAll('.job');
        const jobList = [];

        jobElements.forEach(element => {
          try {
            const titleElement = element.querySelector('.title a');
            const companyElement = element.querySelector('.company');
            const locationElement = element.querySelector('.location');
            const summaryElement = element.querySelector('.description');

            const title = titleElement?.textContent?.trim();
            const company = companyElement?.textContent?.trim();
            const location = locationElement?.textContent?.trim();
            const summary = summaryElement?.textContent?.trim();
            
            let link = titleElement?.href;
            if (link && !link.startsWith('http')) {
              link = new URL(link, siteUrl).href;
            }

            if (title && company) {
              jobList.push({
                title,
                company,
                location: location || 'South Africa',
                summary,
                datePosted: new Date().toISOString().split('T')[0],
                link,
                source: 'CareerJet',
                scrapedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error parsing CareerJet job element:', error);
          }
        });

        return jobList;
      }, this.jobSites.careerjet);

      jobs.push(...careerjetJobs);
      
      await page.close();
      
    } catch (error) {
      console.error('CareerJet scraping error:', error);
    }
    
    return jobs.slice(0, limit);
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

  // Method to continuously scrape jobs (for cron job)
  async continuousScraping() {
    const popularKeywords = [
      'software developer',
      'data analyst',
      'project manager',
      'marketing specialist',
      'sales representative',
      'customer service',
      'accountant',
      'engineer'
    ];

    const locations = [
      'Johannesburg',
      'Cape Town',
      'Durban',
      'Pretoria',
      'Port Elizabeth',
      'South Africa'
    ];

    const allJobs = [];

    for (const keyword of popularKeywords) {
      for (const location of locations) {
        try {
          const jobs = await this.scrapeJobs(keyword, location, 10);
          allJobs.push(...jobs);
          
          // Delay to be respectful to websites
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Error scraping ${keyword} in ${location}:`, error);
        }
      }
    }

    return this.deduplicateJobs(allJobs);
  }
}

export default JobScraper;
