const database = require('../database/connection');

class CompanyKnowledgeService {
  constructor() {
    this.db = database;
  }

  // Fetch complete company knowledge for an agent
  async getCompanyKnowledgeForAgent(agentId) {
    try {
      // Get agent's company profile
      const agentResult = await this.db.query(`
        SELECT user_id FROM ai_agents WHERE id = $1
      `, [agentId]);

      if (agentResult.rows.length === 0) {
        throw new Error('Agent not found');
      }

      const userId = agentResult.rows[0].user_id;

      // Fetch company profile
      const companyProfile = await this.getCompanyProfile(userId);
      
      // Fetch products and services
      const products = await this.getProductsAndServices(userId);
      
      // Fetch document assignments for this agent
      const assignedDocumentIds = await this.getAssignedDocumentIds(agentId);
      
      // Fetch knowledge documents (filtered by assignment if applicable)
      const documents = await this.getKnowledgeDocuments(userId, assignedDocumentIds);
      
      // Fetch agent knowledge assignments
      const agentKnowledge = await this.getAgentKnowledgeAssignments(agentId);

      // Fetch custom business data for agent
      const CustomDataService = require('./CustomDataService');
      const customDataService = new CustomDataService();
      const customData = await customDataService.getDataForAgent(agentId);

      return {
        companyProfile,
        products,
        documents,
        agentKnowledge,
        customData
      };
    } catch (error) {
      console.error('Error fetching company knowledge:', error);
      return null;
    }
  }

