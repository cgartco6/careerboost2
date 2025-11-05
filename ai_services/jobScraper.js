import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { JSDOM } from 'jsdom';
import axios from 'axios';

puppeteer.use(StealthPlugin());

export class JobScraper {
  constructor() {
    this.jobSites = {
      indeed: 'https://www.indeed.co.za/jobs',
      careerjet: 'https://www.careerjet.co.za',
      pnet: 'https://www.pnet.co.za'
    };
  }

  async scrapeJobs(keywords, location = 'South Africa') {
    const jobs = [];
    
    try {
      // Indeed scraping
      const indeedJobs = await this.scrapeIndeed(keywords, location);
      jobs.push(...indeedJobs);
      
      // CareerJet scraping
      const careerjetJobs = await this.scrapeCareerJet(keywords, location);
      jobs.push(...careerjetJobs);
      
    } catch (error) {
      console.error('Scraping error:', error);
    }
    
    return this.deduplicateJobs(jobs);
  }

  async scrapeIndeed(keywords, location) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const url = `${this.jobSites.indeed}?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}`;
      await page.goto(url, { waitUntil: 'networkidle2' });

      const jobs = await page.evaluate(() => {
        const jobElements = document.querySelectorAll('.jobsearch-SerpJobCard');
        const jobList = [];

        jobElements.forEach(element => {
          const title = element.querySelector('.title a')?.textContent?.trim();
          const company = element.querySelector('.company')?.textContent?.trim();
          const location = element.querySelector('.location')?.textContent?.trim();
          const summary = element.querySelector('.summary')?.textContent?.trim();
          const link = element.querySelector('.title a')?.href;

          if (title && company) {
            jobList.push({
              title,
              company,
              location,
              summary,
              link: link ? new URL(link, window.location.origin).href : null,
              source: 'Indeed',
              datePosted: new Date().toISOString()
            });
          }
        });

        return jobList;
      });

      return jobs;
    } finally {
      await browser.close();
    }
  }

  async scrapeCareerJet(keywords, location) {
    // Implementation for CareerJet
    return [];
  }

  deduplicateJobs(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
      const key = `${job.title}-${job.company}-${job.location}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
