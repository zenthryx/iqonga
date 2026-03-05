const OpenAI = require('openai');
const logger = require('../utils/logger');
const database = require('../database/connection');
const ShopifyService = require('./ShopifyService');
const HubSpotService = require('./HubSpotService');
const GeminiService = require('./GeminiService');

class AIContentService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.defaultModel = 'gpt-4o-mini';
    this.fallbackModel = 'gpt-3.5-turbo';
    this.defaultProvider = 'openai'; // 'openai' or 'gemini'
  }

  /**
   * Generate lyrics only (standalone feature)
   * @param {object} options - Lyrics generation options
   * @param {number} userId - Optional user ID for company context
   * @param {object} agent - Optional agent for personality-driven lyrics
   * @returns {Promise<object>} Generated lyrics with metadata
   */
  async generateLyrics(options = {}, userId = null, agent = null) {
    try {
      let {
        topic = null,
        genre = null,
        mood = 'energetic',
        style = 'pop',
        language = 'en',
        length = 'medium', // 'short', 'medium', 'long'
        structure = 'auto', // 'auto', 'verse-chorus', 'verse-only', 'free-form'
        provider = this.defaultProvider
      } = options;

      // Get company knowledge if available
      let companyData = null;
      if (userId) {
        companyData = await this.getCompanyData(userId);
      } else if (agent && agent.user_id) {
        companyData = await this.getCompanyData(agent.user_id);
      }

      // Build personality context if agent provided
      let personalityContext = '';
      if (agent) {
        const personalityPrompt = this.getPersonalityPrompt(agent.personality_type || 'custom');
        const voiceTone = agent.voice_tone || 'professional';
        personalityContext = `\n\nAGENT PERSONALITY:\n${personalityPrompt}\nVoice Tone: ${voiceTone}\n`;
        personalityContext += this.getWritingStyleContext(agent);
      }

      // Build company context
      let companyContext = '';
      let genreGuidance = '';
      if (companyData && companyData.company) {
        const company = companyData.company;
        companyContext = `\n\nCOMPANY INFORMATION:\n`;
        companyContext += `Company Name: ${company.company_name || 'N/A'}\n`;
        companyContext += `Description: ${company.company_description || 'N/A'}\n`;
        if (company.brand_voice) {
          companyContext += `Brand Voice: ${company.brand_voice}\n`;
        }
        if (company.key_messages && company.key_messages.length > 0) {
          companyContext += `Key Messages: ${Array.isArray(company.key_messages) ? company.key_messages.join(', ') : company.key_messages}\n`;
        }
        
        // Use preferred genre if available
        if (company.preferred_music_genre) {
          genreGuidance = company.preferred_music_genre.toLowerCase();
        }
      }
      
      // Get voice type and language - Priority: agent > company profile > options
      // Note: Voice type is not used in lyrics generation, but language is
      if (agent?.preferred_music_language) {
        language = agent.preferred_music_language;
      } else if (companyData?.company?.preferred_music_language) {
        language = companyData.company.preferred_music_language;
      }

      // Determine length in lines/verses
      let lengthGuidance = '';
      if (length === 'short') {
        lengthGuidance = '2-3 verses with a simple chorus (approximately 8-12 lines total)';
      } else if (length === 'long') {
        lengthGuidance = '4-5 verses with chorus and bridge (approximately 20-30 lines total)';
      } else {
        lengthGuidance = '3-4 verses with a chorus (approximately 12-20 lines total)';
      }

      // Structure guidance
      let structureGuidance = '';
      if (structure === 'verse-chorus') {
        structureGuidance = 'Use a traditional verse-chorus structure with repeating chorus';
      } else if (structure === 'verse-only') {
        structureGuidance = 'Use only verses, no repeating chorus';
      } else if (structure === 'free-form') {
        structureGuidance = 'Use a free-form structure without strict verse/chorus patterns';
      } else {
        structureGuidance = 'Use an appropriate structure (verse-chorus recommended for most genres)';
      }

      // Build lyrics generation prompt
      const lyricsPrompt = `You are a professional songwriter. Generate original song lyrics based on the following requirements:

${personalityContext}${companyContext}
REQUIREMENTS:
- Genre: ${genre || genreGuidance || 'pop'}
- Style: ${style}
- Mood: ${mood}
- Language: ${language}
- Length: ${lengthGuidance}
- Structure: ${structureGuidance}
${topic ? `- Topic/Theme: ${topic}` : ''}
${companyContext ? '- Incorporate company values and brand voice naturally' : ''}
${personalityContext ? '- Match the agent personality and voice tone' : ''}

Please provide a JSON response with the following structure:
{
  "title": "Song title",
  "lyrics": "Full lyrics with proper formatting using [Verse], [Chorus], [Bridge] tags",
  "genre": "Specific genre name",
  "mood": "Mood description",
  "structure": "Structure type used",
  "language": "Language code",
  "line_count": "Approximate number of lines",
  "reasoning": "Brief explanation of the lyrics and why they match the requirements"
}

IMPORTANT:
- All lyrics MUST be in ${language} language
- Make the lyrics original and creative
- Ensure proper formatting with [Verse], [Chorus], [Bridge] tags
- Match the mood and style requirements
${genreGuidance ? `- The genre MUST be: ${genreGuidance}` : ''}
- Make it suitable for music generation`;

      // Use Gemini if available and requested, otherwise OpenAI
      let result;
      if (provider === 'gemini' && GeminiService.isAvailable()) {
        result = await GeminiService.generateContent(lyricsPrompt, {
          temperature: 0.9, // Higher creativity for lyrics
          maxTokens: 2000
        });
      } else {
        const completion = await this.openai.chat.completions.create({
          model: this.defaultModel,
          messages: [
            {
              role: 'system',
              content: 'You are a professional songwriter. Generate original, creative song lyrics in the requested format.'
            },
            {
              role: 'user',
              content: lyricsPrompt
            }
          ],
          temperature: 0.9, // Higher creativity for lyrics
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        });

        result = completion.choices[0].message.content;
      }

      // Parse JSON response
      let parsedResult;
      try {
        parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (parseError) {
        logger.warn('Failed to parse lyrics JSON, attempting to extract from text:', parseError);
        // Try to extract JSON from markdown code blocks
        const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) || result.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[1]);
        } else {
          // Fallback: try to parse as plain JSON
          parsedResult = JSON.parse(result);
        }
      }

      // Validate and return
      return {
        title: parsedResult.title || `Generated ${style} Song`,
        lyrics: parsedResult.lyrics || result,
        genre: parsedResult.genre || genre || 'pop',
        mood: parsedResult.mood || mood,
        structure: parsedResult.structure || structure,
        language: parsedResult.language || language,
        lineCount: parsedResult.line_count || 'unknown',
        reasoning: parsedResult.reasoning || `Generated ${style} lyrics with ${mood} mood`,
        agent_aware: !!agent,
        company_aware: !!(companyData && companyData.company)
      };
    } catch (error) {
      logger.error('Lyrics generation failed:', error);
      throw new Error(`Failed to generate lyrics: ${error.message}`);
    }
  }

  /**
   * Generate music concept (prompt, lyrics, style, genre, mood) based on agent personality
   * @param {object} agent - Agent configuration with personality, voice_tone, etc.
   * @param {object} options - Music generation options
   * @returns {Promise<object>} Music concept with prompt, lyrics, style, genre, mood, tempo
   */
  async generateMusicConcept(agent, options = {}) {
    try {
      const {
        topic = null,
        duration = 30,
        instrumental = false,
        provider = this.defaultProvider
      } = options;

      // Get company knowledge if available
      const companyData = await this.getCompanyData(agent.user_id);
      
      // Build personality-based prompt for music concept generation
      const personalityPrompt = this.getPersonalityPrompt(agent.personality_type || 'custom');
      const voiceTone = agent.voice_tone || 'professional';
      const targetTopics = agent.target_topics || 'general topics';
      const writingStyleBlock = this.getWritingStyleContext(agent);
      
      // Build comprehensive company context
      let companyContext = '';
      let genreGuidance = '';
      if (companyData.company) {
        const company = companyData.company;
        companyContext = `\n\nCOMPANY INFORMATION:\n`;
        companyContext += `Company Name: ${company.company_name || 'N/A'}\n`;
        companyContext += `Description: ${company.company_description || 'N/A'}\n`;
        if (company.industry) {
          companyContext += `Industry: ${company.industry}\n`;
        }
        if (company.brand_voice) {
          companyContext += `Brand Voice: ${company.brand_voice}\n`;
        }
        if (company.key_messages && company.key_messages.length > 0) {
          companyContext += `Key Messages: ${Array.isArray(company.key_messages) ? company.key_messages.join(', ') : company.key_messages}\n`;
        }
        if (company.target_audience) {
          companyContext += `Target Audience: ${company.target_audience}\n`;
        }
        
        // Check for explicit genre preference first (highest priority)
        if (company.preferred_music_genre) {
          genreGuidance = company.preferred_music_genre.toLowerCase();
          // Normalize common variations
          if (genreGuidance.includes('hip-hop') || genreGuidance.includes('hiphop') || genreGuidance.includes('hip hop')) {
            genreGuidance = 'hip-hop or rap';
          } else if (genreGuidance.includes('rap')) {
            genreGuidance = 'rap or hip-hop';
          } else if (genreGuidance.includes('electronic') || genreGuidance.includes('edm')) {
            genreGuidance = 'electronic or synth-pop';
          } else if (genreGuidance.includes('pop')) {
            genreGuidance = 'pop or contemporary';
          } else if (genreGuidance.includes('rock')) {
            genreGuidance = 'rock or alternative';
          } else if (genreGuidance.includes('jazz')) {
            genreGuidance = 'jazz or smooth jazz';
          } else if (genreGuidance.includes('classical')) {
            genreGuidance = 'classical or orchestral';
          } else if (genreGuidance.includes('country')) {
            genreGuidance = 'country or folk';
          } else if (genreGuidance.includes('indie')) {
            genreGuidance = 'indie or alternative';
          }
        }
        
        // If no explicit preference, analyze brand voice, industry, and audience for genre hints
        if (!genreGuidance) {
          const brandVoiceLower = (company.brand_voice || '').toLowerCase();
          const industryLower = (company.industry || '').toLowerCase();
          const audienceLower = (company.target_audience || '').toLowerCase();
          const descriptionLower = (company.company_description || '').toLowerCase();
          
          // Analyze brand voice for genre hints
          if (brandVoiceLower.includes('urban') || brandVoiceLower.includes('street') || 
              brandVoiceLower.includes('edgy') || brandVoiceLower.includes('bold') ||
              descriptionLower.includes('hip-hop') || descriptionLower.includes('rap')) {
            genreGuidance = 'hip-hop or rap';
          } else if (brandVoiceLower.includes('energetic') || brandVoiceLower.includes('upbeat') ||
                     brandVoiceLower.includes('vibrant') || brandVoiceLower.includes('dynamic')) {
            genreGuidance = 'pop, electronic, or dance';
          } else if (brandVoiceLower.includes('sophisticated') || brandVoiceLower.includes('elegant') ||
                     brandVoiceLower.includes('refined') || brandVoiceLower.includes('classic')) {
            genreGuidance = 'jazz, classical, or ambient';
          } else if (brandVoiceLower.includes('rock') || brandVoiceLower.includes('gritty') ||
                     brandVoiceLower.includes('raw') || brandVoiceLower.includes('powerful')) {
            genreGuidance = 'rock, alternative, or metal';
          } else if (brandVoiceLower.includes('indie') || brandVoiceLower.includes('alternative') ||
                     brandVoiceLower.includes('creative') || brandVoiceLower.includes('unique')) {
            genreGuidance = 'indie, alternative, or folk';
          }
          
          // Analyze industry for genre hints
          if (!genreGuidance) {
            if (industryLower.includes('tech') || industryLower.includes('software') ||
                industryLower.includes('ai') || industryLower.includes('digital')) {
              genreGuidance = 'electronic, synth-pop, or futuristic';
            } else if (industryLower.includes('entertainment') || industryLower.includes('media') ||
                       industryLower.includes('music') || industryLower.includes('arts')) {
              genreGuidance = 'pop, hip-hop, or contemporary';
            } else if (industryLower.includes('finance') || industryLower.includes('business') ||
                       industryLower.includes('corporate') || industryLower.includes('consulting')) {
              genreGuidance = 'professional, ambient, or sophisticated pop';
            } else if (industryLower.includes('fashion') || industryLower.includes('lifestyle') ||
                       industryLower.includes('luxury') || industryLower.includes('beauty')) {
              genreGuidance = 'pop, electronic, or trendy';
            }
          }
          
          // Analyze target audience for genre hints
          if (audienceLower.includes('young') || audienceLower.includes('millennial') ||
              audienceLower.includes('gen z') || audienceLower.includes('teen')) {
            if (!genreGuidance || genreGuidance.includes('pop')) {
              genreGuidance = 'hip-hop, rap, pop, or electronic';
            }
          } else if (audienceLower.includes('professional') || audienceLower.includes('corporate') ||
                     audienceLower.includes('business') || audienceLower.includes('executive')) {
            if (!genreGuidance) {
              genreGuidance = 'sophisticated pop, ambient, or instrumental';
            }
          }
        }
        
        // Add genre guidance to context if available
        if (genreGuidance) {
          if (company.preferred_music_genre) {
            companyContext += `\nPreferred Music Style: ${company.preferred_music_genre} (explicitly set in company profile).\n`;
          } else {
            companyContext += `\nPreferred Music Style: Based on brand voice, industry, and target audience, the music should be ${genreGuidance}.\n`;
          }
        }
        
        // Add voice type preference if available
        if (company.preferred_voice_type) {
          companyContext += `\nPreferred Voice Type: ${company.preferred_voice_type} (explicitly set in company profile).\n`;
        }
        
        // Add language preference if available
        if (company.preferred_music_language) {
          companyContext += `\nPreferred Language: ${company.preferred_music_language} (explicitly set in company profile). All lyrics MUST be in this language.\n`;
        }
        
        // Add products information
        if (companyData.products && companyData.products.length > 0) {
          companyContext += `\nProducts/Services:\n`;
          companyData.products.slice(0, 3).forEach((product, idx) => {
            companyContext += `${idx + 1}. ${product.name}: ${product.description || 'N/A'}\n`;
            if (product.key_features) {
              companyContext += `   Features: ${product.key_features}\n`;
            }
          });
        }
        
        // Add knowledge documents (summaries)
        if (companyData.documents && companyData.documents.length > 0) {
          companyContext += `\nCompany Knowledge:\n`;
          companyData.documents.slice(0, 3).forEach((doc, idx) => {
            companyContext += `${idx + 1}. ${doc.title}: ${doc.summary || doc.content?.substring(0, 200) || 'N/A'}\n`;
          });
        }
      }
      
      // Build music-specific prompt
      let musicPrompt = `You are ${agent.name}, an AI agent creating a music concept. 

${personalityPrompt}

Voice Tone: ${voiceTone}
Target Topics: ${targetTopics}
${writingStyleBlock}
${companyContext}

${companyData.company ? 
  `PRIMARY FOCUS: Create music that authentically represents ${companyData.company.company_name || 'the company'}. The music should:
- Reflect the company's brand voice (${companyData.company.brand_voice || 'professional'})
- Align with the company's key messages and values
- Appeal to the target audience (${companyData.company.target_audience || 'general audience'})
- Represent the company's products/services and industry (${companyData.company.industry || 'general'})
- Incorporate themes from the company's knowledge base and documents
- Match your personality (${agent.personality_type}) while staying true to the company brand
${genreGuidance ? `- IMPORTANT: The music style/genre should be ${genreGuidance} based on the company's brand voice, industry, and target audience` : ''}` :
  `Generate a complete music concept that matches your personality and voice. The music should:
- Reflect your personality traits and communication style
- Match your voice tone (${voiceTone})
- Be appropriate for your target topics (${targetTopics})`}
${instrumental ? '- Be instrumental only (no vocals)' : '- Include vocals with lyrics that reflect the company values and brand (if company info available)'}
${companyData.company?.preferred_voice_type && !instrumental ? `- Use ${companyData.company.preferred_voice_type} voice type for vocals` : ''}
${companyData.company?.preferred_music_language && !instrumental ? `- CRITICAL: All lyrics MUST be written in ${companyData.company.preferred_music_language} language` : ''}
${duration ? `- Be approximately ${duration} seconds long` : ''}
${topic ? `- Relate to the topic: ${topic}` : ''}
${!companyData.company && !topic ? '- Be creative and unique, representing your authentic voice' : ''}

Please provide a JSON response with the following structure:
{
  "prompt": "A detailed description of the music (e.g., 'Upbeat electronic dance music with synthesizers and a driving bassline')",
  "lyrics": "${instrumental ? 'null' : 'Full song lyrics with verses, chorus, and bridge if applicable'}",
  "style": "${genreGuidance ? genreGuidance.split(' or ')[0].split(',')[0].trim() : 'pop|rock|electronic|hip-hop|jazz|classical|country|indie|etc.'}",
  "genre": "${genreGuidance ? genreGuidance : 'specific genre name or null'}",
  "mood": "happy|energetic|calm|melancholic|uplifting|dramatic|etc.",
  "tempo": "BPM number (e.g., 120) or null",
  "title": "Suggested song title",
  "reasoning": "Brief explanation of why this music concept matches your personality${genreGuidance ? ` and why ${genreGuidance} style was chosen` : ''}"
}

${genreGuidance ? `CRITICAL: The "style" field MUST be one of: ${genreGuidance}. Do NOT use generic styles like "pop" or "electronic" unless they match the preferred style.` : ''}

Make sure the music concept authentically represents your personality and would be something you would create.`;

      // Use Gemini if available and requested, otherwise OpenAI
      let result;
      if (provider === 'gemini' && GeminiService.isAvailable()) {
        const geminiResult = await GeminiService.generateText(musicPrompt, {
          systemInstruction: `You are a creative music producer AI that generates music concepts based on personality traits. Always respond with valid JSON.`,
          temperature: 0.9,
          maxTokens: 2000
        });
        
        try {
          result = JSON.parse(geminiResult.text);
        } catch (parseError) {
          logger.warn('Failed to parse Gemini JSON, extracting from text:', parseError);
          result = this.extractJSONFromText(geminiResult.text);
        }
      } else {
        // Use OpenAI
        const response = await this.openai.chat.completions.create({
          model: this.defaultModel,
          messages: [
            {
              role: 'system',
              content: 'You are a creative music producer AI that generates music concepts based on personality traits. Always respond with valid JSON only, no additional text.'
            },
            {
              role: 'user',
              content: musicPrompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.9,
          max_tokens: 2000
        });

        try {
          result = JSON.parse(response.choices[0]?.message?.content?.trim() || '{}');
        } catch (parseError) {
          logger.error('Failed to parse OpenAI JSON response:', parseError);
          throw new Error('Failed to generate valid music concept');
        }
      }

      // Get voice type and language - Priority: agent > company profile > options
      const voiceType = agent?.preferred_voice_type || 
                       companyData.company?.preferred_voice_type || 
                       options.voiceType || null;
      const language = agent?.preferred_music_language || 
                      companyData.company?.preferred_music_language || 
                      options.language || null;
      
      // Validate and set defaults
      return {
        prompt: result.prompt || `Music that matches ${agent.name}'s ${voiceTone} personality`,
        lyrics: instrumental ? null : (result.lyrics || null),
        style: result.style || 'pop',
        genre: result.genre || null,
        mood: result.mood || 'energetic',
        tempo: result.tempo ? parseInt(result.tempo) : null,
        title: result.title || null,
        voiceType: voiceType,
        language: language,
        reasoning: result.reasoning || (
          companyData.company 
            ? `Generated based on ${agent.name}'s ${agent.personality_type} personality and ${companyData.company.company_name}'s company knowledge, brand voice, products, and values${voiceType ? ` with ${voiceType} voice` : ''}${language ? ` in ${language} language` : ''}`
            : `Generated based on ${agent.name}'s ${agent.personality_type} personality`
        ),
        agent_aware: true,
        company_aware: !!companyData.company
      };

    } catch (error) {
      logger.error('Music concept generation failed:', error);
      
      // Fallback to simple template-based concept
      return this.generateFallbackMusicConcept(agent, options);
    }
  }

  /**
   * Fallback music concept generation using templates
   */
  generateFallbackMusicConcept(agent, options) {
    const { duration = 30, instrumental = false, topic = null } = options;
    const personality = agent.personality_type || 'custom';
    const voiceTone = agent.voice_tone || 'professional';

    // Map personality to music style
    const personalityToStyle = {
      'tech_sage': 'electronic',
      'witty_troll': 'indie pop',
      'quirky_observer': 'indie',
      'custom': 'pop'
    };

    // Map voice tone to mood
    const toneToMood = {
      'professional': 'energetic',
      'casual': 'happy',
      'enthusiastic': 'uplifting',
      'thoughtful': 'calm'
    };

    const style = personalityToStyle[personality] || 'pop';
    const mood = toneToMood[voiceTone] || 'energetic';

    let prompt = `${mood} ${style} music`;
    if (topic) {
      prompt += ` about ${topic}`;
    }
    prompt += ` that matches ${agent.name}'s ${voiceTone} personality`;

    return {
      prompt,
      lyrics: instrumental ? null : `[Verse]\nThis is a song\nThat matches my style\n\n[Chorus]\nMusic that represents me\nIn every way`,
      style,
      genre: null,
      mood,
      tempo: mood === 'energetic' ? 120 : mood === 'calm' ? 80 : 100,
      title: `${agent.name}'s ${style} track`,
      reasoning: `Fallback concept based on ${personality} personality and ${voiceTone} tone`,
      agent_aware: true,
      company_aware: false
    };
  }

  /**
   * Extract JSON from text if parsing fails
   */
  extractJSONFromText(text) {
    try {
      // Try to find JSON object in text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      logger.warn('Failed to extract JSON from text');
    }
    return {};
  }

  /**
   * Generate content based on agent personality and configuration
   */
  async generateContent(agent, options = {}) {
    try {
      const {
        content_type = 'tweet',
        topic,
        style,
        length = 'medium',
        context,
        hashtags = true,
        emojis = true,
        provider = this.defaultProvider, // Allow provider selection
        template_id = null, // Optional: content template ID
        enable_research = false, // Optional: enable research-backed content
        research_options = {} // Optional: research configuration
      } = options;

      // If template is provided, use template structure
      let template = null;
      if (template_id) {
        template = await this.getTemplate(template_id, agent.user_id);
        if (template) {
          // Generate content using template structure
          return await this.generateContentWithTemplate(agent, template, options);
        }
      }

      // Use Gemini if requested and available
      if (provider === 'gemini' && GeminiService.isAvailable()) {
        return await GeminiService.generateContentForAgent(agent, {
          content_type,
          topic,
          style,
          length,
          context,
          hashtags,
          emojis
        });
      }

      // Research topic if requested
      let research = null;
      if (enable_research && topic) {
        try {
          const ContentResearchService = require('./ContentResearchService');
          const researchService = new ContentResearchService();
          research = await researchService.researchTopic(topic, research_options);
          logger.info(`[AIContent] Research completed for topic: ${topic}`);
        } catch (error) {
          logger.error(`[AIContent] Research failed, continuing without research:`, error);
          // Continue without research if it fails
        }
      }

      // Get company knowledge for the agent
      const companyData = await this.getCompanyData(agent.user_id);

      // Use company-aware generation if data exists
      if (companyData.company) {
        const prompt = this.buildCompanyAwarePrompt(agent, {
          content_type,
          topic,
          style,
          length,
          context,
          hashtags,
          emojis,
          companyData,
          research
        });

        const content = await this.generateWithOpenAI(prompt, {
          max_tokens: this.getMaxTokens(length),
          temperature: this.getTemperature(style)
        });

        const processedContent = this.postProcessContent(content, {
          content_type,
          length,
          hashtags,
          emojis
        });

        return {
          content: processedContent,
          original_prompt: 'Generated with company knowledge',
          model_used: this.defaultModel,
          generation_config: {
            content_type,
            topic,
            style,
            length,
            hashtags,
            emojis,
            company_aware: true
          }
        };
      }

      // Fallback to regular prompt-based generation
      let prompt = this.buildPrompt(agent, {
        content_type,
        topic,
        style,
        length,
        context,
        hashtags,
        emojis,
        research
      });

      // Inject OpenClaw-style skills for conversation (personal assistant / chat)
      if (content_type === 'conversation') {
        try {
          const { getFormattedSkillsForPrompt } = require('./SkillLoader');
          const skillsText = await getFormattedSkillsForPrompt({});
          if (skillsText) prompt = prompt + '\n' + skillsText;
        } catch (skillErr) {
          logger.warn('[AIContent] SkillLoader inject failed:', skillErr.message);
        }
      }

      // Generate content using OpenAI - support word_count
      const word_count = options.word_count || null;
      const content = await this.generateWithOpenAI(prompt, {
        max_tokens: this.getMaxTokens(length, content_type, word_count),
        temperature: this.getTemperature(style)
      });

      // Post-process the content
      const processedContent = this.postProcessContent(content, {
        content_type,
        length,
        hashtags,
        emojis
      });

      return {
        content: processedContent,
        original_prompt: prompt,
        model_used: this.defaultModel,
        generation_config: {
          content_type,
          topic,
          style,
          length,
          hashtags,
          emojis,
          company_aware: false
        }
      };

    } catch (error) {
      logger.error('AI content generation failed:', error);
      
      // Fallback to template-based generation
      return this.generateFallbackContent(agent, options);
    }
  }

  /**
   * Generate contextual response for Telegram engagement
   */
  async generateContextualResponse(agent, originalMessage, triggerType, chatId) {
    try {
      // Get company data and context
      const companyData = await this.getCompanyData(agent.user_id);
      const context = this.buildContextualPrompt(agent, originalMessage, triggerType, companyData);

      // Generate AI response
      const aiResponse = await this.generateWithOpenAI(context, {
        max_tokens: 500, // Increased from 200 to 500 for voice chat
        temperature: 0.7
      });

      return aiResponse;
    } catch (error) {
      logger.error('Error generating contextual response:', error);
      // Fallback to generic response
      return this.getFallbackResponse(agent.personality_type, triggerType);
    }
  }

  /**
   * Build a prompt based on agent personality and options
   */
  buildPrompt(agent, options) {
    const {
      content_type,
      topic,
      style,
      length,
      context,
      hashtags,
      emojis,
      research
    } = options;

    // Base personality prompt
    let personalityPrompt = this.getPersonalityPrompt(agent.personality_type);
    
    // Voice tone
    const voiceTone = this.getVoiceTonePrompt(agent.voice_tone || style);
    
    // Content type specific instructions
    const contentTypeInstructions = this.getContentTypeInstructions(content_type);
    
    // Length instructions - support word_count if provided
    const word_count = options.word_count || null;
    const lengthInstructions = this.getLengthInstructions(length, content_type, word_count);
    
    // Topic and context
    const topicContext = topic ? `\n\nTopic: ${topic}` : '';
    const contextInfo = context ? `\n\nContext: ${context}` : '';
    
    // Research-enhanced context
    let researchContext = '';
    if (research) {
      const ContentResearchService = require('./ContentResearchService');
      const researchService = new ContentResearchService();
      researchContext = researchService.enhancePromptWithResearch('', research);
    }
    
    // Special instructions
    const specialInstructions = [];
    if (hashtags) {
      // Use trending hashtags from research if available
      if (research?.trending_topics?.hashtags?.length > 0) {
        specialInstructions.push(`Include trending hashtags: ${research.trending_topics.hashtags.slice(0, 3).join(', ')}`);
      } else {
        specialInstructions.push('Include 2-3 relevant hashtags');
      }
    }
    if (emojis) specialInstructions.push('Use 1-2 appropriate emojis');
    
    const specialInstructionsText = specialInstructions.length > 0 
      ? `\n\nSpecial Instructions:\n- ${specialInstructions.join('\n- ')}`
      : '';

    // Writing style (user's own writing samples) - when enabled, output matches user's style
    const writingStyleBlock = this.getWritingStyleContext(agent);

    // Build the complete prompt
    const prompt = `You are ${agent.name}, an AI agent with the following personality:

${personalityPrompt}

Voice Tone: ${voiceTone}
${writingStyleBlock}

${contentTypeInstructions}

${lengthInstructions}${topicContext}${contextInfo}${specialInstructionsText}

IMPORTANT INSTRUCTIONS:
- Generate unique, varied content each time - avoid repetitive phrases
- Focus on your personality and the topic at hand
- Be authentic and conversational, not robotic
- Create content that represents your own brand/personality authentically
- DO NOT include any section headers, titles, or labels like "Twitter Post", "Blog Post", "Article", etc. in your output
- Just write the content directly without any meta labels or headers
${this.isZenthryxAgent(agent) ? 
  '- You are a Zenthryx AI agent - you can mention Zenthryx AI naturally in your content' : 
  '- Focus on your company\'s brand and avoid mentioning external platforms like Zenthryx AI or Iqonga'}

Content:`;

    return prompt;
  }

  /**
   * Generate content using OpenAI API
   */
  async generateWithOpenAI(prompt, config = {}) {
    try {
      // Determine system message based on content type and length
      let systemMessage = 'You are a creative AI content generator that creates engaging content based on specific personality traits and voice tones.';
      if (config.max_tokens && config.max_tokens > 1000) {
        systemMessage = 'You are a professional content writer that creates comprehensive, well-structured long-form content including blog posts, articles, and detailed narratives. Your content should be engaging, informative, and well-organized with proper structure.';
      }
      
      const completion = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: config.max_tokens || 150,
        temperature: config.temperature || 0.8, // Increased for more creativity
        top_p: 0.9,
        frequency_penalty: 0.3, // Increased to reduce repetitive phrases
        presence_penalty: 0.2 // Increased to encourage diverse topics
      });

      return completion.choices[0]?.message?.content?.trim() || '';

    } catch (error) {
      logger.error('OpenAI API call failed:', error);
      
      // Try fallback model
      if (this.defaultModel !== this.fallbackModel) {
        try {
          // Use same system message logic for fallback
          let systemMessage = 'You are a creative AI content generator that creates engaging content based on specific personality traits and voice tones.';
          if (config.max_tokens && config.max_tokens > 1000) {
            systemMessage = 'You are a professional content writer that creates comprehensive, well-structured long-form content including blog posts, articles, and detailed narratives. Your content should be engaging, informative, and well-organized with proper structure.';
          }
          
          const fallbackCompletion = await this.openai.chat.completions.create({
            model: this.fallbackModel,
            messages: [
              {
                role: 'system',
                content: systemMessage
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: config.max_tokens || 150,
            temperature: config.temperature || 0.8,
            top_p: 0.9,
            frequency_penalty: 0.3,
            presence_penalty: 0.2
          });

          return fallbackCompletion.choices[0]?.message?.content?.trim() || '';
        } catch (fallbackError) {
          logger.error('Fallback model also failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Post-process generated content
   */
  postProcessContent(content, options) {
    const { content_type, length, hashtags, emojis } = options;
    
    let processedContent = content;

    // Remove any unwanted headers/labels that might have been added
    // Remove common headers like "Twitter Post:", "Blog Post:", "Article:", etc.
    const unwantedHeaders = [
      /^Twitter Post:?\s*/i,
      /^Blog Post:?\s*/i,
      /^Article:?\s*/i,
      /^Email:?\s*/i,
      /^Product Description:?\s*/i,
      /^Content:?\s*/i,
      /^Generated Content:?\s*/i
    ];
    
    unwantedHeaders.forEach(pattern => {
      processedContent = processedContent.replace(pattern, '');
    });
    
    // Remove any standalone header lines (lines that are just headers)
    processedContent = processedContent.replace(/^(Twitter Post|Blog Post|Article|Email|Product Description|Content|Generated Content):?\s*$/gmi, '');
    
    // Clean up any extra whitespace at the start
    processedContent = processedContent.trim();

    // Ensure content fits platform limits
    if (content_type === 'tweet') {
      const maxLength = this.getMaxLength(length);
      if (processedContent.length > maxLength) {
        processedContent = processedContent.substring(0, maxLength - 3) + '...';
      }
    }

    // Add hashtags if requested but not present
    if (hashtags && !processedContent.includes('#')) {
      const relevantHashtags = this.generateRelevantHashtags(content);
      processedContent += `\n\n${relevantHashtags}`;
    }

    return processedContent;
  }

  /**
   * Generate fallback content when AI generation fails
   */
  generateFallbackContent(agent, options) {
    const { content_type, topic, style, length } = options;
    
    // Generate unique content each time to avoid repetition
    const timestamp = Date.now();
    const randomSeed = timestamp % 1000;
    
    // Simple template-based generation with variation
    const personalityPrompts = {
      // Original personalities
      'tech_sage': [`As a tech expert, I would say: `, `From my technical perspective: `, `Here's what I think about this: `],
      'witty_troll': [`With a bit of humor: `, `Let me add some wit to this: `, `Here's my take with a smile: `],
      'hype_beast': [`With enthusiasm and energy: `, `This is absolutely amazing: `, `Get ready for something exciting: `],
      'honest_critic': [`From an analytical perspective: `, `Let me give you my honest take: `, `Here's what I really think: `],
      'quirky_observer': [`From my unique perspective: `, `I've noticed something interesting: `, `Here's a different angle: `],
      'custom': [`Based on my personality: `, `Here's my perspective: `, `Let me share my thoughts: `],
      
      // New personalities
      'brand_storyteller': [`Let me tell you a story: `, `Here's a compelling narrative: `, `Picture this scenario: `],
      'community_problem_solver': [`Here's how we can solve this: `, `Let me help with this challenge: `, `I see a solution here: `],
      'growth_strategist': [`From a strategic growth perspective: `, `Here's how to scale this: `, `Let's think big picture: `],
      'trend_analyst': [`Looking at current trends: `, `Here's what the data shows: `, `Based on market patterns: `],
      'engagement_specialist': [`Let's engage with this topic: `, `Here's how we can connect: `, `Let's build community around this: `],
      'product_evangelist': [`Let me explain this product: `, `Here's how this works: `, `This is a game-changer because: `]
    };

    const voiceTones = {
      'professional': 'professional and informative',
      'casual': 'casual and friendly',
      'enthusiastic': 'enthusiastic and energetic',
      'thoughtful': 'thoughtful and reflective'
    };

    const promptArray = personalityPrompts[agent.personality_type] || personalityPrompts.custom;
    const prompt = Array.isArray(promptArray) ? promptArray[randomSeed % promptArray.length] : promptArray;
    const tone = voiceTones[agent.voice_tone || style] || voiceTones.casual;
    
    // Build content without including the prompt template literally
    let content = `${topic || 'sharing some thoughts'} in a ${tone} way. `;
    
    // Add personality-specific content
    if (agent.personality_type === 'tech_sage') {
      content += 'This represents the cutting edge of what\'s possible in our field.';
    } else if (agent.personality_type === 'witty_troll') {
      content += 'Sometimes the best insights come with a smile! 😄';
    } else if (agent.personality_type === 'hype_beast') {
      content += 'This is absolutely amazing and you need to check it out! 🚀';
    } else if (agent.personality_type === 'honest_critic') {
      content += 'Let\'s be real about this - here\'s what actually matters.';
    } else if (agent.personality_type === 'quirky_observer') {
      content += 'The world is full of fascinating patterns if you know where to look.';
    } else if (agent.personality_type === 'brand_storyteller') {
      content += 'Every brand has a story worth telling, and this is ours.';
    } else if (agent.personality_type === 'community_problem_solver') {
      content += 'Together, we can solve any challenge that comes our way.';
    } else if (agent.personality_type === 'growth_strategist') {
      content += 'Strategic thinking leads to exponential growth opportunities.';
    } else if (agent.personality_type === 'trend_analyst') {
      content += 'The future is already here - we just need to recognize the patterns.';
    } else if (agent.personality_type === 'engagement_specialist') {
      content += 'Building genuine connections is what makes communities thrive.';
    } else if (agent.personality_type === 'product_evangelist') {
      content += 'This product will change how you think about technology.';
    }

    return {
      content: content,
      original_prompt: 'Fallback template generation',
      model_used: 'template',
      generation_config: options
    };
  }

  /**
   * Generate relevant hashtags based on content
   */
  generateRelevantHashtags(content) {
    // Simple hashtag generation based on common words
    const words = content.toLowerCase().split(/\s+/);
    const commonWords = words.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)
    );
    
    const hashtags = commonWords.slice(0, 3).map(word => `#${word.charAt(0).toUpperCase() + word.slice(1)}`);
    return hashtags.join(' ');
  }

  /**
   * Get personality-specific prompt
   */
  getPersonalityPrompt(personalityType) {
    const prompts = {
      // Original 6 personalities
      'witty_troll': 'You are a clever and humorous commentator. You have a sharp wit and love to add playful, sometimes sarcastic observations. You\'re not mean-spirited, but you do enjoy a good joke.',
      'tech_sage': 'You are a wise and knowledgeable tech expert. You share insights with authority and depth, always backing your thoughts with expertise. You\'re passionate about technology and its impact on society.',
      'hype_beast': 'You are enthusiastic and energetic, always excited about the latest trends and innovations. You bring positive energy and motivation to conversations while staying grounded in reality.',
      'honest_critic': 'You provide direct, fair feedback with analytical precision. You\'re not afraid to point out flaws but always do so constructively and with wit.',
      'quirky_observer': 'You are a unique and curious observer of the world. You notice things others might miss and share insights from unexpected angles. You have a distinctive perspective that makes people think.',
      'custom': 'You are a creative and adaptable AI agent. You can adjust your communication style based on context while maintaining authenticity and personality.',
      
      // New 6 personalities
      'brand_storyteller': 'You are a master of narrative-driven content who crafts compelling stories around brands and products. You focus on emotional connections and visual storytelling, making complex ideas accessible through engaging narratives.',
      'community_problem_solver': 'You are proactive in identifying and addressing common pain points before they become major issues. You focus on practical solutions and community support, always ready to help solve problems.',
      'growth_strategist': 'You share insights about business development, partnerships, and market expansion. You think strategically about scaling and growth opportunities, providing valuable business intelligence.',
      'trend_analyst': 'You share insights on industry trends, emerging technologies, and market predictions. You post thought-provoking content about the future of your sector and engage in strategic discussions.',
      'engagement_specialist': 'You focus on building genuine relationships and fostering community. You respond to comments, initiate conversations, create interactive content, and celebrate community achievements.',
      'product_evangelist': 'You explain complex products or services in accessible ways. You share tutorials, demos, and technical insights that appeal to technical audiences and early adopters.'
    };
    
    return prompts[personalityType] || prompts.custom;
  }

  /**
   * Get voice tone prompt
   */
  getVoiceTonePrompt(voiceTone) {
    const tones = {
      'professional': 'Professional and authoritative, using industry terminology and formal language when appropriate.',
      'casual': 'Casual and friendly, using everyday language and conversational phrases.',
      'enthusiastic': 'Energetic and passionate, using exclamation marks and positive language.',
      'thoughtful': 'Reflective and contemplative, using thoughtful language and deeper insights.'
    };
    
    return tones[voiceTone] || tones.casual;
  }

  /**
   * Build writing-style context when the user has enabled "learn my style" and provided samples.
   * Injected into content generation so output matches the user's vocabulary, tone, and structure.
   * @param {object} agent - Agent row (may have writing_style_enabled, writing_style_samples)
   * @returns {string} Empty string or a block to append to the prompt
   */
  getWritingStyleContext(agent) {
    if (!agent || !agent.writing_style_enabled) return '';
    const samples = Array.isArray(agent.writing_style_samples) ? agent.writing_style_samples : [];
    const valid = samples.filter(s => typeof s === 'string' && s.trim().length > 0).map(s => s.trim());
    if (valid.length === 0) return '';
    const combined = valid.slice(0, 5).join('\n\n---\n\n'); // max 5 samples, reasonable token use
    return `

WRITING STYLE (match this style):
The following are writing samples from the user. Your generated content MUST match their vocabulary, sentence structure, tone, and level of formality. Do not copy the text; write new content that reads as if the same person wrote it.

--- EXAMPLES ---
${combined}
--- END EXAMPLES ---
`;
  }

  /**
   * Get content type instructions
   */
  getContentTypeInstructions(contentType) {
    const instructions = {
      'tweet': 'Create a Twitter post that is engaging, informative, and encourages interaction. Keep it conversational and authentic.',
      'thread': 'Create the first tweet of a thread. Set up an interesting hook that makes people want to read more.',
      'reply': 'Create a thoughtful reply that adds value to the conversation. Be helpful and engaging.',
      'story': 'Create a short, engaging story or anecdote that relates to the topic.',
      'tip': 'Share a useful tip or piece of advice that your audience would find valuable.',
      'post': 'Write a comprehensive blog post or article. Do NOT include any headers like "Twitter Post" or "Blog Post" in your output. Just write the content directly. Structure it with clear sections, engaging introduction, detailed body paragraphs, and a strong conclusion.',
      'blog': 'Write a comprehensive blog post or article. Do NOT include any headers like "Twitter Post" or "Blog Post" in your output. Just write the content directly. Structure it with clear sections, engaging introduction, detailed body paragraphs, and a strong conclusion.',
      'article': 'Write a comprehensive article. Do NOT include any headers like "Twitter Post" or "Article" in your output. Just write the content directly. Structure it with clear sections, engaging introduction, detailed body paragraphs, and a strong conclusion.',
      'email': 'Write a professional email. Do NOT include headers like "Email" in your output. Just write the email content directly with appropriate greeting and closing.',
      'product': 'Write a product description. Do NOT include headers like "Product Description" in your output. Just write the description directly.',
      'conversation': 'Reply naturally to the user in a chat. Be helpful, concise, and stay in character. If the user asks you to do something that requires a tool (email, calendar, content, image), acknowledge it and say you can help once those tools are available.'
    };

    return instructions[contentType] || instructions.tweet;
  }

  /**
   * Get length instructions - content-type aware
   */
  getLengthInstructions(length, content_type = 'tweet', word_count = null) {
    // If word_count is specified, use it
    if (word_count && word_count > 0) {
      return `Write approximately ${word_count} words. Ensure the content is comprehensive and well-developed.`;
    }
    
    // Content-type specific instructions
    if (content_type === 'post' || content_type === 'blog' || content_type === 'article') {
      const blogInstructions = {
        'short': 'Write a concise blog post of approximately 300-500 words. Include an introduction, main body with 2-3 key points, and a conclusion.',
        'medium': 'Write a comprehensive blog post of approximately 800-1200 words. Include an engaging introduction, detailed main body with 3-5 sections, and a strong conclusion.',
        'long': 'Write an in-depth blog post of approximately 1500-2500 words. Include a compelling introduction, comprehensive main body with 5-7 well-developed sections, detailed examples, and a thoughtful conclusion.'
      };
      return blogInstructions[length] || blogInstructions.medium;
    }
    
    if (content_type === 'email') {
      const emailInstructions = {
        'short': 'Write a brief email of approximately 100-200 words. Be concise and to the point.',
        'medium': 'Write a standard email of approximately 300-500 words. Include all necessary details.',
        'long': 'Write a detailed email of approximately 600-1000 words. Provide comprehensive information.'
      };
      return emailInstructions[length] || emailInstructions.medium;
    }
    
    if (content_type === 'product') {
      const productInstructions = {
        'short': 'Write a brief product description of approximately 100-150 words.',
        'medium': 'Write a detailed product description of approximately 200-300 words.',
        'long': 'Write a comprehensive product description of approximately 400-600 words with full details.'
      };
      return productInstructions[length] || productInstructions.medium;
    }
    
    // Default: social media posts (tweet, etc.)
    const instructions = {
      'short': 'Keep it concise and to the point (around 50-80 characters).',
      'medium': 'Provide enough detail to be engaging but keep it readable (around 120-200 characters).',
      'long': 'You can be more detailed and comprehensive (around 200-280 characters).'
    };
    
    return instructions[length] || instructions.medium;
  }

  /**
   * Get max tokens for OpenAI API - content-type aware
   */
  getMaxTokens(length, content_type = 'tweet', word_count = null) {
    // If word_count is specified, estimate tokens (roughly 1 token = 0.75 words)
    if (word_count && word_count > 0) {
      return Math.ceil(word_count / 0.75) + 100; // Add buffer
    }
    
    // Content-type specific token limits
    if (content_type === 'post' || content_type === 'blog' || content_type === 'article') {
      const blogTokens = {
        'short': 800,   // ~600 words
        'medium': 2000,  // ~1500 words
        'long': 4000    // ~3000 words
      };
      return blogTokens[length] || blogTokens.medium;
    }
    
    if (content_type === 'email') {
      const emailTokens = {
        'short': 300,
        'medium': 800,
        'long': 1500
      };
      return emailTokens[length] || emailTokens.medium;
    }
    
    if (content_type === 'product') {
      const productTokens = {
        'short': 200,
        'medium': 500,
        'long': 1000
      };
      return productTokens[length] || productTokens.medium;
    }
    
    // Default: social media posts
    const tokens = {
      'short': 50,
      'medium': 100,
      'long': 150
    };
    
    return tokens[length] || tokens.medium;
  }

  /**
   * Get temperature for OpenAI API
   */
  getTemperature(style) {
    const temperatures = {
      'professional': 0.3,
      'casual': 0.5,
      'enthusiastic': 0.7,
      'thoughtful': 0.4
    };
    
    return temperatures[style] || 0.5;
  }

  /**
   * Get max length for content
   */
  getMaxLength(length) {
    const lengths = {
      'short': 100,
      'medium': 200,
      'long': 280
    };
    
    return lengths[length] || lengths.medium;
  }

  /**
   * Generate multiple content variations
   */
  async generateContentVariations(agent, options, count = 3) {
    const variations = [];
    
    for (let i = 0; i < count; i++) {
      try {
        // Add some variation to the options
        const variedOptions = {
          ...options,
          style: this.varyStyle(options.style),
          topic: this.varyTopic(options.topic)
        };
        
        const content = await this.generateContent(agent, variedOptions);
        variations.push(content);
      } catch (error) {
        logger.error(`Failed to generate variation ${i + 1}:`, error);
      }
    }
    
    return variations;
  }

  /**
   * Vary the style slightly for different variations
   */
  varyStyle(style) {
    const styleVariations = {
      'professional': ['professional', 'thoughtful'],
      'casual': ['casual', 'enthusiastic'],
      'enthusiastic': ['enthusiastic', 'casual'],
      'thoughtful': ['thoughtful', 'professional']
    };
    
    const variations = styleVariations[style] || [style];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  /**
   * Vary the topic slightly for different variations
   */
  varyTopic(topic) {
    if (!topic) return topic;
    
    const variations = [
      topic,
      `different perspective on ${topic}`,
      `practical applications of ${topic}`,
      `future implications of ${topic}`
    ];
    
    return variations[Math.floor(Math.random() * variations.length)];
  }

  /**
   * Check if agent is a Zenthryx AI agent
   */
  isZenthryxAgent(agent) {
    // Check if agent name or description contains Zenthryx references
    const name = agent.name?.toLowerCase() || '';
    const description = agent.description?.toLowerCase() || '';
    
    return name.includes('zenthryx') || 
           name.includes('miko') || 
           description.includes('zenthryx') ||
           agent.user_id === 1; // Assuming user_id 1 is Zenthryx
  }

  /**
   * Generate image for agent content
   */
  async generateImageForAgent(agent, prompt, options = {}) {
    try {
      const { 
        style = 'realistic', 
        size = '512x512', 
        negativePrompt,
        provider = 'openai' // Allow provider selection
      } = options;

      // Use Gemini if requested and available
      if (provider === 'gemini' && GeminiService.isAvailable()) {
        return await GeminiService.generateImageForAgent(agent, prompt, {
          style,
          size,
          negativePrompt
        });
      }
      
      // Build enhanced prompt based on agent personality and company data
      const companyData = await this.getCompanyData(agent.user_id);
      let enhancedPrompt = prompt;
      
      if (companyData.company) {
        enhancedPrompt = `${prompt}. Style: ${agent.personality_type} AI agent representing ${companyData.company.company_name}. Brand: ${companyData.company.brand_voice || 'professional'}`;
      } else {
        enhancedPrompt = `${prompt}. Style: ${agent.personality_type} AI agent. Professional and engaging visual content.`;
      }

      // Generate image using OpenAI
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: size === '512x512' ? '1024x1024' : size,
        quality: "standard",
        style: style === 'digital_art' ? 'vivid' : 'natural'
      });

      const imageUrl = response.data[0].url;

      // Save to database
      const imageId = require('uuid').v4();
      const database = require('../database/connection');
      
      await database.query(`
        INSERT INTO generated_images (
          id, user_id, agent_id, prompt, style, size, image_url, 
          metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `, [
        imageId,
        agent.user_id,
        agent.id,
        enhancedPrompt,
        style,
        size,
        imageUrl,
        JSON.stringify({
          agentName: agent.name,
          personalityType: agent.personality_type,
          generatedAt: new Date().toISOString(),
          originalPrompt: prompt
        })
      ]);

      return {
        id: imageId,
        url: imageUrl,
        prompt: enhancedPrompt,
        style,
        size,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating image for agent:', error);
      throw error;
    }
  }

  /**
   * Get company data from uploaded documents
   */
  async getCompanyData(userId) {
    try {
      // Get company profile information
      const companyResult = await database.query(`
        SELECT 
          cp.id as company_profile_id,
          cp.company_name,
          cp.company_description,
          cp.industry,
          cp.website_url as website,
          cp.brand_voice,
          cp.key_messages,
          cp.target_audience,
          cp.preferred_music_genre,
          cp.preferred_voice_type,
          cp.preferred_music_language
        FROM company_profiles cp
        WHERE cp.user_id = $1
        LIMIT 1
      `, [userId]);

      // Extract company_profile_id for use in Shopify/HubSpot queries
      const companyProfileId = companyResult.rows[0]?.company_profile_id || null;

      // Get company products
      const productsResult = await database.query(`
        SELECT 
          prod.name,
          prod.category,
          prod.description,
          prod.key_features,
          prod.benefits,
          prod.target_customers,
          prod.use_cases,
          prod.competitive_advantages
        FROM company_products prod
        JOIN company_profiles cp ON prod.company_profile_id = cp.id
        WHERE cp.user_id = $1 AND prod.status = 'active'
        ORDER BY prod.created_at DESC
        LIMIT 5
      `, [userId]);

      // Get uploaded documents and knowledge base content
      const documentsResult = await database.query(`
        SELECT 
          kd.title,
          kd.content,
          kd.file_type,
          kd.summary,
          kd.tags,
          kd.document_type
        FROM knowledge_documents kd
        JOIN company_profiles cp ON kd.company_profile_id = cp.id
        WHERE cp.user_id = $1
        ORDER BY kd.created_at DESC
        LIMIT 10
      `, [userId]);

      // Get company team information if available (optional tables)
      let teamResult = { rows: [] };
      let achievementsResult = { rows: [] };
      
      try {
        teamResult = await database.query(`
          SELECT 
            ct.name,
            ct.position,
            ct.bio,
            ct.expertise_areas,
            ct.social_links
          FROM company_team ct
          JOIN company_profiles cp ON ct.company_profile_id = cp.id
          WHERE cp.user_id = $1 AND ct.status = 'active'
          ORDER BY ct.created_at DESC
          LIMIT 10
        `, [userId]);
      } catch (error) {
        // Table doesn't exist, skip team data
        logger.debug('company_team table not found, skipping team data');
      }

      try {
        achievementsResult = await database.query(`
          SELECT 
            ca.title,
            ca.description,
            ca.achieved_date,
            ca.category,
            ca.impact_level
          FROM company_achievements ca
          JOIN company_profiles cp ON ca.company_profile_id = cp.id
          WHERE cp.user_id = $1 AND ca.status = 'active'
          ORDER BY ca.achieved_date DESC
          LIMIT 10
        `, [userId]);
      } catch (error) {
        // Table doesn't exist, skip achievements data
        logger.debug('company_achievements table not found, skipping achievements data');
      }

      // Get e-commerce data (Shopify) - only if company_profile_id exists
      let shopifyData = { products: [], customers: [] };
      if (companyProfileId) {
        try {
          shopifyData.products = await ShopifyService.getProductsForAI(companyProfileId);
          shopifyData.customers = await ShopifyService.getCustomersForAI(companyProfileId);
        } catch (error) {
          logger.debug('Shopify data not available:', error.message);
        }
      }

      // Get CRM data (HubSpot) - only if company_profile_id exists
      let hubspotData = { contacts: [], deals: [], companies: [] };
      if (companyProfileId) {
        try {
          hubspotData.contacts = await HubSpotService.getContactsForAI(companyProfileId);
          hubspotData.deals = await HubSpotService.getDealsForAI(companyProfileId);
          hubspotData.companies = await HubSpotService.getCompaniesForAI(companyProfileId);
        } catch (error) {
          logger.debug('HubSpot data not available:', error.message);
        }
      }

      return {
        company: companyResult.rows[0] || null,
        products: productsResult.rows || [],
        documents: documentsResult.rows || [],
        team: teamResult.rows || [],
        achievements: achievementsResult.rows || [],
        shopify: shopifyData,
        hubspot: hubspotData
      };
    } catch (error) {
      logger.error('Error getting company data:', error);
      return { company: null, products: [], documents: [], team: [], achievements: [], shopify: { products: [], customers: [] }, hubspot: { contacts: [], deals: [], companies: [] } };
    }
  }

  /**
   * Build company-aware prompt for content generation
   */
  buildCompanyAwarePrompt(agent, options) {
    const {
      content_type,
      topic,
      style,
      length,
      context,
      hashtags,
      emojis,
      companyData,
      research = null
    } = options;

    let prompt = `You are ${agent.name}, a ${agent.personality_type} AI agent representing ${companyData.company.company_name}.

AGENT PERSONALITY: ${agent.personality_type}
AGENT DESCRIPTION: ${agent.description || 'Professional AI assistant'}

COMPANY INFORMATION:
- Industry: ${companyData.company.industry || 'Technology'}
- Description: ${companyData.company.company_description || 'Innovative technology company'}
- Brand Voice: ${companyData.company.brand_voice || 'Professional and helpful'}
- Key Messages: ${companyData.company.key_messages || 'Focus on innovation and customer success'}
- Target Audience: ${companyData.company.target_audience || 'Businesses and professionals'}
- Website: ${companyData.company.website || 'Not specified'}`;

    if (companyData.products && companyData.products.length > 0) {
      prompt += `\n\nCOMPANY PRODUCTS:`;
      companyData.products.forEach((product, index) => {
        prompt += `\n\nProduct ${index + 1}: ${product.name}
Category: ${product.category || 'General'}
Description: ${product.description || 'No description available'}
Key Features: ${product.key_features || 'Advanced capabilities'}
Benefits: ${product.benefits || 'Improved efficiency'}
Target Customers: ${product.target_customers || 'Business users'}
Use Cases: ${product.use_cases || 'Various applications'}
Competitive Advantages: ${product.competitive_advantages || 'Unique value proposition'}`;
      });
    }

    if (companyData.documents.length > 0) {
      prompt += `\n\nCOMPANY DOCUMENTS AND KNOWLEDGE BASE:`;
      companyData.documents.forEach((doc, index) => {
        prompt += `\n\nDocument ${index + 1}: ${doc.title}
Type: ${doc.file_type}
Summary: ${doc.summary || 'No summary available'}
Content Preview: ${doc.content ? doc.content.substring(0, 500) + '...' : 'No content available'}
Document Type: ${doc.document_type || 'General'}`;
      });
      
      // Add knowledge base usage instructions
      prompt += `\n\nKNOWLEDGE BASE USAGE GUIDELINES:
- Reference specific information from the knowledge base when relevant
- Use company documents to provide accurate, detailed information
- Draw insights from multiple documents to create comprehensive content
- Cite specific features, benefits, or capabilities mentioned in the knowledge base
- Use the knowledge base to answer questions about company products and services`;
    }

    if (companyData.team.length > 0) {
      prompt += `\n\nCOMPANY TEAM:`;
      companyData.team.forEach((member, index) => {
        prompt += `\n\nTeam Member ${index + 1}: ${member.name}
Position: ${member.position}
Bio: ${member.bio || 'No bio available'}
Expertise: ${member.expertise_areas || 'General expertise'}`;
      });
    }

    if (companyData.achievements.length > 0) {
      prompt += `\n\nCOMPANY ACHIEVEMENTS:`;
      companyData.achievements.forEach((achievement, index) => {
        prompt += `\n\nAchievement ${index + 1}: ${achievement.title}
Description: ${achievement.description || 'No description available'}
Date: ${achievement.achieved_date}
Category: ${achievement.category || 'General'}
Impact Level: ${achievement.impact_level || 'Medium'}`;
      });
    }

    // Add e-commerce data (Shopify)
    if (companyData.shopify && companyData.shopify.products.length > 0) {
      prompt += `\n\nE-COMMERCE PRODUCTS (Shopify):`;
      companyData.shopify.products.slice(0, 10).forEach((product, index) => {
        prompt += `\n\nProduct ${index + 1}: ${product.title}
Type: ${product.product_type || 'General'}
Vendor: ${product.vendor || 'Company'}
Price: $${product.price || 'Contact for pricing'}
Inventory: ${product.inventory_quantity || 0} units
SKU: ${product.sku || 'N/A'}
Tags: ${product.tags ? product.tags.join(', ') : 'None'}`;
      });
    }

    if (companyData.shopify && companyData.shopify.customers.length > 0) {
      prompt += `\n\nE-COMMERCE CUSTOMERS (Shopify):`;
      prompt += `\nTotal Customers: ${companyData.shopify.customers.length}`;
      prompt += `\nTop Customers by Spending:`;
      companyData.shopify.customers.slice(0, 5).forEach((customer, index) => {
        prompt += `\n${index + 1}. ${customer.first_name} ${customer.last_name} - $${customer.total_spent} (${customer.orders_count} orders)`;
      });
    }

    // Add CRM data (HubSpot)
    if (companyData.hubspot && companyData.hubspot.contacts.length > 0) {
      prompt += `\n\nCRM CONTACTS (HubSpot):`;
      prompt += `\nTotal Contacts: ${companyData.hubspot.contacts.length}`;
      prompt += `\nLead Status Distribution:`;
      const leadStatuses = companyData.hubspot.contacts.reduce((acc, contact) => {
        acc[contact.lead_status || 'Unknown'] = (acc[contact.lead_status || 'Unknown'] || 0) + 1;
        return acc;
      }, {});
      Object.entries(leadStatuses).forEach(([status, count]) => {
        prompt += `\n- ${status}: ${count} contacts`;
      });
    }

    if (companyData.hubspot && companyData.hubspot.deals.length > 0) {
      prompt += `\n\nCRM DEALS (HubSpot):`;
      prompt += `\nTotal Deals: ${companyData.hubspot.deals.length}`;
      prompt += `\nPipeline Value: $${companyData.hubspot.deals.reduce((sum, deal) => sum + (deal.amount || 0), 0).toLocaleString()}`;
      prompt += `\nTop Deals:`;
      companyData.hubspot.deals.slice(0, 5).forEach((deal, index) => {
        prompt += `\n${index + 1}. ${deal.deal_name} - $${deal.amount || 0} (${deal.deal_stage || 'Unknown'})`;
      });
    }

    if (companyData.hubspot && companyData.hubspot.companies.length > 0) {
      prompt += `\n\nCRM COMPANIES (HubSpot):`;
      prompt += `\nTotal Companies: ${companyData.hubspot.companies.length}`;
      prompt += `\nTop Companies by Revenue:`;
      companyData.hubspot.companies.slice(0, 5).forEach((company, index) => {
        prompt += `\n${index + 1}. ${company.company_name} - $${company.annual_revenue || 0} (${company.industry || 'Unknown'})`;
      });
    }

    // Add content generation instructions
    const personalityPrompt = this.getPersonalityPrompt(agent.personality_type);
    const voiceTone = this.getVoiceTonePrompt(agent.voice_tone || style);
    const contentTypeInstructions = this.getContentTypeInstructions(content_type);
    const lengthInstructions = this.getLengthInstructions(length);
    
    const topicContext = topic ? `\n\nTopic: ${topic}` : '';
    const contextInfo = context ? `\n\nContext: ${context}` : '';
    
    // Research-enhanced context
    let researchContext = '';
    if (research) {
      const ContentResearchService = require('./ContentResearchService');
      const researchService = new ContentResearchService();
      researchContext = researchService.enhancePromptWithResearch('', research);
    }
    
    const specialInstructions = [];
    if (hashtags) {
      // Use trending hashtags from research if available
      if (research?.trending_topics?.hashtags?.length > 0) {
        specialInstructions.push(`Include trending hashtags: ${research.trending_topics.hashtags.slice(0, 3).join(', ')}`);
      } else {
        specialInstructions.push('Include 2-3 relevant hashtags');
      }
    }
    if (emojis) specialInstructions.push('Use 1-2 appropriate emojis');
    
    const specialInstructionsText = specialInstructions.length > 0 
      ? `\n\nSpecial Instructions:\n- ${specialInstructions.join('\n- ')}`
      : '';

    // Add content variety mechanisms
    const varietyInstructions = this.getContentVarietyInstructions(agent);
    const openingPatterns = this.getOpeningPatterns(agent.personality_type);
    
    prompt += `\n\n${personalityPrompt}

Voice Tone: ${voiceTone}

${contentTypeInstructions}

${lengthInstructions}${topicContext}${contextInfo}${specialInstructionsText}

${varietyInstructions}

${openingPatterns}

IMPORTANT INSTRUCTIONS:
- Generate unique, varied content each time - avoid repetitive phrases like "Ready to..."
- Use diverse opening patterns and conversation starters
- Focus on your personality and the company information provided
- Be authentic and conversational, not robotic
- Create content that represents the company's brand authentically
- Vary your topics across all company products and services
- Use different angles: educational, inspirational, conversational, problem-solving
${this.isZenthryxAgent(agent) ? 
  '- You are a Zenthryx AI agent - you can mention Zenthryx AI naturally in your content' : 
  '- Focus on your company\'s brand and avoid mentioning external platforms like Zenthryx AI or Iqonga'}

Generate engaging, authentic content that matches the agent's personality and incorporates company information naturally.

Content:`;

    return prompt;
  }

  /**
   * Get content variety instructions to prevent repetitive content for all agents
   */
  getContentVarietyInstructions(agent) {
    const varietyStrategies = [
      'Use different conversation starters - avoid starting every post the same way',
      'Rotate between different content angles: educational, inspirational, conversational, problem-solving, behind-the-scenes, industry insights, customer stories',
      'Vary your topics across all company products and services mentioned in the knowledge base',
      'Mix up your posting style: questions, statements, stories, tips, insights, announcements, tutorials',
      'Use different emotional tones: excited, thoughtful, helpful, curious, confident, empathetic, analytical',
      'Include diverse call-to-actions: questions, invitations to discuss, tips sharing, feedback requests, community engagement',
      'Reference different aspects of your company: products, team, values, achievements, future plans, customer success stories',
      'Draw from different sections of your knowledge base: technical docs, marketing materials, case studies, FAQs',
      'Vary your content depth: quick tips, deep dives, overviews, comparisons, tutorials',
      'Use different engagement formats: polls, questions, challenges, sharing experiences, asking for opinions'
    ];

    // Add personality-specific variety strategies
    const personalitySpecificStrategies = this.getPersonalitySpecificVarietyStrategies(agent.personality_type);
    varietyStrategies.push(...personalitySpecificStrategies);

    return `CONTENT VARIETY STRATEGIES FOR ALL AGENTS:
${varietyStrategies.map(strategy => `- ${strategy}`).join('\n')}

Remember: Each post should feel fresh and different from your previous content. Avoid repetitive patterns and phrases.`;
  }

  /**
   * Get personality-specific variety strategies
   */
  getPersonalitySpecificVarietyStrategies(personalityType) {
    const strategies = {
      'witty_troll': [
        'Vary your humor styles: sarcasm, wordplay, observational humor, gentle teasing',
        'Mix serious insights with light-hearted commentary',
        'Use different comedic timing: setup-punchline, running gags, unexpected twists'
      ],
      'tech_sage': [
        'Alternate between beginner-friendly explanations and advanced technical details',
        'Mix theoretical concepts with practical applications',
        'Vary your expertise demonstration: tutorials, analysis, predictions, comparisons'
      ],
      'hype_beast': [
        'Vary your excitement levels: moderate enthusiasm to full hype',
        'Mix product features with industry trends and future possibilities',
        'Alternate between celebrating achievements and building anticipation'
      ],
      'honest_critic': [
        'Balance constructive criticism with positive reinforcement',
        'Vary your analytical depth: quick assessments to detailed breakdowns',
        'Mix industry analysis with product evaluation'
      ],
      'quirky_observer': [
        'Vary your observation angles: technical, social, behavioral, creative',
        'Mix obvious insights with unexpected connections',
        'Alternate between micro-observations and macro-patterns'
      ],
      'custom': [
        'Adapt your variety strategies based on audience feedback',
        'Experiment with different content formats and measure engagement',
        'Continuously evolve your content approach based on performance'
      ]
    };

    return strategies[personalityType] || strategies.custom;
  }

  /**
   * Get diverse opening patterns based on personality type
   */
  getOpeningPatterns(personalityType) {
    const patterns = {
      'witty_troll': [
        'Here\'s something that caught my attention...',
        'Plot twist:',
        'Hot take incoming:',
        'Unpopular opinion:',
        'Fun fact:',
        'You know what\'s interesting?',
        'Let me tell you about...',
        'Here\'s the thing about...',
        'I\'ve been thinking about...',
        'Quick question:'
      ],
      'tech_sage': [
        'From a technical perspective...',
        'Here\'s what I\'ve learned...',
        'The data shows...',
        'In my experience...',
        'The key insight is...',
        'What fascinates me is...',
        'The technology behind...',
        'Here\'s how it works...',
        'The future of...',
        'Let me explain...'
      ],
      'hype_beast': [
        'This is absolutely incredible!',
        'You have to see this!',
        'I\'m so excited about...',
        'Game changer alert:',
        'This is going to revolutionize...',
        'I can\'t contain my excitement about...',
        'This is next-level stuff!',
        'Mind = blown by...',
        'This is exactly what we needed!',
        'The possibilities are endless with...'
      ],
      'honest_critic': [
        'Let\'s be real about...',
        'Here\'s my honest take on...',
        'The truth about...',
        'I need to address...',
        'Let me give you the real story...',
        'Here\'s what actually matters...',
        'The reality is...',
        'Let\'s talk facts...',
        'I\'ve analyzed this and...',
        'Here\'s my assessment...'
      ],
      'quirky_observer': [
        'I noticed something peculiar...',
        'Here\'s an odd observation...',
        'Something interesting happened...',
        'I had a random thought about...',
        'You know what\'s weird?',
        'I was thinking about...',
        'Here\'s something I discovered...',
        'I had an epiphany about...',
        'This might sound strange, but...',
        'I\'ve been pondering...'
      ],
      'custom': [
        'I wanted to share...',
        'Here\'s something worth discussing...',
        'I\'ve been reflecting on...',
        'Let me tell you about...',
        'I think you\'ll find this interesting...',
        'Here\'s what I\'ve learned...',
        'I wanted to talk about...',
        'This caught my attention...',
        'I\'d like to explore...',
        'Here\'s my perspective on...'
      ]
    };

    const agentPatterns = patterns[personalityType] || patterns.custom;
    const randomPatterns = agentPatterns.sort(() => 0.5 - Math.random()).slice(0, 5);

    return `DIVERSE OPENING PATTERNS (use these instead of repetitive phrases):
${randomPatterns.map(pattern => `- ${pattern}`).join('\n')}

Choose different opening patterns for each post to maintain variety.`;
  }

  /**
   * Build contextual prompt for Telegram responses
   */
  buildContextualPrompt(agent, originalMessage, triggerType, companyData) {
    const userMessage = originalMessage.text || '';
    const chatTitle = originalMessage.chat.title || 'Telegram Group';

    let context = `You are ${agent.name}, a ${agent.personality_type} AI agent representing ${companyData.company?.company_name || 'your company'}.

AGENT PERSONALITY: ${agent.personality_type}
AGENT DESCRIPTION: ${agent.description || 'Professional AI assistant'}

TRIGGER TYPE: ${triggerType}
USER MESSAGE: "${userMessage}"
CHAT CONTEXT: ${chatTitle}

COMPANY INFORMATION:`;

    if (companyData.company) {
      context += `
- Company: ${companyData.company.company_name}
- Industry: ${companyData.company.industry || 'Technology'}
- Description: ${companyData.company.company_description || 'Innovative technology company'}
- Brand Voice: ${companyData.company.brand_voice || 'Professional and helpful'}
- Key Messages: ${companyData.company.key_messages || 'Focus on innovation and customer success'}
- Target Audience: ${companyData.company.target_audience || 'Businesses and professionals'}
- Website: ${companyData.company.website || 'Not specified'}`;
    } else {
      context += `
- Company: Your Company
- Industry: Technology
- Description: Innovative technology company
- Brand Voice: Professional and helpful
- Key Messages: Focus on innovation and customer success
- Target Audience: Businesses and professionals`;
    }

    if (companyData.products && companyData.products.length > 0) {
      context += `\n\nCOMPANY PRODUCTS:`;
      companyData.products.forEach((product, index) => {
        context += `\n\nProduct ${index + 1}: ${product.name}
Category: ${product.category || 'General'}
Description: ${product.description || 'No description available'}
Key Features: ${product.key_features || 'Advanced capabilities'}
Benefits: ${product.benefits || 'Improved efficiency'}
Target Customers: ${product.target_customers || 'Business users'}
Use Cases: ${product.use_cases || 'Various applications'}
Competitive Advantages: ${product.competitive_advantages || 'Unique value proposition'}`;
      });
    }

    if (companyData.documents.length > 0) {
      context += `\n\nCOMPANY DOCUMENTS AND KNOWLEDGE BASE:`;
      companyData.documents.forEach((doc, index) => {
        context += `\n\nDocument ${index + 1}: ${doc.title}
Type: ${doc.file_type}
Summary: ${doc.summary || 'No summary available'}
Content Preview: ${doc.content ? doc.content.substring(0, 500) + '...' : 'No content available'}`;
      });
    }

    context += `\n\nINSTRUCTIONS:
1. Respond as ${agent.name} with a ${agent.personality_type} personality
2. Use the company information and documents to provide accurate, helpful responses
3. If the user asks about trade signals, markets, or crypto, reference the company's specific offerings
4. Keep responses conversational and engaging
5. If you don't have specific information, acknowledge it and offer to help in other ways
6. Always maintain the agent's personality and brand voice

Generate a helpful, contextual response:`;

    return context;
  }

  /**
   * Fallback response when AI fails
   */
  getFallbackResponse(personalityType, triggerType) {
    const responses = {
      'professional': {
        'mention': 'Thank you for mentioning me! I\'m here to help with any questions about our services.',
        'reply': 'I appreciate your response. Let me know if you need any assistance!',
        'keyword': 'That\'s an interesting point. I\'d be happy to discuss this further.'
      },
      'casual': {
        'mention': 'Hey there! 👋 Thanks for the mention! What\'s up?',
        'reply': 'Cool! Thanks for replying! 😊',
        'keyword': 'Nice! I love talking about this stuff! 🚀'
      },
      'expert': {
        'mention': 'I\'m here to provide expert insights on this topic. What would you like to know?',
        'reply': 'Excellent question! Let me share some insights on this.',
        'keyword': 'That\'s a great point. From my experience, I can tell you that...'
      }
    };

    const personalityResponses = responses[personalityType] || responses['professional'];
    return personalityResponses[triggerType] || personalityResponses['mention'];
  }

  /**
   * Check if AI service is available
   */
  isAIAvailable() {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Generate long-form content (blogs, newsletters, articles, etc.)
   * @param {object} agent - Agent configuration
   * @param {object} options - Generation options
   * @returns {Promise<object>} Generated content with title and body
   */
  async generateLongFormContent(agent, options = {}) {
    try {
      const {
        content_type = 'blog',
        topic,
        title,
        target_word_count = 1000,
        tone = 'professional',
        include_seo = true,
        target_audience,
        key_points,
        template_id = null, // Optional: content template ID
        enable_research = true, // Enable web search by default
        include_citations = true // Include source citations
      } = options;

      // If template is provided, use template structure
      if (template_id) {
        const template = await this.getTemplate(template_id, agent.user_id);
        if (template) {
          // Generate content using template structure (adapted for long-form)
          return await this.generateLongFormContentWithTemplate(agent, template, options);
        }
      }

      // Get company knowledge
      const companyData = await this.getCompanyData(agent.user_id);
      
      // Build personality context
      const personalityPrompt = this.getPersonalityPrompt(agent.personality_type || 'custom');
      const voiceTone = agent.voice_tone || 'professional';

      // Build company context
      let companyContext = '';
      if (companyData && companyData.company) {
        const company = companyData.company;
        companyContext = `\n\nCOMPANY INFORMATION:\n`;
        companyContext += `Company Name: ${company.company_name || 'N/A'}\n`;
        companyContext += `Description: ${company.company_description || 'N/A'}\n`;
        if (company.brand_voice) {
          companyContext += `Brand Voice: ${company.brand_voice}\n`;
        }
        if (company.target_audience) {
          companyContext += `Target Audience: ${company.target_audience}\n`;
        }
      }

      // Build content type specific instructions
      const contentTypeInstructions = {
        blog: 'Write a comprehensive, SEO-optimized blog post',
        newsletter: 'Write an engaging newsletter article',
        substack: 'Write a long-form Substack-style article',
        medium: 'Write a Medium publication article',
        press_release: 'Write a professional press release',
        whitepaper: 'Write an in-depth whitepaper',
        case_study: 'Write a detailed case study',
        article: 'Write a general long-form article'
      };

      // Build prompt
      let prompt = `${contentTypeInstructions[content_type] || contentTypeInstructions.article} about: ${topic}\n\n`;
      
      if (title) {
        prompt += `Title: ${title}\n\n`;
      }

      // Check if sections are provided (from plugin)
      const sections = options.sections || null;
      const paragraphs_per_section = options.paragraphs_per_section || 3;
      
      prompt += `Requirements:\n`;
      prompt += `- Target word count: ${target_word_count} words\n`;
      prompt += `- Tone: ${tone}\n`;
      
      if (target_audience) {
        prompt += `- Target audience: ${target_audience}\n`;
      }

      if (key_points) {
        prompt += `- Key points to cover:\n${key_points.split('\n').map(p => `  - ${p.trim()}`).join('\n')}\n`;
      }

      if (include_seo) {
        prompt += `- Include SEO optimization: natural keyword integration, meta-friendly structure\n`;
      }

      // Enhanced structure instructions
      if (sections && Array.isArray(sections) && sections.length > 0) {
        prompt += `\nCONTENT STRUCTURE:\n`;
        prompt += `You MUST follow this exact structure with numbered sections:\n\n`;
        
        sections.forEach((section, index) => {
          const sectionTitle = typeof section === 'string' ? section : (section.title || section.name || section);
          prompt += `${index + 1}. ${sectionTitle}\n`;
          prompt += `   - Write exactly ${paragraphs_per_section} substantial paragraphs for this section\n`;
          prompt += `   - Each paragraph should be 3-5 sentences minimum\n`;
          prompt += `   - Use markdown heading: ## ${index + 1}. ${sectionTitle}\n\n`;
        });
        
        prompt += `FORMATTING REQUIREMENTS:\n`;
        prompt += `- Use numbered markdown headings: ## 1. Section Title, ## 2. Section Title, etc.\n`;
        prompt += `- Each section must have exactly ${paragraphs_per_section} paragraphs\n`;
        prompt += `- Paragraphs should be well-developed (3-5 sentences each)\n`;
        prompt += `- Use proper spacing between sections\n`;
        prompt += `- Ensure all ${sections.length} sections are covered completely\n\n`;
      } else {
        prompt += `- Structure: Use numbered markdown headings (## 1. Section Title, ## 2. Section Title, etc.)\n`;
        prompt += `- Each section should have 3-5 substantial paragraphs\n`;
        prompt += `- Use proper spacing and formatting\n`;
      }
      
      prompt += `- Quality: Well-researched, engaging, and valuable content\n`;
      prompt += `- Completeness: Ensure ALL sections are fully developed - do NOT cut off mid-section or mid-paragraph\n\n`;

      // Add web research if enabled (only for content generation, not for title/sections/excerpt)
      let researchContext = '';
      let citations = [];
      
      // Only enable research if explicitly requested AND we have a valid topic (not a full prompt)
      // Check if topic looks like a prompt (contains instructions) - if so, disable research
      const isPrompt = topic && (
        topic.toLowerCase().includes('write') || 
        topic.toLowerCase().includes('generate') ||
        topic.toLowerCase().includes('output only') ||
        topic.length > 200
      );
      
      if (enable_research && topic && !isPrompt) {
        try {
          const ContentResearchService = require('./ContentResearchService');
          const researchService = new ContentResearchService();
          
          logger.info(`[LongForm] Researching topic: ${topic}`);
          const research = await researchService.researchTopic(topic, {
            max_sources: 5,
            include_trending: true
          });
          
          if (research && research.web_search && research.web_search.results) {
            researchContext = `\n\nRESEARCH FINDINGS:\n`;
            const organicResults = research.web_search.results.organic || [];
            organicResults.slice(0, 5).forEach((result, idx) => {
              researchContext += `${idx + 1}. ${result.title || result.snippet || 'Source'}\n`;
              researchContext += `   Source: ${result.url || result.link || result.url || 'N/A'}\n`;
              researchContext += `   ${result.snippet || result.description || ''}\n\n`;
              
              if (include_citations && (result.url || result.link)) {
                citations.push({
                  title: result.title || 'Source',
                  url: result.url || result.link,
                  snippet: result.snippet || result.description
                });
              }
            });
            
            // Add Twitter/X insights if available
            if (research.trending_topics && research.trending_topics.hashtags) {
              researchContext += `\nSOCIAL MEDIA INSIGHTS (Twitter/X):\n`;
              research.trending_topics.hashtags.slice(0, 3).forEach((hashtag, idx) => {
                researchContext += `${idx + 1}. #${hashtag}\n`;
              });
              researchContext += `\n`;
            }
            
            researchContext += `\nUse this research to inform your content, but write in your own words. `;
            if (include_citations) {
              researchContext += `Include citations in the format: [Source Name](URL) at the end of relevant paragraphs.\n`;
            }
          }
        } catch (researchError) {
          logger.warn(`[LongForm] Research failed, continuing without: ${researchError.message}`);
          // Continue without research
        }
      }
      
      prompt += `AGENT PERSONALITY:\n${personalityPrompt}\nVoice Tone: ${voiceTone}\n`;
      prompt += companyContext;
      prompt += researchContext;

      // Add explicit formatting instructions
      prompt += `\n\nCRITICAL FORMATTING RULES:\n`;
      prompt += `1. Use numbered markdown headings for ALL sections: ## 1. Section Title, ## 2. Section Title, etc.\n`;
      prompt += `2. Each section MUST start with its numbered heading on a new line\n`;
      prompt += `3. After each heading, add a blank line before the first paragraph\n`;
      prompt += `4. CRITICAL: Each paragraph MUST be separated by a blank line (double line break)\n`;
      prompt += `5. Write ${paragraphs_per_section} DISTINCT paragraphs per section - each paragraph should be 3-5 sentences\n`;
      prompt += `6. Use proper spacing: one blank line between paragraphs, one blank line between sections\n`;
      prompt += `7. Do NOT write continuous text without paragraph breaks - always use double line breaks between paragraphs\n`;
      prompt += `8. Do NOT use bullet points or lists for section headings - use numbered headings only\n`;
      prompt += `9. Example format:\n`;
      prompt += `\n## 1. First Section Title\n\nThis is the first paragraph of the first section. It contains multiple sentences that form a complete thought. Each paragraph should be substantial and well-developed.\n\nThis is the second paragraph of the first section. It continues the discussion with new ideas and information. Always separate paragraphs with blank lines.\n\n## 2. Second Section Title\n\nThis is the first paragraph of the second section. Notice how each paragraph is clearly separated.\n\nThis is the second paragraph of the second section. The formatting makes the content easy to read.\n\n`;
      
      prompt += `\nGenerate the complete ${content_type} content now. Make it comprehensive, well-structured, and engaging.`;

      // Generate content
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert content writer specializing in long-form content creation. You write engaging, well-structured, and SEO-optimized content. You ALWAYS use numbered markdown headings (## 1., ## 2., etc.) for sections and ensure proper formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: Math.min(target_word_count * 2, 4000) // Rough estimate
      });
      
      // Post-process content to ensure proper formatting
      let content = response.choices[0].message.content.trim();
      
      // Ensure sections are properly numbered - more aggressive fixing
      if (sections && Array.isArray(sections) && sections.length > 0) {
        // First, extract section titles (clean them)
        const sectionTitles = sections.map(section => {
          const title = typeof section === 'string' ? section : (section.title || section.name || section);
          // Remove any existing numbering or markdown
          return title.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '').trim();
        });
        
        // Fix each section heading
        sectionTitles.forEach((sectionTitle, index) => {
          const sectionNumber = index + 1;
          const expectedHeading = `## ${sectionNumber}. ${sectionTitle}`;
          
          // Try multiple patterns to find and replace
          const patterns = [
            // Pattern 1: Already numbered but wrong format: ## 1 Section Title or ##1 Section Title
            new RegExp(`^##\\s*${sectionNumber}\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi'),
            // Pattern 2: Numbered with dot but wrong spacing: ## 1. Section Title (already correct)
            new RegExp(`^##\\s*${sectionNumber}\\.\\s*${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi'),
            // Pattern 3: Unnumbered heading: ## Section Title
            new RegExp(`^##\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi'),
            // Pattern 4: Single # heading: # Section Title
            new RegExp(`^#\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi'),
            // Pattern 5: Plain text section title (no markdown)
            new RegExp(`^${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'gmi'),
            // Pattern 6: Numbered list format: 1. Section Title
            new RegExp(`^${sectionNumber}\\.\\s*${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi'),
          ];
          
          // Replace first occurrence of any matching pattern
          let replaced = false;
          patterns.forEach(pattern => {
            if (pattern.test(content) && !replaced) {
              content = content.replace(pattern, expectedHeading);
              replaced = true;
            }
          });
          
          // If no pattern matched, try to find and replace by partial title match
          if (!replaced) {
            // Extract key words from section title (first 3-5 words)
            const keyWords = sectionTitle.split(/\s+/).slice(0, 5).join('\\s+');
            const fallbackPattern = new RegExp(`^(##?\\s*)(?:\\d+\\.?\\s*)?(${keyWords}[^\\n]*)`, 'gmi');
            if (fallbackPattern.test(content)) {
              content = content.replace(fallbackPattern, expectedHeading);
            }
          }
        });
        
        // Final pass: ensure all headings are properly formatted
        // Fix any remaining unnumbered ## headings
        const lines = content.split('\n');
        let currentSectionNum = 1;
        const fixedLines = lines.map((line, idx) => {
          // Check if this is a heading line
          if (line.match(/^##\s+/)) {
            // Check if it's already numbered
            if (!line.match(/^##\s+\d+\./)) {
              // Try to match with a section title
              const matchedSection = sectionTitles.findIndex(title => {
                const keyWords = title.split(/\s+/).slice(0, 3).join(' ');
                return line.toLowerCase().includes(keyWords.toLowerCase());
              });
              
              if (matchedSection >= 0) {
                return `## ${matchedSection + 1}. ${sectionTitles[matchedSection]}`;
              } else if (currentSectionNum <= sectionTitles.length) {
                // Use current section number
                const num = currentSectionNum;
                currentSectionNum++;
                const title = line.replace(/^##\s+/, '').trim();
                return `## ${num}. ${title}`;
              }
            }
          }
          return line;
        });
        content = fixedLines.join('\n');
      } else {
        // Even without sections array, ensure any headings are numbered
        // Fix unnumbered ## headings by adding numbers
        let sectionCounter = 1;
        content = content.replace(/^##\s+(?!\d+\.)(.+)$/gm, (match, title) => {
          return `## ${sectionCounter++}. ${title}`;
        });
      }
      
      // Fix numbered list format (1. Title) to markdown headings (## 1. Title)
      // This handles cases where AI outputs "1. Introduction" instead of "## 1. Introduction"
      content = content.replace(/^(\d+)\.\s+([A-Z][^\n]+?)(?:\n\n|\n(?!\n))/gm, (match, num, title) => {
        // Check if this looks like a section heading (not a full paragraph)
        if (title.length < 100 && !title.match(/[.!?]\s+[A-Z]/)) {
          return `## ${num}. ${title.trim()}`;
        }
        return match;
      });
      
      // Ensure proper spacing between sections (minimal processing to avoid breaking content)
      // Just ensure headings have blank lines after them
      content = content.replace(/(##\s+\d+\.\s+[^\n]+)\n([^\n#])/g, '$1\n\n$2');
      
      // Remove excessive blank lines (more than 2 consecutive)
      content = content.replace(/\n{3,}/g, '\n\n');
      
      // Trim any leading/trailing whitespace
      content = content.trim();
      
      const wordCount = content.split(/\s+/).length;

      // Extract title if not provided
      let finalTitle = title;
      if (!finalTitle) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          finalTitle = titleMatch[1].trim();
        } else {
          finalTitle = topic;
        }
      }

      // Add citations to content if available
      if (include_citations && citations.length > 0) {
        content += `\n\n## Sources\n\n`;
        citations.forEach((citation, idx) => {
          content += `${idx + 1}. [${citation.title}](${citation.url})\n`;
        });
      }
      
      return {
        title: finalTitle,
        content: content,
        word_count: wordCount,
        citations: include_citations ? citations : [],
        research_used: enable_research && researchContext ? true : false
      };
    } catch (error) {
      logger.error('Long-form content generation error:', error);
      throw new Error(`Failed to generate long-form content: ${error.message}`);
    }
  }

  /**
   * Generate creative writing content (stories, poems, books, etc.)
   * @param {object} agent - Agent configuration
   * @param {object} options - Generation options
   * @returns {Promise<object>} Generated content with title, body, and optional chapters
   */
  async generateCreativeContent(agent, options = {}) {
    try {
      const {
        content_type = 'story',
        topic,
        title,
        genre = 'fiction',
        target_word_count = 2000,
        style = 'narrative',
        target_audience,
        characters,
        plot_points,
        template_id = null // Optional: content template ID
      } = options;

      // If template is provided, use template structure
      if (template_id) {
        const template = await this.getTemplate(template_id, agent.user_id);
        if (template) {
          // Generate content using template structure (adapted for creative)
          return await this.generateCreativeContentWithTemplate(agent, template, options);
        }
      }

      // Get company knowledge
      const companyData = await this.getCompanyData(agent.user_id);
      
      // Build personality context
      const personalityPrompt = this.getPersonalityPrompt(agent.personality_type || 'custom');
      const voiceTone = agent.voice_tone || 'professional';

      // Build company context
      let companyContext = '';
      if (companyData && companyData.company) {
        const company = companyData.company;
        companyContext = `\n\nCOMPANY INFORMATION (for context only):\n`;
        companyContext += `Company Name: ${company.company_name || 'N/A'}\n`;
        if (company.brand_voice) {
          companyContext += `Brand Voice: ${company.brand_voice}\n`;
        }
      }

      // Build content type specific instructions
      const contentTypeInstructions = {
        story: 'Write a creative short story',
        book_chapter: 'Write a book chapter',
        poem: 'Write a poem',
        children_book: 'Write a children\'s book story',
        screenplay: 'Write a screenplay scene',
        creative_nonfiction: 'Write creative nonfiction'
      };

      // Build prompt
      let prompt = `${contentTypeInstructions[content_type] || contentTypeInstructions.story} about: ${topic}\n\n`;
      
      if (title) {
        prompt += `Title: ${title}\n\n`;
      }

      prompt += `Requirements:\n`;
      prompt += `- Genre: ${genre}\n`;
      prompt += `- Style: ${style}\n`;
      prompt += `- Target word count: ${target_word_count} words\n`;
      
      if (target_audience) {
        prompt += `- Target audience: ${target_audience}\n`;
      }

      if (characters) {
        prompt += `- Characters:\n${characters.split('\n').map(c => `  - ${c.trim()}`).join('\n')}\n`;
      }

      if (plot_points) {
        prompt += `- Plot points:\n${plot_points.split('\n').map(p => `  - ${p.trim()}`).join('\n')}\n`;
      }

      prompt += `- Quality: Engaging, well-written, creative, and original\n\n`;

      prompt += `AGENT PERSONALITY:\n${personalityPrompt}\nVoice Tone: ${voiceTone}\n`;
      prompt += companyContext;

      prompt += `\nGenerate the complete ${content_type} content now. Make it creative, engaging, and well-crafted.`;

      // Generate content
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert creative writer specializing in fiction, poetry, and creative nonfiction. You write engaging, original, and well-crafted creative content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8, // Higher temperature for more creativity
        max_tokens: Math.min(target_word_count * 2, 4000)
      });

      const content = response.choices[0].message.content.trim();
      const wordCount = content.split(/\s+/).length;

      // Extract title if not provided
      let finalTitle = title;
      if (!finalTitle) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          finalTitle = titleMatch[1].trim();
        } else {
          finalTitle = topic;
        }
      }

      return {
        title: finalTitle,
        content: content,
        word_count: wordCount,
        chapters: [] // Can be expanded for multi-chapter books
      };
    } catch (error) {
      logger.error('Creative writing generation error:', error);
      throw new Error(`Failed to generate creative content: ${error.message}`);
    }
  }

  /**
   * Generate long-form content using a template structure
   */
  async generateLongFormContentWithTemplate(agent, template, options) {
    try {
      const {
        content_type = 'blog',
        topic,
        title,
        target_word_count = 1000,
        tone = 'professional',
        include_seo = true,
        target_audience,
        key_points
      } = options;

      const templateStructure = typeof template.template_structure === 'string' 
        ? JSON.parse(template.template_structure)
        : template.template_structure;

      // Get company knowledge
      const companyData = await this.getCompanyData(agent.user_id);
      const personalityPrompt = this.getPersonalityPrompt(agent.personality_type);
      const voiceTone = agent.voice_tone || tone;

      // Build template-based prompt
      let prompt = `Write a comprehensive ${content_type} about: ${topic}\n\n`;
      
      if (title) {
        prompt += `Title: ${title}\n\n`;
      }

      prompt += `CONTENT TEMPLATE: ${template.name}\n${template.description ? `Description: ${template.description}\n` : ''}\n`;

      // Get paragraphs per section from options
      const paragraphs_per_section = options.paragraphs_per_section || 3;
      
      // Add template sections with formatting instructions
      if (templateStructure.sections && Array.isArray(templateStructure.sections)) {
        prompt += `Follow this EXACT structure with numbered sections:\n\n`;
        templateStructure.sections.forEach((section, index) => {
          prompt += `${index + 1}. ${section.name}\n`;
          prompt += `   ${section.prompt}\n`;
          prompt += `   - Write exactly ${paragraphs_per_section} substantial paragraphs for this section\n`;
          prompt += `   - Use markdown heading: ## ${index + 1}. ${section.name}\n\n`;
        });
      }

      prompt += `\nCRITICAL FORMATTING REQUIREMENTS:\n`;
      prompt += `1. EVERY section MUST use numbered markdown headings: ## 1. Section Name, ## 2. Section Name, etc.\n`;
      prompt += `2. The format is EXACTLY: ## [number]. [Section Name] (two #, space, number, period, space, title)\n`;
      prompt += `3. Each section must have exactly ${paragraphs_per_section} paragraphs (3-5 sentences each)\n`;
      prompt += `4. Use proper spacing: blank line before heading, blank line after heading, then paragraphs\n`;
      prompt += `5. Ensure ALL ${templateStructure.sections?.length || 0} sections are covered completely\n`;
      prompt += `6. Example of correct format:\n`;
      prompt += `\n## 1. First Section Name\n\n[Paragraph 1]\n[Paragraph 2]\n\n## 2. Second Section Name\n\n[Paragraph 1]\n[Paragraph 2]\n\n`;
      
      prompt += `Requirements:\n`;
      prompt += `- Target word count: ${target_word_count} words\n`;
      prompt += `- Tone: ${tone}\n`;
      if (target_audience) prompt += `- Target audience: ${target_audience}\n`;
      if (key_points) prompt += `- Key points: ${key_points}\n`;
      if (include_seo) prompt += `- Include SEO optimization\n`;
      prompt += `- Completeness: Do NOT cut off mid-section or mid-paragraph - ensure full completion\n`;

      prompt += `\nAGENT PERSONALITY:\n${personalityPrompt}\nVoice Tone: ${voiceTone}\n`;
      if (companyData.company) {
        prompt += `\nCOMPANY INFORMATION:\nCompany: ${companyData.company.company_name}\n`;
      }

      // Generate content
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert content writer specializing in long-form content creation. You write engaging, well-structured, and SEO-optimized content following specific templates. You ALWAYS use numbered markdown headings (## 1., ## 2., etc.) for sections and ensure proper formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: Math.min(target_word_count * 2, 4000)
      });

      let content = response.choices[0].message.content.trim();
      const wordCount = content.split(/\s+/).length;
      
      // Post-process to ensure proper numbered headings
      if (templateStructure.sections && Array.isArray(templateStructure.sections)) {
        const sectionTitles = templateStructure.sections.map(s => s.name);
        
        // Fix each section heading
        sectionTitles.forEach((sectionTitle, index) => {
          const sectionNumber = index + 1;
          const expectedHeading = `## ${sectionNumber}. ${sectionTitle}`;
          
          // Multiple patterns to catch variations
          const patterns = [
            new RegExp(`^##\\s*${sectionNumber}\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi'),
            new RegExp(`^##\\s*${sectionNumber}\\.\\s*${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi'),
            new RegExp(`^##\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi'),
            new RegExp(`^#\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gmi'),
          ];
          
          patterns.forEach(pattern => {
            content = content.replace(pattern, expectedHeading);
          });
        });
        
        // Final pass: ensure all ## headings are numbered
        let sectionCounter = 1;
        content = content.replace(/^##\s+(?!\d+\.)(.+)$/gm, (match, title) => {
          // Try to match with section titles
          const matchedIndex = sectionTitles.findIndex(st => 
            title.toLowerCase().includes(st.toLowerCase().substring(0, 10))
          );
          if (matchedIndex >= 0) {
            return `## ${matchedIndex + 1}. ${sectionTitles[matchedIndex]}`;
          }
          return `## ${sectionCounter++}. ${title}`;
        });
      }

      return {
        title: title || topic,
        content: content,
        word_count: wordCount,
        generation_config: {
          template_id: template.id,
          template_name: template.name
        }
      };
    } catch (error) {
      logger.error('Template-based long-form generation failed:', error);
      // Fallback to regular generation
      return await this.generateLongFormContent(agent, { ...options, template_id: null });
    }
  }

  /**
   * Get content template by ID
   * @param {string} templateId - Template ID (UUID)
   * @param {number} userId - User ID for access control
   * @returns {Promise<object|null>} Template object or null if not found
   */
  async getTemplate(templateId, userId) {
    try {
      // Query content_series_templates table (for long-form and creative writing templates)
      const result = await database.query(
        `SELECT 
          id,
          name,
          description,
          category,
          framework_type,
          template_structure,
          example_content,
          is_system_template,
          is_active
        FROM content_series_templates 
        WHERE id = $1 
          AND (user_id = $2 OR is_system_template = true)
          AND is_active = true`,
        [templateId, userId]
      );

      if (result.rows.length === 0) {
        logger.warn(`Template not found: ${templateId} for user ${userId}`);
        return null;
      }

      const template = result.rows[0];
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        framework_type: template.framework_type,
        template_structure: template.template_structure,
        example_content: template.example_content,
        is_system_template: template.is_system_template
      };
    } catch (error) {
      logger.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Generate creative content using a template structure
   */
  async generateCreativeContentWithTemplate(agent, template, options) {
    try {
      const {
        content_type = 'story',
        topic,
        title,
        genre = 'fiction',
        target_word_count = 2000,
        style = 'narrative',
        target_audience,
        characters,
        plot_points
      } = options;

      const templateStructure = typeof template.template_structure === 'string' 
        ? JSON.parse(template.template_structure)
        : template.template_structure;

      // Get company knowledge
      const companyData = await this.getCompanyData(agent.user_id);
      const personalityPrompt = this.getPersonalityPrompt(agent.personality_type);
      const voiceTone = agent.voice_tone || style;

      // Build template-based prompt
      let prompt = `Write a creative ${content_type} about: ${topic}\n\n`;
      
      if (title) {
        prompt += `Title: ${title}\n\n`;
      }

      prompt += `CONTENT TEMPLATE: ${template.name}\n${template.description ? `Description: ${template.description}\n` : ''}\n`;

      // Add template sections
      if (templateStructure.sections && Array.isArray(templateStructure.sections)) {
        prompt += `Follow this structure:\n`;
        templateStructure.sections.forEach((section, index) => {
          prompt += `\n${index + 1}. ${section.name}: ${section.prompt}`;
        });
      }

      prompt += `\n\nRequirements:\n`;
      prompt += `- Genre: ${genre}\n`;
      prompt += `- Style: ${style}\n`;
      prompt += `- Target word count: ${target_word_count} words\n`;
      if (target_audience) prompt += `- Target audience: ${target_audience}\n`;
      if (characters) prompt += `- Characters: ${characters}\n`;
      if (plot_points) prompt += `- Plot points: ${plot_points}\n`;

      prompt += `\nAGENT PERSONALITY:\n${personalityPrompt}\nVoice Tone: ${voiceTone}\n`;

      // Generate content
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert creative writer specializing in fiction, poetry, and creative nonfiction. You write engaging, original, and well-crafted creative content following specific templates.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: Math.min(target_word_count * 2, 4000)
      });

      const content = response.choices[0].message.content.trim();
      const wordCount = content.split(/\s+/).length;

      return {
        title: title || topic,
        content: content,
        word_count: wordCount,
        chapters: [],
        generation_config: {
          template_id: template.id,
          template_name: template.name
        }
      };
    } catch (error) {
      logger.error('Template-based creative generation failed:', error);
      // Fallback to regular generation
      return await this.generateCreativeContent(agent, { ...options, template_id: null });
    }
  }
}

module.exports = new AIContentService();
