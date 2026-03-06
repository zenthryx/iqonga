const { Pool } = require('pg');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect(retries = 3, delay = 2000) {
    if (this.isConnected) {
      return this.pool;
    }

    // Parse the DATABASE_URL or use individual components
    const config = this.parseConnectionString(process.env.DATABASE_URL);
    
    this.pool = new Pool({
      ...config,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Increased to 5 seconds for initial connection
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
    });

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        this.isConnected = true;
        logger.info('✅ PostgreSQL connected successfully');
        
        // Set up connection event handlers
        this.pool.on('connect', () => {
          logger.debug('New PostgreSQL client connected');
        });

        this.pool.on('error', (err) => {
          logger.error('Unexpected error on idle PostgreSQL client:', err);
        });

        return this.pool;
      } catch (error) {
        if (attempt === retries) {
          // Last attempt failed
          logger.error(`❌ Failed to connect to PostgreSQL after ${retries} attempts:`, error);
          throw error;
        } else {
          // Log warning but retry
          logger.warn(`⚠️ Database connection attempt ${attempt}/${retries} failed, retrying in ${delay}ms...`, {
            error: error.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff: 2s, 4s, 8s
        }
      }
    }
  }

  parseConnectionString(connectionString) {
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }

    try {
      const url = new URL(connectionString);
      // Support sslmode in URL (e.g. ?sslmode=require) or DATABASE_SSL=true for remote DB (e.g. Vultr)
      const needSsl = process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1' ||
        (url.searchParams.get('sslmode') && url.searchParams.get('sslmode') !== 'disable');
      const ssl = needSsl || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false;

      return {
        user: url.username,
        password: url.password,
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1).split('?')[0], // path without query
        ssl
      };
    } catch (error) {
      logger.error('Failed to parse DATABASE_URL:', error);
      throw error;
    }
  }

  async query(text, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Database query error:', {
        error: error.message,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params
      });
      throw error;
    }
  }

  async getClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return await this.pool.connect();
  }

  async transaction(callback) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('✅ PostgreSQL disconnected');
    }
  }

  // Health check method
  async isHealthy() {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Get connection info
  getConnectionInfo() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// Create singleton instance
const database = new Database();

module.exports = database; 