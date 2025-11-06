import { OpenAI } from 'openai';
import { ContentGenerator } from '../ai_services/contentGenerator.js';

export class MarketingContentGenerator extends ContentGenerator {
  constructor() {
    super();
    this.campaigns = new Map();
  }

  async generateCompleteCampaign(duration = 7, theme = 'Career Success') {
    try {
      console.log(`Generating ${duration}-day marketing campaign with theme: ${theme}`);

      const campaign = {
        id: this.generateCampaignId(),
        theme,
        duration,
        startDate: new Date(),
        status: 'draft',
        content: {},
        schedule: [],
        performance: {
          estimatedReach: 0,
          engagementScore: 0,
          conversionPotential: 0
        },
        createdAt: new Date()
      };

      // Generate different types of content for the campaign
      campaign.content.reels = await this.generateReelSeries(duration);
      campaign.content.blogPosts = await this.generateBlogSeries(Math.ceil(duration / 2));
      campaign.content.emails = await this.generateEmailSeries(duration);
      campaign.content.socialPosts = await this.generateSocialPostSeries(duration);

      // Create publication schedule
      campaign.schedule = this.createPublicationSchedule(campaign.content, duration);
      
      // Calculate campaign performance metrics
      campaign.performance = this.calculateCampaignPerformance(campaign.content);

      // Store campaign
      this.campaigns.set(campaign.id, campaign);

      console.log(`Campaign ${campaign.id} generated successfully`);
      return campaign;

    } catch (error) {
      console.error('Campaign generation error:', error);
      throw new Error('Failed to generate marketing campaign');
    }
  }

  async generateReelSeries(count = 7) {
    const reelTopics = [
      "CV Mistakes That Cost You Interviews",
      "How AI Can 10x Your Job Search",
      "Salary Negotiation Secrets in South Africa",
      "Career Change Success Stories",
      "LinkedIn Profile Optimization",
      "Interview Preparation Masterclass",
      "Remote Work Opportunities in SA",
      "Career Growth During Economic Challenges",
      "Skills That Employers Are Looking For",
      "Personal Branding for Professionals"
    ];

    const reels = [];
    const selectedTopics = this.selectRandomTopics(reelTopics, count);

    for (const topic of selectedTopics) {
      try {
        const style = this.selectRandomStyle();
        const reel = await this.generateReelScript(topic, style);
        reels.push(reel);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error generating reel for ${topic}:`, error);
      }
    }

    return reels;
  }

  async generateBlogSeries(count = 3) {
    const blogTopics = [
      "The Future of Work in South Africa: 2024 Trends",
      "How AI is Revolutionizing Job Searching",
      "Building a Career in South Africa's Digital Economy",
      "Career Resilience: Thriving in Uncertain Times",
      "The Complete Guide to Remote Work in South Africa",
      "Upskilling for the Future: Top Courses and Certifications",
      "Navigating Career Transitions Successfully",
      "The Power of Networking in the South African Job Market"
    ];

    const blogs = [];
    const selectedTopics = this.selectRandomTopics(blogTopics, count);

    for (const topic of selectedTopics) {
      try {
        const blog = await this.generateBlogPost(topic);
        blogs.push(blog);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error generating blog for ${topic}:`, error);
      }
    }

