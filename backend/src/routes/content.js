const express = require('express');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const router = express.Router();
const { upload } = require('../middleware/multer'); // Added multer middleware
const ipfsService = require('../services/ipfsService'); // Added IPFS service
const path = require('path'); // Added path module for local path resolution
const CreditService = require('../services/CreditService'); // Added credit service
const GeminiService = require('../services/GeminiService'); // Added Gemini service
const VideoGenerationService = require('../services/VideoGenerationService'); // Added video generation service
const MusicGenerationService = require('../services/MusicGenerationService'); // Added music generation service
const MusicVideoGenerationService = require('../services/MusicVideoGenerationService'); // Added music video generation service
const ServicePricingService = require('../services/ServicePricingService'); // Added service pricing service
const MultiModalContentService = require('../services/MultiModalContentService'); // Added multi-modal content service
const { formatCreditError } = require('../utils/creditErrorHandler'); // Added credit error formatter

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize credit service
const creditService = new CreditService();

// GET /api/content
router.get('/', async (req, res) => {
  try {
    res.json({ message: 'Content endpoint working', content: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/content/pricing - Get public service pricing (for display to users)
router.get('/pricing', authenticateToken, async (req, res) => {
  try {
    // Initialize table if needed
    await ServicePricingService.initializePricingTable();
    
    // Get pricing from database
    let pricing = [];
    
    try {
      const result = await database.query(`
        SELECT service_key, service_name, category, credit_cost, billing_unit, rate, description
        FROM service_pricing
        ORDER BY category, service_name
      `);
      pricing = result.rows;
    } catch (error) {
      // Table doesn't exist yet, return default pricing structure
      logger.warn('service_pricing table not found, using defaults');
      const defaults = ServicePricingService.getDefaultPricing();
      pricing = Object.entries(defaults).map(([key, value]) => ({
        service_key: key,
        credit_cost: value.cost,
        billing_unit: value.billing_unit,
        rate: value.rate
      }));
    }

    // If no pricing in database, return defaults
    if (pricing.length === 0) {
      const defaults = ServicePricingService.getDefaultPricing();
      pricing = Object.entries(defaults).map(([key, value]) => ({
        service_key: key,
        credit_cost: value.cost,
        billing_unit: value.billing_unit,
        rate: value.rate
      }));
    }

    res.json({
      success: true,
      data: {
        pricing
      }
    });

  } catch (error) {
    logger.error('Service pricing error:', error);
    res.status(500).json({ error: 'Failed to load service pricing' });
  }
});

// GET /api/content/images - Get user's generated images
router.get('/images', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, agentId } = req.query;
    const offset = (page - 1) * limit;
    
    console.log('Fetching images for user:', userId, 'page:', page, 'agentId:', agentId);

    let query = `
      SELECT 
        gi.id,
        gi.prompt,
        gi.style,
        gi.size,
        gi.image_url,
        gi.ipfs_hash,
        gi.ipfs_uri,
        gi.metadata,
        gi.status,
        gi.created_at,
        aa.name as agent_name
      FROM generated_images gi
      LEFT JOIN ai_agents aa ON gi.agent_id = aa.id
      WHERE gi.user_id = $1
    `;
    
    const params = [userId];
    
    if (agentId) {
      query += ` AND gi.agent_id = $${params.length + 1}`;
      params.push(agentId);
    }
    
    query += ` ORDER BY gi.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await database.query(query, params);
    
    console.log('Images query result:', result.rows.length, 'images found for user:', userId);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM generated_images gi WHERE gi.user_id = $1`;
    const countParams = [userId];
    
    if (agentId) {
      countQuery += ` AND gi.agent_id = $2`;
      countParams.push(agentId);
    }
    
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    const responseData = {
      success: true,
      data: {
        images: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };
    
    console.log('Sending response with', result.rows.length, 'images');
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json(responseData);
  } catch (error) {
    logger.error('Error fetching user images:', error);
    res.status(500).json({ error: 'Failed to fetch images', details: error.message });
  }
});

// GET /api/content/images/:id - Get specific image details
router.get('/images/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const imageId = req.params.id;

    const result = await database.query(`
      SELECT 
        gi.*,
        aa.name as agent_name
      FROM generated_images gi
      LEFT JOIN ai_agents aa ON gi.agent_id = aa.id
      WHERE gi.id = $1 AND gi.user_id = $2
    `, [imageId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching image details:', error);
    res.status(500).json({ error: 'Failed to fetch image details', details: error.message });
  }
});

// DELETE /api/content/images/:id - Delete an image
router.delete('/images/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const imageId = req.params.id;

    const result = await database.query(`
      DELETE FROM generated_images 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [imageId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image', details: error.message });
  }
});

// POST /api/content/ai/images/generate
router.post('/ai/images/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, style = 'realistic', size = '512x512', negativePrompt, agentName } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Deduct credits for image generation (dynamic pricing)
    const imageId = uuidv4();
    const creditCost = await ServicePricingService.getPricing('image_generation');
    
    try {
      await creditService.deductCredits(userId, 'image_generation', creditCost, imageId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Build the enhanced prompt based on style
    const stylePrompts = {
      'realistic': 'photorealistic, high quality, detailed',
      'digital_art': 'digital art, concept art, artstation quality',
      'cartoon': 'cartoon style, animated, colorful',
      'anime': 'anime style, manga inspired, detailed',
      'cyberpunk': 'cyberpunk aesthetic, neon lights, futuristic',
      'minimalist': 'minimalist design, clean, simple'
    };

    const enhancedPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.realistic}`;
    
    // Add negative prompt if provided
    const finalPrompt = negativePrompt 
      ? `${enhancedPrompt}. Avoid: ${negativePrompt}`
      : enhancedPrompt;

    console.log('Generating image with prompt:', finalPrompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: finalPrompt,
      n: 1,
      size: size === '512x512' ? '1024x1024' : size, // DALL-E 3 doesn't support 512x512
      quality: "standard",
      style: style === 'digital_art' ? 'vivid' : 'natural'
    });

    const imageUrl = response.data[0].url;

    // Download and save the generated image locally
    let localImageUrl = imageUrl; // Fallback to original URL if download fails
    
    try {
      const https = require('https');
      const fs = require('fs');
      const path = require('path');
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../uploads/generated');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `ai_generated_${timestamp}_${uuidv4().substring(0, 8)}.png`;
      const localPath = path.join(uploadsDir, filename);
      
      // Download the image
      const fileStream = fs.createWriteStream(localPath);
      
      await new Promise((resolve, reject) => {
        https.get(imageUrl, (response) => {
          if (response.statusCode === 200) {
            response.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close();
              localImageUrl = `/uploads/generated/${filename}`;
              console.log(`Image downloaded and saved locally: ${localPath}`);
              resolve();
            });
          } else {
            reject(new Error(`Failed to download image: ${response.statusCode}`));
          }
        }).on('error', (err) => {
          reject(err);
        });
      });
      
    } catch (downloadError) {
      console.warn('Failed to download image locally, using original URL:', downloadError.message);
      // Continue with original Azure URL if local download fails
    }

    // Save the generated image to the database
    try {
      const imageId = uuidv4();
      const result = await database.query(`
        INSERT INTO generated_images (
          id, user_id, agent_id, prompt, style, size, image_url, 
          metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `, [
        imageId,
        req.user?.id || null,
        req.body.agentId || null,
        finalPrompt,
        style,
        size,
        localImageUrl, // Use local URL if available, fallback to Azure URL
        JSON.stringify({
          agentName,
          style,
          size,
          generatedAt: new Date().toISOString(),
          openaiResponse: response.data[0],
          localPath: localImageUrl.startsWith('/uploads/') ? localImageUrl : null,
          originalAzureUrl: imageUrl
        })
      ]);
      
      console.log('Generated image saved to database with ID:', imageId);
      
      // Upload to IPFS for NFT minting
      try {
        if (ipfsService.isConfigured() && localImageUrl.startsWith('/uploads/')) {
          const localPath = path.join(__dirname, '../../', localImageUrl);
          const ipfsFilename = localImageUrl.split('/').pop() || `generated_${imageId}.png`;
          const ipfsResult = await ipfsService.uploadFile(localPath, ipfsFilename);
          console.log(`Image uploaded to IPFS: ${ipfsResult.ipfsHash}`);
          
          // Store IPFS info in database
          try {
            await database.query(`
              UPDATE generated_images 
              SET ipfs_hash = $1, ipfs_uri = $2, ipfs_uploaded_at = NOW()
              WHERE id = $3
            `, [ipfsResult.ipfsHash, ipfsResult.ipfsUri, imageId]);
          } catch (dbError) {
            console.error('Failed to update IPFS info in database:', dbError);
          }
        }
      } catch (ipfsError) {
        console.warn('Failed to upload image to IPFS:', ipfsError.message);
        // Continue even if IPFS upload fails
      }
    } catch (dbError) {
      console.error('Failed to save generated image to database:', dbError);
      // Continue even if database save fails
    }
    
    res.json({
      success: true,
      data: [{
        id: Date.now().toString(),
        url: localImageUrl, // Return local URL if available
        prompt: finalPrompt,
        style,
        size,
        createdAt: new Date().toISOString(),
        metadata: {
          agentName,
          style,
          size,
          generatedAt: new Date().toISOString()
        }
      }],
      imageUrl: localImageUrl, // Keep for backward compatibility
      prompt: finalPrompt,
      metadata: {
        agentName,
        style,
        size,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Image generation failed:', error);
    
    if (error.response?.data) {
      return res.status(400).json({ 
        error: error.response.data.error?.message || 'Image generation failed',
        details: error.response.data
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message 
    });
  }
});

// GET /api/content/ai/images/history
router.get('/ai/images/history', async (req, res) => {
  try {
    // TODO: Implement image history from database
    res.json({ 
      success: true,
      data: [],
      message: 'Image history not yet implemented'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/content/ai/images/generate-avatar
router.post('/ai/images/generate-avatar', async (req, res) => {
  try {
    const { text_prompts, style_preset = 'digital-art', height = 512, width = 512 } = req.body;
    
    if (!text_prompts || !text_prompts[0]?.text) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const prompt = text_prompts[0].text;
    
    console.log('Generating avatar with prompt:', prompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024", // DALL-E 3 standard size
      quality: "standard",
      style: 'vivid'
    });

    const imageUrl = response.data[0].url;
    
    res.json({
      success: true,
      data: {
        id: Date.now().toString(),
        url: imageUrl,
        prompt: prompt,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Avatar generation failed:', error);
    res.status(500).json({ 
      error: 'Failed to generate avatar',
      details: error.message 
    });
  }
});

// GET /api/content/ai/images/:id
router.get('/ai/images/:id', async (req, res) => {
  try {
    // TODO: Implement get specific image from database
    res.json({ 
      success: true,
      data: null,
      message: 'Get specific image not yet implemented'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/content/ai/images/:id
router.delete('/ai/images/:id', async (req, res) => {
  try {
    // TODO: Implement delete image from database
    res.json({ 
      success: true,
      message: 'Image deletion not yet implemented'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/content/ai/images/upload
router.post('/ai/images/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Get file information
    const { filename, path: filePath, mimetype } = req.file;
    const { agentName, description, agentId } = req.body;
    
    // Use organized directory structure for uploads
    const imageUrl = `/uploads/agents/content/${filename}`;
    
    // Save the uploaded image to the database
    try {
      const imageId = uuidv4();
      const result = await database.query(`
        INSERT INTO generated_images (
          id, user_id, agent_id, prompt, style, size, image_url, 
          metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `, [
        imageId,
        req.user.id,
        agentId || null,
        description || 'User uploaded image',
        'uploaded',
        'custom',
        imageUrl,
        JSON.stringify({
          agentName,
          style: 'uploaded',
          size: 'custom',
          uploadedAt: new Date().toISOString(),
          type: 'user_upload',
          originalFilename: filename,
          mimetype
        })
      ]);
      
      console.log('Uploaded image saved to database with ID:', imageId);
    } catch (dbError) {
      console.error('Failed to save uploaded image to database:', dbError);
      // Continue even if database save fails
    }
    
    res.json({
      success: true,
      data: [{
        id: Date.now().toString(),
        url: imageUrl,
        filename: filename,
        prompt: description || 'User uploaded image',
        style: 'uploaded',
        size: 'custom',
        createdAt: new Date().toISOString(),
        metadata: {
          agentName,
          style: 'uploaded',
          size: 'custom',
          uploadedAt: new Date().toISOString(),
          type: 'user_upload'
        }
      }],
      imageUrl: imageUrl,
      filename: filename,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Image upload failed:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// POST /api/content/generate - Generate AI content using agent personality
router.post('/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      agent_id,
      content_type = 'tweet',
      topic,
      style,
      length = 'medium',
      context,
      hashtags = true,
      emojis = true,
      variations = false,
      variation_count = 3,
      word_count = null, // Optional: explicit word count for longer content
      template_id = null, // Optional: content template ID
      enable_research = false, // Optional: enable research-backed content
      research_options = {} // Optional: research configuration
    } = req.body;

    // Validation
    if (!agent_id) {
      return res.status(400).json({
        error: 'Missing required field: agent_id'
      });
    }

    // Check if agent exists and belongs to user
    const agentResult = await database.query(`
      SELECT id, name, personality_type, voice_tone, platforms, target_topics
      FROM ai_agents 
      WHERE id = $1 AND user_id = $2
    `, [agent_id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Deduct credits for content generation (dynamic pricing)
    const contentId = uuidv4();
    const creditCost = content_type === 'reply' 
      ? await ServicePricingService.getPricing('content_generation_reply')
      : await ServicePricingService.getPricing('content_generation_post');
    
    try {
      await creditService.deductCredits(userId, 'content_generation', creditCost, contentId);
    } catch (creditError) {
      const errorResponse = formatCreditError(creditError, creditCost);
      errorResponse.costPerPost = 20;
      errorResponse.costPerReply = 20;
      return res.status(402).json(errorResponse);
    }

    // Use the AI content service
    const aiContentService = require('../services/AIContentService');
    
    let result;
    if (variations) {
      result = await aiContentService.generateContentVariations(agent, {
        content_type,
        topic,
        style,
        length,
        context,
        hashtags,
        emojis,
        word_count,
        template_id,
        enable_research,
        research_options
      }, variation_count);
    } else {
      const singleResult = await aiContentService.generateContent(agent, {
        content_type,
        topic,
        style,
        length,
        context,
        hashtags,
        emojis,
        word_count,
        template_id,
        enable_research,
        research_options
      });
      result = [singleResult];
    }

    // Store the generation record
    let generationId;
    try {
      generationId = uuidv4();
      // Note: This requires a generated_content table with the following schema:
      // CREATE TABLE IF NOT EXISTS generated_content (
      //   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      //   agent_id UUID REFERENCES ai_agents(id),
      //   platform VARCHAR(50),
      //   content_type VARCHAR(50),
      //   content_text TEXT,
      //   ai_model_used VARCHAR(100),
      //   generation_config JSONB,
      //   created_at TIMESTAMP DEFAULT NOW(),
      //   status VARCHAR(50) DEFAULT 'generated'
      // );
      await database.query(`
        INSERT INTO generated_content 
        (id, agent_id, platform, content_type, content_text, ai_model_used, generation_config, created_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'generated')
      `, [
        generationId,
        agent_id,
        'ai_generation',
        content_type,
        result[0].content,
        result[0].model_used,
        JSON.stringify({
          topic,
          style,
          length,
          context,
          hashtags,
          emojis,
          variations
        })
      ]);
    } catch (dbError) {
      logger.error('Failed to save content generation record:', dbError);
      // Continue even if database save fails
    }

    res.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          personality_type: agent.personality_type,
          voice_tone: agent.voice_tone
        },
        content: result,
        generation_id: generationId,
        generation_config: {
          content_type,
          topic,
          style,
          length,
          context,
          hashtags,
          emojis,
          variations
        }
      },
      message: variations 
        ? `Generated ${result.length} content variations successfully`
        : 'Content generated successfully'
    });

  } catch (error) {
    logger.error('Failed to generate AI content:', error);
    res.status(500).json({
      error: 'Failed to generate content',
      details: error.message
    });
  }
});

// POST /api/ai/generate-suggestions - Generate content suggestions for scheduling
router.post('/generate-suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agent_id, content_type, platform, count = 3 } = req.body;

    // Validation
    if (!agent_id) {
      return res.status(400).json({
        error: 'Missing required field: agent_id'
      });
    }

    // Check if agent exists and belongs to user
    const agentResult = await database.query(`
      SELECT id, name, personality_type, voice_tone, target_topics, platforms 
      FROM ai_agents 
      WHERE id = $1 AND user_id = $2
    `, [agent_id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];
    
    // Debug logging
    logger.info(`Agent platforms data:`, {
      agent_id: agent.id,
      agent_name: agent.name,
      platforms_raw: agent.platforms,
      platforms_type: typeof agent.platforms,
      requested_platform: platform
    });

    // Check if agent has the specified platform enabled
    // Handle both array and string formats for platforms
    let agentPlatforms = [];
    if (agent.platforms) {
      if (Array.isArray(agent.platforms)) {
        agentPlatforms = agent.platforms;
      } else if (typeof agent.platforms === 'string') {
        try {
          agentPlatforms = JSON.parse(agent.platforms);
        } catch (error) {
          // If it's not JSON, treat as comma-separated string
          agentPlatforms = agent.platforms.split(',').map(p => p.trim());
        }
      }
    }
    
    // Case-insensitive platform comparison
    const normalizedRequestedPlatform = platform.toLowerCase();
    const normalizedAgentPlatforms = agentPlatforms.map(p => p.toLowerCase());
    
    if (agentPlatforms.length === 0 || !normalizedAgentPlatforms.includes(normalizedRequestedPlatform)) {
      return res.status(400).json({ 
        error: `Agent does not have ${platform} platform enabled. Available platforms: ${agentPlatforms.join(', ') || 'none'}` 
      });
    }

    // Get company knowledge for the agent
    const { CompanyKnowledgeService } = require('../services/CompanyKnowledgeService');
    const companyKnowledgeService = new CompanyKnowledgeService();
    const companyKnowledge = await companyKnowledgeService.getCompanyKnowledgeForAgent(agent_id);

    // Generate suggestions using AI
    const aiContentService = require('../services/AIContentService');

    const suggestions = [];
    for (let i = 0; i < count; i++) {
      try {
        const result = await aiContentService.generateContent(agent, {
          type: 'original_post',
          platform,
          content_type,
          trends: null,
          hashtags: true,
          focus_on_company: true
        });

        if (result && result.content && typeof result.content === 'string') {
          suggestions.push(result.content.trim());
        } else {
          logger.warn(`Generated content is not a string for suggestion ${i + 1}:`, result);
        }
      } catch (error) {
        logger.error(`Failed to generate suggestion ${i + 1}:`, error);
        // Continue with other suggestions
      }
    }

    // If no suggestions were generated, provide a fallback
    if (suggestions.length === 0) {
      logger.warn('No suggestions generated, providing fallback content');
      suggestions.push(
        `Exciting news from ${agent.name}! We're working on some amazing updates that will help our users achieve better results. Stay tuned for more details! 🚀`,
        `Did you know? ${agent.name} can help you optimize your workflow and improve productivity. What challenges are you facing today? 💡`,
        `Great insights from our team at ${agent.name}! We believe in continuous improvement and innovation. What's your take on the latest industry trends? 🤔`
      );
    }

    res.json({
      success: true,
      suggestions: suggestions,
      message: `Generated ${suggestions.length} content suggestions`
    });

  } catch (error) {
    logger.error('Failed to generate content suggestions:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      details: error.message
    });
  }
});

// POST /api/content/gemini/images/generate - Generate images using Gemini
router.post('/gemini/images/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, style = 'realistic', size = '1024x1024', negativePrompt, agentId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!GeminiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Gemini service not available',
        details: 'GEMINI_API_KEY not configured'
      });
    }

    // Deduct credits for image generation (dynamic pricing)
    const imageId = uuidv4();
    const creditCost = await ServicePricingService.getPricing('image_generation');
    
    try {
      await creditService.deductCredits(userId, 'image_generation', creditCost, imageId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Generate image using Gemini
    const result = await GeminiService.generateImage(prompt, {
      style,
      size,
      negativePrompt,
      agentId,
      userId
    });

    res.json({
      success: true,
      data: {
        id: result.id,
        prompt: result.prompt,
        enhancedPrompt: result.enhancedPrompt,
        style: result.style,
        size: result.size,
        note: result.note,
        createdAt: result.createdAt || new Date().toISOString()
      },
      metadata: {
        provider: 'gemini',
        style,
        size,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Gemini image generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate image with Gemini',
      details: error.message
    });
  }
});

// POST /api/content/gemini/videos/generate - Generate video scripts/clips using Gemini
router.post('/gemini/videos/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      prompt, 
      duration = 5, 
      style = 'cinematic', 
      aspectRatio = '16:9',
      agentId,
      generateActualVideo = false // New option to generate actual video
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!GeminiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Gemini service not available',
        details: 'GEMINI_API_KEY not configured'
      });
    }

    // Deduct credits for video generation (dynamic pricing)
    const videoId = uuidv4();
    let creditCost;
    
    if (generateActualVideo) {
      // Check if Veo is being used (duration-based pricing)
      const videoProvider = req.body.videoProvider || process.env.VIDEO_GENERATION_PROVIDER || 'runwayml';
      const isVeo = videoProvider === 'veo' || videoProvider === 'veo3.1';
      const quality = req.body.quality || 'standard';
      
      if (isVeo) {
        // Use duration-based pricing for Veo (per second)
        const serviceKey = quality === 'fast' ? 'veo_video_generation' : 'veo_video_generation_standard';
        creditCost = await ServicePricingService.calculateCost(serviceKey, duration || 5);
      } else {
        // RunwayML and other providers also use duration-based pricing (per second)
        creditCost = await ServicePricingService.calculateCost('video_generation_actual', duration || 5);
      }
    } else {
      creditCost = await ServicePricingService.getPricing('video_generation_script');
    }
    
    try {
      await creditService.deductCredits(userId, 'video_generation', creditCost, videoId);
    } catch (creditError) {
      const { formatCreditError } = require('../utils/creditErrorHandler');
      const errorResponse = formatCreditError(creditError, creditCost);
      return res.status(402).json(errorResponse);
    }

    // Generate video script and storyboard using Gemini
    const scriptResult = await GeminiService.generateVideo(prompt, {
      duration,
      style,
      aspectRatio,
      agentId,
      userId
    });

    let videoUrl = null;
    let videoStatus = scriptResult.status || 'pending';
    let videoNote = scriptResult.note;
    let promptTruncated = false;
    let promptOriginalLength = null;
    let promptMaxLength = null;
    let selectedVideoProvider = null;

    // If user requested actual video generation and service is available
    if (generateActualVideo && VideoGenerationService.isAvailable()) {
      try {
        logger.info('Generating actual video file...');
        
        // Generate actual video using VideoGenerationService
        // Allow provider selection (default: runwayml, can use veo3.1)
        let videoProvider = req.body.videoProvider || process.env.VIDEO_GENERATION_PROVIDER || 'runwayml';
        selectedVideoProvider = videoProvider;
        
        // Map 'veo3.1' to 'veo' for backend compatibility
        if (videoProvider === 'veo3.1') {
          videoProvider = 'veo';
          selectedVideoProvider = videoProvider;
        }
        
        // Check if characterId is provided - use character images as reference
        let referenceImages = null;
        if (req.body.characterId) {
          const CharacterService = require('../services/CharacterService');
          try {
            const character = await CharacterService.getCharacterById(req.body.characterId, userId);
            if (character.imageUrls && character.imageUrls.length > 0) {
              referenceImages = character.imageUrls;
              logger.info(`Using character "${character.name}" with ${referenceImages.length} reference images for video generation`);
            }
          } catch (charError) {
            logger.warn(`Failed to load character ${req.body.characterId}: ${charError.message}`);
          }
        }

        const videoResult = await VideoGenerationService.generateVideo(prompt, {
          provider: videoProvider,
          duration,
          style,
          aspectRatio,
          videoScript: scriptResult.videoScript,
          storyboard: scriptResult.storyboard,
          quality: req.body.quality || 'standard', // 'fast' or 'standard' for Veo
          cameraControl: req.body.cameraControl || null, // Camera movement instructions
          referenceImages: referenceImages // Character images for consistency
        });

        videoUrl = videoResult.videoUrl;
        videoStatus = videoResult.status || 'completed';
        videoNote = videoResult.note || 'Video generated successfully!';
        if (typeof videoResult.promptTruncated !== 'undefined') {
          promptTruncated = !!videoResult.promptTruncated;
          if (typeof videoResult.promptOriginalLength !== 'undefined') {
            promptOriginalLength = videoResult.promptOriginalLength;
          }
          if (typeof videoResult.promptMaxLength !== 'undefined') {
            promptMaxLength = videoResult.promptMaxLength;
          }
        }

        logger.info(`Video generation completed. Video URL: ${videoUrl}, Status: ${videoStatus}`);

        // Update database with video URL
        try {
          await database.query(`
            UPDATE generated_videos
            SET video_url = $1, status = $2, updated_at = NOW()
            WHERE id = $3
          `, [videoUrl, videoStatus, scriptResult.id]);
          logger.info(`Video URL updated in database for video ID: ${scriptResult.id}`);
        } catch (dbError) {
          logger.warn('Failed to update video URL in database:', dbError);
        }
      } catch (videoError) {
        logger.error('Actual video generation failed:', videoError);
        
        // Provide user-friendly error messages for rate limits
        if (videoError.message.includes('rate limit') || videoError.message.includes('429') || videoError.message.includes('quota')) {
          videoNote = `Video generation rate limit exceeded. Veo API allows 10 requests per day. Please try again tomorrow or upgrade your Google AI plan. See https://ai.google.dev/gemini-api/docs/rate-limits for details.`;
        } else {
          videoNote = `Script generated, but video generation failed: ${videoError.message}`;
        }
        // Don't fail the request, just return the script
      }
    }

    const responseData = {
      success: true,
      data: {
        id: scriptResult.id,
        prompt: scriptResult.prompt,
        videoScript: scriptResult.videoScript,
        storyboard: scriptResult.storyboard,
        duration: scriptResult.duration,
        style: scriptResult.style,
        aspectRatio: scriptResult.aspectRatio,
        status: videoStatus,
        videoUrl: videoUrl,
        note: videoNote,
        createdAt: scriptResult.createdAt
      },
      metadata: {
        provider: 'gemini',
        videoProvider: generateActualVideo && videoUrl ? (selectedVideoProvider || VideoGenerationService.defaultProvider) : null,
        duration,
        style,
        aspectRatio,
        generatedAt: new Date().toISOString(),
        promptTruncated,
        promptOriginalLength,
        promptMaxLength
      }
    };

    logger.info(`Sending response for video generation. Video URL present: ${!!videoUrl}, Status: ${videoStatus}`);
    res.json(responseData);

  } catch (error) {
    logger.error('Gemini video generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate video with Gemini',
      details: error.message
    });
  }
});

// POST /api/content/gemini/generate - Generate text content using Gemini
router.post('/gemini/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      agent_id,
      content_type = 'tweet',
      topic,
      style,
      length = 'medium',
      context,
      hashtags = true,
      emojis = true
    } = req.body;

    if (!agent_id) {
      return res.status(400).json({
        error: 'Missing required field: agent_id'
      });
    }

    if (!GeminiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Gemini service not available',
        details: 'GEMINI_API_KEY not configured'
      });
    }

    // Check if agent exists and belongs to user
    const agentResult = await database.query(`
      SELECT id, name, personality_type, voice_tone, platforms, target_topics, user_id
      FROM ai_agents 
      WHERE id = $1 AND user_id = $2
    `, [agent_id, userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Deduct credits for content generation
    const contentId = uuidv4();
    const creditCost = content_type === 'reply' ? 20 : 20;
    
    try {
      await creditService.deductCredits(userId, 'content_generation', creditCost, contentId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Generate content using Gemini
    const result = await GeminiService.generateContentForAgent(agent, {
      content_type,
      topic,
      style,
      length,
      context,
      hashtags,
      emojis
    });

    res.json({
      success: true,
      data: {
        content: result.content,
        model: result.model,
        usage: result.usage,
        generation_config: result.generation_config
      },
      metadata: {
        provider: 'gemini',
        agentId: agent.id,
        agentName: agent.name,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Gemini content generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate content with Gemini',
      details: error.message
    });
  }
});

// GET /api/content/videos - Get user's generated videos (similar to images endpoint)
router.get('/videos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, agentId } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('Fetching videos for user:', userId, 'page:', page, 'agentId:', agentId);

    let query = `
      SELECT 
        gv.id,
        gv.prompt,
        gv.style,
        gv.duration,
        gv.aspect_ratio,
        gv.video_url,
        gv.video_script,
        gv.storyboard,
        gv.status,
        gv.provider,
        gv.metadata,
        gv.created_at,
        gv.updated_at,
        aa.name as agent_name
      FROM generated_videos gv
      LEFT JOIN ai_agents aa ON gv.agent_id = aa.id
      WHERE gv.user_id = $1
    `;
    
    const params = [userId];
    
    if (agentId) {
      query += ` AND gv.agent_id = $${params.length + 1}`;
      params.push(agentId);
    }
    
    query += ` ORDER BY gv.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await database.query(query, params);
    
    logger.info('Videos query result:', result.rows.length, 'videos found for user:', userId);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM generated_videos gv WHERE gv.user_id = $1`;
    const countParams = [userId];
    
    if (agentId) {
      countQuery += ` AND gv.agent_id = $2`;
      countParams.push(agentId);
    }
    
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Map database fields to frontend format
    const videos = result.rows.map(video => ({
      id: video.id,
      prompt: video.prompt,
      style: video.style,
      duration: video.duration,
      aspectRatio: video.aspect_ratio,
      videoUrl: video.video_url,
      videoScript: video.video_script,
      storyboard: video.storyboard,
      status: video.status,
      provider: video.provider,
      metadata: video.metadata || {},
      createdAt: video.created_at,
      created_at: video.created_at, // Legacy field
      updated_at: video.updated_at,
      agent_name: video.agent_name
    }));

    const responseData = {
      success: true,
      data: {
        videos: videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };
    
    logger.info('Sending response with', result.rows.length, 'videos');
    
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(responseData);
  } catch (error) {
    logger.error('Error fetching videos:', error);
    res.status(500).json({ 
      error: 'Failed to fetch videos', 
      details: error.message 
    });
  }
});

// GET /api/content/video-providers - Get available video generation providers with metadata
router.get('/video-providers', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const providers = VideoGenerationService.getProvidersMetadata();
    res.json({
      success: true,
      data: providers,
      defaultProvider: VideoGenerationService.defaultProvider
    });
  } catch (error) {
    logger.error('Failed to get video providers:', error);
    res.status(500).json({
      error: 'Failed to get video providers',
      details: error.message
    });
  }
});

// GET /api/content/gemini/videos/:id - Get video generation status
router.get('/gemini/videos/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await database.query(`
      SELECT 
        id, prompt, style, duration, aspect_ratio, 
        video_url, video_script, storyboard, status, 
        metadata, provider, created_at, updated_at
      FROM generated_videos
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to get video status:', error);
    res.status(500).json({
      error: 'Failed to get video status',
      details: error.message
    });
  }
});

// GET /api/content/gemini/models - List available Gemini models (for debugging)
router.get('/gemini/models', authenticateToken, async (req, res) => {
  try {
    if (!GeminiService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Gemini service not available',
        details: 'GEMINI_API_KEY not configured'
      });
    }

    const availableModels = await GeminiService.listAvailableModels();

    // Get package version safely
    let packageVersion = 'unknown';
    try {
      const pkg = require('@google/generative-ai/package.json');
      packageVersion = pkg.version || 'unknown';
    } catch (e) {
      // Package.json might not be accessible this way
      packageVersion = '0.24.1'; // Known installed version
    }

    res.json({
      success: true,
      data: {
        availableModels,
        packageVersion,
        currentDefault: 'gemini-1.5-flash'
      }
    });

  } catch (error) {
    logger.error('Failed to list Gemini models:', error);
    res.status(500).json({
      error: 'Failed to list models',
      details: error.message
    });
  }
});

// ============================================
// Veo 3.1 Flow Features Routes
// ============================================

// POST /api/content/videos/extend - Scene Extension (Flow feature)
// Extend an existing video to create longer clips
router.post('/videos/extend', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      videoUrl, 
      extensionPrompt, 
      duration = 5, 
      style = 'cinematic' 
    } = req.body;

    if (!videoUrl || !extensionPrompt) {
      return res.status(400).json({ 
        error: 'videoUrl and extensionPrompt are required' 
      });
    }

    if (!VideoGenerationService.isAvailable() || !VideoGenerationService.providers.veo?.enabled) {
      return res.status(503).json({ 
        error: 'Veo 3.1 service not available',
        details: 'GEMINI_API_KEY not configured or Veo not enabled'
      });
    }

    // Deduct credits for video extension (dynamic pricing - per second)
    const extensionId = uuidv4();
    const creditCost = await ServicePricingService.calculateCost('video_generation_extension', duration || 5);
    
    try {
      await creditService.deductCredits(userId, 'video_extension', creditCost, extensionId);
    } catch (creditError) {
      const { formatCreditError } = require('../utils/creditErrorHandler');
      const errorResponse = formatCreditError(creditError, creditCost);
      return res.status(402).json(errorResponse);
    }

    logger.info('Extending video with Veo 3.1 Scene Extension...');
    
    const result = await VideoGenerationService.extendVideo(videoUrl, extensionPrompt, {
      duration,
      style
    });

    res.json({
      success: true,
      data: {
        ...result,
        extensionId,
        originalVideoUrl: videoUrl
      },
      metadata: {
        feature: 'scene-extension',
        provider: 'veo3.1',
        duration,
        style,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Video extension failed:', error);
    res.status(500).json({
      error: 'Failed to extend video',
      details: error.message
    });
  }
});

// POST /api/content/videos/ingredients - Ingredients to Video (Flow feature)
// Generate video from reference images (up to 3 images)
router.post('/videos/ingredients', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      referenceImages, // Array of image URLs or base64
      characterId, // Character ID to use as reference
      prompt, 
      duration = 5, 
      style = 'cinematic',
      aspectRatio = '16:9',
      quality = 'standard',
      provider = 'runwayml' // Default to RunwayML (Veo 3.1 ingredients-to-video doesn't work properly)
    } = req.body;

    // If characterId is provided, fetch character images
    let finalReferenceImages = referenceImages || [];
    if (characterId && (!referenceImages || referenceImages.length === 0)) {
      const CharacterService = require('../services/CharacterService');
      try {
        const character = await CharacterService.getCharacterById(characterId, userId);
        if (character.imageUrls && character.imageUrls.length > 0) {
          finalReferenceImages = character.imageUrls;
          logger.info(`Using character "${character.name}" with ${finalReferenceImages.length} reference images`);
        }
      } catch (charError) {
        logger.warn(`Failed to load character ${characterId}: ${charError.message}`);
      }
    }

    if (!finalReferenceImages || !Array.isArray(finalReferenceImages) || finalReferenceImages.length === 0) {
      return res.status(400).json({ 
        error: 'At least one reference image or character ID is required' 
      });
    }

    if (finalReferenceImages.length > 3) {
      return res.status(400).json({ 
        error: 'Maximum 3 reference images allowed' 
      });
    }

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required' 
      });
    }

    // Check if requested provider is available
    if (provider === 'veo' && (!VideoGenerationService.isAvailable() || !VideoGenerationService.providers.veo?.enabled)) {
      return res.status(503).json({ 
        error: 'Veo 3.1 service not available',
        details: 'GEMINI_API_KEY not configured or Veo not enabled'
      });
    }
    
    if (provider === 'runwayml' && (!VideoGenerationService.isAvailable() || !VideoGenerationService.providers.runwayml?.enabled)) {
      return res.status(503).json({ 
        error: 'RunwayML service not available',
        details: 'RUNWAYML_API_KEY not configured or RunwayML not enabled'
      });
    }

    // Deduct credits for ingredients-to-video (dynamic pricing - per second)
    const generationId = uuidv4();
    const creditCost = await ServicePricingService.calculateCost('video_generation_ingredients', duration || 5);
    
    try {
      await creditService.deductCredits(userId, 'video_generation', creditCost, generationId);
    } catch (creditError) {
      const { formatCreditError } = require('../utils/creditErrorHandler');
      const errorResponse = formatCreditError(creditError, creditCost);
      return res.status(402).json(errorResponse);
    }

    if (!finalReferenceImages || finalReferenceImages.length === 0) {
      return res.status(400).json({
        error: 'Reference images or character ID is required for ingredients-to-video generation'
      });
    }

    logger.info(`Generating video from ${finalReferenceImages.length} reference images with ${provider}...`);
    
    const result = await VideoGenerationService.generateFromIngredients(finalReferenceImages, prompt, {
      duration,
      style,
      aspectRatio,
      quality,
      provider
    });

    res.json({
      success: true,
      data: {
        ...result,
        generationId,
        referenceImagesCount: finalReferenceImages.length,
        characterId: characterId || null
      },
      metadata: {
        feature: 'ingredients-to-video',
        provider: 'veo3.1',
        duration,
        style,
        aspectRatio,
        quality,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Ingredients to video generation failed:', error);
    
    // Provide more helpful error messages for common RunwayML errors
    let errorMessage = error.message;
    let suggestions = [];
    
    if (error.message.includes('INTERNAL.BAD_OUTPUT.CODE01')) {
      errorMessage = 'RunwayML encountered an internal error processing your image. This may be due to image format, size, or content compatibility.';
      suggestions = [
        'Try using a different image (JPG or PNG, under 10MB)',
        'Simplify your prompt',
        'Ensure the image is clear and well-lit',
        'Try again in a few minutes (this may be a temporary RunwayML issue)'
      ];
    } else if (error.message.includes('RunwayML generation failed')) {
      errorMessage = 'Video generation failed on RunwayML\'s servers.';
      suggestions = [
        'Check that your image is publicly accessible',
        'Try a different image or prompt',
        'Wait a few minutes and try again'
      ];
    }
    
    res.status(500).json({
      error: 'Failed to generate video from ingredients',
      details: errorMessage,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/content/videos/frames - First and Last Frame (Flow feature)
// Generate transition video between two images
router.post('/videos/frames', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      firstFrame, // Image URL or base64
      lastFrame, // Image URL or base64
      prompt, 
      duration = 5, 
      style = 'cinematic',
      aspectRatio = '16:9',
      quality = 'standard'
    } = req.body;

    if (!firstFrame || !lastFrame) {
      return res.status(400).json({ 
        error: 'Both firstFrame and lastFrame images are required' 
      });
    }

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required' 
      });
    }

    if (!VideoGenerationService.isAvailable() || !VideoGenerationService.providers.veo?.enabled) {
      return res.status(503).json({ 
        error: 'Veo 3.1 service not available',
        details: 'GEMINI_API_KEY not configured or Veo not enabled'
      });
    }

    // Deduct credits for first-last-frame generation (dynamic pricing - per second)
    const generationId = uuidv4();
    const creditCost = await ServicePricingService.calculateCost('video_generation_frames', duration || 5);
    
    try {
      await creditService.deductCredits(userId, 'video_generation', creditCost, generationId);
    } catch (creditError) {
      const { formatCreditError } = require('../utils/creditErrorHandler');
      const errorResponse = formatCreditError(creditError, creditCost);
      return res.status(402).json(errorResponse);
    }

    logger.info('Generating video transition with Veo 3.1 First and Last Frame...');
    
    const result = await VideoGenerationService.generateFromFrames(firstFrame, lastFrame, prompt, {
      duration,
      style,
      aspectRatio,
      quality
    });

    res.json({
      success: true,
      data: {
        ...result,
        generationId
      },
      metadata: {
        feature: 'first-last-frame',
        provider: 'veo3.1',
        duration,
        style,
        aspectRatio,
        quality,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('First and last frame generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate video transition',
      details: error.message
    });
  }
});

// ============================================
// LYRICS GENERATION ROUTES
// ============================================

// POST /api/content/ai/lyrics/generate - Generate lyrics only
router.post('/ai/lyrics/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      topic = null,
      url = null, // New: URL to extract content from
      genre = null,
      mood = 'energetic',
      style = 'pop',
      language = 'en',
      length = 'medium', // 'short', 'medium', 'long'
      structure = 'auto', // 'auto', 'verse-chorus', 'verse-only', 'free-form'
      agentId = null
    } = req.body;

    // If URL is provided, extract and analyze content
    let finalTopic = topic;
    let finalMood = mood;
    let finalStyle = style;
    let urlAnalysis = null;

    if (url) {
      try {
        const URLContentExtractionService = require('../services/URLContentExtractionService');
        const urlService = new URLContentExtractionService();
        
        logger.info(`[Lyrics] Processing URL for lyrics generation: ${url}`);
        urlAnalysis = await urlService.processURLForMusic(url, { style, mood, genre });
        
        // Use AI-suggested values if available, otherwise use provided values
        finalTopic = urlAnalysis.analysis?.lyricsTopic || topic || urlAnalysis.analysis?.musicPrompt || urlAnalysis.title;
        finalMood = urlAnalysis.analysis?.suggestedMood || mood;
        finalStyle = urlAnalysis.analysis?.suggestedStyle || style;
        
        logger.info(`[Lyrics] URL analysis complete. Topic: ${finalTopic}, Mood: ${finalMood}, Style: ${finalStyle}`);
      } catch (urlError) {
        logger.error(`[Lyrics] Error processing URL:`, urlError);
        return res.status(400).json({
          error: 'Failed to process URL',
          details: urlError.message
        });
      }
    }

    // Deduct credits for lyrics generation (dynamic pricing)
    const generationId = uuidv4();
    const creditCost = await ServicePricingService.getPricing('lyrics_generation');
    
    try {
      await creditService.deductCredits(userId, 'lyrics_generation', creditCost, generationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    logger.info(`Generating lyrics for user ${userId}${agentId ? ` with agent ${agentId}` : ''}${url ? ` (from URL: ${url})` : ''}`);

    // Get agent if provided
    let agent = null;
    if (agentId) {
      try {
        const agentResult = await database.query(
          'SELECT * FROM agents WHERE id = $1 AND user_id = $2',
          [agentId, userId]
        );
        if (agentResult.rows.length > 0) {
          agent = agentResult.rows[0];
        }
      } catch (agentError) {
        logger.warn(`Failed to fetch agent ${agentId}:`, agentError);
        // Continue without agent
      }
    }

    // Generate lyrics
    const aiContentService = require('../services/AIContentService');
    const lyricsResult = await aiContentService.generateLyrics(
      {
        topic: finalTopic,
        genre,
        mood: finalMood,
        style: finalStyle,
        language,
        length,
        structure
      },
      userId,
      agent
    );

    // Store lyrics in database
    let lyricsId;
    try {
      lyricsId = uuidv4();
      await database.query(`
        INSERT INTO generated_lyrics (
          id, user_id, agent_id, topic, genre, mood, style, language,
          length, structure, title, lyrics_text, line_count, reasoning,
          metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      `, [
        lyricsId,
        userId,
        agentId || null,
        topic || null,
        genre || null,
        mood,
        style,
        language,
        length,
        structure,
        lyricsResult.title || `Generated ${finalStyle} Song`,
        lyricsResult.lyrics || '',
        lyricsResult.lineCount || 'unknown',
        lyricsResult.reasoning || null,
        JSON.stringify({
          genre: lyricsResult.genre,
          mood: finalMood,
          structure: lyricsResult.structure,
          agent_aware: lyricsResult.agent_aware || false,
          company_aware: lyricsResult.company_aware || false,
          source_url: url || null,
          url_analysis: urlAnalysis ? {
            themes: urlAnalysis.analysis?.themes,
            topics: urlAnalysis.analysis?.topics,
            emotionalTone: urlAnalysis.analysis?.emotionalTone
          } : null,
          generatedAt: new Date().toISOString()
        })
      ]);
      logger.info(`Lyrics saved to database with ID: ${lyricsId}`);
    } catch (dbError) {
      logger.error('Failed to save lyrics to database:', dbError);
      // Continue even if database save fails
    }

    res.json({
      success: true,
      data: {
        ...lyricsResult,
        id: lyricsId
      },
      creditsUsed: creditCost
    });
  } catch (error) {
    logger.error('Lyrics generation error:', error);
    res.status(500).json({
      error: 'Failed to generate lyrics',
      details: error.message
    });
  }
});

