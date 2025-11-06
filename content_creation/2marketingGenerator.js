import { OpenAI } from 'openai';

export class MarketingContentGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateReelScript(topic) {
    const prompt = `Create a engaging 30-second reel script about ${topic} for CareerBoost. 
    Focus on how AI helps job seekers find better opportunities. 
    Include hooks, key points, and call-to-action.`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You create viral social media content for career services."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return completion.choices[0].message.content;
  }

  async generateShortContent() {
    const topics = [
      "CV Tips for 2024",
      "How AI Finds Hidden Jobs",
      "Salary Negotiation Secrets",
      "Career Change Success Stories"
    ];

    const contents = [];
    
    for (const topic of topics) {
      const content = await this.generateReelScript(topic);
      contents.push({
        topic,
        script: content,
        hashtags: this.generateHashtags(topic),
        created: new Date()
      });
    }

    return contents;
  }

  generateHashtags(topic) {
    const baseTags = ['CareerBoost', 'JobSearch', 'CareerGoals', 'SouthAfrica'];
    const topicTags = topic.toLowerCase().split(' ').map(word => `#${word}`);
    return [...baseTags, ...topicTags].join(' ');
  }
}
