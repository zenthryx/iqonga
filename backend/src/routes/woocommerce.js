const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const aiContentService = require('../services/AIContentService'); // Already an instance
const CreditService = require('../services/CreditService');
const { v4: uuidv4 } = require('uuid');

// Lazy initialization of services (only when needed)
let creditService = null;
let voiceService = null;

function getCreditService() {
  if (!creditService) {
    creditService = new CreditService();
  }
  return creditService;
}

function getVoiceService() {
  if (!voiceService) {
    const VoiceService = require('../services/VoiceService');
    voiceService = new VoiceService();
  }
  return voiceService;
}

// Helper function to get personality prompt
function getPersonalityPrompt(personalityType) {
  return aiContentService.getPersonalityPrompt(personalityType);
}

/**
 * POST /api/woocommerce/chat
 * Shopping assistant chat endpoint
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, context, context_data, agent_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Deduct credits for chat interaction
    const chatId = uuidv4();
    const creditCost = 10; // Lower cost for chat interactions
    
    try {
      await getCreditService().deductCredits(userId, 'woocommerce_chat', creditCost, chatId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Get agent if provided
    let agent = null;
    if (agent_id) {
      try {
        const agentResult = await database.query(
          'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
          [agent_id, userId]
        );
        if (agentResult.rows.length > 0) {
          agent = agentResult.rows[0];
        }
      } catch (agentError) {
        logger.warn(`Failed to fetch agent ${agent_id}:`, agentError);
      }
    }

    // Get company data for context
    const companyData = await aiContentService.getCompanyData(userId);
    
    // Build context prompt
    let contextPrompt = '';
    if (context_data) {
      if (context_data.product) {
        contextPrompt += `\n\nPRODUCT CONTEXT:\n`;
        contextPrompt += `Product Name: ${context_data.product.name || 'N/A'}\n`;
        contextPrompt += `Description: ${context_data.product.description || context_data.product.short_description || 'N/A'}\n`;
        contextPrompt += `Price: ${context_data.product.price || 'N/A'}\n`;
        if (context_data.product.categories && context_data.product.categories.length > 0) {
          contextPrompt += `Categories: ${context_data.product.categories.join(', ')}\n`;
        }
        if (context_data.product.attributes) {
          contextPrompt += `Attributes: ${JSON.stringify(context_data.product.attributes)}\n`;
        }
      }
      
      if (context_data.cart) {
        contextPrompt += `\n\nCART CONTEXT:\n`;
        contextPrompt += `Items in cart: ${context_data.cart.item_count || 0}\n`;
        contextPrompt += `Cart total: ${context_data.cart.total || 'N/A'}\n`;
        if (context_data.cart.items && context_data.cart.items.length > 0) {
          contextPrompt += `Items: ${context_data.cart.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}\n`;
        }
      }
      
      if (context_data.purchase_history && context_data.purchase_history.length > 0) {
        contextPrompt += `\n\nPURCHASE HISTORY:\n`;
        contextPrompt += `Previously purchased: ${context_data.purchase_history.map(item => item.name).join(', ')}\n`;
      }

      // Add order context if customer is asking about orders
      if (context_data.customer_email || context_data.customer_id) {
        try {
          // Get user's WooCommerce store
          const storeResult = await database.query(
            'SELECT id FROM woocommerce_stores WHERE user_id = $1 AND is_active = true LIMIT 1',
            [userId]
          );

          if (storeResult.rows.length > 0) {
            const storeId = storeResult.rows[0].id;
            
            // Get recent orders for this customer
            let customerQuery = `
              SELECT wo.* FROM woocommerce_orders wo
              WHERE wo.woocommerce_store_id = $1
            `;
            const customerParams = [storeId];
            
            if (context_data.customer_email) {
              customerQuery += ` AND wo.customer_email = $2`;
              customerParams.push(context_data.customer_email);
            } else if (context_data.customer_id) {
              // Try to find customer by WooCommerce customer ID
              const customerResult = await database.query(
                'SELECT id FROM woocommerce_customers WHERE woocommerce_store_id = $1 AND woocommerce_customer_id = $2',
                [storeId, context_data.customer_id]
              );
              if (customerResult.rows.length > 0) {
                customerQuery += ` AND wo.woocommerce_customer_id = $2::uuid`;
                customerParams.push(customerResult.rows[0].id);
              }
            }

            customerQuery += ` ORDER BY wo.date_created DESC LIMIT 10`;
            
            const ordersResult = await database.query(customerQuery, customerParams);
            
            if (ordersResult.rows.length > 0) {
              contextPrompt += `\n\nCUSTOMER ORDER HISTORY:\n`;
              ordersResult.rows.forEach((order, index) => {
                contextPrompt += `Order #${order.order_number || order.woocommerce_order_id}:\n`;
                contextPrompt += `  Status: ${order.status}\n`;
                contextPrompt += `  Total: ${order.currency} ${order.total}\n`;
                contextPrompt += `  Date: ${order.date_created ? new Date(order.date_created).toLocaleDateString() : 'N/A'}\n`;
                if (order.line_items && Array.isArray(order.line_items)) {
                  const items = order.line_items.map((item) => 
                    `${item.name || 'Item'} (x${item.quantity || 1})`
                  ).join(', ');
                  contextPrompt += `  Items: ${items}\n`;
                }
                if (order.shipping_address) {
                  const shipping = typeof order.shipping_address === 'string' 
                    ? JSON.parse(order.shipping_address) 
                    : order.shipping_address;
                  if (shipping.city && shipping.country) {
                    contextPrompt += `  Shipping: ${shipping.city}, ${shipping.country}\n`;
                  }
                }
                contextPrompt += `\n`;
              });
            }
          }
        } catch (orderError) {
          logger.warn('Error fetching order context:', orderError);
          // Continue without order context if there's an error
        }
      }
    }

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
      
      // Add products/services context
      if (companyData.products && companyData.products.length > 0) {
        companyContext += `\nAvailable Products/Services:\n`;
        companyData.products.forEach(product => {
          companyContext += `- ${product.name}: ${product.description || 'N/A'}\n`;
        });
      }
    }

    // Build personality context if agent provided
    let personalityContext = '';
    if (agent) {
      const personalityPrompt = getPersonalityPrompt(agent.personality_type || 'custom');
      const voiceTone = agent.voice_tone || 'professional';
      personalityContext = `\n\nAGENT PERSONALITY:\n${personalityPrompt}\nVoice Tone: ${voiceTone}\n`;
    }

    // Build the chat prompt
    const chatPrompt = `You are a helpful AI shopping assistant for an e-commerce store.${personalityContext}${companyContext}${contextPrompt}

Your role is to:
- Answer questions about products helpfully and accurately
- Provide product recommendations based on customer needs
- Help customers navigate the store
- Be friendly, professional, and sales-oriented without being pushy
- Use the product and cart context provided to give relevant answers

Customer Question: ${message}

Please provide a helpful, concise response. If you can recommend products, include them in your response.`;

    // Generate response using AI
    let aiResponse;
    try {
      // Use OpenAI by default (can be extended to support Gemini if needed)
      aiResponse = await aiContentService.generateWithOpenAI(chatPrompt, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500
      });
    } catch (aiError) {
      logger.error('AI generation error:', aiError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate response',
        details: aiError.message
      });
    }

    // Extract recommendations if mentioned in response
    const recommendations = [];
    // Simple extraction - in production, you might want more sophisticated parsing
    // For now, we'll return the response and let the frontend handle recommendations separately

    // Check if voice response is requested (from voice chat)
    const isVoiceRequest = req.body.voice_request === true || req.headers['x-voice-request'] === 'true';
    let audioResponse = null;

    if (isVoiceRequest) {
      try {
        const voiceSvc = getVoiceService();
        const ttsResult = await voiceSvc.textToSpeech(aiResponse, {
          model: 'tts-1',
          voice: 'alloy',
          format: 'mp3'
        });
        // Convert buffer to base64
        audioResponse = ttsResult.audioBuffer.toString('base64');
      } catch (ttsError) {
        logger.error('Text-to-speech error:', ttsError);
        // Continue without audio if TTS fails
      }
    }

    res.json({
      success: true,
      data: {
        response: aiResponse,
        recommendations: recommendations,
        audio: audioResponse // Base64 encoded MP3 audio
      }
    });

  } catch (error) {
    logger.error('WooCommerce chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

/**
 * POST /api/woocommerce/recommendations
 * Get product recommendations based on context
 */
