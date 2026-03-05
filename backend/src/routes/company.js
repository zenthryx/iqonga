const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const database = require('../database/connection');

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Configure multer for file uploads (MVP: server storage, later: S3)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/company-documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for MVP (to avoid Nginx issues)
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'text/x-markdown' // Alternative MIME type for markdown
    ];
    
    // Get file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md'];
    
    // Check both MIME type and file extension (browsers may send different MIME types)
    const isValidMimeType = allowedTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.includes(ext);
    
    // Also allow if MIME type is unknown but extension is valid (some browsers send application/octet-stream for .md)
    const isUnknownMimeButValidExt = (file.mimetype === 'application/octet-stream' || !file.mimetype) && isValidExtension;
    
    if (isValidMimeType || isValidExtension || isUnknownMimeButValidExt) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only PDF, DOCX, DOC, TXT, and MD files are allowed. Received: ${file.mimetype || 'unknown'} (${ext})`));
    }
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Authenticating request to:', req.path);
    console.log('🔑 Auth header:', req.headers['authorization'] ? 'Present' : 'Missing');
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }
    
    console.log('🔑 Token received:', token.substring(0, 20) + '...');

    const jwt = require('jsonwebtoken');
    console.log('🔐 JWT_SECRET available:', !!process.env.JWT_SECRET);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('✅ JWT verified successfully');
      console.log('🔍 Decoded token fields:', Object.keys(decoded));
      
      // Handle both userId and id fields in JWT token
      const userId = decoded.userId || decoded.id;
      console.log('👤 User ID from token:', userId);
      
      if (!userId) {
        console.log('❌ No userId found in token');
        return res.status(401).json({ error: 'Invalid token structure' });
      }
      
      const userResult = await database.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        console.log('❌ User not found in database');
        return res.status(401).json({ error: 'User not found' });
      }

      console.log('✅ User authenticated successfully:', userResult.rows[0].id);
      req.user = userResult.rows[0];
      next();
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/company/dashboard - Get company dashboard overview
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get company profile
    const profileResult = await database.query(
      'SELECT * FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          profile: null,
          products: [],
          documents: [],
          agents: [],
          stats: {
            profileComplete: 0,
            productsCount: 0,
            documentsCount: 0,
            agentsConnected: 0
          }
        }
      });
    }

    const profile = profileResult.rows[0];

    // Get products count
    const productsResult = await database.query(
      'SELECT COUNT(*) as count FROM company_products WHERE company_profile_id = $1 AND status = $2',
      [profile.id, 'active']
    );

    // Get documents count
    const documentsResult = await database.query(
      'SELECT COUNT(*) as count FROM knowledge_documents WHERE company_profile_id = $1',
      [profile.id]
    );

    // Get connected agents
    const agentsResult = await database.query(
      'SELECT COUNT(*) as count FROM ai_agents WHERE user_id = $1 AND is_active = $2',
      [req.user.id, true]
    );

    // Get team members count (table name is company_team, not company_team_members)
    let teamCount = 0;
    try {
      const teamResult = await database.query(
        'SELECT COUNT(*) as count FROM company_team WHERE company_profile_id = $1',
        [profile.id]
      );
      teamCount = parseInt(teamResult.rows[0]?.count || 0);
    } catch (teamError) {
      // Table might not exist, use 0 as default
      logger.warn('Could not get team count (table may not exist):', teamError.message);
      teamCount = 0;
    }

    // Get achievements count
    const achievementsResult = await database.query(
      'SELECT COUNT(*) as count FROM company_achievements WHERE company_profile_id = $1',
      [profile.id]
    );

    // Get Web3 details count
    const web3Result = await database.query(
      'SELECT COUNT(*) as count FROM web3_details WHERE company_profile_id = $1',
      [profile.id]
    );

    // Get custom data schemas count
    const customDataSchemasResult = await database.query(
      'SELECT COUNT(*) as count FROM custom_data_schemas WHERE company_profile_id = $1 AND is_active = $2',
      [profile.id, true]
    );

    // Get custom data entries count
    const customDataEntriesResult = await database.query(
      `SELECT COUNT(*) as count FROM custom_business_data cbd
       JOIN custom_data_schemas cds ON cbd.schema_id = cds.id
       WHERE cds.company_profile_id = $1 AND cbd.status = $2`,
      [profile.id, 'active']
    );

    // Calculate profile completion percentage
    const profileFields = ['company_name', 'industry', 'company_description', 'brand_voice', 'target_audience'];
    const completedFields = profileFields.filter(field => profile[field] && profile[field].toString().trim() !== '').length;
    const profileComplete = Math.round((completedFields / profileFields.length) * 100);

    res.json({
      success: true,
      data: {
        profile,
        products: [],
        documents: [],
        agents: [],
        stats: {
          profileComplete,
          productsCount: parseInt(productsResult.rows[0].count),
          documentsCount: parseInt(documentsResult.rows[0].count),
          teamMembersCount: teamCount,
          achievementsCount: parseInt(achievementsResult.rows[0].count),
          agentsConnected: parseInt(agentsResult.rows[0].count),
          web3Configured: parseInt(web3Result.rows[0].count) > 0,
          customDataSchemasCount: parseInt(customDataSchemasResult.rows[0].count),
          customDataEntriesCount: parseInt(customDataEntriesResult.rows[0].count)
        }
      }
    });

  } catch (error) {
    console.error('Failed to get company dashboard:', error);
    res.status(500).json({ error: 'Failed to get company dashboard' });
  }
});

// GET /api/company/profile - Get company profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profileResult = await database.query(
      'SELECT * FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.json({
        success: true,
        data: { profile: null, products: [], locations: [], faqs: [] }
      });
    }

    const profile = profileResult.rows[0];

    const [productsResult, locationsResult, faqsResult] = await Promise.all([
      database.query(
        `
        SELECT id, name, category, description, key_features, benefits, 
               pricing_info, target_customers, use_cases, competitive_advantages, 
               status
        FROM company_products
        WHERE company_profile_id = $1 AND status = 'active'
        ORDER BY created_at DESC
        `,
        [profile.id]
      ),
      database.query(
        `
        SELECT id, location_name, location_type, address, contact_email, contact_phone,
               timezone, hours, is_primary, created_at, updated_at
        FROM company_locations
        WHERE company_profile_id = $1
        ORDER BY is_primary DESC, location_name ASC
        `,
        [profile.id]
      ),
      database.query(
        `
        SELECT id, question, answer, category, tags, sort_order, is_active
        FROM company_faqs
        WHERE company_profile_id = $1
        ORDER BY sort_order ASC, created_at ASC
        `,
        [profile.id]
      )
    ]);

    res.json({
      success: true,
      data: {
        profile,
        products: productsResult.rows,
        locations: locationsResult.rows,
        faqs: faqsResult.rows
      }
    });
  } catch (error) {
    console.error('Failed to get company profile:', error);
    res.status(500).json({ error: 'Failed to get company profile' });
  }
});

// POST /api/company/profile - Save company profile
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    const {
      companyName,
      legalName,
      businessType,
      registrationNumber,
      industry,
      description,
      brandVoice,
      keyMessages,
      targetAudience,
      websiteUrl,
      timeZone,
      supportEmail,
      supportPhone,
      whatsappNumber,
      supportHours,
      primaryCurrency,
      acceptedCurrencies,
      preferredLanguages,
      shippingRegions,
      operatingCountries,
      taxPolicy,
      vatNumber,
      returnPolicy,
      refundPolicy,
      warrantyPolicy,
      preferredMusicGenre,
      preferredVoiceType,
      preferredMusicLanguage,
      address,
      businessHoursNotes,
      socialMediaHandles,
      locations,
      faqs
    } = req.body;

    const headquartersAddress = address || {};
    const businessHours = businessHoursNotes
      ? { notes: businessHoursNotes }
      : (req.body.businessHours || {});
    const primaryCurrencyCode = primaryCurrency?.code || null;
    const primaryCurrencySymbol = primaryCurrency?.symbol || null;
    const acceptedCurrenciesArray = Array.isArray(acceptedCurrencies) ? acceptedCurrencies : null;
    const preferredLanguagesArray = Array.isArray(preferredLanguages) ? preferredLanguages : null;
    const shippingRegionsArray = Array.isArray(shippingRegions) ? shippingRegions : null;
    const operatingCountriesArray = Array.isArray(operatingCountries) ? operatingCountries : null;
    const keyMessagesArray = Array.isArray(keyMessages) ? keyMessages : [];
    const socialHandles = socialMediaHandles || {};

    const locationsProvided = Array.isArray(locations);
    const faqsProvided = Array.isArray(faqs);

    const profileId = await database.transaction(async (client) => {
      const existing = await client.query(
        'SELECT id FROM company_profiles WHERE user_id = $1',
        [req.user.id]
      );

      let savedProfileId;

      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE company_profiles 
          SET company_name = $1,
              legal_name = $2,
              business_type = $3,
              registration_number = $4,
              industry = $5,
              company_description = $6,
              brand_voice = $7,
              key_messages = $8,
              target_audience = $9,
              website_url = $10,
              time_zone = $11,
              headquarters_address = $12,
              support_email = $13,
              support_phone = $14,
              whatsapp_number = $15,
              support_hours = $16,
              primary_currency_code = $17,
              primary_currency_symbol = $18,
              accepted_currencies = $19,
              preferred_languages = $20,
              shipping_regions = $21,
              operating_countries = $22,
              tax_policy = $23,
              vat_number = $24,
              return_policy = $25,
              refund_policy = $26,
              warranty_policy = $27,
              business_hours = $28,
              preferred_music_genre = $29,
              preferred_voice_type = $30,
              preferred_music_language = $31,
              social_media_handles = $32,
              updated_at = NOW()
          WHERE user_id = $33
        `, [
          companyName,
          legalName || null,
          businessType || null,
          registrationNumber || null,
          industry,
          description,
          brandVoice,
          keyMessagesArray,
          targetAudience,
          websiteUrl,
          timeZone || null,
          headquartersAddress || {},
          supportEmail || null,
          supportPhone || null,
          whatsappNumber || null,
          supportHours || null,
          primaryCurrencyCode,
          primaryCurrencySymbol,
          acceptedCurrenciesArray,
          preferredLanguagesArray,
          shippingRegionsArray,
          operatingCountriesArray,
          taxPolicy || null,
          vatNumber || null,
          returnPolicy || null,
          refundPolicy || null,
          warrantyPolicy || null,
          businessHours || {},
          preferredMusicGenre || null,
          preferredVoiceType || null,
          preferredMusicLanguage || null,
          socialHandles,
          req.user.id
        ]);

        savedProfileId = existing.rows[0].id;
      } else {
        const insertResult = await client.query(`
          INSERT INTO company_profiles (
            user_id,
            company_name,
            legal_name,
            business_type,
            registration_number,
            industry,
            company_description,
            brand_voice,
            key_messages,
            target_audience,
            website_url,
            time_zone,
            headquarters_address,
            support_email,
            support_phone,
            whatsapp_number,
            support_hours,
            primary_currency_code,
            primary_currency_symbol,
            accepted_currencies,
            preferred_languages,
            shipping_regions,
            operating_countries,
            tax_policy,
            vat_number,
            return_policy,
            refund_policy,
            warranty_policy,
            business_hours,
            preferred_music_genre,
            preferred_voice_type,
            preferred_music_language,
            social_media_handles
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
          )
          RETURNING id
        `, [
          req.user.id,
          companyName,
          legalName || null,
          businessType || null,
          registrationNumber || null,
          industry,
          description,
          brandVoice,
          keyMessagesArray,
          targetAudience,
          websiteUrl,
          timeZone || null,
          headquartersAddress || {},
          supportEmail || null,
          supportPhone || null,
          whatsappNumber || null,
          supportHours || null,
          primaryCurrencyCode,
          primaryCurrencySymbol,
          acceptedCurrenciesArray,
          preferredLanguagesArray,
          shippingRegionsArray,
          operatingCountriesArray,
          taxPolicy || null,
          vatNumber || null,
          returnPolicy || null,
          refundPolicy || null,
          warrantyPolicy || null,
          businessHours || {},
          preferredMusicGenre || null,
          preferredVoiceType || null,
          preferredMusicLanguage || null,
          socialHandles
        ]);

        savedProfileId = insertResult.rows[0].id;
      }

      // Locations (optional to avoid wiping data for older clients)
      if (locationsProvided) {
        await client.query(
          'DELETE FROM company_locations WHERE company_profile_id = $1',
          [savedProfileId]
        );

        for (const [index, location] of locations.entries()) {
          if (!location || !location.locationName) {
            continue;
          }

          const locationAddress = location.address || {};
          const locationHours = location.hours
            ? location.hours
            : (location.notes ? { notes: location.notes } : {});

          await client.query(`
            INSERT INTO company_locations (
              company_profile_id,
              location_name,
              location_type,
              address,
              contact_email,
              contact_phone,
              timezone,
              hours,
              is_primary,
              created_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
          `, [
            savedProfileId,
            location.locationName,
            location.locationType || null,
            locationAddress,
            location.contactEmail || null,
            location.contactPhone || null,
            location.timezone || null,
            locationHours || {},
            location.isPrimary === true || index === 0
          ]);
        }
      }

      // FAQs
      if (faqsProvided) {
        await client.query(
          'DELETE FROM company_faqs WHERE company_profile_id = $1',
          [savedProfileId]
        );

        for (const [index, faq] of faqs.entries()) {
          if (!faq || !faq.question || !faq.answer) {
            continue;
          }

          await client.query(`
            INSERT INTO company_faqs (
              company_profile_id,
              question,
              answer,
              category,
              tags,
              sort_order,
              is_active
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
          `, [
            savedProfileId,
            faq.question,
            faq.answer,
            faq.category || null,
            Array.isArray(faq.tags) ? faq.tags : null,
            typeof faq.sortOrder === 'number' ? faq.sortOrder : index,
            faq.isActive !== false
          ]);
        }
      }

      return savedProfileId;
    });

    res.json({ success: true, data: { profileId } });
  } catch (error) {
    console.error('Failed to save company profile:', error);
    res.status(500).json({ error: 'Failed to save company profile' });
  }
});

