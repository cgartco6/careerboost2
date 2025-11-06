import { OpenAI } from 'openai';

export class ContentGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateReelScript(topic, style = 'professional') {
    const prompt = `
      Create an engaging 30-second reel script about "${topic}" for CareerBoost - an AI-powered career service platform.
      
      Style: ${style}
      Platform: Instagram Reels / TikTok
      Duration: 30 seconds
      Target Audience: Job seekers in South Africa (ages 20-45)
      
      Requirements:
      - Start with a strong hook (first 3 seconds)
      - Include 3 key points about how CareerBoost helps
      - End with clear call-to-action
      - Use trending reel format (text overlays, quick cuts)
      - Include relevant hashtags
      - Keep language conversational and engaging
      
      Format:
      [Visual Description]: [Spoken Script] | [Text Overlay]
      
      Return the script in a structured format with timing cues.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a viral social media content creator specializing in career advice and job search content. You create engaging, shareable content that performs well on Instagram Reels and TikTok."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.8
      });

      return {
        topic,
        style,
        script: completion.choices[0].message.content.trim(),
        hashtags: this.generateHashtags(topic),
        created: new Date(),
        type: 'reel'
      };
    } catch (error) {
      console.error('Reel script generation error:', error);
      throw new Error('Failed to generate reel script');
    }
  }

  async generateShortContent() {
    const topics = [
      "CV Tips for 2024",
      "How AI Finds Hidden Jobs",
      "Salary Negotiation Secrets",
      "Career Change Success Stories",
      "ATS Optimization Tips",
      "Interview Preparation Guide",
      "Networking Strategies",
      "Remote Work Opportunities"
    ];

    const styles = ['professional', 'casual', 'inspirational', 'educational'];
    
    const contents = [];
    
    for (const topic of topics.slice(0, 4)) { // Generate 4 pieces of content
      const style = styles[Math.floor(Math.random() * styles.length)];
      
      try {
        const content = await this.generateReelScript(topic, style);
        contents.push(content);
        
        // Delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error generating content for ${topic}:`, error);
      }
    }

    return contents;
  }

  async generateBlogPost(topic) {
    const prompt = `
      Write a comprehensive blog post about "${topic}" focused on job searching and career development in South Africa.
      
      Requirements:
      - Title that grabs attention
      - Introduction that addresses pain points
      - 5-7 main points with practical advice
      - Include South African context and examples
      - Actionable tips and steps
      - Conclusion with motivation
      - SEO-optimized with natural keyword placement
      - Word count: 800-1200 words
      
      Format the content in proper HTML with headings, paragraphs, and bullet points where appropriate.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a career expert and professional blogger writing for job seekers in South Africa. You provide valuable, actionable advice that helps people advance their careers."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      return {
        topic,
        type: 'blog',
        content: completion.choices[0].message.content.trim(),
        wordCount: completion.choices[0].message.content.split(' ').length,
        created: new Date(),
        seoKeywords: this.extractKeywords(topic)
      };
    } catch (error) {
      console.error('Blog post generation error:', error);
      throw new Error('Failed to generate blog post');
    }
  }

  async generateEmailNewsletter(theme) {
    const prompt = `
      Create an engaging email newsletter for CareerBoost subscribers with the theme: "${theme}"
      
      Structure:
      1. Catchy subject line
      2. Personalized greeting
      3. Main featured content (career tip of the week)
      4. Success story or case study
      5. Latest job market insights
      6. Upcoming features or news
      7. Call-to-action (encourage engagement)
      8. Professional closing
      
      Tone: Professional yet friendly, motivational
      Length: 300-500 words
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional email marketer specializing in career development content. You create engaging newsletters that provide value and keep subscribers interested."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.6
      });

      return {
        theme,
        type: 'email',
        content: completion.choices[0].message.content.trim(),
        created: new Date(),
        subject: this.extractSubjectLine(completion.choices[0].message.content)
      };
    } catch (error) {
      console.error('Email newsletter generation error:', error);
      throw new Error('Failed to generate email newsletter');
    }
  }

  generateHashtags(topic) {
    const baseTags = [
      '#CareerBoost', 
      '#JobSearch', 
      '#CareerGoals', 
      '#SouthAfricaJobs',
      '#HiringSouthAfrica',
      '#CareerAdvice'
    ];
    
    const topicTags = topic.toLowerCase()
      .split(' ')
      .filter(word => word.length > 3)
      .map(word => `#${word.replace(/[^a-z0-9]/g, '')}`);
    
    const industryTags = [
      '#TechJobs', 
      '#FinanceCareers', 
      '#MarketingJobs', 
      '#EngineeringCareers'
    ];
    
    const allTags = [...baseTags, ...topicTags, ...industryTags[Math.floor(Math.random() * industryTags.length)]];
    
    // Return unique tags, max 15
    return [...new Set(allTags)].slice(0, 15).join(' ');
  }

  extractKeywords(topic) {
    const words = topic.toLowerCase().split(' ');
    const additionalKeywords = {
      'cv': ['resume', 'curriculum vitae', 'job application', 'career'],
      'job': ['employment', 'career', 'work', 'position'],
      'interview': ['meeting', 'assessment', 'evaluation'],
      'salary': ['compensation', 'pay', 'income', 'earnings']
    };
    
    let keywords = [...words];
    
    words.forEach(word => {
      if (additionalKeywords[word]) {
        keywords.push(...additionalKeywords[word]);
      }
    });
    
    return [...new Set(keywords)].slice(0, 10);
  }

  extractSubjectLine(content) {
    // Extract first line as subject
    const firstLine = content.split('\n')[0];
    return firstLine.replace(/^#+\s*/, '').trim();
  }

  // Batch content generation for marketing campaigns
  async generateMarketingCampaign(days = 7) {
    const campaign = {
      duration: days,
      content: [],
      schedule: []
    };

    const contentTypes = ['reel', 'blog', 'email'];
    
    for (let day = 1; day <= days; day++) {
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      let content;

      try {
        switch (contentType) {
          case 'reel':
            const topics = [
              "CV Mistakes to Avoid",
              "How to Ace Your Interview",
              "Networking Tips",
              "Career Growth Strategies"
            ];
            const topic = topics[Math.floor(Math.random() * topics.length)];
            content = await this.generateReelScript(topic);
            break;
            
          case 'blog':
            const blogTopics = [
              "The Future of Work in South Africa",
              "Remote Work Best Practices",
              "Career Transition Guide",
              "Building Your Personal Brand"
            ];
            const blogTopic = blogTopics[Math.floor(Math.random() * blogTopics.length)];
            content = await this.generateBlogPost(blogTopic);
            break;
            
          case 'email':
            const themes = [
              "Weekly Career Tips",
              "Job Market Update",
              "Success Stories",
              "New Features Announcement"
            ];
            const theme = themes[Math.floor(Math.random() * themes.length)];
            content = await this.generateEmailNewsletter(theme);
            break;
        }

        campaign.content.push(content);
        campaign.schedule.push({
          day,
          contentType: content.type,
          topic: content.topic || content.theme,
          publishTime: this.generatePublishTime()
        });

        // Delay between generations
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error generating content for day ${day}:`, error);
      }
    }

    return campaign;
  }

  generatePublishTime() {
    const times = ['09:00', '12:00', '15:00', '18:00'];
    return times[Math.floor(Math.random() * times.length)];
  }
}

export default ContentGenerator;