  // Get company profile
  async getCompanyProfile(userId) {
    try {
      const result = await this.db.query(`
        SELECT 
          company_name,
          industry,
          company_description,
          brand_voice,
          key_messages,
          target_audience,
          website_url
        FROM company_profiles 
        WHERE user_id = $1
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const profile = result.rows[0];
      
      // Safely parse key_messages JSON
      let keyMessages = [];
      if (profile.key_messages) {
        try {
          // If it's already a JSON object, use it directly
          if (typeof profile.key_messages === 'object') {
            keyMessages = Object.values(profile.key_messages);
          } else {
            // Try to parse as JSON string
            const parsed = JSON.parse(profile.key_messages);
            keyMessages = Object.values(parsed);
          }
        } catch (error) {
          console.error('Error parsing key_messages:', error);
          // Fallback: treat as comma-separated string
          keyMessages = profile.key_messages.split(',').map(msg => msg.trim());
        }
      }
      
      return {
        name: profile.company_name,
        industry: profile.industry,
        description: profile.company_description,
        brandVoice: profile.brand_voice,
        keyMessages: keyMessages,
        targetAudience: profile.target_audience,
        websiteUrl: profile.website_url
      };
    } catch (error) {
      console.error('Error fetching company profile:', error);
      return null;
    }
  }

  // Get products and services
  async getProductsAndServices(userId) {
    try {
      const result = await this.db.query(`
        SELECT 
          cp.name,
          cp.category,
          cp.description,
          cp.key_features,
          cp.benefits,
          cp.target_customers,
          cp.use_cases,
          cp.pricing_info
        FROM company_products cp
        JOIN company_profiles cprof ON cp.company_profile_id = cprof.id
        WHERE cprof.user_id = $1 AND cp.status = 'active'
        ORDER BY cp.created_at DESC
      `, [userId]);

      return result.rows.map(product => ({
        name: product.name,
        category: product.category,
        description: product.description,
        keyFeatures: product.key_features || [],
        benefits: product.benefits || [],
        targetCustomers: product.target_customers,
        useCases: product.use_cases || [],
        pricingInfo: product.pricing_info
      }));
    } catch (error) {
      console.error('Error fetching products and services:', error);
      return [];
    }
  }

  // Get knowledge documents
  async getKnowledgeDocuments(userId, assignedDocumentIds = []) {
    try {
      let query = `
        SELECT 
          kd.id,
          kd.title,
          kd.content,
          kd.document_type,
          kd.summary,
          kd.file_size,
          kd.created_at
        FROM knowledge_documents kd
        JOIN company_profiles cprof ON kd.company_profile_id = cprof.id
        WHERE cprof.user_id = $1
      `;

      const params = [userId];

      if (assignedDocumentIds && assignedDocumentIds.length > 0) {
        query += ' AND kd.id = ANY($2)';
        params.push(assignedDocumentIds);
      }

      query += ' ORDER BY kd.created_at DESC';

      const result = await this.db.query(query, params);

      return result.rows.map(doc => ({
        title: doc.title,
        content: doc.content,
        type: doc.document_type,
        summary: doc.summary,
        fileSize: doc.file_size,
        createdAt: doc.created_at
      }));
    } catch (error) {
      console.error('Error fetching knowledge documents:', error);
      return [];
    }
  }

  // Get documents assigned to a specific agent
  async getAssignedDocumentIds(agentId) {
    try {
      const result = await this.db.query(`
        SELECT document_id 
        FROM agent_document_assignments 
        WHERE agent_id = $1
      `, [agentId]);

      return result.rows.map(row => row.document_id);
    } catch (error) {
      console.error('Error fetching assigned documents:', error);
      return [];
    }
  }

  // Get agent knowledge assignments
  async getAgentKnowledgeAssignments(agentId) {
    try {
      const result = await this.db.query(`
        SELECT 
          knowledge_scope,
          custom_instructions,
          priority_level,
          is_active
        FROM agent_knowledge_assignments 
        WHERE agent_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `, [agentId]);

      return result.rows.map(assignment => ({
        knowledgeScope: assignment.knowledge_scope ? (() => {
          try {
            // If it's already an array/object (parsed by database driver), use it directly
            if (Array.isArray(assignment.knowledge_scope) || typeof assignment.knowledge_scope === 'object') {
              return assignment.knowledge_scope;
            }
            // If it's a string, try to parse it
            if (typeof assignment.knowledge_scope === 'string') {
              return JSON.parse(assignment.knowledge_scope);
            }
            return [];
          } catch (error) {
            console.error('Error parsing knowledge_scope:', error, 'Raw value:', assignment.knowledge_scope);
            return [];
          }
        })() : [],
        customInstructions: assignment.custom_instructions,
        priorityLevel: assignment.priority_level,
        isActive: assignment.is_active
      }));
    } catch (error) {
      console.error('Error fetching agent knowledge assignments:', error);
      return [];
    }
  }

  // Get relevant content for a specific topic
  async getRelevantContent(userId, topic) {
    try {
      // Search in company profile
      const profileResult = await this.db.query(`
        SELECT company_description, brand_voice, key_messages
        FROM company_profiles 
        WHERE user_id = $1 
        AND (
          LOWER(company_description) LIKE LOWER($2) OR
          LOWER(brand_voice) LIKE LOWER($2) OR
          LOWER(key_messages::text) LIKE LOWER($2)
        )
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId, `%${topic}%`]);

      // Search in products
      const productsResult = await this.db.query(`
        SELECT cp.name, cp.description, cp.key_features, cp.benefits
        FROM company_products cp
        JOIN company_profiles cprof ON cp.company_profile_id = cprof.id
        WHERE cprof.user_id = $1 AND cp.status = 'active'
        AND (
          LOWER(cp.name) LIKE LOWER($2) OR
          LOWER(cp.description) LIKE LOWER($2) OR
          LOWER(cp.key_features::text) LIKE LOWER($2) OR
          LOWER(cp.benefits::text) LIKE LOWER($2)
        )
        ORDER BY cp.created_at DESC
      `, [userId, `%${topic}%`]);

      // Search in documents
      const documentsResult = await this.db.query(`
        SELECT kd.title, kd.content, kd.summary
        FROM knowledge_documents kd
        JOIN company_profiles cprof ON kd.company_profile_id = cprof.id
        WHERE cprof.user_id = $1
        AND (
          LOWER(kd.title) LIKE LOWER($2) OR
          LOWER(kd.content) LIKE LOWER($2) OR
          LOWER(kd.summary) LIKE LOWER($2)
        )
        ORDER BY kd.created_at DESC
      `, [userId, `%${topic}%`]);

      return {
        profile: profileResult.rows[0] || null,
        products: productsResult.rows,
        documents: documentsResult.rows
      };
    } catch (error) {
      console.error('Error searching relevant content:', error);
      return { profile: null, products: [], documents: [] };
    }
  }

  // Get content templates for the company
  async getContentTemplates(userId) {
    try {
      const result = await this.db.query(`
        SELECT 
          template_name,
          template_type,
          content_template,
          variables,
          is_active
        FROM content_templates 
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows.map(template => ({
        name: template.template_name,
        type: template.template_type,
        content: template.content_template,
        variables: template.variables ? JSON.parse(template.variables) : {},
        isActive: template.is_active
      }));
    } catch (error) {
      console.error('Error fetching content templates:', error);
      return [];
    }
  }

  // Check if company knowledge exists for user
  async hasCompanyKnowledge(userId) {
    try {
      const profileResult = await this.db.query(`
        SELECT COUNT(*) as count FROM company_profiles WHERE user_id = $1
      `, [userId]);

      const productsResult = await this.db.query(`
        SELECT COUNT(*) as count FROM company_products cp
        JOIN company_profiles cprof ON cp.company_profile_id = cprof.id
        WHERE cprof.user_id = $1 AND cp.status = 'active'
      `, [userId]);

      const documentsResult = await this.db.query(`
        SELECT COUNT(*) as count FROM knowledge_documents kd
        JOIN company_profiles cprof ON kd.company_profile_id = cprof.id
        WHERE cprof.user_id = $1
      `, [userId]);

      return {
        hasProfile: parseInt(profileResult.rows[0].count) > 0,
        hasProducts: parseInt(productsResult.rows[0].count) > 0,
        hasDocuments: parseInt(documentsResult.rows[0].count) > 0
      };
    } catch (error) {
      console.error('Error checking company knowledge:', error);
      return { hasProfile: false, hasProducts: false, hasDocuments: false };
    }
  }
}

module.exports = { CompanyKnowledgeService };