// GET /api/company/products - Get company products
router.get('/products', authenticateToken, async (req, res) => {
  try {
    // Get company profile ID
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const profileId = profile.rows[0].id;

    // Get all products for this company
    const products = await database.query(`
      SELECT id, name, category, description, key_features, benefits, 
             pricing_info, target_customers, use_cases, competitive_advantages, 
             status, created_at
      FROM company_products 
      WHERE company_profile_id = $1 
      ORDER BY created_at DESC
    `, [profileId]);

    res.json({ success: true, data: products.rows });
  } catch (error) {
    console.error('Failed to get company products:', error);
    res.status(500).json({ error: 'Failed to get company products' });
  }
});

// POST /api/company/products - Create or Update a single product
router.post('/products', authenticateToken, async (req, res) => {
  try {
    const productData = req.body; // Expecting a single product object
    const { id, name, category, description, key_features, benefits, pricing_info, target_customers, use_cases, competitive_advantages, status } = productData;

    // Get company profile ID
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.status(400).json({ error: 'Company profile not found. Please create profile first.' });
    }

    const profileId = profile.rows[0].id;

    if (id) {
      // If product ID is provided, attempt to update
      const updateResult = await database.query(`
        UPDATE company_products
        SET name = $1, category = $2, description = $3, key_features = $4,
            benefits = $5, pricing_info = $6, target_customers = $7,
            use_cases = $8, competitive_advantages = $9, status = $10,
            updated_at = NOW()
        WHERE id = $11 AND company_profile_id = $12
        RETURNING id;
      `, [name, category, description, key_features, benefits, pricing_info,
          target_customers, use_cases, competitive_advantages, status || 'active', id, profileId]);

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found or not owned by company' });
      }
      res.json({ success: true, message: 'Product updated successfully', productId: id });
    } else {
      // If no product ID, create a new product
      const insertResult = await database.query(`
        INSERT INTO company_products
        (company_profile_id, name, category, description, key_features,
         benefits, pricing_info, target_customers, use_cases, competitive_advantages, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id;
      `, [profileId, name, category, description, key_features, benefits, pricing_info,
          target_customers, use_cases, competitive_advantages, status || 'active']);

      res.status(201).json({ success: true, message: 'Product created successfully', productId: insertResult.rows[0].id });
    }
  } catch (error) {
    console.error('Failed to save product:', error);
    res.status(500).json({ error: 'Failed to save product' });
  }
});