router.post('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product, cart_items, purchase_history, user_id } = req.body;

    // Get company products for recommendations
    const companyData = await getAIContentService().getCompanyData(userId);
    
    // Build recommendation context
    let contextPrompt = 'Based on the following information, recommend 3-5 relevant products:\n\n';
    
    if (product) {
      contextPrompt += `Current Product:\n`;
      contextPrompt += `- Name: ${product.name || 'N/A'}\n`;
      contextPrompt += `- Categories: ${(product.categories || []).join(', ') || 'N/A'}\n`;
      contextPrompt += `- Tags: ${(product.tags || []).join(', ') || 'N/A'}\n`;
    }
    
    if (cart_items && cart_items.length > 0) {
      contextPrompt += `\nItems in Cart:\n`;
      cart_items.forEach(item => {
        contextPrompt += `- ${item.name}\n`;
      });
    }
    
    if (purchase_history && purchase_history.length > 0) {
      contextPrompt += `\nPurchase History:\n`;
      purchase_history.forEach(item => {
        contextPrompt += `- ${item.name}\n`;
      });
    }
    
    if (companyData && companyData.products && companyData.products.length > 0) {
      contextPrompt += `\n\nAvailable Products:\n`;
      companyData.products.forEach(prod => {
        contextPrompt += `- ${prod.name}: ${prod.description || prod.category || 'N/A'}\n`;
      });
    }

    contextPrompt += `\n\nProvide product recommendations as a JSON array with: id, name, url, reason.`;

    // Generate recommendations using AI
    let recommendationsText;
    try {
      recommendationsText = await aiContentService.generateWithOpenAI(contextPrompt, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500
      });
    } catch (aiError) {
      logger.error('AI recommendation error:', aiError);
      // Fallback: return empty recommendations
      return res.json({
        success: true,
        data: {
          recommendations: []
        }
      });
    }

    // Parse recommendations from AI response
    // Try to extract JSON from response
    let recommendations = [];
    try {
      // Try to find JSON array in response
      const jsonMatch = recommendationsText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create simple recommendations from company products
        if (companyData && companyData.products) {
          recommendations = companyData.products.slice(0, 5).map(prod => ({
            id: prod.id || prod.name,
            name: prod.name,
            url: '#',
            reason: 'Recommended based on your interests'
          }));
        }
      }
    } catch (parseError) {
      logger.warn('Failed to parse recommendations:', parseError);
      // Fallback to company products
      if (companyData && companyData.products) {
        recommendations = companyData.products.slice(0, 5).map(prod => ({
          id: prod.id,
          name: prod.name,
          url: '#',
          reason: 'Recommended product'
        }));
      }
    }

    res.json({
      success: true,
      data: {
        recommendations: recommendations
      }
    });

  } catch (error) {
    logger.error('WooCommerce recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
      details: error.message
    });
  }
});

