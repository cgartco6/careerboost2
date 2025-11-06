import { OpenAI } from 'openai';
import PDFParser from 'pdf-parse';
import mammoth from 'mammoth';

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
      throw new Error('PDF extraction failed: ' + error.message);
    }
  }

  async extractTextFromDOCX(docxBuffer) {
    try {
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      return result.value;
    } catch (error) {
      throw new Error('DOCX extraction failed: ' + error.message);
    }
  }

  async extractTextFromFile(buffer, mimeType) {
    switch (mimeType) {
      case 'application/pdf':
        return await this.extractTextFromPDF(buffer);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await this.extractTextFromDOCX(buffer);
      default:
        throw new Error('Unsupported file type');
    }
  }

  async rewriteCV(originalText, targetIndustry) {
    const prompt = `
      You are a professional CV writer and career coach with expertise in the ${targetIndustry} industry.
      
      Please analyze and rewrite the following CV to make it:
      1. ATS (Applicant Tracking System) friendly
      2. Industry-specific with relevant keywords for ${targetIndustry}
      3. Professional, concise, and impactful
      4. Structured for easy reading
      5. Highlighting achievements with quantifiable results
      
      Maintain the original information but enhance the language, structure, and impact.
      Focus on action verbs and measurable achievements.
      
      Original CV Content:
      ${originalText.substring(0, 3000)} // Limit text to avoid token limits
      
      Return only the enhanced CV text without any additional explanations or markdown formatting.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert CV writer who creates professional, ATS-optimized resumes that help candidates stand out. You focus on clarity, impact, and relevance to the target industry."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('CV rewriting error:', error);
      throw new Error('Failed to rewrite CV: ' + error.message);
    }
  }

  async generateCoverLetter(cvText, jobDescription) {
    const prompt = `
      Generate a professional, compelling cover letter based on the candidate's CV and the target job description.
      
      Candidate's CV:
      ${cvText.substring(0, 2000)}
      
      Job Description:
      ${jobDescription}
      
      Requirements:
      1. Address it "Dear Hiring Manager"
      2. Highlight relevant experience and skills from the CV
      3. Show enthusiasm for the role and company
      4. Keep it to 3-4 paragraphs
      5. Professional tone but engaging
      6. Include a call to action
      7. End with "Sincerely" followed by space for signature
      
      Return only the cover letter text without any additional explanations.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert cover letter writer who creates personalized, compelling cover letters that get candidates interviews. You know how to match candidate experience to job requirements effectively."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Cover letter generation error:', error);
      throw new Error('Failed to generate cover letter: ' + error.message);
    }
  }

  async analyzeCVStrengths(cvText) {
    const prompt = `
      Analyze the following CV and identify:
      1. Key strengths and unique selling points
      2. Areas for improvement
      3. Missing information that could be valuable
      4. Skills that are in high demand
      
      CV Content:
      ${cvText.substring(0, 2000)}
      
      Provide a concise analysis in bullet points.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a career coach who provides insightful, constructive feedback on CVs to help candidates improve their job prospects."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.5
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('CV analysis error:', error);
      throw new Error('Failed to analyze CV: ' + error.message);
    }
  }

  async generateATSKeywords(industry) {
    const prompt = `
      Generate a list of 20-30 ATS (Applicant Tracking System) keywords and skills that are highly relevant for the ${industry} industry.
      Include technical skills, soft skills, tools, and methodologies.
      Format as a comma-separated list.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert in ATS optimization and know exactly what keywords recruiters and automated systems look for in different industries."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      return completion.choices[0].message.content.trim().split(',').map(kw => kw.trim());
    } catch (error) {
      console.error('ATS keywords generation error:', error);
      return []; // Return empty array rather than failing
    }
  }
}

export default CVProcessor;