// DELETE /api/company/products/:id - Delete a specific product
router.delete('/products/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get company profile ID to verify ownership
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.status(400).json({ error: 'Company profile not found' });
    }

    const profileId = profile.rows[0].id;

    // Delete the product (only if it belongs to this company)
    const result = await database.query(`
      DELETE FROM company_products 
      WHERE id = $1 AND company_profile_id = $2
      RETURNING id
    `, [id, profileId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// GET /api/company/documents - Get company documents
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    // Get company profile ID
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const profileId = profile.rows[0].id;

    // Get all documents for this company
    const documents = await database.query(`
      SELECT id, title, file_type, file_size, summary, 
             content, tags, file_path, created_at
      FROM knowledge_documents 
      WHERE company_profile_id = $1 
      ORDER BY created_at DESC
    `, [profileId]);

    res.json({ success: true, data: documents.rows });
  } catch (error) {
    console.error('Failed to get company documents:', error);
    res.status(500).json({ error: 'Failed to get company documents' });
  }
});

// DELETE /api/company/documents/:id - Delete a specific document
router.delete('/documents/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get company profile ID to verify ownership
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.status(400).json({ error: 'Company profile not found' });
    }

    const profileId = profile.rows[0].id;

    // Delete the document (only if it belongs to this company)
    const result = await database.query(`
      DELETE FROM knowledge_documents 
      WHERE id = $1 AND company_profile_id = $2
      RETURNING id
    `, [id, profileId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Failed to delete document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/company/documents - Upload and process documents
router.post('/documents', authenticateToken, upload.array('documents', 10), async (req, res) => {
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Get company profile ID
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.status(400).json({ error: 'Company profile not found' });
    }

    const profileId = profile.rows[0].id;
    const processedDocuments = [];

    for (const file of files) {
      try {
        // Extract text from document
        const extractedText = await extractTextFromDocument(file.path);
        
        // Generate summary using AI
        const summary = await generateDocumentSummary(extractedText);
        
        // Store document in database
        const documentType = getDocumentType(file.mimetype);
        const result = await database.query(`
          INSERT INTO knowledge_documents 
          (company_profile_id, document_type, title, content, summary, file_path, file_size, file_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [profileId, documentType, file.originalname, extractedText, summary, 
            file.path, file.size, documentType]);

        processedDocuments.push({
          id: result.rows[0].id,
          title: file.originalname,
          status: 'processed',
          fileSize: file.size
        });

      } catch (error) {
        console.error(`Failed to process document ${file.originalname}:`, error);
        processedDocuments.push({
          title: file.originalname,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: { processedDocuments }
    });

  } catch (error) {
    console.error('Document upload failed:', error);
    res.status(500).json({ error: 'Document upload failed' });
  }
});

// GET /api/company/documents - Get uploaded documents
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.json({ success: true, data: { documents: [] } });
    }

    const profileId = profile.rows[0].id;
    const { agentId } = req.query;

    let validatedAgentId = null;
    if (agentId) {
      const agentCheck = await database.query(
        'SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2',
        [agentId, req.user.id]
      );

      if (agentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      validatedAgentId = agentId;
    }

    let selectClause = `
      SELECT id, title, file_type, file_size, summary, 
             content, tags, file_path, created_at
    `;
    let joinClause = '';
    const params = [profileId];

    if (validatedAgentId) {
      selectClause += `, CASE WHEN ada.agent_id IS NULL THEN false ELSE true END AS assigned`;
      joinClause = 'LEFT JOIN agent_document_assignments ada ON ada.document_id = knowledge_documents.id AND ada.agent_id = $2';
      params.push(validatedAgentId);
    } else {
      selectClause += `, false AS assigned`;
    }

    const documents = await database.query(`
      ${selectClause}
      FROM knowledge_documents
      ${joinClause}
      WHERE company_profile_id = $1 
      ORDER BY created_at DESC
    `, params);

    res.json({
      success: true,
      data: documents.rows
    });

  } catch (error) {
    console.error('Failed to get documents:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// DELETE /api/company/agent-knowledge/:id - Remove agent knowledge assignment
router.delete('/agent-knowledge/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get company profile ID to verify ownership
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.status(400).json({ error: 'Company profile not found' });
    }

    const profileId = profile.rows[0].id;

    // Delete the assignment (only if it belongs to this company)
    const result = await database.query(`
      DELETE FROM agent_knowledge_assignments 
      WHERE id = $1 AND company_profile_id = $2
      RETURNING id
    `, [id, profileId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found or access denied' });
    }

    res.json({ success: true, message: 'Agent knowledge assignment removed successfully' });
  } catch (error) {
    console.error('Failed to remove agent knowledge assignment:', error);
    res.status(500).json({ error: 'Failed to remove agent knowledge assignment' });
  }
});

// POST /api/company/assign-to-agent - Assign company knowledge to agent
router.post('/assign-to-agent', authenticateToken, async (req, res) => {
  try {
    const { agent_id, knowledge_scope, custom_instructions, priority_level = 1, assigned_documents = [] } = req.body;

    // Verify agent ownership
    const agent = await database.query(
      'SELECT id FROM ai_agents WHERE id = $1 AND user_id = $2',
      [agent_id, req.user.id]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get company profile
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.status(400).json({ error: 'Company profile not found' });
    }

    const profileId = profile.rows[0].id;

    await database.query('BEGIN');

    // Create or update knowledge assignment
    await database.query(`
      INSERT INTO agent_knowledge_assignments 
      (agent_id, company_profile_id, knowledge_scope, custom_instructions, priority_level)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (agent_id, company_profile_id) DO UPDATE SET
        knowledge_scope = $3,
        custom_instructions = $4,
        priority_level = $5,
        is_active = true
    `, [agent_id, profileId, JSON.stringify(knowledge_scope || []), custom_instructions, priority_level]);

    // Update document assignments
    const validDocumentsArray = Array.isArray(assigned_documents) ? assigned_documents : [];

    // Remove existing assignments
    await database.query('DELETE FROM agent_document_assignments WHERE agent_id = $1', [agent_id]);

    if (validDocumentsArray.length > 0) {
      const validDocs = await database.query(`
        SELECT id 
        FROM knowledge_documents 
        WHERE company_profile_id = $1 
          AND id = ANY($2::uuid[])
      `, [profileId, validDocumentsArray]);

      for (const row of validDocs.rows) {
        await database.query(`
          INSERT INTO agent_document_assignments (agent_id, document_id, priority_level)
          VALUES ($1, $2, $3)
          ON CONFLICT (agent_id, document_id) DO UPDATE SET
            priority_level = EXCLUDED.priority_level
        `, [agent_id, row.id, priority_level]);
      }
    }

    await database.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await database.query('ROLLBACK').catch(() => {});
    console.error('Failed to assign knowledge to agent:', error);
    res.status(500).json({ error: 'Failed to assign knowledge to agent' });
  }
});

// GET /api/company/agents - Get all user's AI agents
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await database.query(`
      SELECT id, name, personality_type, voice_tone, is_active
      FROM ai_agents 
      WHERE user_id = $1 AND is_active = true
      ORDER BY name
    `, [req.user.id]);

    res.json({
      success: true,
      data: { agents: agents.rows }
    });

  } catch (error) {
    console.error('Failed to get agents:', error);
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// GET /api/company/agent-knowledge - Get agent knowledge assignments
router.get('/agent-knowledge', authenticateToken, async (req, res) => {
  try {
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.json({ success: true, data: { assignments: [] } });
    }

    const profileId = profile.rows[0].id;

    const assignments = await database.query(`
      SELECT 
        aka.id, 
        aka.agent_id, 
        aka.knowledge_scope, 
        aka.custom_instructions, 
        aka.priority_level, 
        aka.is_active,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', kd.id, 'title', kd.title)
          ) FILTER (WHERE kd.id IS NOT NULL),
          '[]'
        ) AS documents
      FROM agent_knowledge_assignments aka
      LEFT JOIN agent_document_assignments ada ON ada.agent_id = aka.agent_id
      LEFT JOIN knowledge_documents kd ON kd.id = ada.document_id
      WHERE aka.company_profile_id = $1
      GROUP BY aka.id
      ORDER BY aka.priority_level DESC, aka.created_at DESC
    `, [profileId]);

    // Parse knowledge_scope JSON for each assignment
    const parsedAssignments = assignments.rows.map(assignment => ({
      ...assignment,
      knowledge_scope: typeof assignment.knowledge_scope === 'string' 
        ? JSON.parse(assignment.knowledge_scope) 
        : assignment.knowledge_scope,
      documents: Array.isArray(assignment.documents) 
        ? assignment.documents 
        : (assignment.documents ? JSON.parse(assignment.documents) : [])
    }));

    res.json({
      success: true,
      data: { assignments: parsedAssignments }
    });

  } catch (error) {
    console.error('Failed to get agent knowledge assignments:', error);
    res.status(500).json({ error: 'Failed to get agent knowledge assignments' });
  }
});

// GET /api/company/knowledge-overview - Get company knowledge overview
router.get('/knowledge-overview', authenticateToken, async (req, res) => {
  try {
    const profile = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profile.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          profile: null,
          products: [],
          documents: [],
          teamMembers: [],
          achievements: [],
          web3Details: null,
          customDataSchemas: 0,
          customDataEntries: 0
        }
      });
    }

    const profileId = profile.rows[0].id;

    // Get company profile
    const profileResult = await database.query(
      'SELECT * FROM company_profiles WHERE id = $1',
      [profileId]
    );

    // Get products
    const productsResult = await database.query(
      'SELECT id, name FROM company_products WHERE company_profile_id = $1 AND status = $2',
      [profileId, 'active']
    );

    // Get documents
    const documentsResult = await database.query(
      'SELECT id, title FROM knowledge_documents WHERE company_profile_id = $1',
      [profileId]
    );

    // Get team members
    const teamMembersResult = await database.query(
      'SELECT id, name FROM company_team WHERE company_profile_id = $1',
      [profileId]
    );

    // Get achievements
    const achievementsResult = await database.query(
      'SELECT id, title FROM company_achievements WHERE company_profile_id = $1',
      [profileId]
    );

    // Get Web3 details
    const web3Result = await database.query(
      'SELECT id FROM web3_details WHERE company_profile_id = $1',
      [profileId]
    );

    // Get custom data schemas count
    const customDataSchemasResult = await database.query(
      'SELECT COUNT(*) as count FROM custom_data_schemas WHERE company_profile_id = $1 AND is_active = $2',
      [profileId, true]
    );

    // Get custom data entries count
    const customDataEntriesResult = await database.query(
      `SELECT COUNT(*) as count FROM custom_business_data cbd
       JOIN custom_data_schemas cds ON cbd.schema_id = cds.id
       WHERE cds.company_profile_id = $1 AND cbd.status = $2`,
      [profileId, 'active']
    );

    res.json({
      success: true,
      data: {
        profile: profileResult.rows[0] || null,
        products: productsResult.rows,
        documents: documentsResult.rows,
        teamMembers: teamMembersResult.rows,
        achievements: achievementsResult.rows,
        web3Details: web3Result.rows.length > 0 ? web3Result.rows[0] : null,
        customDataSchemas: parseInt(customDataSchemasResult.rows[0].count),
        customDataEntries: parseInt(customDataEntriesResult.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Failed to get knowledge overview:', error);
    res.status(500).json({ error: 'Failed to get knowledge overview' });
  }
});

// Helper function to map MIME types to document types
function getDocumentType(mimetype) {
  const typeMap = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'text/plain': 'txt',
    'text/markdown': 'md'
  };
  return typeMap[mimetype] || 'unknown';
}

// Helper functions
async function extractTextFromDocument(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  
  try {
    switch (extension) {
      case '.pdf':
        const pdf = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
        
      case '.docx':
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
        
      case '.txt':
      case '.md':
        return fs.readFileSync(filePath, 'utf-8');
        
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  } catch (error) {
    throw new Error(`Failed to extract text from document: ${error.message}`);
  }
}

async function generateDocumentSummary(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates concise summaries of business documents. Create a 2-3 sentence summary that captures the key points and purpose of the document."
        },
        {
          role: "user",
          content: `Please summarize this document:\n\n${text.substring(0, 4000)}`
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    });

    return response.choices[0].message.content || "Summary not available";
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return "Summary not available";
  }
}

// ==================== WEB3 DETAILS ROUTES ====================

// GET /api/company/web3 - Get Web3 details for user's company
router.get('/web3', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Fetching Web3 details for user:', req.user.id);

    // Get company profile
    const profileResult = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.json({
        success: true,
        data: { web3Details: null }
      });
    }

    const profileId = profileResult.rows[0].id;

    // Get Web3 details
    const web3Result = await database.query(
      'SELECT * FROM web3_details WHERE company_profile_id = $1',
      [profileId]
    );

    res.json({
      success: true,
      data: {
        web3Details: web3Result.rows[0] || null
      }
    });

  } catch (error) {
    console.error('Failed to get Web3 details:', error);
    res.status(500).json({ error: 'Failed to get Web3 details' });
  }
});

// POST /api/company/web3 - Create/Update Web3 details for user's company
router.post('/web3', authenticateToken, async (req, res) => {
  try {
    console.log('💾 Saving Web3 details for user:', req.user.id);

    const {
      // Blockchain & Technical Infrastructure
      blockchainPlatforms,
      networkType,
      layerType,
      smartContractAddresses,
      tokenStandard,
      isCrossChain,
      crossChainDetails,
      
      // Tokenomics
      tokenName,
      tokenTicker,
      tokenContractAddress,
      totalSupply,
      circulatingSupply,
      tokenDistribution,
      vestingSchedule,
      tokenUtility,
      burnMechanism,
      hasStaking,
      stakingDetails,
      
      // DeFi/Protocol Specifics
      protocolType,
      tvl,
      liquidityPools,
      tradingPairs,
      feeStructure,
      yieldApy,
      
      // Governance & DAO
      governanceModel,
      votingMechanism,
      governanceToken,
      proposalProcess,
      votingPowerRequirements,
      
      // NFT Details
      hasNft,
      nftCollectionName,
      nftCollectionSize,
      nftMintingDetails,
      nftRoyalties,
      nftUtility,
      nftMarketplaceLinks,
      
      // Security & Trust
      auditReports,
      auditedBy,
      hasBugBounty,
      bugBountyDetails,
      insuranceCoverage,
      multisigDetails,
      
      // Where to Buy/Trade
      dexListings,
      cexListings,
      liquidityProviders,
      tokenPurchaseGuide,
      
      // Wallet & Access
      supportedWallets,
      walletConnectionGuide,
      networkSettings,
      
      // Community & Social Metrics
      communitySize,
      communityChannels,
      communityPrograms,
      
      // Partnerships & Ecosystem
      keyPartnerships,
      integrations,
      ecosystemProjects,
      crossChainBridges,
      
      // Roadmap & Milestones
      launchDate,
      majorMilestones,
      upcomingFeatures,
      currentPhase,
      
      // Additional Information
      whitepaperUrl,
      litepaperUrl,
      documentationUrl,
      githubUrl
    } = req.body;

    // Get company profile
    const profileResult = await database.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Company profile not found. Please create a company profile first.' 
      });
    }

    const profileId = profileResult.rows[0].id;

    // Check if Web3 details already exist
    const existingWeb3 = await database.query(
      'SELECT id FROM web3_details WHERE company_profile_id = $1',
      [profileId]
    );

    let web3Details;

    if (existingWeb3.rows.length > 0) {
      // Update existing Web3 details
      const updateResult = await database.query(`
        UPDATE web3_details SET
          blockchain_platforms = $1,
          network_type = $2,
          layer_type = $3,
          smart_contract_addresses = $4,
          token_standard = $5,
          is_cross_chain = $6,
          cross_chain_details = $7,
          token_name = $8,
          token_ticker = $9,
          token_contract_address = $10,
          total_supply = $11,
          circulating_supply = $12,
          token_distribution = $13,
          vesting_schedule = $14,
          token_utility = $15,
          burn_mechanism = $16,
          has_staking = $17,
          staking_details = $18,
          protocol_type = $19,
          tvl = $20,
          liquidity_pools = $21,
          trading_pairs = $22,
          fee_structure = $23,
          yield_apy = $24,
          governance_model = $25,
          voting_mechanism = $26,
          governance_token = $27,
          proposal_process = $28,
          voting_power_requirements = $29,
          has_nft = $30,
          nft_collection_name = $31,
          nft_collection_size = $32,
          nft_minting_details = $33,
          nft_royalties = $34,
          nft_utility = $35,
          nft_marketplace_links = $36,
          audit_reports = $37,
          audited_by = $38,
          has_bug_bounty = $39,
          bug_bounty_details = $40,
          insurance_coverage = $41,
          multisig_details = $42,
          dex_listings = $43,
          cex_listings = $44,
          liquidity_providers = $45,
          token_purchase_guide = $46,
          supported_wallets = $47,
          wallet_connection_guide = $48,
          network_settings = $49,
          community_size = $50,
          community_channels = $51,
          community_programs = $52,
          key_partnerships = $53,
          integrations = $54,
          ecosystem_projects = $55,
          cross_chain_bridges = $56,
          launch_date = $57,
          major_milestones = $58,
          upcoming_features = $59,
          current_phase = $60,
          whitepaper_url = $61,
          litepaper_url = $62,
          documentation_url = $63,
          github_url = $64,
          updated_at = NOW()
        WHERE company_profile_id = $65
        RETURNING *
      `, [
        JSON.stringify(blockchainPlatforms || []),
        networkType || null,
        layerType || null,
        JSON.stringify(smartContractAddresses || []),
        tokenStandard || null,
        isCrossChain || false,
        crossChainDetails || null,
        tokenName || null,
        tokenTicker || null,
        tokenContractAddress || null,
        totalSupply || null,
        circulatingSupply || null,
        JSON.stringify(tokenDistribution || {}),
        vestingSchedule || null,
        JSON.stringify(tokenUtility || []),
        burnMechanism || null,
        hasStaking || false,
        JSON.stringify(stakingDetails || {}),
        protocolType || null,
        tvl || null,
        JSON.stringify(liquidityPools || []),
        JSON.stringify(tradingPairs || []),
        JSON.stringify(feeStructure || {}),
        yieldApy || null,
        governanceModel || null,
        votingMechanism || null,
        governanceToken || null,
        proposalProcess || null,
        votingPowerRequirements || null,
        hasNft || false,
        nftCollectionName || null,
        nftCollectionSize || null,
        JSON.stringify(nftMintingDetails || {}),
        nftRoyalties || null,
        nftUtility || null,
        JSON.stringify(nftMarketplaceLinks || []),
        JSON.stringify(auditReports || []),
        JSON.stringify(auditedBy || []),
        hasBugBounty || false,
        bugBountyDetails || null,
        insuranceCoverage || null,
        multisigDetails || null,
        JSON.stringify(dexListings || []),
        JSON.stringify(cexListings || []),
        JSON.stringify(liquidityProviders || []),
        tokenPurchaseGuide || null,
        JSON.stringify(supportedWallets || []),
        walletConnectionGuide || null,
        JSON.stringify(networkSettings || {}),
        JSON.stringify(communitySize || {}),
        JSON.stringify(communityChannels || {}),
        communityPrograms || null,
        JSON.stringify(keyPartnerships || []),
        JSON.stringify(integrations || []),
        JSON.stringify(ecosystemProjects || []),
        JSON.stringify(crossChainBridges || []),
        launchDate || null,
        JSON.stringify(majorMilestones || []),
        JSON.stringify(upcomingFeatures || []),
        currentPhase || null,
        whitepaperUrl || null,
        litepaperUrl || null,
        documentationUrl || null,
        githubUrl || null,
        profileId
      ]);

      web3Details = updateResult.rows[0];
      console.log('✅ Web3 details updated successfully');

    } else {
      // Insert new Web3 details
      const insertResult = await database.query(`
        INSERT INTO web3_details (
          company_profile_id,
          blockchain_platforms,
          network_type,
          layer_type,
          smart_contract_addresses,
          token_standard,
          is_cross_chain,
          cross_chain_details,
          token_name,
          token_ticker,
          token_contract_address,
          total_supply,
          circulating_supply,
          token_distribution,
          vesting_schedule,
          token_utility,
          burn_mechanism,
          has_staking,
          staking_details,
          protocol_type,
          tvl,
          liquidity_pools,
          trading_pairs,
          fee_structure,
          yield_apy,
          governance_model,
          voting_mechanism,
          governance_token,
          proposal_process,
          voting_power_requirements,
          has_nft,
          nft_collection_name,
          nft_collection_size,
          nft_minting_details,
          nft_royalties,
          nft_utility,
          nft_marketplace_links,
          audit_reports,
          audited_by,
          has_bug_bounty,
          bug_bounty_details,
          insurance_coverage,
          multisig_details,
          dex_listings,
          cex_listings,
          liquidity_providers,
          token_purchase_guide,
          supported_wallets,
          wallet_connection_guide,
          network_settings,
          community_size,
          community_channels,
          community_programs,
          key_partnerships,
          integrations,
          ecosystem_projects,
          cross_chain_bridges,
          launch_date,
          major_milestones,
          upcoming_features,
          current_phase,
          whitepaper_url,
          litepaper_url,
          documentation_url,
          github_url
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,
          $39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54,$55,$56,
          $57,$58,$59,$60,$61,$62,$63,$64,$65
        )
        RETURNING *
      `, [
        profileId,
        JSON.stringify(blockchainPlatforms || []),
        networkType || null,
        layerType || null,
        JSON.stringify(smartContractAddresses || []),
        tokenStandard || null,
        isCrossChain || false,
        crossChainDetails || null,
        tokenName || null,
        tokenTicker || null,
        tokenContractAddress || null,
        totalSupply || null,
        circulatingSupply || null,
        JSON.stringify(tokenDistribution || {}),
        vestingSchedule || null,
        JSON.stringify(tokenUtility || []),
        burnMechanism || null,
        hasStaking || false,
        JSON.stringify(stakingDetails || {}),
        protocolType || null,
        tvl || null,
        JSON.stringify(liquidityPools || []),
        JSON.stringify(tradingPairs || []),
        JSON.stringify(feeStructure || {}),
        yieldApy || null,
        governanceModel || null,
        votingMechanism || null,
        governanceToken || null,
        proposalProcess || null,
        votingPowerRequirements || null,
        hasNft || false,
        nftCollectionName || null,
        nftCollectionSize || null,
        JSON.stringify(nftMintingDetails || {}),
        nftRoyalties || null,
        nftUtility || null,
        JSON.stringify(nftMarketplaceLinks || []),
        JSON.stringify(auditReports || []),
        JSON.stringify(auditedBy || []),
        hasBugBounty || false,
        bugBountyDetails || null,
        insuranceCoverage || null,
        multisigDetails || null,
        JSON.stringify(dexListings || []),
        JSON.stringify(cexListings || []),
        JSON.stringify(liquidityProviders || []),
        tokenPurchaseGuide || null,
        JSON.stringify(supportedWallets || []),
        walletConnectionGuide || null,
        JSON.stringify(networkSettings || {}),
        JSON.stringify(communitySize || {}),
        JSON.stringify(communityChannels || {}),
        communityPrograms || null,
        JSON.stringify(keyPartnerships || []),
        JSON.stringify(integrations || []),
        JSON.stringify(ecosystemProjects || []),
        JSON.stringify(crossChainBridges || []),
        launchDate || null,
        JSON.stringify(majorMilestones || []),
        JSON.stringify(upcomingFeatures || []),
        currentPhase || null,
        whitepaperUrl || null,
        litepaperUrl || null,
        documentationUrl || null,
        githubUrl || null
      ]);

      web3Details = insertResult.rows[0];
      console.log('✅ Web3 details created successfully');
    }

    res.json({
      success: true,
      message: 'Web3 details saved successfully',
      data: { web3Details }
    });

  } catch (error) {
    console.error('Failed to save Web3 details:', error);
    res.status(500).json({ error: 'Failed to save Web3 details', details: error.message });
  }
});

module.exports = router;