/**
 * POST /api/woocommerce/generate-description
 * Generate product description using AI
 */
router.post('/generate-description', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product, type = 'description' } = req.body;

    if (!product || !product.name) {
      return res.status(400).json({
        success: false,
        error: 'Product data is required'
      });
    }

    // Deduct credits
    const generationId = uuidv4();
    const creditCost = 30; // Cost for product description generation
    
    try {
      await getCreditService().deductCredits(userId, 'product_description_generation', creditCost, generationId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Get company data for context
    const companyData = await aiContentService.getCompanyData(userId);

    // Build product description prompt
    let descriptionPrompt = `Generate a compelling product description for an e-commerce store.\n\n`;
    
    if (companyData && companyData.company) {
      const company = companyData.company;
      descriptionPrompt += `COMPANY INFORMATION:\n`;
      descriptionPrompt += `Company Name: ${company.company_name || 'N/A'}\n`;
      descriptionPrompt += `Brand Voice: ${company.brand_voice || 'Professional'}\n`;
      if (company.company_description) {
        descriptionPrompt += `Company Description: ${company.company_description}\n`;
      }
      descriptionPrompt += `\n`;
    }

    descriptionPrompt += `PRODUCT INFORMATION:\n`;
    descriptionPrompt += `Product Name: ${product.name}\n`;
    if (product.sku) {
      descriptionPrompt += `SKU: ${product.sku}\n`;
    }
    if (product.categories && product.categories.length > 0) {
      descriptionPrompt += `Categories: ${product.categories.join(', ')}\n`;
    }
    if (product.tags && product.tags.length > 0) {
      descriptionPrompt += `Tags: ${product.tags.join(', ')}\n`;
    }
    if (product.price) {
      descriptionPrompt += `Price: ${product.price}\n`;
    }
    if (product.attributes && Object.keys(product.attributes).length > 0) {
      descriptionPrompt += `Attributes:\n`;
      Object.entries(product.attributes).forEach(([key, values]) => {
        descriptionPrompt += `- ${key}: ${Array.isArray(values) ? values.join(', ') : values}\n`;
      });
    }
    if (product.short_description) {
      descriptionPrompt += `Current Short Description: ${product.short_description}\n`;
    }

    if (type === 'short_description') {
      descriptionPrompt += `\n\nGenerate a SHORT product description (2-3 sentences, max 150 words) that:\n`;
      descriptionPrompt += `- Highlights key features and benefits\n`;
      descriptionPrompt += `- Is engaging and sales-oriented\n`;
      descriptionPrompt += `- Matches the company's brand voice\n`;
      descriptionPrompt += `- Is suitable for product listings and previews\n`;
    } else {
      descriptionPrompt += `\n\nGenerate a COMPREHENSIVE product description (300-500 words) that:\n`;
      descriptionPrompt += `- Provides detailed product information\n`;
      descriptionPrompt += `- Highlights key features and benefits\n`;
      descriptionPrompt += `- Uses persuasive, sales-oriented language\n`;
      descriptionPrompt += `- Matches the company's brand voice\n`;
      descriptionPrompt += `- Includes relevant keywords for SEO\n`;
      descriptionPrompt += `- Is well-structured with paragraphs\n`;
    }

    descriptionPrompt += `\n\nReturn ONLY the product description text, no titles or labels.`;

    // Generate description
    let description;
    try {
      description = await aiContentService.generateWithOpenAI(descriptionPrompt, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: type === 'short_description' ? 200 : 800
      });
      
      // Clean up the response (remove any labels or headers)
      description = description.replace(/^(Product Description|Description|Short Description):\s*/i, '').trim();
    } catch (aiError) {
      logger.error('AI description generation error:', aiError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate description',
        details: aiError.message
      });
    }

    // Return appropriate description based on type
    if (type === 'short_description') {
      res.json({
        success: true,
        data: {
          short_description: description,
          description: description // Also provide as full description
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          description: description,
          short_description: description.split('\n')[0] // Use first paragraph as short description
        }
      });
    }

  } catch (error) {
    logger.error('WooCommerce description generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate product description',
      details: error.message
    });
  }
});

