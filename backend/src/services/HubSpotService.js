const axios = require('axios');
const logger = require('../utils/logger');
const database = require('../database/connection');

class HubSpotService {
  constructor() {
    this.baseURL = 'https://api.hubapi.com';
    this.accessToken = null;
    this.portalId = null;
  }

  /**
   * Initialize HubSpot service with credentials
   */
  async initialize(portalId, accessToken) {
    this.portalId = portalId;
    this.accessToken = accessToken;
    
    // Test connection
    try {
      await this.testConnection();
      logger.info('HubSpot service initialized successfully', { portalId });
      return true;
    } catch (error) {
      logger.error('Failed to initialize HubSpot service:', error);
      throw error;
    }
  }

  /**
   * Test HubSpot API connection
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/crm/v3/objects/contacts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 1
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error('HubSpot connection test failed:', error.response?.data || error.message);
      throw new Error(`HubSpot connection failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Sync contacts from HubSpot
   */
  async syncContacts(companyProfileId) {
    try {
      logger.info('Starting HubSpot contacts sync', { companyProfileId });
      
      // Get or create account record
      const account = await this.getOrCreateAccount(companyProfileId);
      
      let after = null;
      let allContacts = [];
      
      do {
        const response = await this.fetchContactsPage(after);
        allContacts = allContacts.concat(response.results);
        after = response.paging?.next?.after;
      } while (after);

      logger.info(`Fetched ${allContacts.length} contacts from HubSpot`);

      // Process and save contacts
      for (const contact of allContacts) {
        await this.saveContact(account.id, contact);
      }

      // Update last sync time
      await database.query(
        'UPDATE hubspot_accounts SET last_sync_at = NOW() WHERE id = $1',
        [account.id]
      );

      logger.info('HubSpot contacts sync completed successfully');
      return { success: true, contactsCount: allContacts.length };
      
    } catch (error) {
      logger.error('HubSpot contacts sync failed:', error);
      throw error;
    }
  }

