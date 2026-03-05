const axios = require('axios');
const logger = require('../utils/logger');
const database = require('../database/connection');

class ShopifyService {
  constructor() {
    this.apiVersion = '2025-10';
  }

  /**
   * Get user's Shopify configuration
   */
  async getUserShopifyConfig(userId) {
    try {
      const result = await database.query(
        'SELECT shop_domain, access_token, scope FROM user_shopify_configs WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('No Shopify store connected for this user');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get user Shopify config:', error);
      throw error;
    }
  }

  /**
   * Initialize Shopify service for a specific user
   */
  async initializeForUser(userId) {
    try {
      const config = await this.getUserShopifyConfig(userId);
      
      this.baseURL = `https://${config.shop_domain}/admin/api/${this.apiVersion}`;
      this.accessToken = config.access_token;
      
      // Test connection
      await this.testConnection();
      logger.info('Shopify service initialized for user', { userId, shop_domain: config.shop_domain });
      return true;
    } catch (error) {
      logger.error('Failed to initialize Shopify service for user:', error);
      throw error;
    }
  }

  /**
   * Test Shopify API connection
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.shop;
    } catch (error) {
      logger.error('Shopify connection test failed:', error.response?.data || error.message);
      throw new Error(`Shopify connection failed: ${error.response?.data?.errors || error.message}`);
    }
  }

  /**
   * Sync products from user's Shopify store
   */
  async syncProductsForUser(userId) {
    try {
      await this.initializeForUser(userId);
      logger.info('Starting Shopify products sync for user', { userId });
      
      let pageInfo = null;
      let allProducts = [];
      
      do {
        const response = await this.fetchProductsPage(pageInfo);
        allProducts = allProducts.concat(response.products);
        pageInfo = response.pageInfo;
      } while (pageInfo?.hasNextPage);

      logger.info(`Fetched ${allProducts.length} products from Shopify for user ${userId}`);

      // Process and save products for this user
      for (const product of allProducts) {
        await this.saveProductForUser(userId, product);
      }

      // Update last sync time
      await database.query(
        'UPDATE user_shopify_configs SET last_sync_at = NOW() WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      logger.info('Shopify products sync completed successfully for user', { userId });
      return { success: true, productsCount: allProducts.length };
      
    } catch (error) {
      logger.error('Shopify products sync failed for user:', error);
      throw error;
    }
  }

  /**
   * Fetch products page from Shopify API
   */
  async fetchProductsPage(pageInfo = null) {
    try {
      let url = `${this.baseURL}/products.json?limit=250`;
      if (pageInfo?.nextPageUrl) {
        url = pageInfo.nextPageUrl;
      }

      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });

      return {
        products: response.data.products,
        pageInfo: this.extractPageInfo(response.headers.link)
      };
    } catch (error) {
      logger.error('Failed to fetch Shopify products page:', error);
      throw error;
    }
  }

  /**
   * Save product to database for specific user
   */
  async saveProductForUser(userId, product) {
    try {
      // Insert or update product in user's Shopify data
      await database.query(`
        INSERT INTO user_shopify_products (
          user_id, shopify_product_id, title, description, handle,
          product_type, vendor, tags, status, published_at, price, inventory_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (user_id, shopify_product_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          handle = EXCLUDED.handle,
          product_type = EXCLUDED.product_type,
          vendor = EXCLUDED.vendor,
          tags = EXCLUDED.tags,
          status = EXCLUDED.status,
          published_at = EXCLUDED.published_at,
          price = EXCLUDED.price,
          inventory_quantity = EXCLUDED.inventory_quantity,
          updated_at = NOW()
      `, [
        userId,
        product.id,
        product.title,
        product.body_html,
        product.handle,
        product.product_type,
        product.vendor,
        product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
        product.status,
        product.published_at,
        product.variants && product.variants.length > 0 ? parseFloat(product.variants[0].price) : 0,
        product.variants && product.variants.length > 0 ? product.variants[0].inventory_quantity : 0
      ]);

    } catch (error) {
      logger.error('Failed to save Shopify product for user:', error);
      throw error;
    }
  }

  /**
   * Sync customers from Shopify
   */
  async syncCustomers(companyProfileId) {
    try {
      logger.info('Starting Shopify customers sync', { companyProfileId });
      
      const store = await this.getOrCreateStore(companyProfileId);
      
      let pageInfo = null;
      let allCustomers = [];
      
      do {
        const response = await this.fetchCustomersPage(pageInfo);
        allCustomers = allCustomers.concat(response.customers);
        pageInfo = response.pageInfo;
      } while (pageInfo?.hasNextPage);

      logger.info(`Fetched ${allCustomers.length} customers from Shopify`);

      // Process and save customers
      for (const customer of allCustomers) {
        await this.saveCustomer(store.id, customer);
      }

      logger.info('Shopify customers sync completed successfully');
      return { success: true, customersCount: allCustomers.length };
      
    } catch (error) {
      logger.error('Shopify customers sync failed:', error);
      throw error;
    }
  }

  /**
   * Fetch customers page from Shopify API
   */
  async fetchCustomersPage(pageInfo = null) {
    try {
      let url = `${this.baseURL}/customers.json?limit=250`;
      if (pageInfo?.nextPageUrl) {
        url = pageInfo.nextPageUrl;
      }

      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });

      return {
        customers: response.data.customers,
        pageInfo: this.extractPageInfo(response.headers.link)
      };
    } catch (error) {
      logger.error('Failed to fetch Shopify customers page:', error);
      throw error;
    }
  }

  /**
   * Save customer to database
   */
  async saveCustomer(storeId, customer) {
    try {
      await database.query(`
        INSERT INTO shopify_customers (
          shopify_store_id, shopify_customer_id, email, first_name, last_name,
          phone, total_spent, orders_count, state, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (shopify_store_id, shopify_customer_id)
        DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          total_spent = EXCLUDED.total_spent,
          orders_count = EXCLUDED.orders_count,
          state = EXCLUDED.state,
          tags = EXCLUDED.tags,
          updated_at = NOW()
      `, [
        storeId,
        customer.id,
        customer.email,
        customer.first_name,
        customer.last_name,
        customer.phone,
        parseFloat(customer.total_spent || 0),
        customer.orders_count || 0,
        customer.state,
        customer.tags ? customer.tags.split(',').map(tag => tag.trim()) : []
      ]);
    } catch (error) {
      logger.error('Failed to save Shopify customer:', error);
      throw error;
    }
  }

  /**
   * Get or create store record
   */
  async getOrCreateStore(companyProfileId) {
    try {
      const result = await database.query(`
        SELECT * FROM shopify_stores 
        WHERE company_profile_id = $1 AND status = 'active'
        LIMIT 1
      `, [companyProfileId]);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Extract store domain from baseURL
      const storeDomain = this.baseURL.match(/https:\/\/(.+)\.myshopify\.com/)?.[1];
      
      const newStore = await database.query(`
        INSERT INTO shopify_stores (
          company_profile_id, store_domain, access_token, api_version, status
        ) VALUES ($1, $2, $3, $4, 'active')
        RETURNING *
      `, [companyProfileId, storeDomain, this.accessToken, this.apiVersion]);

      return newStore.rows[0];
    } catch (error) {
      logger.error('Failed to get or create Shopify store:', error);
      throw error;
    }
  }

  /**
   * Extract pagination info from Link header
   */
  extractPageInfo(linkHeader) {
    if (!linkHeader) return null;
    
    const links = linkHeader.split(',').map(link => {
      const [url, rel] = link.split(';');
      return {
        url: url.trim().slice(1, -1), // Remove < >
        rel: rel.trim().split('=')[1].slice(1, -1) // Remove quotes
      };
    });

    const nextLink = links.find(link => link.rel === 'next');
    return nextLink ? { hasNextPage: true, nextPageUrl: nextLink.url } : null;
  }

  /**
   * Get products for AI content generation
   */
  async getProductsForAI(companyProfileId) {
    try {
      const result = await database.query(`
        SELECT 
          sp.title,
          sp.description,
          sp.product_type,
          sp.vendor,
          sp.tags,
          sv.price,
          sv.compare_at_price,
          sv.inventory_quantity,
          sv.sku
        FROM shopify_products sp
        JOIN shopify_stores ss ON sp.shopify_store_id = ss.id
        JOIN shopify_variants sv ON sp.id = sv.shopify_product_id
        WHERE ss.company_profile_id = $1 
        AND sp.status = 'active'
        AND sv.status = 'active'
        ORDER BY sp.created_at DESC
        LIMIT 50
      `, [companyProfileId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get Shopify products for AI:', error);
      return [];
    }
  }

  /**
   * Get customers for AI content generation
   */
  async getCustomersForAI(companyProfileId) {
    try {
      const result = await database.query(`
        SELECT 
          sc.email,
          sc.first_name,
          sc.last_name,
          sc.total_spent,
          sc.orders_count,
          sc.tags
        FROM shopify_customers sc
        JOIN shopify_stores ss ON sc.shopify_store_id = ss.id
        WHERE ss.company_profile_id = $1
        ORDER BY sc.total_spent DESC
        LIMIT 100
      `, [companyProfileId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get Shopify customers for AI:', error);
      return [];
    }
  }
}

module.exports = new ShopifyService();