// GET /api/content/lyrics - Get user's generated lyrics
router.get('/lyrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, agentId } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        gl.id,
        gl.topic,
        gl.genre,
        gl.mood,
        gl.style,
        gl.language,
        gl.length,
        gl.structure,
        gl.title,
        gl.lyrics_text,
        gl.line_count,
        gl.reasoning,
        gl.metadata,
        gl.created_at,
        a.name as agent_name
      FROM generated_lyrics gl
      LEFT JOIN ai_agents a ON gl.agent_id = a.id
      WHERE gl.user_id = $1
    `;
    
    const params = [userId];
    
    if (agentId) {
      query += ` AND gl.agent_id = $${params.length + 1}`;
      params.push(agentId);
    }
    
    query += ` ORDER BY gl.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await database.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM generated_lyrics gl WHERE gl.user_id = $1`;
    const countParams = [userId];
    if (agentId) {
      countQuery += ` AND gl.agent_id = $2`;
      countParams.push(agentId);
    }
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch lyrics:', error);
    res.status(500).json({
      error: 'Failed to fetch lyrics',
      details: error.message
    });
  }
});

// GET /api/content/lyrics/:id - Get specific lyrics
router.get('/lyrics/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await database.query(`
      SELECT 
        gl.id,
        gl.topic,
        gl.genre,
        gl.mood,
        gl.style,
        gl.language,
        gl.length,
        gl.structure,
        gl.title,
        gl.lyrics_text,
        gl.line_count,
        gl.reasoning,
        gl.metadata,
        gl.created_at,
        a.name as agent_name
      FROM generated_lyrics gl
      LEFT JOIN ai_agents a ON gl.agent_id = a.id
      WHERE gl.id = $1 AND gl.user_id = $2
    `, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lyrics not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch lyrics:', error);
    res.status(500).json({
      error: 'Failed to fetch lyrics',
      details: error.message
    });
  }
});

// ============================================
// MUSIC GENERATION ROUTES
// ============================================

// POST /api/content/ai/music/generate - Generate music
router.post('/ai/music/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      prompt,
      url = null, // New: URL to extract content from
      agentId = null,
      duration = 30,
      style = 'pop',
      genre = null,
      instrumental = false,
      lyrics = null,
      tempo = null,
      mood = null,
      provider = null, // Auto-select based on priority
      voiceType = null, // Voice type: male, female, neutral, auto, or specific styles
      language = null // Language code: en, es, fr, de, it, pt, ja, ko, zh, etc.
    } = req.body;

    // If URL is provided, extract and analyze content
    let finalPrompt = prompt;
    let finalMood = mood;
    let finalStyle = style;
    let urlAnalysis = null;

    if (url) {
      try {
        const URLContentExtractionService = require('../services/URLContentExtractionService');
        const urlService = new URLContentExtractionService();
        
        logger.info(`[Music] Processing URL for music generation: ${url}`);
        urlAnalysis = await urlService.processURLForMusic(url, { style, mood, genre });
        
        // Use AI-suggested values if available, otherwise use provided values
        finalPrompt = urlAnalysis.analysis?.musicPrompt || prompt || urlAnalysis.analysis?.lyricsTopic || urlAnalysis.title;
        finalMood = urlAnalysis.analysis?.suggestedMood || mood;
        finalStyle = urlAnalysis.analysis?.suggestedStyle || style;
        
        logger.info(`[Music] URL analysis complete. Prompt: ${finalPrompt}, Mood: ${finalMood}, Style: ${finalStyle}`);
      } catch (urlError) {
        logger.error(`[Music] Error processing URL:`, urlError);
        return res.status(400).json({
          error: 'Failed to process URL',
          details: urlError.message
        });
      }
    }

    if (!finalPrompt) {
      return res.status(400).json({
        error: 'Prompt is required (or provide a URL)'
      });
    }

    // Check if music generation service is available
    const musicService = new MusicGenerationService();
    if (!musicService.isAvailable()) {
      return res.status(503).json({
        error: 'Music generation service not available',
        details: 'No music generation API keys configured. Please set MUSICGPT_API_KEY, MUSICAPI_API_KEY, STABILITY_API_KEY, or SUNOAPI_API_KEY in environment variables.'
      });
    }

    // Deduct credits for music generation (dynamic pricing)
    const generationId = uuidv4();
    const creditCost = await ServicePricingService.getPricing('music_generation');
    
    try {
      await creditService.deductCredits(userId, 'music_generation', creditCost, generationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    logger.info(`Generating music for user ${userId} with prompt: ${finalPrompt}${url ? ` (from URL: ${url})` : ''}`);

    // Generate webhook URL and secret based on provider
    const webhookSecret = process.env.MUSICAPI_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');
    let webhookUrl;
    if (provider === 'musicgpt') {
      webhookUrl = `${process.env.BACKEND_URL || 'https://www.iqonga.org'}/api/webhooks/musicgpt`;
    } else {
      webhookUrl = `${process.env.BACKEND_URL || 'https://www.iqonga.org'}/api/webhooks/musicapi`;
    }

    // Generate music
    const result = await musicService.generateMusic(finalPrompt, {
      provider,
      duration: parseInt(duration),
      style: finalStyle,
      genre,
      instrumental: instrumental === true || instrumental === 'true',
      lyrics,
      tempo: tempo ? parseInt(tempo) : null,
      mood: finalMood,
      voiceType: voiceType || null,
      language: language || null,
      webhookUrl,
      webhookSecret
    });

    // Save to database
    let musicId;
    try {
      musicId = uuidv4();
      await database.query(`
        INSERT INTO generated_music (
          id, user_id, agent_id, prompt, style, genre, duration,
          instrumental, lyrics, tempo, mood, audio_url, provider,
          status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        musicId,
        userId,
        agentId || null,
        finalPrompt,
        finalStyle,
        genre || null,
        duration,
        instrumental === true || instrumental === 'true',
        lyrics || null,
        tempo ? parseInt(tempo) : null,
        finalMood || null,
        result.audioUrl || null,
        result.provider,
        result.status || 'processing',
        JSON.stringify({
          source_url: url || null,
          url_analysis: urlAnalysis ? {
            themes: urlAnalysis.analysis?.themes,
            topics: urlAnalysis.analysis?.topics,
            emotionalTone: urlAnalysis.analysis?.emotionalTone
          } : null,
          ...(result.metadata || {}),
          webhook_secret: webhookSecret // Store secret for webhook verification
        })
      ]);

      logger.info(`Music saved to database with ID: ${musicId}, task_id: ${result.taskId || 'N/A'}`);
      
      // Note: Webhooks are the primary method for async completion.
      // Polling is kept as a fallback if webhooks fail or are not configured.
      // If we got a task_id and status is processing, start polling in background as fallback
      if (result.status === 'processing' && result.taskId) {
        // Start background polling as fallback (non-blocking)
        // This will only run if webhook doesn't arrive within a reasonable time
        setTimeout(() => {
          let pollPromise;
          if (result.provider === 'musicgpt') {
            pollPromise = musicService.pollMusicGPTCompletion(result.taskId, result.conversionId);
          } else if (result.provider === 'musicapi') {
            pollPromise = musicService.pollMusicAPICompletion(result.taskId);
          } else {
            return; // Provider doesn't support polling
          }
          
          pollPromise
          .then(async (completedResult) => {
            // Update database with completed result
            try {
              await database.query(`
                UPDATE generated_music 
                SET audio_url = $1, 
                    status = $2,
                    metadata = $3,
                    updated_at = NOW()
                WHERE id = $4
              `, [
                completedResult.audioUrl,
                'completed',
                JSON.stringify(completedResult.metadata || {}),
                musicId
              ]);
              logger.info(`Music generation completed and updated in database: ${musicId}`);
            } catch (updateError) {
              logger.error(`Failed to update music in database: ${updateError.message}`);
            }
          })
          .catch(async (pollError) => {
            // Update database with failed status
            try {
              await database.query(`
                UPDATE generated_music 
                SET status = $1,
                    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
                    updated_at = NOW()
                WHERE id = $3
              `, [
                'failed',
                JSON.stringify(pollError.message),
                musicId
              ]);
              logger.error(`Music generation failed: ${pollError.message}`);
            } catch (updateError) {
              logger.error(`Failed to update music status in database: ${updateError.message}`);
            }
          });
        }, 5 * 60 * 1000); // Wait 5 minutes before starting fallback polling
      }
    } catch (dbError) {
      logger.error('Failed to save music to database:', dbError);
      // Continue even if database save fails
    }

    res.json({
      success: true,
      data: {
        ...result,
        id: musicId || generationId,
        prompt,
        style,
        genre,
        duration,
        instrumental,
        lyrics,
        tempo,
        mood
      },
      metadata: {
        provider: result.provider,
        generatedAt: new Date().toISOString(),
        creditCost
      }
    });

  } catch (error) {
    // Safely log error without circular references
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined
    };
    logger.error('Music generation failed:', errorDetails);
    
    // Provide helpful error messages
    let errorMessage = error.message;
    let suggestions = [];
    
    if (error.message.includes('No music generation providers')) {
      errorMessage = 'No music generation providers are configured.';
      suggestions = [
        'Please configure at least one API key: MUSICAPI_API_KEY, STABILITY_API_KEY, or SUNOAPI_API_KEY'
      ];
    } else if (error.message.includes('All music generation providers failed')) {
      errorMessage = 'All music generation providers failed. Please try again.';
      suggestions = [
        'Check your API keys are valid',
        'Try a different prompt',
        'Wait a few minutes and try again'
      ];
    }
    
    res.status(500).json({
      error: 'Failed to generate music',
      details: errorMessage,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/content/music - Get user's generated music
router.get('/music', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, agentId } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('Fetching music for user:', userId, 'page:', page, 'agentId:', agentId);

    let query = `
      SELECT 
        gm.id,
        gm.prompt,
        gm.style,
        gm.genre,
        gm.duration,
        gm.instrumental,
        gm.lyrics,
        gm.tempo,
        gm.mood,
        gm.audio_url,
        gm.provider,
        gm.status,
        gm.metadata,
        gm.created_at,
        gm.updated_at,
        aa.name as agent_name
      FROM generated_music gm
      LEFT JOIN ai_agents aa ON gm.agent_id = aa.id
      WHERE gm.user_id = $1
    `;
    
    const queryParams = [userId];
    
    if (agentId) {
      query += ` AND gm.agent_id = $${queryParams.length + 1}`;
      queryParams.push(agentId);
    }
    
    query += ` ORDER BY gm.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await database.query(query, queryParams);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM generated_music gm WHERE gm.user_id = $1`;
    const countParams = [userId];
    
    if (agentId) {
      countQuery += ` AND gm.agent_id = $2`;
      countParams.push(agentId);
    }
    
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    const music = result.rows.map(track => ({
      id: track.id,
      prompt: track.prompt,
      style: track.style,
      genre: track.genre,
      duration: track.duration,
      instrumental: track.instrumental,
      lyrics: track.lyrics,
      tempo: track.tempo,
      mood: track.mood,
      audioUrl: track.audio_url,
      provider: track.provider,
      status: track.status,
      metadata: track.metadata || {},
      createdAt: track.created_at,
      created_at: track.created_at, // Legacy field
      updated_at: track.updated_at,
      agent_name: track.agent_name
    }));

    res.json({
      success: true,
      data: {
        music: music,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching music:', error);
    res.status(500).json({
      error: 'Failed to fetch music',
      details: error.message
    });
  }
});

// GET /api/content/music/file/:filename - Serve music files
router.get('/music/file/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: Only allow alphanumeric, dashes, underscores, and dots in filename
    if (!/^[a-zA-Z0-9._-]+\.(mp3|wav|m4a|ogg|flac)$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.join(__dirname, '../../uploads/music/generated', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'File not found',
        path: filePath 
      });
    }
    
    // Set appropriate headers for audio file with CORS
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin requests
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Accept-Ranges', 'bytes'); // Enable range requests for streaming
    
    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error serving music file:', error);
    res.status(500).json({ error: 'Failed to serve file', message: error.message });
  }
});