  /**
   * Fetch contacts page from HubSpot API
   */
  async fetchContactsPage(after = null) {
    try {
      const params = {
        limit: 100,
        properties: 'email,firstname,lastname,phone,company,jobtitle,hs_lead_status,lifecyclestage,hs_lead_score,lastactivitydate'
      };
      
      if (after) {
        params.after = after;
      }

      const response = await axios.get(`${this.baseURL}/crm/v3/objects/contacts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch HubSpot contacts page:', error);
      throw error;
    }
  }

  /**
   * Save contact to database
   */
  async saveContact(accountId, contact) {
    try {
      const properties = contact.properties || {};
      
      await database.query(`
        INSERT INTO hubspot_contacts (
          hubspot_account_id, hubspot_contact_id, email, first_name, last_name,
          phone, company, job_title, lead_status, lifecycle_stage, lead_score, last_activity_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (hubspot_account_id, hubspot_contact_id)
        DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          company = EXCLUDED.company,
          job_title = EXCLUDED.job_title,
          lead_status = EXCLUDED.lead_status,
          lifecycle_stage = EXCLUDED.lifecycle_stage,
          lead_score = EXCLUDED.lead_score,
          last_activity_date = EXCLUDED.last_activity_date,
          updated_at = NOW()
      `, [
        accountId,
        contact.id,
        properties.email,
        properties.firstname,
        properties.lastname,
        properties.phone,
        properties.company,
        properties.jobtitle,
        properties.hs_lead_status,
        properties.lifecyclestage,
        parseInt(properties.hs_lead_score || 0),
        properties.lastactivitydate ? new Date(properties.lastactivitydate) : null
      ]);
    } catch (error) {
      logger.error('Failed to save HubSpot contact:', error);
      throw error;
    }
  }

  /**
   * Sync deals from HubSpot
   */
  async syncDeals(companyProfileId) {
    try {
      logger.info('Starting HubSpot deals sync', { companyProfileId });
      
      const account = await this.getOrCreateAccount(companyProfileId);
      
      let after = null;
      let allDeals = [];
      
      do {
        const response = await this.fetchDealsPage(after);
        allDeals = allDeals.concat(response.results);
        after = response.paging?.next?.after;
      } while (after);

      logger.info(`Fetched ${allDeals.length} deals from HubSpot`);

      // Process and save deals
      for (const deal of allDeals) {
        await this.saveDeal(account.id, deal);
      }

      logger.info('HubSpot deals sync completed successfully');
      return { success: true, dealsCount: allDeals.length };
      
    } catch (error) {
      logger.error('HubSpot deals sync failed:', error);
      throw error;
    }
  }

  /**
   * Fetch deals page from HubSpot API
   */
  async fetchDealsPage(after = null) {
    try {
      const params = {
        limit: 100,
        properties: 'dealname,amount,dealstage,dealtype,closedate,hubspot_owner_id,associatedcontactids,associatedcompanyids,pipeline'
      };
      
      if (after) {
        params.after = after;
      }

      const response = await axios.get(`${this.baseURL}/crm/v3/objects/deals`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch HubSpot deals page:', error);
      throw error;
    }
  }

  /**
   * Save deal to database
   */
  async saveDeal(accountId, deal) {
    try {
      const properties = deal.properties || {};
      
      await database.query(`
        INSERT INTO hubspot_deals (
          hubspot_account_id, hubspot_deal_id, deal_name, amount, currency,
          deal_stage, deal_type, close_date, owner_id, contact_id, company_id, pipeline
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (hubspot_account_id, hubspot_deal_id)
        DO UPDATE SET
          deal_name = EXCLUDED.deal_name,
          amount = EXCLUDED.amount,
          currency = EXCLUDED.currency,
          deal_stage = EXCLUDED.deal_stage,
          deal_type = EXCLUDED.deal_type,
          close_date = EXCLUDED.close_date,
          owner_id = EXCLUDED.owner_id,
          contact_id = EXCLUDED.contact_id,
          company_id = EXCLUDED.company_id,
          pipeline = EXCLUDED.pipeline,
          updated_at = NOW()
      `, [
        accountId,
        deal.id,
        properties.dealname,
        properties.amount ? parseFloat(properties.amount) : null,
        properties.currency || 'USD',
        properties.dealstage,
        properties.dealtype,
        properties.closedate ? new Date(properties.closedate) : null,
        properties.hubspot_owner_id,
        properties.associatedcontactids ? properties.associatedcontactids.split(',')[0] : null,
        properties.associatedcompanyids ? properties.associatedcompanyids.split(',')[0] : null,
        properties.pipeline
      ]);
    } catch (error) {
      logger.error('Failed to save HubSpot deal:', error);
      throw error;
    }
  }

  /**
   * Sync companies from HubSpot
   */
  async syncCompanies(companyProfileId) {
    try {
      logger.info('Starting HubSpot companies sync', { companyProfileId });
      
      const account = await this.getOrCreateAccount(companyProfileId);
      
      let after = null;
      let allCompanies = [];
      
      do {
        const response = await this.fetchCompaniesPage(after);
        allCompanies = allCompanies.concat(response.results);
        after = response.paging?.next?.after;
      } while (after);

      logger.info(`Fetched ${allCompanies.length} companies from HubSpot`);

      // Process and save companies
      for (const company of allCompanies) {
        await this.saveCompany(account.id, company);
      }

      logger.info('HubSpot companies sync completed successfully');
      return { success: true, companiesCount: allCompanies.length };
      
    } catch (error) {
      logger.error('HubSpot companies sync failed:', error);
      throw error;
    }
  }

  /**
   * Fetch companies page from HubSpot API
   */
  async fetchCompaniesPage(after = null) {
    try {
      const params = {
        limit: 100,
        properties: 'name,domain,industry,city,state,country,phone,website,num_employees,annualrevenue,lifecyclestage,hs_lead_status'
      };
      
      if (after) {
        params.after = after;
      }

      const response = await axios.get(`${this.baseURL}/crm/v3/objects/companies`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch HubSpot companies page:', error);
      throw error;
    }
  }

  /**
   * Save company to database
   */
  async saveCompany(accountId, company) {
    try {
      const properties = company.properties || {};
      
      await database.query(`
        INSERT INTO hubspot_companies (
          hubspot_account_id, hubspot_company_id, company_name, domain, industry,
          city, state, country, phone, website, number_of_employees, annual_revenue,
          lifecycle_stage, lead_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (hubspot_account_id, hubspot_company_id)
        DO UPDATE SET
          company_name = EXCLUDED.company_name,
          domain = EXCLUDED.domain,
          industry = EXCLUDED.industry,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          country = EXCLUDED.country,
          phone = EXCLUDED.phone,
          website = EXCLUDED.website,
          number_of_employees = EXCLUDED.number_of_employees,
          annual_revenue = EXCLUDED.annual_revenue,
          lifecycle_stage = EXCLUDED.lifecycle_stage,
          lead_status = EXCLUDED.lead_status,
          updated_at = NOW()
      `, [
        accountId,
        company.id,
        properties.name,
        properties.domain,
        properties.industry,
        properties.city,
        properties.state,
        properties.country,
        properties.phone,
        properties.website,
        properties.num_employees ? parseInt(properties.num_employees) : null,
        properties.annualrevenue ? parseFloat(properties.annualrevenue) : null,
        properties.lifecyclestage,
        properties.hs_lead_status
      ]);
    } catch (error) {
      logger.error('Failed to save HubSpot company:', error);
      throw error;
    }
  }

  /**
   * Get or create account record
   */
  async getOrCreateAccount(companyProfileId) {
    try {
      const result = await database.query(`
        SELECT * FROM hubspot_accounts 
        WHERE company_profile_id = $1 AND status = 'active'
        LIMIT 1
      `, [companyProfileId]);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      const newAccount = await database.query(`
        INSERT INTO hubspot_accounts (
          company_profile_id, portal_id, access_token, status
        ) VALUES ($1, $2, $3, 'active')
        RETURNING *
      `, [companyProfileId, this.portalId, this.accessToken]);

      return newAccount.rows[0];
    } catch (error) {
      logger.error('Failed to get or create HubSpot account:', error);
      throw error;
    }
  }

  /**
   * Get contacts for AI content generation
   */
  async getContactsForAI(companyProfileId) {
    try {
      const result = await database.query(`
        SELECT 
          hc.email,
          hc.first_name,
          hc.last_name,
          hc.company,
          hc.job_title,
          hc.lead_status,
          hc.lifecycle_stage,
          hc.lead_score
        FROM hubspot_contacts hc
        JOIN hubspot_accounts ha ON hc.hubspot_account_id = ha.id
        WHERE ha.company_profile_id = $1
        ORDER BY hc.lead_score DESC, hc.last_activity_date DESC
        LIMIT 100
      `, [companyProfileId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get HubSpot contacts for AI:', error);
      return [];
    }
  }

  /**
   * Get deals for AI content generation
   */
  async getDealsForAI(companyProfileId) {
    try {
      const result = await database.query(`
        SELECT 
          hd.deal_name,
          hd.amount,
          hd.deal_stage,
          hd.deal_type,
          hd.close_date,
          hd.pipeline
        FROM hubspot_deals hd
        JOIN hubspot_accounts ha ON hd.hubspot_account_id = ha.id
        WHERE ha.company_profile_id = $1
        ORDER BY hd.amount DESC, hd.close_date DESC
        LIMIT 50
      `, [companyProfileId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get HubSpot deals for AI:', error);
      return [];
    }
  }

  /**
   * Get companies for AI content generation
   */
  async getCompaniesForAI(companyProfileId) {
    try {
      const result = await database.query(`
        SELECT 
          hc.company_name,
          hc.domain,
          hc.industry,
          hc.city,
          hc.state,
          hc.country,
          hc.number_of_employees,
          hc.annual_revenue,
          hc.lifecycle_stage
        FROM hubspot_companies hc
        JOIN hubspot_accounts ha ON hc.hubspot_account_id = ha.id
        WHERE ha.company_profile_id = $1
        ORDER BY hc.annual_revenue DESC
        LIMIT 50
      `, [companyProfileId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get HubSpot companies for AI:', error);
      return [];
    }
  }
}

module.exports = new HubSpotService();
