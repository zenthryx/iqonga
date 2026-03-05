const { PersonalityAgent } = require('./PersonalityAgent');
const { OpenAI } = require('openai');

class CompanyAwarePersonalityAgent extends PersonalityAgent {
  constructor(agentConfig, companyKnowledge) {
    super(agentConfig);
    this.companyKnowledge = companyKnowledge;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Override content generation to include company context
  async generateContent(options) {
    try {
      // Check if this should be company-related content
      const shouldIncludeCompany = await this.shouldIncludeCompanyInfo(options);
      
      if (shouldIncludeCompany) {
        return await this.generateCompanyAwareContent(options);
      } else {
        // Fall back to regular personality-driven content
        return await super.generateContent(options);
      }
    } catch (error) {
      console.error('Company-aware content generation failed:', error);
      // Fallback to regular generation
      return await super.generateContent(options);
    }
  }

  // Determine if company info should be included
  async shouldIncludeCompanyInfo(options) {
    try {
      const { type, platform, originalTweet, trends } = options;
      
      // Always include company info for original posts (scheduled content)
      if (type === 'original_post') {
        return true;
      }

      // For replies, check if the tweet mentions the company or related topics
      if (type === 'reply' && originalTweet) {
        const tweetText = originalTweet.text.toLowerCase();
        const companyName = this.companyKnowledge.companyProfile.name.toLowerCase();
        const productNames = this.companyKnowledge.products.map(p => p.name.toLowerCase());
        
        // Check if tweet mentions company, products, or industry keywords
        const relevantKeywords = [
          companyName,
          ...productNames,
          ...this.companyKnowledge.companyProfile.industry.toLowerCase().split(' '),
          'trading', 'ai', 'automation', 'platform', 'software', 'technology'
        ];

        return relevantKeywords.some(keyword => tweetText.includes(keyword));
      }

      // For trends, check if they relate to company's industry
      if (trends && trends.length > 0) {
        const industryKeywords = this.companyKnowledge.companyProfile.industry.toLowerCase().split(' ');
        return trends.some(trend => 
          industryKeywords.some(keyword => trend.toLowerCase().includes(keyword))
        );
      }

      return false;
    } catch (error) {
      console.error('Error determining company relevance:', error);
      return false;
    }
  }

  // Generate content with company knowledge
  async generateCompanyAwareContent(options) {
    try {
      const { type, platform, originalTweet, trends } = options;
      
      // Find relevant company information
      const relevantInfo = await this.findRelevantCompanyInfo(options);
      
      // Build enhanced prompt with company knowledge
      const companyPrompt = this.buildCompanyAwarePrompt(options, relevantInfo);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: companyPrompt
          },
          {
            role: "user",
            content: this.buildContentRequest(options)
          }
        ],
        max_tokens: 280,
        temperature: 0.9, // Higher temperature for more variety
        top_p: 0.9,
        frequency_penalty: 0.3, // Reduce repetition
        presence_penalty: 0.2, // Encourage new topics
      });

      const content = completion.choices[0].message.content || '';
      return this.postProcessContent(content, options);
    } catch (error) {
      console.error('Company-aware content generation failed:', error);
      return await super.generateContent(options);
    }
  }

  // Find relevant company information based on context
  async findRelevantCompanyInfo(options) {
    const { type, originalTweet, trends } = options;
    
    let relevantProducts = [];
    let relevantDocuments = [];
    
    if (originalTweet) {
      const tweetText = originalTweet.text.toLowerCase();
      
      // Find relevant products
      relevantProducts = this.companyKnowledge.products.filter(product => {
        const productKeywords = [
          product.name.toLowerCase(),
          ...product.keyFeatures.map(f => f.toLowerCase()),
          ...product.benefits.map(b => b.toLowerCase())
        ];
        return productKeywords.some(keyword => tweetText.includes(keyword));
      });

      // Find relevant documents
      relevantDocuments = this.companyKnowledge.documents.filter(doc => {
        const docKeywords = [
          doc.title.toLowerCase(),
          doc.summary.toLowerCase(),
          ...doc.content.toLowerCase().split(' ').slice(0, 50) // First 50 words
        ];
        return docKeywords.some(keyword => tweetText.includes(keyword));
      });
    }

    return {
      companyInfo: this.companyKnowledge.companyProfile,
      products: relevantProducts,
      documents: relevantDocuments
    };
  }

  // Build prompt with company knowledge
  buildCompanyAwarePrompt(options, relevantInfo) {
    const { type, platform } = options;
    
    return `
You are ${this.config.name}, a ${this.config.personality_type} AI agent.

CORE PERSONALITY:
- Voice Tone: ${this.config.voice_tone || 'casual'}
- Target Topics: ${this.config.target_topics ? this.config.target_topics.join(', ') : 'general topics'}

COMPANY INFORMATION:
Company: ${relevantInfo.companyInfo.name}
Industry: ${relevantInfo.companyInfo.industry}
Brand Voice: ${relevantInfo.companyInfo.brandVoice}
Key Messages: ${relevantInfo.companyInfo.keyMessages.join(', ')}
Target Audience: ${relevantInfo.companyInfo.targetAudience}

${relevantInfo.products.length > 0 ? `
RELEVANT PRODUCTS/SERVICES:
${relevantInfo.products.map(product => `
- ${product.name}: ${product.description}
  Key Benefits: ${product.benefits.join(', ')}
  Target Customers: ${product.targetCustomers}
`).join('\n')}
` : ''}

${relevantInfo.documents.length > 0 ? `
RELEVANT COMPANY DOCUMENTS:
${relevantInfo.documents.map(doc => `
- ${doc.title}: ${doc.summary || doc.content.substring(0, 200)}...
`).join('\n')}
` : ''}

IMPORTANT GUIDELINES:
- Naturally incorporate company information when relevant
- Don't sound like a corporate advertisement
- Maintain your personality while representing the brand
- Only mention products/services if they genuinely add value to the conversation
- Stay authentic to your character while being helpful about company offerings
- If someone asks about the company, provide helpful and accurate information
- Use the brand voice guidelines but filter through your personality
- For scheduled posts, focus on company-relevant content 80% of the time
- For replies, only include company info if it's genuinely helpful to the conversation
`;
  }

  // Build content request based on type
  buildContentRequest(options) {
    const { type, originalTweet, trends } = options;
    const timestamp = new Date().toISOString();
    
    if (type === 'reply' && originalTweet) {
      return `Someone posted: "${originalTweet.text}"

Generate a reply that:
1. Stays true to your personality
2. Addresses their post appropriately
3. Includes relevant company information if it would be genuinely helpful
4. Doesn't sound like a sales pitch
5. Keeps it under 280 characters

Current time: ${timestamp}`;
    } else if (type === 'original_post') {
      return `Create an original post that:
1. Fits your personality perfectly
2. Is engaging and authentic
3. Naturally incorporates relevant company information
4. Provides value to your audience
5. Represents the brand positively without being overly promotional
6. Keeps it under 280 characters
${trends ? `7. Relates to current trends: ${trends.join(', ')}` : ''}

Current time: ${timestamp}`;
    } else {
      return `Create content that:
1. Matches your personality
2. Includes relevant company information naturally
3. Is engaging and authentic
4. Keeps it under 280 characters

Current time: ${timestamp}`;
    }
  }

  // Post-process content to ensure quality
  postProcessContent(content, options) {
    let processedContent = content.trim();
    
    // Ensure it's not too long for Twitter
    if (processedContent.length > 280) {
      processedContent = processedContent.substring(0, 277) + '...';
    }
    
    // Add hashtags if enabled
    if (options.hashtags !== false) {
      const hashtags = this.generateRelevantHashtags(options);
      if (hashtags.length > 0) {
        const hashtagString = ' ' + hashtags.join(' ');
        if (processedContent.length + hashtagString.length <= 280) {
          processedContent += hashtagString;
        }
      }
    }
    
    return processedContent;
  }

  // Generate relevant hashtags
  generateRelevantHashtags(options) {
    const hashtags = [];
    
    // Add company hashtag
    const companyName = this.companyKnowledge.companyProfile.name.replace(/\s+/g, '');
    hashtags.push(`#${companyName}`);
    
    // Add industry hashtags
    const industry = this.companyKnowledge.companyProfile.industry.toLowerCase();
    if (industry.includes('technology') || industry.includes('ai')) {
      hashtags.push('#AI', '#Technology');
    }
    if (industry.includes('trading') || industry.includes('finance')) {
      hashtags.push('#Trading', '#Finance');
    }
    
    // Add product hashtags
    if (options.type === 'original_post') {
      this.companyKnowledge.products.forEach(product => {
        const productName = product.name.replace(/\s+/g, '');
        hashtags.push(`#${productName}`);
      });
    }
    
    // Limit to 3 hashtags to avoid spam
    return hashtags.slice(0, 3);
  }

  // Handle customer inquiries specifically
  async handleCustomerInquiry(inquiry) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `
You are ${this.config.name}, a ${this.config.personality_type} AI agent representing ${this.companyKnowledge.companyProfile.name}.

COMPANY INFORMATION:
${this.companyKnowledge.companyProfile.description}

PRODUCTS/SERVICES:
${this.companyKnowledge.products.map(product => `
- ${product.name}: ${product.description}
  Benefits: ${product.benefits.join(', ')}
  Target Customers: ${product.targetCustomers}
`).join('\n')}

BRAND VOICE: ${this.companyKnowledge.companyProfile.brandVoice}
KEY MESSAGES: ${this.companyKnowledge.companyProfile.keyMessages.join(', ')}

Respond to customer inquiries in your personality while providing accurate, helpful information about the company and products. Be authentic and helpful, not salesy.
`
          },
          {
            role: "user",
            content: inquiry
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('Customer inquiry handling failed:', error);
      return `Thanks for asking! I'd be happy to help you learn more about ${this.companyKnowledge.companyProfile.name}. What specific information are you looking for?`;
    }
  }
}

module.exports = { CompanyAwarePersonalityAgent };
