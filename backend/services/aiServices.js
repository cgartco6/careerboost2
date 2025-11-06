import { OpenAI } from 'openai';
import PDFParser from 'pdf-parse';
import mammoth from 'mammoth';
import { SecurityManager } from '../security/encryption.js';

export class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 3
    });
    this.availableModels = {
      fast: 'gpt-3.5-turbo',
      quality: 'gpt-4',
      latest: 'gpt-4-turbo-preview'
    };
  }

  async processCV(cvBuffer, fileType, targetIndustry, userId) {
    try {
      console.log(`Processing CV for user ${userId}, industry: ${targetIndustry}`);
      
      // Extract text from file
      const extractedText = await this.extractTextFromFile(cvBuffer, fileType);
      
      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('CV text extraction failed or content too short');
      }

      // Analyze CV content
      const analysis = await this.analyzeCVContent(extractedText, targetIndustry);
      
      // Enhance CV with AI
      const enhancedCV = await this.enhanceCV(extractedText, targetIndustry, analysis);
      
      // Generate ATS-optimized version
      const atsOptimizedCV = await this.optimizeForATS(enhancedCV, targetIndustry);
      
      // Generate cover letter template
      const coverLetter = await this.generateCoverLetterTemplate(extractedText, targetIndustry);

      return {
        success: true,
        originalText: SecurityManager.encryptSensitiveData(extractedText),
        enhancedCV: atsOptimizedCV,
        coverLetter: coverLetter,
        analysis: analysis,
        metadata: {
          originalLength: extractedText.length,
          enhancedLength: atsOptimizedCV.length,
          processingTime: new Date(),
          modelUsed: this.availableModels.quality
        }
      };
    } catch (error) {
      console.error('CV processing error:', error);
      throw new Error(`CV processing failed: ${error.message}`);
    }
  }

  async extractTextFromFile(buffer, fileType) {
    try {
      switch (fileType) {
        case 'application/pdf':
          return await this.extractTextFromPDF(buffer);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractTextFromDOCX(buffer);
        case 'application/msword':
          return await this.extractTextFromDOC(buffer);
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error(`Failed to extract text from file: ${error.message}`);
    }
  }

  async extractTextFromPDF(buffer) {
    try {
      const data = await PDFParser(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  async extractTextFromDOCX(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  }

  async extractTextFromDOC(buffer) {
    // For .doc files, we might need a different approach
    // This is a simplified version - in production you might use a different library
    throw new Error('DOC file format not supported. Please use PDF or DOCX.');
  }

  async analyzeCVContent(cvText, targetIndustry) {
    const prompt = `
      Analyze the following CV content for a candidate targeting the ${targetIndustry} industry.
      
      CV Content:
      ${cvText.substring(0, 3000)}
      
      Please provide a comprehensive analysis with the following sections:
      
      1. STRENGTHS_ANALYSIS: Identify key strengths and unique selling points
      2. IMPROVEMENT_AREAS: Identify areas that need improvement
      3. SKILLS_GAP: Compare current skills with ${targetIndustry} requirements
      4. KEYWORD_ANALYSIS: Identify relevant keywords for ${targetIndustry}
      5. ATS_COMPATIBILITY: Assess ATS compatibility score (1-100)
      6. CAREER_RECOMMENDATIONS: Specific recommendations for ${targetIndustry}
      
      Format the response as a JSON object with these exact keys.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.availableModels.quality,
        messages: [
          {
            role: "system",
            content: "You are an expert CV analyst and career coach. You provide detailed, actionable feedback to help candidates improve their CVs for specific industries."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      
      // Validate analysis structure
      const requiredKeys = ['STRENGTHS_ANALYSIS', 'IMPROVEMENT_AREAS', 'SKILLS_GAP', 'KEYWORD_ANALYSIS', 'ATS_COMPATIBILITY', 'CAREER_RECOMMENDATIONS'];
      for (const key of requiredKeys) {
        if (!analysis[key]) {
          analysis[key] = 'Analysis not available';
        }
      }

      return analysis;
    } catch (error) {
      console.error('CV analysis error:', error);
      return this.getDefaultAnalysis(targetIndustry);
    }
  }

  async enhanceCV(originalText, targetIndustry, analysis) {
    const prompt = `
      Rewrite and enhance the following CV for the ${targetIndustry} industry.
      
      Original CV:
      ${originalText.substring(0, 2500)}
      
      Analysis Insights:
      - Strengths: ${analysis.STRENGTHS_ANALYSIS}
      - Improvements: ${analysis.IMPROVEMENT_AREAS}
      - Skills Gap: ${analysis.SKILLS_GAP}
      - Keywords: ${analysis.KEYWORD_ANALYSIS}
      
      Requirements:
      1. Maintain all factual information
      2. Use industry-specific terminology for ${targetIndustry}
      3. Optimize for ATS systems
      4. Use action-oriented language and quantify achievements
      5. Improve structure and readability
      6. Highlight relevant experience for ${targetIndustry}
      7. Keep professional tone
      
      Return only the enhanced CV text without any additional explanations.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.availableModels.quality,
        messages: [
          {
            role: "system",
            content: "You are a professional CV writer who enhances CVs for specific industries while maintaining accuracy and improving impact."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('CV enhancement error:', error);
      throw new Error('Failed to enhance CV');
    }
  }

  async optimizeForATS(cvText, targetIndustry) {
    const prompt = `
      Optimize the following CV for Applicant Tracking Systems (ATS) targeting ${targetIndustry} roles.
      
      CV Content:
      ${cvText.substring(0, 2000)}
      
      ATS Optimization Requirements:
      1. Ensure proper section headings (Experience, Education, Skills, etc.)
      2. Include relevant keywords for ${targetIndustry}
      3. Use standard formatting that ATS can parse easily
      4. Remove any complex formatting, tables, or columns
      5. Ensure chronological order where appropriate
      6. Use bullet points for achievements
      7. Include quantifiable results
      8. Standardize date formats
      9. Use common job titles
      
      Return the ATS-optimized CV text.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.availableModels.quality,
        messages: [
          {
            role: "system",
            content: "You are an ATS optimization expert who transforms CVs to be perfectly readable by applicant tracking systems while maintaining content quality."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.3
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('ATS optimization error:', error);
      return cvText; // Return original if optimization fails
    }
  }

  async generateCoverLetterTemplate(cvText, targetIndustry, specificCompany = null) {
    const companyContext = specificCompany 
      ? `for a position at ${specificCompany}`
      : `in the ${targetIndustry} industry`;

    const prompt = `
      Generate a professional cover letter template ${companyContext} based on the following CV.
      
      CV Content:
      ${cvText.substring(0, 1500)}
      
      Requirements:
      1. Professional and engaging tone
      2. Three main paragraphs: introduction, qualifications, call to action
      3. Include placeholders for customization: [Company Name], [Position Title], [Specific Achievement]
      4. Highlight relevant experience for ${targetIndustry}
      5. Show enthusiasm and confidence
      6. Include proper salutation and closing
      7. Length: 250-400 words
      
      Return the cover letter template with clear placeholders marked with brackets.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.availableModels.quality,
        messages: [
          {
            role: "system",
            content: "You are an expert cover letter writer who creates professional, customizable templates that help candidates stand out."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.6
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Cover letter generation error:', error);
      return this.getDefaultCoverLetterTemplate(targetIndustry);
    }
  }

  async matchJobsToCV(cvText, jobs, maxMatches = 10) {
    try {
      const prompt = `
        Analyze the following CV and match it to the most suitable jobs from the list provided.
        
        CV Content:
        ${cvText.substring(0, 2000)}
        
        Available Jobs (format: Title | Company | Description):
        ${jobs.slice(0, 50).map(job => 
          `${job.title} | ${job.company} | ${job.description?.substring(0, 200) || 'No description'}`
        ).join('\n')}
        
        Return a JSON array of job matches with this structure:
        [
          {
            "jobId": "identifier",
            "matchScore": 85,
            "reasoning": "Key matching factors",
            "recommendations": "How to improve application"
          }
        ]
        
        Consider:
        - Skills alignment
        - Experience level match
        - Industry relevance
        - Location preferences
        - Salary expectations
        
        Return only the JSON array, no additional text.
      `;

      const completion = await this.openai.chat.completions.create({
        model: this.availableModels.quality,
        messages: [
          {
            role: "system",
            content: "You are a job matching expert who accurately matches candidate profiles to suitable job opportunities based on skills, experience, and preferences."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.4,
        response_format: { type: "json_object" }
      });

      const matches = JSON.parse(completion.choices[0].message.content);
      return Array.isArray(matches) ? matches.slice(0, maxMatches) : [];
    } catch (error) {
      console.error('Job matching error:', error);
      return [];
    }
  }

  async generateInterviewQuestions(jobDescription, cvText) {
    const prompt = `
      Generate relevant interview questions based on the job description and candidate's CV.
      
      Job Description:
      ${jobDescription?.substring(0, 1000) || 'Not provided'}
      
      Candidate CV:
      ${cvText.substring(0, 1000)}
      
      Generate 8-12 interview questions covering:
      1. Technical skills and experience
      2. Behavioral questions
      3. Situation-based questions
      4. Company-specific questions
      5. Career motivation
      
      Format as JSON array of questions with categories.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.availableModels.quality,
        messages: [
          {
            role: "system",
            content: "You are an experienced hiring manager who creates relevant, insightful interview questions tailored to specific candidates and job roles."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.5,
        response_format: { type: "json_object" }
      });

      const questions = JSON.parse(completion.choices[0].message.content);
      return questions.questions || questions.interviewQuestions || [];
    } catch (error) {
      console.error('Interview questions generation error:', error);
      return this.getDefaultInterviewQuestions();
    }
  }

  async analyzeJobDescription(jobDescription) {
    const prompt = `
      Analyze the following job description and extract key information:
      
      Job Description:
      ${jobDescription.substring(0, 2000)}
      
      Extract and return as JSON:
      {
        "requiredSkills": [],
        "preferredSkills": [],
        "experienceLevel": "",
        "educationRequirements": "",
        "keyResponsibilities": [],
        "companyCultureIndicators": [],
        "salaryIndicators": "",
        "redFlags": [],
        "greenFlags": []
      }
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.availableModels.fast,
        messages: [
          {
            role: "system",
            content: "You are a job description analyst who extracts key information and insights from job postings."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Job description analysis error:', error);
      return this.getDefaultJobAnalysis();
    }
  }

  // Utility methods
  getDefaultAnalysis(industry) {
    return {
      STRENGTHS_ANALYSIS: "Strong foundational skills and experience",
      IMPROVEMENT_AREAS: "Consider adding more industry-specific keywords",
      SKILLS_GAP: `Review current ${industry} requirements and identify skill gaps`,
      KEYWORD_ANALYSIS: "Include more relevant industry terminology",
      ATS_COMPATIBILITY: 70,
      CAREER_RECOMMENDATIONS: `Focus on developing ${industry}-specific expertise and networking`
    };
  }

  getDefaultCoverLetterTemplate(industry) {
    return `
Dear Hiring Manager,

I am writing to express my interest in positions within the ${industry} industry. With my background and skills, I am confident in my ability to contribute effectively to your organization.

My experience has provided me with a strong foundation in relevant areas, and I am particularly drawn to opportunities that allow for growth and challenge. I have developed key skills that I believe align well with the requirements of roles in ${industry}.

I am excited about the possibility of bringing my dedication and expertise to your team. I would welcome the opportunity to discuss how my background and skills would be a valuable asset to your organization.

Thank you for considering my application. I look forward to the possibility of discussing this opportunity further.

Sincerely,
[Your Name]
    `.trim();
  }

  getDefaultInterviewQuestions() {
    return [
      "Tell me about yourself and your background.",
      "What interests you about this position?",
      "What are your greatest strengths?",
      "What is your greatest weakness?",
      "Describe a challenging situation and how you handled it.",
      "Where do you see yourself in 5 years?",
      "Why should we hire you?",
      "What are your salary expectations?"
    ];
  }

  getDefaultJobAnalysis() {
    return {
      requiredSkills: [],
      preferredSkills: [],
      experienceLevel: "not-specified",
      educationRequirements: "not-specified",
      keyResponsibilities: [],
      companyCultureIndicators: [],
      salaryIndicators: "",
      redFlags: [],
      greenFlags: []
    };
  }

  // Health check for AI service
  async healthCheck() {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.availableModels.fast,
        messages: [
          {
            role: "user",
            content: "Hello, please respond with 'OK' if you're working."
          }
        ],
        max_tokens: 10
      });

      return {
        status: 'healthy',
        response: completion.choices[0].message.content,
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
const aiService = new AIService();
export default aiService;