// POST /api/content/music/manual-download - Manually download music if you have the audio URL
router.post('/music/manual-download', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { musicId, audioUrl } = req.body;
    
    if (!musicId || !audioUrl) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide both musicId and audioUrl'
      });
    }
    
    // Verify the music belongs to the user
    const result = await database.query(`
      SELECT id, metadata, provider, status, user_id
      FROM generated_music
      WHERE id = $1 AND user_id = $2
    `, [musicId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Music track not found',
        message: 'No music track found with the provided ID for this user'
      });
    }
    
    const music = result.rows[0];
    
    if (music.status === 'completed' && music.audio_url) {
      return res.json({
        success: true,
        message: 'Music already has an audio URL',
        data: {
          id: music.id,
          audioUrl: music.audio_url
        }
      });
    }
    
    // Download and store audio locally
    const musicService = new MusicGenerationService();
    const localAudioPath = await musicService.downloadAndStoreAudio(audioUrl, 'musicapi');
    const relativePath = `/uploads/music/generated/${path.basename(localAudioPath)}`;
    
    // Update database
    await database.query(`
      UPDATE generated_music 
      SET audio_url = $1, 
          status = $2,
          metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{manually_downloaded_at}', $3::jsonb),
          updated_at = NOW()
      WHERE id = $4
    `, [
      relativePath,
      'completed',
      JSON.stringify(new Date().toISOString()),
      music.id
    ]);
    
    logger.info(`Music manually downloaded: ${music.id}, audio_url: ${relativePath}`);
    
    return res.json({
      success: true,
      message: 'Music downloaded successfully',
      data: {
        id: music.id,
        status: 'completed',
        audioUrl: relativePath
      }
    });
    
  } catch (error) {
    logger.error('Manual download failed:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

// GET /api/content/music/debug/:id - Debug endpoint to see what's stored for a music track
router.get('/music/debug/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await database.query(`
      SELECT id, metadata, provider, status, audio_url, created_at, updated_at
      FROM generated_music
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Music track not found' });
    }
    
    const track = result.rows[0];
    const metadata = typeof track.metadata === 'string' 
      ? JSON.parse(track.metadata) 
      : track.metadata;
    
    res.json({
      success: true,
      data: {
        id: track.id,
        status: track.status,
        provider: track.provider,
        audio_url: track.audio_url,
        task_id: metadata?.task_id,
        full_metadata: metadata,
        created_at: track.created_at,
        updated_at: track.updated_at
      }
    });
  } catch (error) {
    logger.error('Debug query failed:', error);
    res.status(500).json({ error: 'Debug query failed', message: error.message });
  }
});