/**
 * POST /api/woocommerce/sync-products
Sync WooCommerce products to Iqonga company knowledge base
 */
router.post('/sync-products', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { products } = req.body;

    logger.info('WooCommerce sync request received', {
      userId,
      hasProducts: !!products,
      productsType: typeof products,
      isArray: Array.isArray(products),
      productsLength: Array.isArray(products) ? products.length : 'N/A',
      bodyKeys: Object.keys(req.body || {})
    });

    if (!products) {
      return res.status(400).json({
        success: false,
        data: 'Products array is required',
        error: 'Products array is required'
      });
    }

    if (!Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        data: 'Products must be an array',
        error: 'Products must be an array'
      });
    }

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        data: 'No products to sync. Please ensure you have published products in WooCommerce.',
        error: 'No products to sync'
      });
    }

    // Get or create company profile
    let profileResult = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [userId]
    );

    let profileId;
    if (profileResult.rows.length === 0) {
      // Create company profile if it doesn't exist
      const insertResult = await database.query(
        `INSERT INTO company_profiles (user_id, company_name, company_description, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [userId, 'WooCommerce Store', 'Products synced from WooCommerce']
      );
      profileId = insertResult.rows[0].id;
    } else {
      profileId = profileResult.rows[0].id;
    }

    // Sync products to company_products table
    let syncedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;

    for (const product of products) {
      try {
        // Check if product already exists (by name only, since metadata column doesn't exist)
        const existingResult = await database.query(
          `SELECT id FROM company_products 
           WHERE company_profile_id = $1 
           AND name = $2`,
          [profileId, product.name]
        );

        // Convert product attributes to PostgreSQL array format for key_features
        let keyFeaturesArray = null;
        if (product.attributes) {
          if (Array.isArray(product.attributes)) {
            keyFeaturesArray = product.attributes;
          } else if (typeof product.attributes === 'object') {
            // Convert object to array of "key: value" strings
            keyFeaturesArray = Object.entries(product.attributes).map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
              }
              return `${key}: ${value}`;
            });
          } else {
            keyFeaturesArray = [String(product.attributes)];
          }
        }

        // Map product tags to benefits (if tags exist)
        const benefitsArray = product.tags && Array.isArray(product.tags) && product.tags.length > 0
          ? product.tags
          : null;

        // Map product categories to target_customers (use all categories, not just first)
        const targetCustomers = product.categories && Array.isArray(product.categories) && product.categories.length > 0
          ? product.categories.join(', ')
          : null;

        // Use product tags for use_cases if available
        const useCasesArray = product.tags && Array.isArray(product.tags) && product.tags.length > 0
          ? product.tags.map(tag => `Use case: ${tag}`)
          : null;

        // Build competitive advantages from price and categories
        const competitiveAdvantages = [];
        if (product.price) {
          competitiveAdvantages.push(`Competitive pricing: $${product.price}`);
        }
        if (product.sale_price && product.regular_price) {
          const discount = Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100);
          competitiveAdvantages.push(`Special discount: ${discount}% off`);
        }
        const competitiveAdvantagesArray = competitiveAdvantages.length > 0 ? competitiveAdvantages : null;

        if (existingResult.rows.length > 0) {
          // Update existing product - try to include all available fields
          try {
            await database.query(
              `UPDATE company_products
               SET name = $1,
                   category = $2,
                   description = $3,
                   key_features = $4,
                   benefits = $5,
                   target_customers = $6,
                   use_cases = $7,
                   competitive_advantages = $8
               WHERE id = $9`,
              [
                product.name,
                (product.categories && product.categories.length > 0) ? product.categories[0] : 'General',
                product.description || product.short_description || '',
                keyFeaturesArray,
                benefitsArray,
                targetCustomers,
                useCasesArray,
                competitiveAdvantagesArray,
                existingResult.rows[0].id
              ]
            );
          } catch (updateErr) {
            // Fallback to basic fields if extended fields don't exist
            if (updateErr.message && (updateErr.message.includes('benefits') || updateErr.message.includes('target_customers'))) {
              await database.query(
                `UPDATE company_products
                 SET name = $1,
                     category = $2,
                     description = $3,
                     key_features = $4
                 WHERE id = $5`,
                [
                  product.name,
                  (product.categories && product.categories.length > 0) ? product.categories[0] : 'General',
                  product.description || product.short_description || '',
                  keyFeaturesArray,
                  existingResult.rows[0].id
                ]
              );
            } else {
              throw updateErr;
            }
          }
          updatedCount++;
        } else {
          // Create new product - try to include all available fields
          try {
            await database.query(
              `INSERT INTO company_products
               (company_profile_id, name, category, description, key_features, benefits, target_customers, use_cases, competitive_advantages, status, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW())`,
              [
                profileId,
                product.name,
                (product.categories && product.categories.length > 0) ? product.categories[0] : 'General',
                product.description || product.short_description || '',
                keyFeaturesArray,
                benefitsArray,
                targetCustomers,
                useCasesArray,
                competitiveAdvantagesArray
              ]
            );
          } catch (insertErr) {
            // Fallback to basic fields if extended fields don't exist
            if (insertErr.message && (insertErr.message.includes('benefits') || insertErr.message.includes('target_customers'))) {
              await database.query(
                `INSERT INTO company_products
                 (company_profile_id, name, category, description, key_features, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, 'active', NOW())`,
                [
                  profileId,
                  product.name,
                  (product.categories && product.categories.length > 0) ? product.categories[0] : 'General',
                  product.description || product.short_description || '',
                  keyFeaturesArray
                ]
              );
            } else {
              throw insertErr;
            }
          }
          createdCount++;
        }
        syncedCount++;
      } catch (productError) {
        logger.error(`Error syncing product ${product.id}:`, productError);
        // Continue with next product
      }
    }

    logger.info(`Synced ${syncedCount} products for user ${userId} (${createdCount} created, ${updatedCount} updated)`);

    res.json({
      success: true,
      data: {
        synced_count: syncedCount,
        created_count: createdCount,
        updated_count: updatedCount,
        message: `Successfully synced ${syncedCount} products to Iqonga (${createdCount} created, ${updatedCount} updated).`
      }
    });

  } catch (error) {
    logger.error('WooCommerce product sync error:', error);
    res.status(500).json({
      success: false,
      data: error.message || 'Failed to sync products',
      error: 'Failed to sync products',
      details: error.message
    });
  }
});

/**
 * POST /api/woocommerce/sync-orders
Sync WooCommerce orders to Iqonga for order management
 */
router.post('/sync-orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orders, store_url, store_name } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        error: 'Orders array is required'
      });
    }

    if (!store_url) {
      return res.status(400).json({
        success: false,
        error: 'Store URL is required'
      });
    }

    // Get or create company profile
    let profileResult = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [userId]
    );

    let profileId = null;
    if (profileResult.rows.length > 0) {
      profileId = profileResult.rows[0].id;
    }

    // Get or create WooCommerce store record
    let storeResult = await database.query(
      'SELECT id FROM woocommerce_stores WHERE user_id = $1 AND store_url = $2',
      [userId, store_url]
    );

    let storeId;
    if (storeResult.rows.length === 0) {
      const insertStoreResult = await database.query(
        `INSERT INTO woocommerce_stores (user_id, company_profile_id, store_url, store_name, last_sync_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
         RETURNING id`,
        [userId, profileId, store_url, store_name || 'WooCommerce Store']
      );
      storeId = insertStoreResult.rows[0].id;
    } else {
      storeId = storeResult.rows[0].id;
      // Update last sync time
      await database.query(
        'UPDATE woocommerce_stores SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1',
        [storeId]
      );
    }

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    // Process each order
    for (const order of orders) {
      try {
        // Check if order exists
        const existingOrder = await database.query(
          'SELECT id FROM woocommerce_orders WHERE woocommerce_store_id = $1 AND woocommerce_order_id = $2',
          [storeId, order.id]
        );

        // Get or create customer
        let customerId = null;
        if (order.customer_id) {
          let customerResult = await database.query(
            'SELECT id FROM woocommerce_customers WHERE woocommerce_store_id = $1 AND woocommerce_customer_id = $2',
            [storeId, order.customer_id]
          );

          if (customerResult.rows.length === 0) {
            // Create customer
            const customerInsert = await database.query(
              `INSERT INTO woocommerce_customers (
                woocommerce_store_id, woocommerce_customer_id, email, first_name, last_name,
                phone, total_spent, orders_count, date_created, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
              RETURNING id`,
              [
                storeId,
                order.customer_id,
                order.billing?.email || null,
                order.billing?.first_name || null,
                order.billing?.last_name || null,
                order.billing?.phone || null,
                parseFloat(order.total || 0),
                1,
                order.date_created ? new Date(order.date_created) : null
              ]
            );
            customerId = customerInsert.rows[0].id;
          } else {
            customerId = customerResult.rows[0].id;
            // Update customer stats
            await database.query(
              `UPDATE woocommerce_customers 
               SET orders_count = orders_count + 1,
                   total_spent = total_spent + $1,
                   updated_at = NOW()
               WHERE id = $2`,
              [parseFloat(order.total || 0), customerId]
            );
          }
        }

        // Prepare order data
        const orderData = {
          woocommerce_store_id: storeId,
          woocommerce_order_id: order.id,
          order_number: order.number || order.id.toString(),
          woocommerce_customer_id: customerId,
          customer_email: order.billing?.email || null,
          customer_first_name: order.billing?.first_name || null,
          customer_last_name: order.billing?.last_name || null,
          status: order.status || 'pending',
          currency: order.currency || 'USD',
          total: parseFloat(order.total || 0),
          subtotal: parseFloat(order.subtotal || 0),
          total_tax: parseFloat(order.total_tax || 0),
          shipping_total: parseFloat(order.shipping_total || 0),
          discount_total: parseFloat(order.discount_total || 0),
          payment_method: order.payment_method || null,
          payment_method_title: order.payment_method_title || null,
          date_created: order.date_created ? new Date(order.date_created) : null,
          date_modified: order.date_modified ? new Date(order.date_modified) : null,
          date_completed: order.date_completed ? new Date(order.date_completed) : null,
          billing_address: order.billing || null,
          shipping_address: order.shipping || null,
          line_items: order.line_items || [],
          shipping_lines: order.shipping_lines || [],
          fee_lines: order.fee_lines || [],
          coupon_lines: order.coupon_lines || [],
          metadata: order.meta_data || []
        };

        if (existingOrder.rows.length > 0) {
          // Update existing order
          await database.query(
            `UPDATE woocommerce_orders SET
              woocommerce_customer_id = $1,
              customer_email = $2,
              customer_first_name = $3,
              customer_last_name = $4,
              status = $5,
              currency = $6,
              total = $7,
              subtotal = $8,
              total_tax = $9,
              shipping_total = $10,
              discount_total = $11,
              payment_method = $12,
              payment_method_title = $13,
              date_modified = $14,
              date_completed = $15,
              billing_address = $16,
              shipping_address = $17,
              line_items = $18,
              shipping_lines = $19,
              fee_lines = $20,
              coupon_lines = $21,
              metadata = $22,
              updated_at = NOW()
            WHERE id = $23`,
            [
              orderData.woocommerce_customer_id,
              orderData.customer_email,
              orderData.customer_first_name,
              orderData.customer_last_name,
              orderData.status,
              orderData.currency,
              orderData.total,
              orderData.subtotal,
              orderData.total_tax,
              orderData.shipping_total,
              orderData.discount_total,
              orderData.payment_method,
              orderData.payment_method_title,
              orderData.date_modified,
              orderData.date_completed,
              JSON.stringify(orderData.billing_address),
              JSON.stringify(orderData.shipping_address),
              JSON.stringify(orderData.line_items),
              JSON.stringify(orderData.shipping_lines),
              JSON.stringify(orderData.fee_lines),
              JSON.stringify(orderData.coupon_lines),
              JSON.stringify(orderData.metadata),
              existingOrder.rows[0].id
            ]
          );
          updatedCount++;
        } else {
          // Create new order
          await database.query(
            `INSERT INTO woocommerce_orders (
              woocommerce_store_id, woocommerce_order_id, order_number, woocommerce_customer_id,
              customer_email, customer_first_name, customer_last_name, status, currency,
              total, subtotal, total_tax, shipping_total, discount_total,
              payment_method, payment_method_title, date_created, date_modified, date_completed,
              billing_address, shipping_address, line_items, shipping_lines, fee_lines,
              coupon_lines, metadata, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
              $20, $21, $22, $23, $24, $25, $26, NOW(), NOW()
            )`,
            [
              orderData.woocommerce_store_id,
              orderData.woocommerce_order_id,
              orderData.order_number,
              orderData.woocommerce_customer_id,
              orderData.customer_email,
              orderData.customer_first_name,
              orderData.customer_last_name,
              orderData.status,
              orderData.currency,
              orderData.total,
              orderData.subtotal,
              orderData.total_tax,
              orderData.shipping_total,
              orderData.discount_total,
              orderData.payment_method,
              orderData.payment_method_title,
              orderData.date_created,
              orderData.date_modified,
              orderData.date_completed,
              JSON.stringify(orderData.billing_address),
              JSON.stringify(orderData.shipping_address),
              JSON.stringify(orderData.line_items),
              JSON.stringify(orderData.shipping_lines),
              JSON.stringify(orderData.fee_lines),
              JSON.stringify(orderData.coupon_lines),
              JSON.stringify(orderData.metadata)
            ]
          );
          createdCount++;
        }
        syncedCount++;
      } catch (orderError) {
        logger.error(`Error syncing order ${order.id}:`, orderError);
        // Continue with next order
      }
    }

    logger.info(`Synced ${syncedCount} orders for user ${userId} (${createdCount} created, ${updatedCount} updated)`);

    res.json({
      success: true,
      data: {
        synced_count: syncedCount,
        created_count: createdCount,
        updated_count: updatedCount,
        message: `Successfully synced ${syncedCount} orders (${createdCount} created, ${updatedCount} updated).`
      }
    });

  } catch (error) {
    logger.error('WooCommerce order sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync orders',
      details: error.message
    });
  }
});

/**
 * GET /api/woocommerce/orders
 * Get orders for the authenticated user's WooCommerce store
 */
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, customer_email, limit = 50, offset = 0 } = req.query;

    // Get user's WooCommerce store
    const storeResult = await database.query(
      'SELECT id FROM woocommerce_stores WHERE user_id = $1 AND is_active = true LIMIT 1',
      [userId]
    );

    if (storeResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          orders: [],
          total: 0
        }
      });
    }

    const storeId = storeResult.rows[0].id;

    // Build query
    let query = `
      SELECT 
        wo.id,
        wo.woocommerce_order_id,
        wo.order_number,
        wo.customer_email,
        wo.customer_first_name,
        wo.customer_last_name,
        wo.status,
        wo.currency,
        wo.total,
        wo.date_created,
        wo.date_completed,
        wo.line_items,
        wo.billing_address,
        wo.shipping_address
      FROM woocommerce_orders wo
      WHERE wo.woocommerce_store_id = $1
    `;
    const params = [storeId];
    let paramIndex = 2;

    if (status) {
      query += ` AND wo.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (customer_email) {
      query += ` AND wo.customer_email = $${paramIndex}`;
      params.push(customer_email);
      paramIndex++;
    }

    query += ` ORDER BY wo.date_created DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const ordersResult = await database.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM woocommerce_orders WHERE woocommerce_store_id = $1';
    const countParams = [storeId];
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    if (customer_email) {
      countQuery += ` AND customer_email = $${countParams.length + 1}`;
      countParams.push(customer_email);
    }
    const countResult = await database.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        orders: ordersResult.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('WooCommerce get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orders',
      details: error.message
    });
  }
});

/**
 * GET /api/woocommerce/orders/:orderId
 * Get specific order details
 */
router.get('/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Get user's WooCommerce store
    const storeResult = await database.query(
      'SELECT id FROM woocommerce_stores WHERE user_id = $1 AND is_active = true LIMIT 1',
      [userId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'WooCommerce store not found'
      });
    }

    const storeId = storeResult.rows[0].id;

    // Get order (try by internal ID first, then by WooCommerce order ID)
    const orderResult = await database.query(
      `SELECT * FROM woocommerce_orders 
       WHERE woocommerce_store_id = $1 
       AND (id = $2::uuid OR woocommerce_order_id = $3::bigint OR order_number = $4)
       LIMIT 1`,
      [storeId, orderId, parseInt(orderId) || 0, orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        order: orderResult.rows[0]
      }
    });

  } catch (error) {
    logger.error('WooCommerce get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order',
      details: error.message
    });
  }
});

/**
 * GET /api/woocommerce/customers
 * Get customers for the authenticated user's WooCommerce store
 */
router.get('/customers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, limit = 50, offset = 0 } = req.query;

    // Get user's WooCommerce store
    const storeResult = await database.query(
      'SELECT id FROM woocommerce_stores WHERE user_id = $1 AND is_active = true LIMIT 1',
      [userId]
    );

    if (storeResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          customers: [],
          total: 0
        }
      });
    }

    const storeId = storeResult.rows[0].id;

    // Build query
    let query = `
      SELECT 
        wc.*,
        COUNT(wo.id) as total_orders,
        SUM(wo.total) as lifetime_value
      FROM woocommerce_customers wc
      LEFT JOIN woocommerce_orders wo ON wo.woocommerce_customer_id = wc.id
      WHERE wc.woocommerce_store_id = $1
    `;
    const params = [storeId];
    let paramIndex = 2;

    if (email) {
      query += ` AND wc.email = $${paramIndex}`;
      params.push(email);
      paramIndex++;
    }

    query += ` GROUP BY wc.id ORDER BY wc.date_created DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const customersResult = await database.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM woocommerce_customers WHERE woocommerce_store_id = $1';
    const countParams = [storeId];
    if (email) {
      countQuery += ' AND email = $2';
      countParams.push(email);
    }
    const countResult = await database.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        customers: customersResult.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('WooCommerce get customers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customers',
      details: error.message
    });
  }
});

/**
 * GET /api/woocommerce/customers/:customerId/orders
 * Get orders for a specific customer
 */
router.get('/customers/:customerId/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // Get user's WooCommerce store
    const storeResult = await database.query(
      'SELECT id FROM woocommerce_stores WHERE user_id = $1 AND is_active = true LIMIT 1',
      [userId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'WooCommerce store not found'
      });
    }

    const storeId = storeResult.rows[0].id;

    // Get customer
    const customerResult = await database.query(
      'SELECT id FROM woocommerce_customers WHERE id = $1::uuid AND woocommerce_store_id = $2',
      [customerId, storeId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const customerDbId = customerResult.rows[0].id;

    // Build query
    let query = `
      SELECT * FROM woocommerce_orders
      WHERE woocommerce_store_id = $1 AND woocommerce_customer_id = $2
    `;
    const params = [storeId, customerDbId];
    let paramIndex = 3;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY date_created DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const ordersResult = await database.query(query, params);

    res.json({
      success: true,
      data: {
        orders: ordersResult.rows,
        total: ordersResult.rows.length
      }
    });

  } catch (error) {
    logger.error('WooCommerce get customer orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer orders',
      details: error.message
    });
  }
});

module.exports = router;

