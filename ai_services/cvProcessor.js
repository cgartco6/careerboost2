import { OpenAI } from 'openai';
import PDFParser from 'pdf-parse';

export class CVProcessor {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async extractTextFromPDF(pdfBuffer) {
    try {
      const data = await PDFParser(pdfBuffer);
      return data.text;
    } catch (error) {
      throw new Error('PDF extraction failed');
    }
  }

  async rewriteCV(originalText, targetIndustry) {
    const prompt = `
      Rewrite and enhance the following CV for the ${targetIndustry} industry.
      Make it professional, ATS-friendly, and highlight relevant skills.
      Maintain the original structure but improve wording and impact.
      
      Original CV:
      ${originalText}
    `;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional CV writer and career coach. Enhance CVs for better job matching."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000
    });

    return completion.choices[0].message.content;
  }

  async generateCoverLetter(cvText, jobDescription) {
    const prompt = `
      Generate a professional cover letter based on the CV below, tailored for this job:
      
      Job Description: ${jobDescription}
      
      CV: ${cvText}
      
      Create a compelling cover letter that highlights relevant experience and skills.
    `;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert cover letter writer who creates personalized, compelling cover letters."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500
    });

    return completion.choices[0].message.content;
  }
}