// POST /api/content/music/recover - Manually recover processing music tasks
router.post('/music/recover', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId, musicId } = req.body;
    
    logger.info(`Recovery request from user ${userId}`, { taskId, musicId });
    
    // If specific taskId or musicId provided, recover that one
    if (taskId || musicId) {
      let query;
      let params;
      
      if (musicId) {
        query = `
          SELECT id, metadata, provider, status
          FROM generated_music
          WHERE id = $1 AND user_id = $2
        `;
        params = [musicId, userId];
      } else {
        query = `
          SELECT id, metadata, provider, status
          FROM generated_music
          WHERE metadata->>'task_id' = $1 AND user_id = $2
        `;
        params = [taskId, userId];
      }
      
      const result = await database.query(query, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Music track not found',
          message: 'No music track found with the provided ID'
        });
      }
      
      const music = result.rows[0];
      
      if (music.status === 'completed') {
        return res.json({
          success: true,
          message: 'Music is already completed',
          data: { id: music.id, status: music.status }
        });
      }
      
      // Extract task_id from metadata
      const metadata = typeof music.metadata === 'string' 
        ? JSON.parse(music.metadata) 
        : music.metadata;
      const taskIdFromDb = metadata?.task_id || taskId;
      
      if (!taskIdFromDb) {
        return res.status(400).json({
          error: 'No task_id found',
          message: 'Cannot recover: no task_id found in metadata'
        });
      }
      
      // Try to recover using MusicAPI.ai
      if (music.provider === 'musicapi') {
        const musicService = new MusicGenerationService();
        
        try {
          const status = await musicService.getMusicAPIStatus(taskIdFromDb);
          
          // Check if music is ready
          // The response from /api/v1/sonic/task/{task_id} may have audio_url in different places
          // It could be in the root, in a data array, or in individual clips
          let audioUrl = null;
          
          // Check various possible locations for audio_url
          if (status.audio_url) {
            audioUrl = status.audio_url;
          } else if (status.url) {
            audioUrl = status.url;
          } else if (status.output) {
            audioUrl = status.output;
          } else if (status.data && Array.isArray(status.data)) {
            // If data is an array, check the first item
            const firstItem = status.data[0];
            audioUrl = firstItem?.audio_url || firstItem?.url;
          } else if (Array.isArray(status)) {
            // If status itself is an array
            const firstItem = status[0];
            audioUrl = firstItem?.audio_url || firstItem?.url;
          }
          
          if (audioUrl) {
            
            // Download and store audio locally
            const localAudioPath = await musicService.downloadAndStoreAudio(audioUrl, 'musicapi');
            const relativePath = `/uploads/music/generated/${path.basename(localAudioPath)}`;
            
            // Update database
            await database.query(`
              UPDATE generated_music 
              SET audio_url = $1, 
                  status = $2,
                  metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{recovered_at}', $3::jsonb),
                  updated_at = NOW()
              WHERE id = $4
            `, [
              relativePath,
              'completed',
              JSON.stringify(new Date().toISOString()),
              music.id
            ]);
            
            return res.json({
              success: true,
              message: 'Music recovered successfully',
              data: {
                id: music.id,
                status: 'completed',
                audioUrl: relativePath
              }
            });
          } else if (status.status === 'failed' || status.error) {
            // Update to failed status
            await database.query(`
              UPDATE generated_music 
              SET status = $1,
                  metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
                  updated_at = NOW()
              WHERE id = $3
            `, [
              'failed',
              JSON.stringify(status.error || status.message || 'Generation failed'),
              music.id
            ]);
            
            return res.status(400).json({
              error: 'Music generation failed',
              message: status.error || status.message || 'Generation failed on MusicAPI.ai'
            });
          } else {
            return res.json({
              success: true,
              message: 'Music is still processing',
              data: {
                id: music.id,
                status: 'processing',
                currentStatus: status.status || 'processing'
              }
            });
          }
        } catch (recoveryError) {
          logger.error(`Recovery error for task ${taskIdFromDb}:`, recoveryError);
          return res.status(500).json({
            error: 'Recovery failed',
            message: recoveryError.message,
            details: 'Could not retrieve status from MusicAPI.ai'
          });
        }
      } else {
        return res.status(400).json({
          error: 'Unsupported provider',
          message: `Recovery not yet implemented for provider: ${music.provider}`
        });
      }
    } else {
      // Recover all processing tasks for this user (also check 'pending' status)
      const result = await database.query(`
        SELECT id, metadata, provider, status, created_at, audio_url
        FROM generated_music
        WHERE user_id = $1 
          AND status IN ('processing', 'pending')
          AND provider = 'musicapi'
          AND (audio_url IS NULL OR audio_url = '')
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);
      
      if (result.rows.length === 0) {
        return res.json({
          success: true,
          message: 'No processing tasks found',
          recovered: 0,
          failed: 0,
          stillProcessing: 0
        });
      }
      
      const musicService = new MusicGenerationService();
      let recovered = 0;
      let failed = 0;
      let stillProcessing = 0;
      const results = [];
      
      for (const music of result.rows) {
        const metadata = typeof music.metadata === 'string' 
          ? JSON.parse(music.metadata) 
          : music.metadata;
        const taskIdFromDb = metadata?.task_id;
        
        if (!taskIdFromDb) {
          stillProcessing++;
          results.push({ id: music.id, status: 'no_task_id' });
          continue;
        }
        
        try {
          const status = await musicService.getMusicAPIStatus(taskIdFromDb);
          
          // Check various possible locations for audio_url
          let audioUrl = null;
          if (status.audio_url) {
            audioUrl = status.audio_url;
          } else if (status.url) {
            audioUrl = status.url;
          } else if (status.output) {
            audioUrl = status.output;
          } else if (status.data && Array.isArray(status.data)) {
            const firstItem = status.data[0];
            audioUrl = firstItem?.audio_url || firstItem?.url;
          } else if (Array.isArray(status)) {
            const firstItem = status[0];
            audioUrl = firstItem?.audio_url || firstItem?.url;
          }
          
          if (audioUrl) {
            const localAudioPath = await musicService.downloadAndStoreAudio(audioUrl, 'musicapi');
            const relativePath = `/uploads/music/generated/${path.basename(localAudioPath)}`;
            
            await database.query(`
              UPDATE generated_music 
              SET audio_url = $1, 
                  status = $2,
                  metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{recovered_at}', $3::jsonb),
                  updated_at = NOW()
              WHERE id = $4
            `, [
              relativePath,
              'completed',
              JSON.stringify(new Date().toISOString()),
              music.id
            ]);
            
            recovered++;
            results.push({ id: music.id, status: 'recovered', audioUrl: relativePath });
          } else if (status.status === 'failed' || status.error) {
            await database.query(`
              UPDATE generated_music 
              SET status = $1,
                  metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
                  updated_at = NOW()
              WHERE id = $3
            `, [
              'failed',
              JSON.stringify(status.error || status.message || 'Generation failed'),
              music.id
            ]);
            
            failed++;
            results.push({ id: music.id, status: 'failed', error: status.error || status.message });
          } else {
            stillProcessing++;
            results.push({ id: music.id, status: 'still_processing' });
          }
        } catch (error) {
          logger.error(`Recovery error for music ${music.id}:`, error);
          stillProcessing++;
          results.push({ id: music.id, status: 'error', error: error.message });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return res.json({
        success: true,
        message: `Recovery completed: ${recovered} recovered, ${failed} failed, ${stillProcessing} still processing`,
        recovered,
        failed,
        stillProcessing,
        results
      });
    }
  } catch (error) {
    logger.error('Music recovery failed:', error);
    res.status(500).json({
      error: 'Recovery failed',
      message: error.message
    });
  }
});

// GET /api/content/music/:id - Get specific music track
router.get('/music/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await database.query(`
      SELECT 
        id, user_id, agent_id, prompt, style, genre, duration,
        instrumental, lyrics, tempo, mood, audio_url, provider,
        status, metadata, created_at, updated_at
      FROM generated_music
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Music track not found' });
    }

    const track = result.rows[0];

    res.json({
      success: true,
      data: {
        id: track.id,
        prompt: track.prompt,
        style: track.style,
        genre: track.genre,
        duration: track.duration,
        instrumental: track.instrumental,
        lyrics: track.lyrics,
        tempo: track.tempo,
        mood: track.mood,
        audioUrl: track.audio_url,
        provider: track.provider,
        status: track.status,
        metadata: track.metadata || {},
        createdAt: track.created_at,
        updated_at: track.updated_at
      }
    });

  } catch (error) {
    logger.error('Failed to get music track:', error);
    res.status(500).json({
      error: 'Failed to get music track',
      details: error.message
    });
  }
});