    return blogs;
  }

  async generateEmailSeries(count = 7) {
    const emailThemes = [
      "Weekly Career Tips Roundup",
      "Job Market Insights Update",
      "Success Stories from Our Users",
      "New Features and Updates",
      "Industry Spotlight: Trending Careers",
      "Career Development Webinar Invitation",
      "Exclusive Job Opportunities",
      "Career Assessment Tools Available"
    ];

    const emails = [];
    const selectedThemes = this.selectRandomTopics(emailThemes, count);

    for (const theme of selectedThemes) {
      try {
        const email = await this.generateEmailNewsletter(theme);
        emails.push(email);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error generating email for ${theme}:`, error);
      }
    }

    return emails;
  }

  async generateSocialPostSeries(count = 7) {
    const postTemplates = [
      {
        type: 'tip',
        format: "💡 Career Tip: {content} \n\n{hashtags}"
      },
      {
        type: 'stat',
        format: "📊 Did you know? {content} \n\n{hashtags}"
      },
      {
        type: 'question',
        format: "❓ Question: {content} \n\nShare your thoughts below! 👇 \n\n{hashtags}"
      },
      {
        type: 'success',
        format: "🎉 Success Story: {content} \n\n{hashtags}"
      }
    ];

    const posts = [];
    
    for (let i = 0; i < count; i++) {
      const template = postTemplates[Math.floor(Math.random() * postTemplates.length)];
      const content = await this.generateSocialPostContent(template.type);
      
      const post = {
        type: template.type,
        content: template.format
          .replace('{content}', content)
          .replace('{hashtags}', this.generateHashtags(content)),
        platform: ['instagram', 'linkedin', 'twitter'][Math.floor(Math.random() * 3)],
        created: new Date()
      };
      
      posts.push(post);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return posts;
  }

  async generateSocialPostContent(type) {
    const prompts = {
      tip: "Generate a short, actionable career tip for social media (max 150 characters)",
      stat: "Generate an interesting statistic about job searching or careers in South Africa (max 120 characters)",
      question: "Generate an engaging question about career development that encourages comments (max 100 characters)",
      success: "Generate a brief success story about someone who found a job through CareerBoost (max 180 characters)"
    };

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You create engaging social media content for career-related platforms. You're concise, motivational, and know how to drive engagement."
          },
          {
            role: "user",
            content: prompts[type]
          }
        ],
        max_tokens: 100,
        temperature: 0.8
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Social post content generation error:', error);
      return this.getFallbackContent(type);
    }
  }

  createPublicationSchedule(content, duration) {
    const schedule = [];
    const startDate = new Date();
    
    let reelIndex = 0;
    let blogIndex = 0;
    let emailIndex = 0;
    let socialIndex = 0;

    for (let day = 0; day < duration; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);

      const dailySchedule = {
        date: date.toISOString().split('T')[0],
        posts: []
      };

      // Schedule 1 reel per day
      if (reelIndex < content.reels.length) {
        dailySchedule.posts.push({
          type: 'reel',
          content: content.reels[reelIndex],
          time: this.selectOptimalTime('reel'),
          platform: 'instagram'
        });
        reelIndex++;
      }

      // Schedule 1 social post per day
      if (socialIndex < content.socialPosts.length) {
        dailySchedule.posts.push({
          type: 'social',
          content: content.socialPosts[socialIndex],
          time: this.selectOptimalTime('social'),
          platform: content.socialPosts[socialIndex].platform
        });
        socialIndex++;
      }

      // Schedule blog posts every 2-3 days
      if (day % 2 === 0 && blogIndex < content.blogPosts.length) {
        dailySchedule.posts.push({
          type: 'blog',
          content: content.blogPosts[blogIndex],
          time: this.selectOptimalTime('blog'),
          platform: 'website'
        });
        blogIndex++;
      }

      // Schedule emails daily
      if (emailIndex < content.emails.length) {
        dailySchedule.posts.push({
          type: 'email',
          content: content.emails[emailIndex],
          time: this.selectOptimalTime('email'),
          platform: 'email'
        });
        emailIndex++;
      }

      schedule.push(dailySchedule);
    }

    return schedule;
  }

  calculateCampaignPerformance(content) {
    let totalScore = 0;
    let contentCount = 0;

    // Score reels
    content.reels.forEach(reel => {
      totalScore += this.estimateReelPerformance(reel);
      contentCount++;
    });

    // Score blog posts
    content.blogPosts.forEach(blog => {
      totalScore += this.estimateBlogPerformance(blog);
      contentCount++;
    });

    // Score emails
    content.emails.forEach(email => {
      totalScore += this.estimateEmailPerformance(email);
      contentCount++;
    });

    const avgScore = contentCount > 0 ? totalScore / contentCount : 0;

    return {
      estimatedReach: Math.round(avgScore * 1000),
      engagementScore: Math.round(avgScore * 100),
      conversionPotential: Math.round(avgScore * 10),
      overallScore: Math.round(avgScore * 100) / 100
    };
  }

  estimateReelPerformance(reel) {
    // Simple estimation based on content characteristics
    let score = 0.5; // Base score
    
    // Topic relevance
    const engagingTopics = ['mistakes', 'secrets', 'success', 'how to', 'tips'];
    if (engagingTopics.some(topic => reel.topic.toLowerCase().includes(topic))) {
      score += 0.2;
    }

    // Style factor
    if (reel.style === 'inspirational' || reel.style === 'educational') {
      score += 0.15;
    }

    // Hashtag count
    const hashtagCount = (reel.hashtags.match(/#/g) || []).length;
    score += Math.min(hashtagCount * 0.02, 0.1);

    return Math.min(score, 1);
  }

  estimateBlogPerformance(blog) {
    let score = 0.6; // Base score for blogs
    
    // Word count factor
    if (blog.wordCount > 800 && blog.wordCount < 1200) {
      score += 0.2;
    }

    // SEO keywords
    if (blog.seoKeywords && blog.seoKeywords.length >= 5) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  estimateEmailPerformance(email) {
    let score = 0.7; // Base score for emails
    
    // Subject line length
    if (email.subject && email.subject.length > 20 && email.subject.length < 60) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  // Utility methods
  selectRandomTopics(topics, count) {
    const shuffled = [...topics].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, topics.length));
  }

  selectRandomStyle() {
    const styles = ['professional', 'casual', 'inspirational', 'educational', 'conversational'];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  selectOptimalTime(contentType) {
    const timeSlots = {
      reel: ['09:00', '12:00', '17:00', '20:00'],
      social: ['08:00', '13:00', '18:00', '21:00'],
      blog: ['06:00', '10:00', '15:00'],
      email: ['07:00', '11:00', '16:00']
    };

    const slots = timeSlots[contentType] || timeSlots.social;
    return slots[Math.floor(Math.random() * slots.length)];
  }

  generateCampaignId() {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  getFallbackContent(type) {
    const fallback = {
      tip: "Always tailor your CV for each job application. Highlight relevant skills and achievements that match the job description.",
      stat: "85% of jobs are filled through networking. Build your professional connections!",
      question: "What's the biggest challenge you're facing in your job search right now?",
      success: "Meet Sarah! She went from retail to tech in 3 months with CareerBoost's AI-powered CV and job matching."
    };
    return fallback[type] || fallback.tip;
  }

  // Campaign management methods
  getCampaign(campaignId) {
    return this.campaigns.get(campaignId);
  }

  getAllCampaigns() {
    return Array.from(this.campaigns.values());
  }

  updateCampaignStatus(campaignId, status) {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = status;
      campaign.updatedAt = new Date();
      return true;
    }
    return false;
  }

  deleteCampaign(campaignId) {
    return this.campaigns.delete(campaignId);
  }

  // Export campaign for content management system
  exportCampaign(campaignId, format = 'json') {
    const campaign = this.getCampaign(campaignId);
    if (!campaign) return null;

    switch (format) {
      case 'json':
        return JSON.stringify(campaign, null, 2);
      case 'csv':
        return this.exportToCSV(campaign);
      case 'calendar':
        return this.exportToCalendar(campaign);
      default:
        return campaign;
    }
  }

  exportToCSV(campaign) {
    let csv = 'Date,Type,Platform,Time,Topic\n';
    
    campaign.schedule.forEach(day => {
      day.posts.forEach(post => {
        csv += `"${day.date}","${post.type}","${post.platform}","${post.time}","${post.content.topic || post.content.theme}"\n`;
      });
    });

    return csv;
  }

  exportToCalendar(campaign) {
    // Basic iCal format (simplified)
    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//CareerBoost//Marketing Campaign//EN\n';
    
    campaign.schedule.forEach(day => {
      day.posts.forEach((post, index) => {
        const eventId = `${campaign.id}_${day.date.replace(/-/g, '')}_${index}`;
        const startTime = `${day.date}T${post.time}:00`;
        const endTime = `${day.date}T${this.addHours(post.time, 1)}:00`;
        
        ical += `BEGIN:VEVENT\n`;
        ical += `UID:${eventId}\n`;
        ical += `DTSTART:${startTime}\n`;
        ical += `DTEND:${endTime}\n`;
        ical += `SUMMARY:${post.type.toUpperCase()} - ${post.content.topic || post.content.theme}\n`;
        ical += `DESCRIPTION:${post.platform} ${post.type}\n`;
        ical += `END:VEVENT\n`;
      });
    });
    
    ical += 'END:VCALENDAR';
    return ical;
  }

  addHours(time, hours) {
    const [h, m] = time.split(':').map(Number);
    let newHour = h + hours;
    if (newHour >= 24) newHour -= 24;
    return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}

export default MarketingContentGenerator;