// POST /api/content/music-videos/generate - Generate music video from music track
router.post('/music-videos/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      musicId, // Required: ID of the generated music track
      agentId = null,
      provider = null, // vidnoz, heygen (auto-selects if not specified)
      avatarId = null, // Optional: Avatar ID from provider or our character ID
      lookId = null, // Optional: Look ID if using our avatar system
      avatarType = 'avatar', // 'avatar', 'talking_photo', 'template', 'custom'
      script = null, // Optional: Script/text for avatar to speak
      background = null, // Optional: Background image/video URL
      aspectRatio = '16:9',
      resolution = null // null means use HeyGen default (don't send resolution parameter)
    } = req.body;

    if (!musicId) {
      return res.status(400).json({
        error: 'Music ID is required',
        details: 'Please provide the ID of a generated music track'
      });
    }

    // Check if music video generation service is available
    const musicVideoService = new MusicVideoGenerationService();
    if (!musicVideoService.isAvailable()) {
      return res.status(503).json({
        error: 'Music video generation service not available',
        details: 'No music video generation API keys configured. Please set VIDNOZ_API_KEY or HEYGEN_API_KEY in environment variables.'
      });
    }

    // Verify music track exists and belongs to user
    const musicResult = await database.query(`
      SELECT id, audio_url, status, duration, user_id
      FROM generated_music
      WHERE id = $1 AND user_id = $2
    `, [musicId, userId]);

    if (musicResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Music track not found',
        details: 'The specified music track does not exist or does not belong to you'
      });
    }

    const music = musicResult.rows[0];

    if (music.status !== 'completed' || !music.audio_url) {
      return res.status(400).json({
        error: 'Music track not ready',
        details: 'The music track must be completed and have an audio URL before creating a video'
      });
    }

    // Deduct credits for music video generation (dynamic pricing - per second)
    const generationId = uuidv4();
    // Music video duration is based on the music track duration
    const musicDuration = music.duration || 30; // Default to 30 seconds if not available
    const creditCost = await ServicePricingService.calculateCost('music_video_generation', musicDuration);
    
    try {
      await creditService.deductCredits(userId, 'music_video_generation', creditCost, generationId);
    } catch (creditError) {
      const { formatCreditError } = require('../utils/creditErrorHandler');
      const errorResponse = formatCreditError(creditError, creditCost);
      return res.status(402).json(errorResponse);
    }

    logger.info(`Generating music video for user ${userId}, musicId: ${musicId}`);

    // Get full audio URL (handle relative paths)
    let audioUrl = music.audio_url;
    if (!audioUrl.startsWith('http')) {
      audioUrl = `${process.env.BACKEND_URL || 'https://www.iqonga.org'}${audioUrl}`;
    }

    // Webhook support disabled for now - can be enabled later when HeyGen webhook is configured
    // const webhookSecret = process.env.HEYGEN_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');
    // const webhookUrl = `${process.env.BACKEND_URL || 'https://www.iqonga.org'}/api/webhooks/heygen`;

    // If lookId is provided, get the look's HeyGen ID or use character's HeyGen ID
    let finalAvatarId = avatarId;
    if (lookId && avatarId) {
      try {
        const CharacterService = require('../services/CharacterService');
        const character = await CharacterService.getCharacterById(avatarId, userId);
        
        // Get the look
        const looks = await CharacterService.getAvatarLooks(avatarId, userId);
        const selectedLook = looks.find(l => l.id === lookId);
        
        if (selectedLook) {
          // If look has a HeyGen ID in metadata, use it
          // Otherwise, use the character's HeyGen ID
          if (selectedLook.metadata?.heygen_id) {
            finalAvatarId = selectedLook.metadata.heygen_id;
          } else if (character.heygenAvatarId) {
            finalAvatarId = character.heygenAvatarId;
          }
          // If using photo-based avatar with look, set avatarType to talking_photo
          if (character.avatarType === 'photo' && selectedLook.look_type === 'photo') {
            avatarType = 'talking_photo';
          }
        }
      } catch (lookError) {
        logger.warn(`Failed to get look ${lookId}: ${lookError.message}`);
        // Continue with original avatarId
      }
    } else if (avatarId && !lookId) {
      // If avatarId is provided but no lookId, try to get character's HeyGen ID
      try {
        const CharacterService = require('../services/CharacterService');
        const character = await CharacterService.getCharacterById(avatarId, userId);
        if (character.heygenAvatarId) {
          finalAvatarId = character.heygenAvatarId;
        }
        // Set avatarType based on character type
        if (character.avatarType === 'photo') {
          avatarType = 'talking_photo';
        }
      } catch (charError) {
        logger.warn(`Failed to get character ${avatarId}: ${charError.message}`);
        // Continue with provided avatarId (might be a HeyGen ID directly)
      }
    }

    // Generate music video (reuse musicVideoService declared above)
    // Force provider to 'heygen' since it's the only option
    // Note: If resolution is null/undefined, it won't be sent to HeyGen (uses default)
    const result = await musicVideoService.generateMusicVideo(musicId, audioUrl, {
      provider: 'heygen', // Only HeyGen is supported
      avatarId: finalAvatarId,
      avatarType,
      script,
      background,
      aspectRatio,
      resolution: resolution || null // null means don't send resolution parameter (use HeyGen default)
      // webhookUrl,
      // webhookSecret
    });

    // Save to database
    let videoId;
    try {
      videoId = uuidv4();
      // Store video_id in metadata
      const metadataWithIds = {
        ...(result.metadata || {}),
        video_id: result.videoId || null
      };
      
      await database.query(`
        INSERT INTO generated_music_videos (
          id, user_id, agent_id, music_id, video_url, audio_url, provider,
          avatar_id, avatar_type, status, metadata, duration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        videoId,
        userId,
        agentId || null,
        musicId,
        result.videoUrl || null,
        music.audio_url,
        result.provider,
        avatarId || null,
        avatarType,
        result.status || 'processing',
        JSON.stringify(metadataWithIds),
        music.duration
      ]);

      logger.info(`Music video saved to database with ID: ${videoId}, video_id: ${result.videoId || 'N/A'}`);
      
      // If status is processing, start background polling (similar to music generation)
      // Note: HeyGen videos can take 2-5 minutes to generate, so we wait before polling
      if (result.status === 'processing' && result.videoId) {
        logger.info(`Starting background polling for video ${result.videoId} in 2 minutes...`);
        
        // Start background polling as fallback
        setTimeout(async () => {
          let pollAttempts = 0;
          const maxPollAttempts = 20; // Poll for up to 10 minutes (20 attempts * 30 seconds)
          const pollInterval = 30000; // 30 seconds between polls
          
          const pollVideo = async () => {
            pollAttempts++;
            logger.info(`Polling attempt ${pollAttempts}/${maxPollAttempts} for video ${result.videoId}`);
            
            try {
              const statusResult = await musicVideoService.getVideoStatus(result.provider, result.videoId);
              logger.info(`HeyGen status check response: ${JSON.stringify(statusResult, null, 2)}`);
              
              // Check various possible response structures from HeyGen status endpoint
              // HeyGen returns: { data: { video_url, status, ... } } or { video_url, status, ... }
              const videoUrl = statusResult.data?.video_url || 
                              statusResult.data?.url ||
                              statusResult.video_url || 
                              statusResult.url ||
                              statusResult.data?.data?.video_url ||
                              statusResult.data?.thumbnail_url; // Sometimes thumbnail_url is available first
              
              const videoStatus = statusResult.data?.status || 
                                 statusResult.status ||
                                 statusResult.data?.data?.status ||
                                 statusResult.data?.state; // Some APIs use 'state' instead of 'status'
              
              logger.info(`Video status: ${videoStatus}, Video URL: ${videoUrl || 'not available'}`);
              
              if (videoUrl) {
                // Video is ready, download it
                const localVideoPath = await musicVideoService.downloadAndStoreVideo(videoUrl, result.provider, musicId);
                const relativePath = `/uploads/videos/music-videos/${path.basename(localVideoPath)}`;
                
                await database.query(`
                  UPDATE generated_music_videos 
                  SET video_url = $1, 
                      status = $2,
                      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{polling_completed_at}', $3::jsonb),
                      updated_at = NOW()
                  WHERE id = $4
                `, [
                  relativePath,
                  'completed',
                  JSON.stringify(new Date().toISOString()),
                  videoId
                ]);
                logger.info(`Music video generation completed via polling: ${videoId}`);
                return; // Stop polling
              } else if (videoStatus === 'failed' || videoStatus === 'error') {
                // Video generation failed
                await database.query(`
                  UPDATE generated_music_videos 
                  SET status = $1,
                      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
                      updated_at = NOW()
                  WHERE id = $3
                `, [
                  'failed',
                  JSON.stringify(statusResult.data?.error || statusResult.error || 'Video generation failed'),
                  videoId
                ]);
                logger.error(`Music video generation failed: ${videoId}`);
                return; // Stop polling
              } else if (pollAttempts < maxPollAttempts) {
                // Still processing, continue polling
                setTimeout(pollVideo, pollInterval);
              } else {
                // Max attempts reached
                await database.query(`
                  UPDATE generated_music_videos 
                  SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{polling_timeout}', $1::jsonb),
                      updated_at = NOW()
                  WHERE id = $2
                `, [
                  JSON.stringify(new Date().toISOString()),
                  videoId
                ]);
                logger.warn(`Music video polling timeout after ${maxPollAttempts} attempts: ${videoId}`);
              }
            } catch (pollError) {
              // Safely extract error information without circular references
              const errorMessage = pollError.message || 'Polling failed';
              const errorInfo = {
                message: errorMessage,
                url: pollError.config?.url || 'unknown',
                status: pollError.response?.status || 'no status',
                responseData: typeof pollError.response?.data === 'string' 
                  ? pollError.response.data.substring(0, 200) 
                  : pollError.response?.data || {}
              };
              
              logger.error(`Polling error (attempt ${pollAttempts}/${maxPollAttempts}):`, errorInfo);
              
              // Only mark as failed if we've exhausted all attempts or got a definitive error
              if (pollAttempts >= maxPollAttempts || (pollError.response?.status && pollError.response.status !== 404)) {
                await database.query(`
                  UPDATE generated_music_videos 
                  SET status = $1,
                      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
                      updated_at = NOW()
                  WHERE id = $3
                `, [
                  'failed',
                  JSON.stringify(errorInfo),
                  videoId
                ]);
                logger.error(`Music video generation failed via polling: ${errorMessage}`, errorInfo);
              } else if (pollAttempts < maxPollAttempts) {
                // Retry after interval
                setTimeout(pollVideo, pollInterval);
              }
            }
          };
          
          // Start polling
          pollVideo();
        }, 2 * 60 * 1000); // Wait 2 minutes before starting polling
      }
    } catch (dbError) {
      logger.error('Failed to save music video to database:', dbError);
      // Continue even if database save fails
    }

    res.json({
      success: true,
      data: {
        ...result,
        id: videoId || generationId,
        musicId,
        audioUrl: music.audio_url,
        duration: music.duration
      },
      metadata: {
        provider: result.provider,
        generatedAt: new Date().toISOString(),
        creditCost
      }
    });

  } catch (error) {
    // Safely log error without circular references
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined
    };
    logger.error('Music video generation failed:', errorDetails);
    
    // Provide helpful error messages
    let errorMessage = error.message;
    let suggestions = [];
    
    if (error.message.includes('No music video generation providers')) {
      errorMessage = 'No music video generation providers are configured.';
      suggestions = [
        'Please configure at least one API key: HEYGEN_API_KEY or RECCLOUD_API_KEY'
      ];
    } else if (error.message.includes('All music video generation providers failed')) {
      errorMessage = 'All music video generation providers failed. Please try again.';
      suggestions = [
        'Check your API keys are valid',
        'Try a different music track',
        'Wait a few minutes and try again'
      ];
    }
    
    res.status(500).json({
      error: 'Failed to generate music video',
      details: errorMessage,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/content/music-videos - Get user's generated music videos
router.get('/music-videos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, agentId, musicId } = req.query;
    const offset = (page - 1) * limit;
    
    logger.info('Fetching music videos for user:', userId);

    let query = `
      SELECT 
        gmv.id,
        gmv.music_id,
        gmv.video_url,
        gmv.audio_url,
        gmv.provider,
        gmv.avatar_id,
        gmv.avatar_type,
        gmv.status,
        gmv.metadata,
        gmv.duration,
        gmv.created_at,
        gmv.updated_at,
        gm.prompt as music_prompt,
        gm.style as music_style,
        gm.genre as music_genre,
        aa.name as agent_name
      FROM generated_music_videos gmv
      LEFT JOIN generated_music gm ON gmv.music_id = gm.id
      LEFT JOIN ai_agents aa ON gmv.agent_id = aa.id
      WHERE gmv.user_id = $1
    `;
    
    const queryParams = [userId];
    
    if (agentId) {
      query += ` AND gmv.agent_id = $${queryParams.length + 1}`;
      queryParams.push(agentId);
    }
    
    if (musicId) {
      query += ` AND gmv.music_id = $${queryParams.length + 1}`;
      queryParams.push(musicId);
    }
    
    query += ` ORDER BY gmv.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const result = await database.query(query, queryParams);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM generated_music_videos gmv WHERE gmv.user_id = $1`;
    const countParams = [userId];
    
    if (agentId) {
      countQuery += ` AND gmv.agent_id = $2`;
      countParams.push(agentId);
    }
    
    if (musicId) {
      countQuery += ` AND gmv.music_id = $${countParams.length + 1}`;
      countParams.push(musicId);
    }
    
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    const videos = result.rows.map(video => ({
      id: video.id,
      musicId: video.music_id,
      videoUrl: video.video_url,
      audioUrl: video.audio_url,
      provider: video.provider,
      avatarId: video.avatar_id,
      avatarType: video.avatar_type,
      status: video.status,
      metadata: video.metadata || {},
      duration: video.duration,
      createdAt: video.created_at,
      created_at: video.created_at, // Legacy field
      updated_at: video.updated_at,
      musicPrompt: video.music_prompt,
      musicStyle: video.music_style,
      musicGenre: video.music_genre,
      agentName: video.agent_name
    }));

    res.json({
      success: true,
      data: {
        videos: videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch music videos:', error);
    res.status(500).json({
      error: 'Failed to fetch music videos',
      details: error.message
    });
  }
});

// POST /api/content/music-videos/recover - Manually recover processing music video tasks
router.post('/music-videos/recover', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { videoId, heygenVideoId } = req.body;
    
    logger.info(`Music video recovery request from user ${userId}`, { videoId, heygenVideoId });
    
    if (!videoId && !heygenVideoId) {
      return res.status(400).json({
        error: 'Missing video ID',
        message: 'Please provide either videoId (our database ID) or heygenVideoId (HeyGen video ID)'
      });
    }
    
    // Find the video record
    let query;
    let params;
    
    if (videoId) {
      query = `
        SELECT id, metadata, provider, status, music_id
        FROM generated_music_videos
        WHERE id = $1 AND user_id = $2
      `;
      params = [videoId, userId];
    } else {
      // Find by HeyGen video_id stored in metadata
      query = `
        SELECT id, metadata, provider, status, music_id
        FROM generated_music_videos
        WHERE metadata->>'video_id' = $1 AND user_id = $2
      `;
      params = [heygenVideoId, userId];
    }
    
    const result = await database.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Music video not found',
        message: 'No music video found with the provided ID'
      });
    }
    
    const video = result.rows[0];
    
    if (video.status === 'completed') {
      return res.json({
        success: true,
        message: 'Music video is already completed',
        data: { id: video.id, status: video.status }
      });
    }
    
    // Extract video_id from metadata
    const metadata = typeof video.metadata === 'string' 
      ? JSON.parse(video.metadata) 
      : video.metadata;
    const heygenVideoIdFromDb = metadata?.video_id || heygenVideoId;
    
    if (!heygenVideoIdFromDb) {
      return res.status(400).json({
        error: 'No HeyGen video_id found',
        message: 'Cannot recover: no video_id found in metadata'
      });
    }
    
    // Check if provider is HeyGen
    if (video.provider !== 'heygen') {
      return res.status(400).json({
        error: 'Unsupported provider',
        message: `Recovery is only supported for HeyGen videos. This video uses provider: ${video.provider}`
      });
    }
    
    // Check status with HeyGen
    const musicVideoService = new MusicVideoGenerationService();
    const statusResult = await musicVideoService.getVideoStatus('heygen', heygenVideoIdFromDb);
    
    logger.info(`HeyGen status check for recovery: ${JSON.stringify(statusResult, null, 2)}`);
    
    // Parse response
    const videoUrl = statusResult.data?.video_url ||
                     statusResult.data?.url ||
                     statusResult.video_url ||
                     statusResult.url;
    
    const videoStatus = statusResult.data?.status ||
                        statusResult.status ||
                        statusResult.data?.state;
    
    const error = statusResult.data?.error || statusResult.error;
    
    if (videoUrl) {
      // Video is ready, download it
      const localVideoPath = await musicVideoService.downloadAndStoreVideo(videoUrl, 'heygen', video.music_id);
      const relativePath = `/uploads/videos/music-videos/${path.basename(localVideoPath)}`;
      
      await database.query(`
        UPDATE generated_music_videos
        SET video_url = $1,
            status = $2,
            metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{recovered_at}', $3::jsonb),
            updated_at = NOW()
        WHERE id = $4
      `, [
        relativePath,
        'completed',
        JSON.stringify(new Date().toISOString()),
        video.id
      ]);
      
      logger.info(`Music video recovered successfully: ${video.id}`);
      
      return res.json({
        success: true,
        message: 'Music video recovered successfully',
        data: {
          id: video.id,
          status: 'completed',
          videoUrl: relativePath
        }
      });
    } else if (videoStatus === 'failed' || error) {
      // Video generation failed
      await database.query(`
        UPDATE generated_music_videos
        SET status = $1,
            metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{error}', $2::jsonb),
            updated_at = NOW()
        WHERE id = $3
      `, [
        'failed',
        JSON.stringify(error || 'Video generation failed'),
        video.id
      ]);
      
      logger.error(`Music video generation failed: ${video.id}`);
      
      return res.json({
        success: true,
        message: 'Video generation failed',
        data: {
          id: video.id,
          status: 'failed',
          error: error || 'Video generation failed'
        }
      });
    } else {
      // Still processing
      return res.json({
        success: true,
        message: 'Video is still processing',
        data: {
          id: video.id,
          status: videoStatus || 'processing',
          note: 'Please check again later'
        }
      });
    }
  } catch (error) {
    logger.error('Music video recovery failed:', error);
    res.status(500).json({
      error: 'Recovery failed',
      message: error.message
    });
  }
});

// GET /api/content/music-videos/:id - Get specific music video details
router.get('/music-videos/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await database.query(`
      SELECT 
        gmv.*,
        gm.prompt as music_prompt,
        gm.style as music_style,
        gm.genre as music_genre,
        gm.lyrics as music_lyrics,
        aa.name as agent_name
      FROM generated_music_videos gmv
      LEFT JOIN generated_music gm ON gmv.music_id = gm.id
      LEFT JOIN ai_agents aa ON gmv.agent_id = aa.id
      WHERE gmv.id = $1 AND gmv.user_id = $2
    `, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Music video not found' });
    }
    
    const video = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: video.id,
        musicId: video.music_id,
        videoUrl: video.video_url,
        audioUrl: video.audio_url,
        provider: video.provider,
        avatarId: video.avatar_id,
        avatarType: video.avatar_type,
        status: video.status,
        metadata: video.metadata || {},
        duration: video.duration,
        createdAt: video.created_at,
        updated_at: video.updated_at,
        musicPrompt: video.music_prompt,
        musicStyle: video.music_style,
        musicGenre: video.music_genre,
        musicLyrics: video.music_lyrics,
        agentName: video.agent_name
      }
    });
  } catch (error) {
    logger.error('Failed to fetch music video:', error);
    res.status(500).json({
      error: 'Failed to fetch music video',
      details: error.message
    });
  }
});

// ============================================
// HeyGen Avatar Videos Endpoints
// ============================================

// GET /api/content/heygen/avatars - Get available HeyGen avatars
router.get('/heygen/avatars', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    if (!VideoGenerationService.providers.heygen?.enabled) {
      return res.status(503).json({
        error: 'HeyGen service not available',
        details: 'HEYGEN_API_KEY not configured'
      });
    }

    const avatars = await VideoGenerationService.getHeyGenAvatars();
    
    res.json({
      success: true,
      data: avatars,
      count: avatars.length
    });
  } catch (error) {
    logger.error('Failed to fetch HeyGen avatars:', error);
    res.status(500).json({
      error: 'Failed to fetch avatars',
      details: error.message
    });
  }
});

// GET /api/content/heygen/voices - Get available HeyGen voices
router.get('/heygen/voices', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    if (!VideoGenerationService.providers.heygen?.enabled) {
      return res.status(503).json({
        error: 'HeyGen service not available',
        details: 'HEYGEN_API_KEY not configured'
      });
    }

    const voices = await VideoGenerationService.getHeyGenVoices();
    
    res.json({
      success: true,
      data: voices,
      count: voices.length
    });
  } catch (error) {
    logger.error('Failed to fetch HeyGen voices:', error);
    res.status(500).json({
      error: 'Failed to fetch voices',
      details: error.message
    });
  }
});

// POST /api/content/heygen/text-to-avatar - Generate avatar video from text script
router.post('/heygen/text-to-avatar', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      script,
      avatarId = null,
      voiceId = null,
      background = null,
      aspectRatio = '16:9',
      resolution = null
    } = req.body;

    if (!script || !script.trim()) {
      return res.status(400).json({
        error: 'Script is required',
        details: 'Please provide a script for the avatar to speak'
      });
    }

    // Check if HeyGen service is available
    if (!VideoGenerationService.providers.heygen?.enabled) {
      return res.status(503).json({
        error: 'HeyGen service not available',
        details: 'HEYGEN_API_KEY not configured'
      });
    }

    // Deduct credits for avatar video generation (dynamic pricing)
    const generationId = uuidv4();
    const creditCost = await ServicePricingService.getPricing('heygen_text_to_avatar');
    
    try {
      await creditService.deductCredits(userId, 'video_generation', creditCost, generationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    logger.info(`Generating HeyGen avatar video for user ${userId}`);

    // Generate avatar video using VideoGenerationService
    const result = await VideoGenerationService.generateVideo(script, {
      provider: 'heygen',
      duration: null, // HeyGen calculates duration from script
      style: null, // Not applicable for HeyGen
      aspectRatio: aspectRatio,
      videoScript: script, // Use script as videoScript
      avatarId: avatarId || undefined,
      voiceId: voiceId || undefined,
      background: background || undefined
    });

    // Save to database
    let videoId;
    try {
      videoId = uuidv4();
      const metadataWithIds = {
        ...(result.metadata || {}),
        video_id: result.videoId,
        avatar_id: avatarId,
        voice_id: voiceId,
        script_length: script.length,
        generated_at: new Date().toISOString()
      };

      await database.query(`
        INSERT INTO generated_videos (
          id, user_id, prompt, video_url, status, provider, 
          duration, style, aspect_ratio, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        videoId,
        userId,
        script.substring(0, 500), // Truncate for prompt field
        result.videoUrl || null,
        result.status || 'processing',
        'heygen',
        null, // Duration calculated by HeyGen
        'avatar-video',
        aspectRatio,
        JSON.stringify(metadataWithIds)
      ]);
    } catch (dbError) {
      logger.error('Failed to save HeyGen video to database:', dbError);
      // Continue even if database save fails
    }

    res.json({
      success: true,
      data: {
        ...result,
        id: videoId || generationId,
        script: script,
        creditCost
      },
      metadata: {
        provider: 'heygen',
        generatedAt: new Date().toISOString(),
        creditCost
      }
    });

  } catch (error) {
    logger.error('HeyGen text-to-avatar generation failed:', error);
    
    let errorMessage = error.message;
    let suggestions = [];
    
    if (error.message.includes('not configured')) {
      errorMessage = 'HeyGen service is not configured.';
      suggestions = ['Please configure HEYGEN_API_KEY in environment variables'];
    } else if (error.message.includes('character limit')) {
      errorMessage = 'Script exceeds character limit.';
      suggestions = ['Please keep your script under 1,500 characters'];
    }
    
    res.status(500).json({
      error: 'Failed to generate avatar video',
      details: errorMessage,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/content/heygen/audio-lip-sync - Generate avatar video with audio lip-sync
router.post('/heygen/audio-lip-sync', authenticateToken, requireTokenAccess, upload.single('audio'), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      audioUrl: providedAudioUrl,
      avatarId = null,
      aspectRatio = '16:9',
      resolution = null
    } = req.body;

    // Check if HeyGen service is available
    const musicVideoService = new MusicVideoGenerationService();
    if (!musicVideoService.isAvailable() || !musicVideoService.providers.heygen?.enabled) {
      return res.status(503).json({
        error: 'HeyGen service not available',
        details: 'HEYGEN_API_KEY not configured'
      });
    }

    // Get audio URL - either from file upload or provided URL
    let audioUrl = providedAudioUrl;
    if (req.file) {
      // File was uploaded, construct URL
      const baseUrl = process.env.PUBLIC_BASE_URL || process.env.BACKEND_URL || 'https://www.iqonga.org';
      audioUrl = `${baseUrl}/uploads/music/temp/${req.file.filename}`;
      logger.info(`Audio file uploaded: ${audioUrl}`);
    }

    if (!audioUrl) {
      return res.status(400).json({
        error: 'Audio file or URL is required',
        details: 'Please provide an audio file upload or audio URL'
      });
    }

    // Deduct credits for audio lip-sync video generation (dynamic pricing)
    const generationId = uuidv4();
    const creditCost = await ServicePricingService.getPricing('heygen_audio_lip_sync');
    
    try {
      await creditService.deductCredits(userId, 'music_video_generation', creditCost, generationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    logger.info(`Generating HeyGen audio lip-sync video for user ${userId}`);

    // Generate music video using MusicVideoGenerationService (which handles HeyGen audio lip-sync)
    const result = await musicVideoService.generateMusicVideo(generationId, audioUrl, {
      provider: 'heygen',
      avatarId: avatarId || null,
      avatarType: 'avatar',
      script: null, // No script needed for audio lip-sync
      background: null,
      aspectRatio: aspectRatio,
      resolution: resolution || null
    });

    // Save to database
    let videoId;
    try {
      videoId = uuidv4();
      const metadataWithIds = {
        ...(result.metadata || {}),
        video_id: result.videoId,
        avatar_id: avatarId,
        audio_url: audioUrl,
        generated_at: new Date().toISOString()
      };

      await database.query(`
        INSERT INTO generated_music_videos (
          id, user_id, music_id, video_url, audio_url, status, provider, 
          avatar_id, avatar_type, aspect_ratio, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        videoId,
        userId,
        generationId, // Use generationId as music_id reference
        result.videoUrl || null,
        audioUrl,
        result.status || 'processing',
        'heygen',
        avatarId,
        'avatar',
        aspectRatio,
        JSON.stringify(metadataWithIds)
      ]);
    } catch (dbError) {
      logger.error('Failed to save HeyGen audio lip-sync video to database:', dbError);
      // Continue even if database save fails
    }

    res.json({
      success: true,
      data: {
        ...result,
        id: videoId || generationId,
        audioUrl: audioUrl,
        creditCost
      },
      metadata: {
        provider: 'heygen',
        generatedAt: new Date().toISOString(),
        creditCost
      }
    });

  } catch (error) {
    logger.error('HeyGen audio lip-sync generation failed:', error);
    
    res.status(500).json({
      error: 'Failed to generate audio lip-sync video',
      details: error.message,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/content/heygen/video-translation - Translate video with lip-sync
router.post('/heygen/video-translation', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      videoUrl,
      targetLanguage = 'en',
      mode = 'quality' // 'fast' or 'quality'
    } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        error: 'Video URL is required',
        details: 'Please provide a source video URL to translate'
      });
    }

    // Check if HeyGen service is available
    if (!VideoGenerationService.providers.heygen?.enabled) {
      return res.status(503).json({
        error: 'HeyGen service not available',
        details: 'HEYGEN_API_KEY not configured'
      });
    }

    // TODO: Implement video translation using HeyGen Video Translation API
    // This requires the Video Translation API endpoint which may need additional implementation
    // For now, return a placeholder response
    
    logger.info(`HeyGen video translation requested for user ${userId}: ${videoUrl} -> ${targetLanguage} (${mode})`);

    // Calculate credits based on video duration (duration-based pricing)
    // Fast mode: 3 credits/min, Quality mode: 6 credits/min
    const serviceKey = mode === 'quality' 
      ? 'heygen_video_translation_quality' 
      : 'heygen_video_translation_fast';
    
    // Get video duration if provided, otherwise estimate 1 minute
    const videoDurationSeconds = req.body.videoDurationSeconds || 60;
    const creditCost = await ServicePricingService.calculateCost(serviceKey, videoDurationSeconds);

    // Deduct credits
    const generationId = uuidv4();
    try {
      await creditService.deductCredits(userId, 'video_generation', creditCost, generationId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // TODO: Implement actual HeyGen video translation API call
    // This would use HeyGen's Video Translation API endpoint
    // For now, return a placeholder
    
    res.json({
      success: true,
      message: 'Video translation feature coming soon',
      data: {
        id: generationId,
        videoUrl: videoUrl,
        targetLanguage: targetLanguage,
        mode: mode,
        status: 'pending',
        note: 'Video translation API integration is in progress. This feature will be available soon.'
      },
      metadata: {
        provider: 'heygen',
        generatedAt: new Date().toISOString(),
        creditCost: estimatedCreditCost
      }
    });

  } catch (error) {
    logger.error('HeyGen video translation failed:', error);
    
    res.status(500).json({
      error: 'Failed to translate video',
      details: error.message,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/content/heygen/videos - Get user's generated HeyGen avatar videos
router.get('/heygen/videos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await database.query(`
      SELECT 
        id, prompt, video_url, status, provider, 
        duration, style, aspect_ratio, metadata, created_at
      FROM generated_videos
      WHERE user_id = $1 AND provider = 'heygen'
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await database.query(`
      SELECT COUNT(*) as total
      FROM generated_videos
      WHERE user_id = $1 AND provider = 'heygen'
    `, [userId]);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch HeyGen videos:', error);
    res.status(500).json({
      error: 'Failed to fetch videos',
      details: error.message
    });
  }
});

// ============================================
// LONG-FORM CONTENT GENERATION ROUTES
// ============================================

// POST /api/content/long-form/generate - Generate long-form content
router.post('/long-form/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      agent_id,
      content_type = 'blog',
      topic,
      title,
      target_word_count = 1000,
      tone = 'professional',
      include_seo = true,
      target_audience,
      key_points,
      template_id = null // Optional: content template ID
    } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Check if agent exists and belongs to user
    const agentResult = await database.query(
      'SELECT id, name, personality_type, voice_tone, user_id FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agent_id, userId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Deduct credits (dynamic pricing)
    const contentId = uuidv4();
    const creditCost = await ServicePricingService.getPricing('long_form_content');
    
    try {
      await creditService.deductCredits(userId, 'long_form_content', creditCost, contentId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Generate long-form content
    const aiContentService = require('../services/AIContentService');
    const result = await aiContentService.generateLongFormContent(agent, {
      content_type,
      topic,
      title,
      target_word_count,
      tone,
      include_seo,
      target_audience,
      key_points,
      template_id
    });

    res.json({
      success: true,
      data: {
        title: result.title || title || topic,
        content: result.content,
        word_count: result.word_count || 0
      },
      creditsUsed: creditCost
    });
  } catch (error) {
    logger.error('Long-form content generation error:', error);
    res.status(500).json({
      error: 'Failed to generate long-form content',
      details: error.message
    });
  }
});

// GET /api/content/long-form/drafts - Get saved drafts
router.get('/long-form/drafts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const drafts = await database.query(
      `SELECT id, title, content, content_type, word_count, created_at, status 
       FROM long_form_content 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: drafts.rows
    });
  } catch (error) {
    logger.error('Failed to fetch drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

// POST /api/content/long-form/drafts - Save draft
router.post('/long-form/drafts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content, content_type, word_count } = req.body;

    const result = await database.query(
      `INSERT INTO long_form_content (user_id, title, content, content_type, word_count, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING *`,
      [userId, title, content, content_type, word_count]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to save draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// ============================================
// CREATIVE WRITING ROUTES
// ============================================

// POST /api/content/creative/generate - Generate creative writing content
router.post('/creative/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      agent_id,
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
    } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    if (!topic) {
      return res.status(400).json({ error: 'Topic or prompt is required' });
    }

    // Check if agent exists and belongs to user
    const agentResult = await database.query(
      'SELECT id, name, personality_type, voice_tone, user_id FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agent_id, userId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Deduct credits (dynamic pricing)
    const contentId = uuidv4();
    const creditCost = await ServicePricingService.getPricing('creative_writing');
    
    try {
      await creditService.deductCredits(userId, 'creative_writing', creditCost, contentId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Generate creative content
    const aiContentService = require('../services/AIContentService');
    const result = await aiContentService.generateCreativeContent(agent, {
      content_type,
      topic,
      title,
      genre,
      target_word_count,
      style,
      target_audience,
      characters,
      plot_points,
      template_id
    });

    res.json({
      success: true,
      data: {
        title: result.title || title || topic,
        content: result.content,
        word_count: result.word_count || 0,
        chapters: result.chapters || []
      },
      creditsUsed: creditCost
    });
  } catch (error) {
    logger.error('Creative writing generation error:', error);
    res.status(500).json({
      error: 'Failed to generate creative content',
      details: error.message
    });
  }
});

// GET /api/content/creative/drafts - Get saved drafts
router.get('/creative/drafts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const drafts = await database.query(
      `SELECT id, title, content, content_type, word_count, chapters, created_at, status 
       FROM creative_writing_content 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: drafts.rows.map(draft => ({
        ...draft,
        chapters: typeof draft.chapters === 'string' ? JSON.parse(draft.chapters) : draft.chapters
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

// POST /api/content/creative/drafts - Save draft
router.post('/creative/drafts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content, content_type, word_count, chapters } = req.body;

    const result = await database.query(
      `INSERT INTO creative_writing_content (user_id, title, content, content_type, word_count, chapters, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING *`,
      [userId, title, content, content_type, word_count, JSON.stringify(chapters || [])]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        chapters: typeof result.rows[0].chapters === 'string' 
          ? JSON.parse(result.rows[0].chapters) 
          : result.rows[0].chapters
      }
    });
  } catch (error) {
    logger.error('Failed to save draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// ============================================
// MULTI-MODAL CONTENT GENERATION ROUTES
// ============================================

// Initialize multi-modal service
let multiModalService;
try {
  multiModalService = new MultiModalContentService();
  logger.info('MultiModalContentService initialized successfully');
} catch (error) {
  logger.error('Failed to initialize MultiModalContentService:', error);
  multiModalService = null;
}

// POST /api/content/multimodal/generate - Generate complete content package (text + image + video)
router.post('/multimodal/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      agent_id,
      content_type = 'tweet',
      topic,
      style,
      length = 'medium',
      context,
      hashtags = true,
      emojis = true,
      template_id = null,
      include_image = true,
      include_video = false,
      image_style = 'realistic',
      image_size = '1024x1024',
      video_duration = 15,
      video_provider = 'heygen',
      platform = 'twitter'
    } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const agentResult = await database.query(
      'SELECT id, name, personality_type, voice_tone, user_id FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agent_id, userId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];
    const estimatedCredits = 20 + (include_image ? 50 : 0) + (include_video ? Math.ceil(video_duration / 60) * 150 : 0);
    
    const userCredits = await creditService.getUserCredits(userId);
    if (userCredits.credit_balance < estimatedCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: `Estimated ${estimatedCredits} credits needed. You have ${userCredits.credit_balance} credits.`,
        requiredCredits: estimatedCredits,
        availableCredits: userCredits.credit_balance
      });
    }

    const result = await multiModalService.generateContentPackage(agent, {
      content_type, topic, style, length, context, hashtags, emojis, template_id,
      include_image, include_video, image_style, image_size, video_duration, video_provider, platform
    });

    try {
      await creditService.deductCredits(userId, 'multimodal_content', result.package.credits_used, result.package.package_id);
    } catch (creditError) {
      logger.error('[MultiModal] Failed to deduct credits:', creditError);
    }

    res.json({
      success: true,
      data: result,
      creditsUsed: result.package.credits_used
    });
  } catch (error) {
    logger.error('Multi-modal content generation error:', error);
    res.status(500).json({
      error: 'Failed to generate content package',
      details: error.message
    });
  }
});

// GET /api/content/multimodal/packages - Get user's content packages
router.get('/multimodal/packages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    if (!multiModalService) {
      logger.error('MultiModalContentService not initialized');
      return res.status(500).json({ error: 'Service not available' });
    }
    
    const packages = await multiModalService.getUserPackages(userId, parseInt(limit), parseInt(offset));
    res.json({ success: true, data: packages });
  } catch (error) {
    logger.error('Failed to fetch content packages:', error);
    res.status(500).json({ error: 'Failed to fetch content packages', details: error.message });
  }
});

// GET /api/content/multimodal/packages/:id - Get specific content package
router.get('/multimodal/packages/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const contentPackage = await multiModalService.getPackage(id, userId);
    if (!contentPackage) {
      return res.status(404).json({ error: 'Content package not found' });
    }
    res.json({ success: true, data: contentPackage });
  } catch (error) {
    logger.error('Failed to fetch content package:', error);
    res.status(500).json({ error: 'Failed to fetch content package' });
  }
});

// ============================================
// CONTENT RESEARCH ROUTES
// ============================================

const ContentResearchService = require('../services/ContentResearchService');
const researchService = new ContentResearchService();

// POST /api/content/research - Research a topic
router.post('/research', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      topic,
      include_trending = true,
      include_keywords = true,
      include_competitor_analysis = false,
      max_sources = 10,
      allowed_domains = [],
      excluded_domains = []
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Deduct credits for research
    const researchCost = 30; // Research costs 30 credits
    try {
      await creditService.deductCredits(userId, 'content_research', researchCost);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: researchCost
      });
    }

    // Perform research
    const research = await researchService.researchTopic(topic, {
      include_trending,
      include_keywords,
      include_competitor_analysis,
      max_sources,
      allowed_domains,
      excluded_domains
    });

    res.json({
      success: true,
      data: research,
      creditsUsed: researchCost
    });
  } catch (error) {
    logger.error('Content research error:', error);
    res.status(500).json({
      error: 'Failed to research topic',
      details: error.message
    });
  }
});

// GET /api/content/research/:id - Get saved research
router.get('/research/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const research = await researchService.getResearch(id);
    
    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }

    res.json({
      success: true,
      data: research
    });
  } catch (error) {
    logger.error('Failed to fetch research:', error);
    res.status(500).json({ error: 'Failed to fetch research' });
  }
});

// POST /api/content/research/fact-check - Fact-check content
router.post('/research/fact-check', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const { content, research_id } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Get research if research_id provided
    let research = null;
    if (research_id) {
      research = await researchService.getResearch(research_id);
      if (!research) {
        return res.status(404).json({ error: 'Research not found' });
      }
      research = research.research_data;
    }

    // Perform fact-check
    const factCheck = await researchService.factCheckContent(content, research || {});

    res.json({
      success: true,
      data: factCheck
    });
  } catch (error) {
    logger.error('Fact-check error:', error);
    res.status(500).json({
      error: 'Failed to fact-check content',
      details: error.message
    });
  }
});

// ============================================
// CONTENT PERFORMANCE PREDICTION ROUTES
// ============================================

const ContentPerformanceService = require('../services/ContentPerformanceService');
const performanceService = new ContentPerformanceService();

// POST /api/content/predict - Predict content performance
router.post('/predict', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      content,
      agent_id = null,
      platform = 'twitter',
      content_type = 'tweet',
      hashtags = [],
      mentions = [],
      has_media = false,
      scheduled_time = null
    } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Extract hashtags and mentions from content if not provided
    const extractedHashtags = hashtags.length > 0 
      ? hashtags 
      : (content.match(/#\w+/g) || []).map(h => h.substring(1));
    const extractedMentions = mentions.length > 0
      ? mentions
      : (content.match(/@\w+/g) || []).map(m => m.substring(1));

    // Predict engagement
    const prediction = await performanceService.predictEngagement(content, {
      userId,
      agentId: agent_id,
      platform,
      content_type,
      hashtags: extractedHashtags,
      mentions: extractedMentions,
      has_media,
      scheduled_time
    });

    // Save prediction
    try {
      await performanceService.savePrediction({
        ...prediction,
        user_id: userId,
        agent_id: agent_id,
        content
      });
    } catch (saveError) {
      logger.error('Failed to save prediction:', saveError);
      // Don't fail the request
    }

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    logger.error('Performance prediction error:', error);
    res.status(500).json({
      error: 'Failed to predict content performance',
      details: error.message
    });
  }
});

// ============================================
// CONTENT REPURPOSING ROUTES
// ============================================

const ContentRepurposingService = require('../services/ContentRepurposingService');
const repurposingService = new ContentRepurposingService();

// POST /api/content/repurpose - Repurpose content to multiple formats
router.post('/repurpose', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      content,
      agent_id = null,
      source_format = 'blog_post',
      target_formats = ['twitter_thread', 'linkedin_post', 'instagram_carousel', 'youtube_script', 'newsletter'],
      include_quotes = true,
      include_hashtags = true
    } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Deduct credits for repurposing
    const repurposeCost = 50; // Repurposing costs 50 credits
    try {
      await creditService.deductCredits(userId, 'content_repurpose', repurposeCost);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: repurposeCost
      });
    }

    // Repurpose content
    const repurposed = await repurposingService.repurposeContent(content, {
      userId,
      agentId: agent_id,
      sourceFormat: source_format,
      targetFormats: target_formats,
      includeQuotes: include_quotes,
      includeHashtags: include_hashtags
    });

    res.json({
      success: true,
      data: repurposed,
      creditsUsed: repurposeCost
    });
  } catch (error) {
    logger.error('Content repurposing error:', error);
    res.status(500).json({
      error: 'Failed to repurpose content',
      details: error.message
    });
  }
});

// GET /api/content/repurpose/:id - Get repurposed content
router.get('/repurpose/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const repurposed = await repurposingService.getRepurposedContent(id, userId);

    if (!repurposed) {
      return res.status(404).json({ error: 'Repurposed content not found' });
    }

    res.json({
      success: true,
      data: repurposed
    });
  } catch (error) {
    logger.error('Failed to fetch repurposed content:', error);
    res.status(500).json({ error: 'Failed to fetch repurposed content' });
  }
});

// ============================================
// CONTENT OPTIMIZATION ASSISTANT ROUTES
// ============================================

const ContentOptimizationService = require('../services/ContentOptimizationService');
const optimizationService = new ContentOptimizationService();

// POST /api/content/optimize - Analyze and optimize content
router.post('/optimize', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      content,
      platform = 'twitter',
      content_type = 'tweet',
      agent_id = null
    } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Analyze content
    const analysis = await optimizationService.analyzeContent(content, {
      platform,
      content_type,
      userId,
      agentId: agent_id
    });

    // Get tone consistency if agent is provided
    if (agent_id) {
      try {
        const toneAnalysis = await optimizationService.analyzeToneConsistency(content, agent_id);
        analysis.tone_consistency = toneAnalysis;
      } catch (error) {
        logger.debug('[ContentOptimization] Tone analysis failed:', error);
      }
    }

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Content optimization error:', error);
    res.status(500).json({
      error: 'Failed to analyze content',
      details: error.message
    });
  }
});

// ============================================
// CONTENT BRIEF GENERATOR ROUTES
// ============================================

let ContentBriefService;
let briefService;
try {
  ContentBriefService = require('../services/ContentBriefService');
  briefService = new ContentBriefService();
  logger.info('ContentBriefService initialized successfully');
} catch (error) {
  logger.error('Failed to initialize ContentBriefService:', error);
  logger.error('ContentBriefService error details:', error.stack);
  briefService = null;
  ContentBriefService = null;
}

// POST /api/content/brief - Generate content brief
router.post('/brief', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      topic,
      platform = 'twitter',
      content_type = 'tweet',
      target_audience = null,
      goals = [],
      agent_id = null,
      save = false
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Generate brief
    const brief = await briefService.generateBrief(topic, {
      platform,
      content_type,
      target_audience,
      goals,
      userId,
      agentId: agent_id
    });

    // Save brief if requested
    if (save) {
      try {
        await briefService.saveBrief(userId, {
          ...brief,
          agent_id
        });
      } catch (saveError) {
        logger.warn('[ContentBrief] Failed to save brief:', saveError);
        // Don't fail the request if save fails
      }
    }

    res.json({
      success: true,
      data: brief
    });
  } catch (error) {
    logger.error('Content brief generation error:', error);
    res.status(500).json({
      error: 'Failed to generate content brief',
      details: error.message
    });
  }
});

// GET /api/content/brief - Get user's saved briefs
router.get('/brief', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    if (!briefService) {
      logger.error('ContentBriefService not initialized');
      return res.status(500).json({ error: 'Service not available' });
    }

    const briefs = await briefService.getUserBriefs(userId, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: briefs
    });
  } catch (error) {
    logger.error('Failed to fetch content briefs:', error);
    res.status(500).json({
      error: 'Failed to fetch content briefs',
      details: error.message
    });
  }
});

// GET /api/content/brief/:id - Get specific brief
router.get('/brief/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const brief = await briefService.getBriefById(id, userId);

    if (!brief) {
      return res.status(404).json({ error: 'Content brief not found' });
    }

    res.json({
      success: true,
      data: brief
    });
  } catch (error) {
    logger.error('Failed to fetch content brief:', error);
    res.status(500).json({
      error: 'Failed to fetch content brief',
      details: error.message
    });
  }
});

// ============================================
// EBOOK PROJECT ROUTES
// ============================================

const EBookProjectService = require('../services/EBookProjectService');

// POST /api/content/ebook/projects - Create new eBook project
router.post('/ebook/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const project = await EBookProjectService.createProject(userId, req.body);

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Failed to create eBook project:', error);
    res.status(500).json({
      error: 'Failed to create eBook project',
      details: error.message
    });
  }
});

// GET /api/content/ebook/projects - List user's eBook projects
router.get('/ebook/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      status,
      genre,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const result = await EBookProjectService.listProjects(userId, {
      status: status || null,
      genre: genre || null,
      search: search || null,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to list eBook projects:', error);
    res.status(500).json({
      error: 'Failed to list eBook projects',
      details: error.message
    });
  }
});

// GET /api/content/ebook/projects/:id - Get specific eBook project
router.get('/ebook/projects/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const project = await EBookProjectService.getProject(id, userId);
    if (!project) {
      return res.status(404).json({
        error: 'eBook project not found'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Failed to get eBook project:', error);
    res.status(500).json({
      error: 'Failed to get eBook project',
      details: error.message
    });
  }
});

// GET /api/content/ebook/projects/share/:token - Get project by share token (public)
router.get('/ebook/projects/share/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const project = await EBookProjectService.getProjectByShareToken(token);
    if (!project) {
      return res.status(404).json({
        error: 'eBook project not found or not publicly shared'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Failed to get shared eBook project:', error);
    res.status(500).json({
      error: 'Failed to get shared eBook project',
      details: error.message
    });
  }
});

// GET /api/content/ebook/projects/share/:token/chapters - Get chapters for shared project (public)
router.get('/ebook/projects/share/:token/chapters', async (req, res) => {
  try {
    const { token } = req.params;

    // First verify the project exists and is shared
    const project = await EBookProjectService.getProjectByShareToken(token);
    if (!project) {
      return res.status(404).json({
        error: 'eBook project not found or not publicly shared'
      });
    }

    // Get chapters for this project (no user auth required for shared projects)
    const chapters = await EBookProjectService.getChapters(project.id, null);

    res.json({
      success: true,
      data: chapters
    });
  } catch (error) {
    logger.error('Failed to get shared eBook chapters:', error);
    res.status(500).json({
      error: 'Failed to get shared eBook chapters',
      details: error.message
    });
  }
});

// PUT /api/content/ebook/projects/:id - Update eBook project
router.put('/ebook/projects/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const project = await EBookProjectService.updateProject(id, userId, req.body);

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Failed to update eBook project:', error);
    if (error.message === 'Project not found or access denied') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to update eBook project',
      details: error.message
    });
  }
});

// DELETE /api/content/ebook/projects/:id - Delete eBook project
router.delete('/ebook/projects/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await EBookProjectService.deleteProject(id, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to delete eBook project:', error);
    if (error.message === 'Project not found or access denied') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to delete eBook project',
      details: error.message
    });
  }
});

// POST /api/content/ebook/projects/:id/clone - Clone eBook project
router.post('/ebook/projects/:id/clone', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { newTitle } = req.body;

    const project = await EBookProjectService.cloneProject(id, userId, newTitle);

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Failed to clone eBook project:', error);
    if (error.message === 'Project not found or access denied') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to clone eBook project',
      details: error.message
    });
  }
});

// ============================================
// EBOOK CHAPTER ROUTES
// ============================================

// POST /api/content/ebook/projects/:projectId/chapters - Create new chapter
router.post('/ebook/projects/:projectId/chapters', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;

    const chapter = await EBookProjectService.createChapter(projectId, userId, req.body);

    res.json({
      success: true,
      data: chapter
    });
  } catch (error) {
    logger.error('Failed to create chapter:', error);
    if (error.message === 'Project not found or access denied') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to create chapter',
      details: error.message
    });
  }
});

// GET /api/content/ebook/projects/:projectId/chapters - Get all chapters for a project
router.get('/ebook/projects/:projectId/chapters', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;

    const chapters = await EBookProjectService.getChapters(projectId, userId);

    res.json({
      success: true,
      data: chapters
    });
  } catch (error) {
    logger.error('Failed to get chapters:', error);
    if (error.message === 'Project not found or access denied') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to get chapters',
      details: error.message
    });
  }
});

// GET /api/content/ebook/chapters/:id - Get specific chapter
router.get('/ebook/chapters/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const chapter = await EBookProjectService.getChapter(id, userId);
    if (!chapter) {
      return res.status(404).json({
        error: 'Chapter not found'
      });
    }

    res.json({
      success: true,
      data: chapter
    });
  } catch (error) {
    logger.error('Failed to get chapter:', error);
    res.status(500).json({
      error: 'Failed to get chapter',
      details: error.message
    });
  }
});

// PUT /api/content/ebook/chapters/:id - Update chapter
router.put('/ebook/chapters/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const chapter = await EBookProjectService.updateChapter(id, userId, req.body);

    res.json({
      success: true,
      data: chapter
    });
  } catch (error) {
    logger.error('Failed to update chapter:', error);
    if (error.message === 'Chapter not found or access denied') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to update chapter',
      details: error.message
    });
  }
});

// DELETE /api/content/ebook/chapters/:id - Delete chapter
router.delete('/ebook/chapters/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await EBookProjectService.deleteChapter(id, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to delete chapter:', error);
    if (error.message === 'Chapter not found or access denied') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to delete chapter',
      details: error.message
    });
  }
});

// POST /api/content/ebook/projects/:projectId/chapters/reorder - Reorder chapters
router.post('/ebook/projects/:projectId/chapters/reorder', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;
    const { chapterOrders } = req.body; // Array of { chapterId, orderIndex }

    if (!Array.isArray(chapterOrders)) {
      return res.status(400).json({
        error: 'chapterOrders must be an array'
      });
    }

    const result = await EBookProjectService.reorderChapters(projectId, userId, chapterOrders);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to reorder chapters:', error);
    if (error.message === 'Project not found or access denied') {
      return res.status(404).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to reorder chapters',
      details: error.message
    });
  }
});

// ============================================
// EBOOK AI GENERATION ROUTES
// ============================================

const EBookAIContentServiceClass = require('../services/EBookAIContentService');
const EBookAIContentService = new EBookAIContentServiceClass();
// CreditService and creditService are already declared at the top of the file (lines 14, 28)
// ServicePricingService is already declared at the top of the file (line 19)
const pricingService = ServicePricingService;

// POST /api/content/ebook/projects/:id/generate-outline - Generate chapter outline
router.post('/ebook/projects/:id/generate-outline', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { numberOfChapters } = req.body;

    if (!numberOfChapters || numberOfChapters < 1) {
      return res.status(400).json({
        error: 'numberOfChapters is required and must be at least 1'
      });
    }

    // Get project
    const project = await EBookProjectService.getProject(id, userId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check credits
    const cost = await pricingService.getPricing('ebook_outline_generation') || 10;
    try {
      await creditService.deductCredits(userId, 'ebook_outline_generation', cost);
    } catch (creditErr) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditErr.message
      });
    }

    // Generate outline
    const outline = await EBookAIContentService.generateChapterOutline(project, numberOfChapters);

    // Save outline to project
    await database.query(
      `UPDATE ebook_projects 
       SET chapter_outline = $1, number_of_chapters = $2, updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(outline), numberOfChapters, id]
    );

    res.json({
      success: true,
      data: {
        outline,
        creditsUsed: cost
      }
    });
  } catch (error) {
    logger.error('Failed to generate outline:', error);
    res.status(500).json({
      error: 'Failed to generate outline',
      details: error.message
    });
  }
});

// POST /api/content/ebook/projects/:id/generate-chapter - Generate single chapter
router.post('/ebook/projects/:id/generate-chapter', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { chapterNumber, chapterTitle, chapterDescription } = req.body;

    if (!chapterNumber || !chapterTitle) {
      return res.status(400).json({
        error: 'chapterNumber and chapterTitle are required'
      });
    }

    // Get project
    const project = await EBookProjectService.getProject(id, userId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Get previous chapters for context
    const existingChapters = await EBookProjectService.getChapters(id, userId);
    const previousChapters = existingChapters
      .filter(ch => ch.chapter_number < chapterNumber)
      .map(ch => ({
        number: ch.chapter_number,
        title: ch.title,
        content: ch.content.substring(0, 1000)
      }));

    // Calculate target word count
    let targetWordCount = 2000; // Default
    if (project.target_word_count) {
      if (project.word_count_type === 'total') {
        targetWordCount = Math.floor(project.target_word_count / (project.number_of_chapters || 1));
      } else {
        targetWordCount = project.target_word_count;
      }
    }

    // Check credits (15 credits per chapter as per original spec)
    const cost = await pricingService.getPricing('ebook_chapter_generation') || 15;
    try {
      await creditService.deductCredits(userId, 'ebook_chapter_generation', cost);
    } catch (creditErr) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditErr.message
      });
    }

    // Generate chapter content
    const content = await EBookAIContentService.generateChapterContent(
      project,
      chapterNumber,
      chapterTitle,
      chapterDescription || '',
      previousChapters,
      targetWordCount
    );

    // Create chapter in database
    const chapter = await EBookProjectService.createChapter(id, userId, {
      title: chapterTitle,
      content,
      chapterNumber
    });

    res.json({
      success: true,
      data: {
        chapter,
        creditsUsed: cost
      }
    });
  } catch (error) {
    logger.error('Failed to generate chapter:', error);
    res.status(500).json({
      error: 'Failed to generate chapter',
      details: error.message
    });
  }
});

// POST /api/content/ebook/projects/:id/generate-all-chapters - Generate all chapters
router.post('/ebook/projects/:id/generate-all-chapters', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get project
    const project = await EBookProjectService.getProject(id, userId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if outline exists
    let outline = project.chapter_outline;
    if (!outline) {
      return res.status(400).json({
        error: 'Chapter outline is required. Please generate an outline first.'
      });
    }

    // Parse outline if it's a string
    if (typeof outline === 'string') {
      try {
        outline = JSON.parse(outline);
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid chapter outline format. Please regenerate the outline.'
        });
      }
    }

    if (!Array.isArray(outline) || outline.length === 0) {
      return res.status(400).json({
        error: 'Chapter outline is empty. Please generate an outline first.'
      });
    }
    const totalCost = outline.length * (await pricingService.getPricing('ebook_chapter_generation') || 15);

    // Check credits
    try {
      await creditService.deductCredits(userId, 'ebook_chapter_generation', totalCost);
    } catch (creditErr) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: `Need ${totalCost} credits to generate ${outline.length} chapters. ${creditErr.message}`
      });
    }

    // Update generation status
    await database.query(
      `UPDATE ebook_projects SET generation_status = 'generating', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Generate chapters asynchronously (in production, use a job queue)
    // For now, we'll do it synchronously but return immediately with a status
    EBookAIContentService.generateAllChapters(project, outline, async (progress) => {
      // Progress callback - could use WebSocket here for real-time updates
      logger.info(`Generation progress: ${progress.chapter}/${progress.total} - ${progress.message}`);
    })
      .then(async (generatedChapters) => {
        // Create all chapters in database
        for (const genChapter of generatedChapters) {
          await EBookProjectService.createChapter(id, userId, {
            title: genChapter.title,
            content: genChapter.content,
            chapterNumber: genChapter.chapterNumber
          });
        }

        // Update generation status
        await database.query(
          `UPDATE ebook_projects SET generation_status = 'completed', updated_at = NOW() WHERE id = $1`,
          [id]
        );

        logger.info(`Successfully generated ${generatedChapters.length} chapters for project ${id}`);
      })
      .catch(async (error) => {
        logger.error(`Failed to generate chapters for project ${id}:`, error);
        await database.query(
          `UPDATE ebook_projects SET generation_status = 'failed', updated_at = NOW() WHERE id = $1`,
          [id]
        );
      });

    // Return immediately with status
    res.json({
      success: true,
      data: {
        message: 'Chapter generation started',
        totalChapters: outline.length,
        estimatedCredits: totalCost,
        status: 'generating'
      }
    });
  } catch (error) {
    logger.error('Failed to start chapter generation:', error);
    res.status(500).json({
      error: 'Failed to start chapter generation',
      details: error.message
    });
  }
});

// GET /api/content/ebook/projects/:id/generation-status - Get generation status
router.get('/ebook/projects/:id/generation-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const project = await EBookProjectService.getProject(id, userId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const chapters = await EBookProjectService.getChapters(id, userId);

    res.json({
      success: true,
      data: {
        generationStatus: project.generation_status || 'not_started',
        totalChapters: project.number_of_chapters || 0,
        generatedChapters: chapters.length,
        outline: project.chapter_outline || null
      }
    });
  } catch (error) {
    logger.error('Failed to get generation status:', error);
    res.status(500).json({
      error: 'Failed to get generation status',
      details: error.message
    });
  }
});

// ============================================
// EBOOK IMPORT/EXPORT ROUTES
// ============================================

const EBookImportService = require('../services/EBookImportService');
const EBookExportService = require('../services/EBookExportService');

// Configure multer for eBook file uploads
const ebookMulter = require('multer');
const ebookUpload = ebookMulter({
  dest: path.join(__dirname, '../../uploads/ebook-imports'),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|doc|docx|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, and TXT files are allowed.'));
    }
  }
});

// Configure multer for eBook image uploads
const ebookImageUpload = ebookMulter({
  dest: path.join(__dirname, '../../uploads/ebook-images'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// POST /api/content/ebook/import/file - Import from uploaded file
router.post('/ebook/import/file', authenticateToken, requireTokenAccess, ebookUpload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let importedContent;
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    try {
      if (fileExtension === '.pdf') {
        importedContent = await EBookImportService.importFromPDF(filePath);
      } else if (fileExtension === '.doc' || fileExtension === '.docx') {
        importedContent = await EBookImportService.importFromWord(filePath);
      } else if (fileExtension === '.txt') {
        const textContent = fs.readFileSync(filePath, 'utf-8');
        importedContent = await EBookImportService.importFromText(textContent, req.file.originalname);
      } else {
        throw new Error('Unsupported file type');
      }

      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({
        success: true,
        data: importedContent
      });
    } catch (importError) {
      // Clean up on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw importError;
    }
  } catch (error) {
    logger.error('Failed to import file:', error);
    res.status(500).json({
      error: 'Failed to import file',
      details: error.message
    });
  }
});

// POST /api/content/ebook/import/url - Import from URL
router.post('/ebook/import/url', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const importedContent = await EBookImportService.importFromUrl(url);

    res.json({
      success: true,
      data: importedContent
    });
  } catch (error) {
    logger.error('Failed to import from URL:', error);
    res.status(500).json({
      error: 'Failed to import from URL',
      details: error.message
    });
  }
});

// POST /api/content/ebook/import/google-docs - Import from Google Docs
router.post('/ebook/import/google-docs', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Google Docs URL is required' });
    }

    const importedContent = await EBookImportService.importFromGoogleDocs(url);

    res.json({
      success: true,
      data: importedContent
    });
  } catch (error) {
    logger.error('Failed to import from Google Docs:', error);
    res.status(500).json({
      error: 'Failed to import from Google Docs',
      details: error.message
    });
  }
});

// POST /api/content/ebook/import - Import content from various sources (legacy endpoint)
router.post('/ebook/import', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { source, url, text, title } = req.body;

    let importedContent;

    switch (source) {
      case 'url':
        if (!url) {
          return res.status(400).json({ error: 'URL is required for URL import' });
        }
        importedContent = await EBookImportService.importFromUrl(url);
        break;

      case 'google_docs':
        if (!url) {
          return res.status(400).json({ error: 'Google Docs URL is required' });
        }
        importedContent = await EBookImportService.importFromGoogleDocs(url);
        break;

      case 'text':
        if (!text) {
          return res.status(400).json({ error: 'Text content is required' });
        }
        importedContent = await EBookImportService.importFromText(text, title);
        break;

      default:
        return res.status(400).json({ error: 'Invalid import source' });
    }

    res.json({
      success: true,
      data: importedContent
    });
  } catch (error) {
    logger.error('Failed to import content:', error);
    res.status(500).json({
      error: 'Failed to import content',
      details: error.message
    });
  }
});

// POST /api/content/ebook/projects/:id/export - Export eBook to various formats
router.post('/ebook/projects/:id/export', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { format, saveToDrive, folderId } = req.body;

    if (!format || !['pdf', 'epub', 'flipbook'].includes(format)) {
      return res.status(400).json({
        error: 'Invalid export format',
        details: 'Format must be one of: pdf, epub, flipbook'
      });
    }

    let result;

    switch (format) {
      case 'pdf':
        result = await EBookExportService.exportToPDF(id, userId);
        break;
      case 'epub':
        result = await EBookExportService.exportToEpub(id, userId);
        break;
      case 'flipbook':
        result = await EBookExportService.exportToFlipbook(id, userId);
        break;
    }

    // Optionally save to Google Drive
    if (saveToDrive && result.filePath) {
      try {
        const GoogleDriveService = require('../services/GoogleDriveService');
        const mimeTypes = {
          'pdf': 'application/pdf',
          'epub': 'application/epub+zip',
          'flipbook': 'text/html'
        };
        
        const driveResult = await GoogleDriveService.uploadFile(
          userId,
          result.filePath,
          result.fileName,
          mimeTypes[format] || 'application/octet-stream',
          folderId || null
        );
        
        result.driveFileId = driveResult.fileId;
        result.driveWebViewLink = driveResult.webViewLink;
        result.savedToDrive = true;
      } catch (driveError) {
        logger.error('Failed to save to Google Drive:', driveError);
        // Don't fail the export if Drive save fails
        result.driveError = driveError.message;
      }
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to export eBook:', error);
    res.status(500).json({
      error: 'Failed to export eBook',
      details: error.message
    });
  }
});

// GET /api/content/ebook/exports - Get export history
router.get('/ebook/exports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId, format, limit = 20 } = req.query;

    let query = `
      SELECT e.*, p.title as project_title
      FROM ebook_exports e
      JOIN ebook_projects p ON e.project_id = p.id
      WHERE e.user_id = $1
    `;
    const params = [userId];

    if (projectId) {
      query += ` AND e.project_id = $${params.length + 1}`;
      params.push(projectId);
    }

    if (format) {
      query += ` AND e.export_format = $${params.length + 1}`;
      params.push(format);
    }

    query += ` ORDER BY e.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const database = require('../database/connection');
    const result = await database.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch exports:', error);
    res.status(500).json({
      error: 'Failed to fetch exports',
      details: error.message
    });
  }
});

// ============================================
// EBOOK AUDIOBOOK ROUTES
// ============================================

const EBookAudiobookService = require('../services/EBookAudiobookService');

// POST /api/content/ebook/projects/:id/audiobook - Generate audiobook
router.post('/ebook/projects/:id/audiobook', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { voice, speed, regenerate } = req.body;

    const result = await EBookAudiobookService.generateAudiobook(id, userId, {
      voice: voice || 'alloy',
      speed: speed || 1.0,
      regenerate: regenerate || false
    });

    if (!result.success) {
      return res.status(402).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Failed to generate audiobook:', error);
    res.status(500).json({
      error: 'Failed to generate audiobook',
      details: error.message
    });
  }
});

// GET /api/content/ebook/projects/:id/audiobook - Get audiobook status
router.get('/ebook/projects/:id/audiobook', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const audiobooks = await EBookAudiobookService.getProjectAudiobooks(id, userId);

    res.json({
      success: true,
      data: audiobooks
    });
  } catch (error) {
    logger.error('Failed to get audiobook:', error);
    res.status(500).json({
      error: 'Failed to get audiobook',
      details: error.message
    });
  }
});

// ============================================
// EBOOK TRANSCRIPTION ROUTES
// ============================================

const EBookTranscriptionService = require('../services/EBookTranscriptionService');
const transcriptionMulter = require('multer');
const transcriptionUpload = transcriptionMulter({ dest: 'uploads/transcriptions/' });

// POST /api/content/ebook/transcribe - Transcribe file
router.post('/ebook/transcribe', authenticateToken, requireTokenAccess, transcriptionUpload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const { language, prompt, model } = req.body;

    const result = await EBookTranscriptionService.transcribeFile(userId, req.file.path, {
      language,
      prompt,
      model: model || 'whisper-1'
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to transcribe file:', error);
    res.status(500).json({
      error: 'Failed to transcribe file',
      details: error.message
    });
  }
});

// POST /api/content/ebook/transcribe/url - Transcribe from URL
router.post('/ebook/transcribe/url', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url, language, prompt, model } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    const result = await EBookTranscriptionService.transcribeFromUrl(userId, url, {
      language,
      prompt,
      model: model || 'whisper-1'
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to transcribe from URL:', error);
    res.status(500).json({
      error: 'Failed to transcribe from URL',
      details: error.message
    });
  }
});

// GET /api/content/ebook/transcriptions - Get transcription history
router.get('/ebook/transcriptions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const transcriptions = await EBookTranscriptionService.getUserTranscriptions(userId, parseInt(limit));

    res.json({
      success: true,
      data: transcriptions
    });
  } catch (error) {
    logger.error('Failed to get transcriptions:', error);
    res.status(500).json({
      error: 'Failed to get transcriptions',
      details: error.message
    });
  }
});

// GET /api/content/ebook/transcriptions/:id - Get specific transcription
router.get('/ebook/transcriptions/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const transcription = await EBookTranscriptionService.getTranscription(id, userId);

    if (!transcription) {
      return res.status(404).json({
        error: 'Transcription not found'
      });
    }

    res.json({
      success: true,
      data: transcription
    });
  } catch (error) {
    logger.error('Failed to get transcription:', error);
    res.status(500).json({
      error: 'Failed to get transcription',
      details: error.message
    });
  }
});

// ============================================
// EBOOK COVER DESIGN ROUTES
// ============================================

const EBookCoverService = require('../services/EBookCoverService');

// POST /api/content/ebook/projects/:id/cover - Generate cover
router.post('/ebook/projects/:id/cover', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const options = req.body;

    const result = await EBookCoverService.generateCover(id, userId, options);

    res.json(result);
  } catch (error) {
    logger.error('Failed to generate cover:', error);
    if (error.message.includes('Insufficient credits')) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to generate cover',
      details: error.message
    });
  }
});

// GET /api/content/ebook/projects/:id/covers - Get project covers
router.get('/ebook/projects/:id/covers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const covers = await EBookCoverService.getProjectCovers(id, userId);

    res.json({
      success: true,
      data: covers
    });
  } catch (error) {
    logger.error('Failed to get covers:', error);
    res.status(500).json({
      error: 'Failed to get covers',
      details: error.message
    });
  }
});

// GET /api/content/ebook/cover-templates - Get cover templates
router.get('/ebook/cover-templates', authenticateToken, async (req, res) => {
  try {
    const templates = EBookCoverService.getCoverTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Failed to get cover templates:', error);
    res.status(500).json({
      error: 'Failed to get cover templates',
      details: error.message
    });
  }
});

// ============================================
// EBOOK TOC & PAGE NUMBERING ROUTES
// ============================================

let EBookTOCService;
try {
  EBookTOCService = require('../services/EBookTOCService');
} catch (e) {
  logger.error('Failed to load EBookTOCService:', e);
  EBookTOCService = null;
}

// GET /api/content/ebook/projects/:id/toc - Generate table of contents
router.get('/ebook/projects/:id/toc', authenticateToken, async (req, res) => {
  try {
    if (!EBookTOCService) {
      return res.status(503).json({
        error: 'TOC service not available',
        details: 'EBookTOCService module not loaded'
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const options = req.query;

    const result = await EBookTOCService.generateTOC(id, userId, options);

    res.json(result);
  } catch (error) {
    logger.error('Failed to generate TOC:', error);
    res.status(500).json({
      error: 'Failed to generate TOC',
      details: error.message
    });
  }
});

// POST /api/content/ebook/projects/:id/toc - Generate table of contents (with body params)
// Rate limiting: Store last request time per user to prevent spam
const tocRequestTimes = new Map();

router.post('/ebook/projects/:id/toc', authenticateToken, async (req, res) => {
  try {
    if (!EBookTOCService) {
      return res.status(503).json({
        error: 'TOC service not available',
        details: 'EBookTOCService module not loaded'
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    
    // Rate limiting: Max 1 request per second per user
    const now = Date.now();
    const lastRequest = tocRequestTimes.get(userId) || 0;
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < 1000) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please wait a moment before generating another TOC preview',
        retryAfter: Math.ceil((1000 - timeSinceLastRequest) / 1000)
      });
    }
    
    tocRequestTimes.set(userId, now);
    
    // Clean up old entries (older than 1 minute)
    if (tocRequestTimes.size > 1000) {
      const oneMinuteAgo = now - 60000;
      for (const [uid, time] of tocRequestTimes.entries()) {
        if (time < oneMinuteAgo) {
          tocRequestTimes.delete(uid);
        }
      }
    }

    const options = req.body; // Use body instead of query for POST

    const result = await EBookTOCService.generateTOC(id, userId, options);

    res.json(result);
  } catch (error) {
    logger.error('Failed to generate TOC:', error);
    if (error.message && error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Too many requests',
        details: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to generate TOC',
      details: error.message
    });
  }
});

// GET /api/content/ebook/projects/:id/full-book - Generate full book with TOC and page numbers
router.get('/ebook/projects/:id/full-book', authenticateToken, async (req, res) => {
  try {
    if (!EBookTOCService) {
      return res.status(503).json({
        error: 'TOC service not available',
        details: 'EBookTOCService module not loaded'
      });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const options = req.query;

    const result = await EBookTOCService.generateFullBook(id, userId, options);

    res.json(result);
  } catch (error) {
    logger.error('Failed to generate full book:', error);
    res.status(500).json({
      error: 'Failed to generate full book',
      details: error.message
    });
  }
});

// ============================================
// EBOOK PLATFORM INTEGRATION ROUTES
// ============================================

const EBookPlatformService = require('../services/EBookPlatformService');

// POST /api/content/ebook/projects/:id/platform/kindle - Prepare for Amazon Kindle
router.post('/ebook/projects/:id/platform/kindle', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const options = req.body;

    const result = await EBookPlatformService.prepareForKindle(id, userId, options);

    res.json(result);
  } catch (error) {
    logger.error('Failed to prepare for Kindle:', error);
    res.status(500).json({
      error: 'Failed to prepare for Kindle',
      details: error.message
    });
  }
});

// POST /api/content/ebook/projects/:id/platform/apple - Prepare for Apple Books
router.post('/ebook/projects/:id/platform/apple', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const options = req.body;

    const result = await EBookPlatformService.prepareForAppleBooks(id, userId, options);

    res.json(result);
  } catch (error) {
    logger.error('Failed to prepare for Apple Books:', error);
    res.status(500).json({
      error: 'Failed to prepare for Apple Books',
      details: error.message
    });
  }
});

// POST /api/content/ebook/projects/:id/platform/kobo - Prepare for Kobo
router.post('/ebook/projects/:id/platform/kobo', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const options = req.body;

    const result = await EBookPlatformService.prepareForKobo(id, userId, options);

    res.json(result);
  } catch (error) {
    logger.error('Failed to prepare for Kobo:', error);
    res.status(500).json({
      error: 'Failed to prepare for Kobo',
      details: error.message
    });
  }
});

// Debug: Log route registration
logger.info('Content routes registered: /multimodal/packages, /brief, /ebook, /ebook/cover, /ebook/toc, /ebook/platform');

// POST /api/content/ebook/upload-image - Upload image for eBook chapters
router.post('/ebook/upload-image', authenticateToken, requireTokenAccess, ebookImageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided'
      });
    }

    const userId = req.user.id;
    const file = req.file;
    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
    const finalPath = path.join(__dirname, '../../uploads/ebook-images', fileName);

    // Move file to final location
    fs.renameSync(file.path, finalPath);

    const imageUrl = `/api/uploads/ebook-images/${fileName}`;

    logger.info(`eBook image uploaded: ${fileName} by user ${userId}`);

    res.json({
      success: true,
      url: imageUrl,
      fileName: fileName
    });
  } catch (error) {
    logger.error('Failed to upload eBook image:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      details: error.message
    });
  }
});

// GET /api/content/ebook/templates - Get all page templates
router.get('/ebook/templates', authenticateToken, async (req, res) => {
  try {
    const { category, layout_type } = req.query;
    
    let query = 'SELECT * FROM ebook_page_templates WHERE is_active = TRUE';
    const params = [];
    
    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }
    
    if (layout_type) {
      query += ` AND layout_type = $${params.length + 1}`;
      params.push(layout_type);
    }
    
    query += ' ORDER BY category, name';
    
    const result = await database.query(query, params);
    
    res.json({
      success: true,
      templates: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch templates:', error);
    res.status(500).json({
      error: 'Failed to fetch templates',
      details: error.message
    });
  }
});

// GET /api/content/ebook/templates/:id - Get specific template
router.get('/ebook/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await database.query(
      'SELECT * FROM ebook_page_templates WHERE id = $1 AND is_active = TRUE',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      template: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch template:', error);
    res.status(500).json({
      error: 'Failed to fetch template',
      details: error.message
    });
  }
});

module.exports = router;
