const logger = require('../utils/logger');
const database = require('../database/connection');

/**
 * Model Context Protocol (MCP) Integration Service
 * Allows agents to access external data sources via MCP
 * 
 * MCP is a protocol for connecting AI models to external data sources
 * This service manages MCP server connections and data retrieval
 */
class MCPIntegrationService {
    constructor() {
        this.db = database;
        this.connections = new Map(); // Cache active connections
    }

    /**
     * Register an MCP integration
     */
    async registerIntegration(userId, integrationData) {
        try {
            const { integration_name, integration_type, config, capabilities } = integrationData;

            const profileResult = await this.db.query(
                'SELECT id FROM company_profiles WHERE user_id = $1',
                [userId]
            );

            if (profileResult.rows.length === 0) {
                throw new Error('Company profile not found');
            }

            const companyProfileId = profileResult.rows[0].id;

            // Encrypt sensitive config data (in production, use proper encryption)
            const encryptedConfig = this.encryptConfig(config);

            const result = await this.db.query(
                `INSERT INTO mcp_integrations 
                 (company_profile_id, integration_name, integration_type, config, capabilities)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (company_profile_id, integration_name)
                 DO UPDATE SET 
                     integration_type = EXCLUDED.integration_type,
                     config = EXCLUDED.config,
                     capabilities = EXCLUDED.capabilities,
                     updated_at = NOW()
                 RETURNING id`,
                [companyProfileId, integration_name, integration_type, encryptedConfig, capabilities || []]
            );

            logger.info(`Registered MCP integration: ${integration_name} for user ${userId}`);
            return { success: true, integration_id: result.rows[0].id };
        } catch (error) {
            logger.error('Error registering MCP integration:', error);
            throw error;
        }
    }

    /**
     * Get MCP integrations for a company
     */
    async getIntegrations(userId) {
        try {
            const profileResult = await this.db.query(
                'SELECT id FROM company_profiles WHERE user_id = $1',
                [userId]
            );

            if (profileResult.rows.length === 0) {
                return [];
            }

            const companyProfileId = profileResult.rows[0].id;

            const result = await this.db.query(
                `SELECT id, integration_name, integration_type, capabilities, 
                        is_active, last_sync_at, created_at
                 FROM mcp_integrations
                 WHERE company_profile_id = $1 AND is_active = true
                 ORDER BY created_at DESC`,
                [companyProfileId]
            );

            // Decrypt configs (don't return full config for security)
            return result.rows.map(row => ({
                ...row,
                config_available: true // Indicate config exists but don't return it
            }));
        } catch (error) {
            logger.error('Error fetching MCP integrations:', error);
            throw error;
        }
    }

    /**
     * Query MCP integration for data
     */
    async queryIntegration(userId, integrationName, query, options = {}) {
        try {
            const profileResult = await this.db.query(
                'SELECT id FROM company_profiles WHERE user_id = $1',
                [userId]
            );

            if (profileResult.rows.length === 0) {
                throw new Error('Company profile not found');
            }

            const companyProfileId = profileResult.rows[0].id;

            // Get integration config
            const integrationResult = await this.db.query(
                `SELECT integration_type, config, capabilities
                 FROM mcp_integrations
                 WHERE company_profile_id = $1 AND integration_name = $2 AND is_active = true`,
                [companyProfileId, integrationName]
            );

            if (integrationResult.rows.length === 0) {
                throw new Error(`Integration '${integrationName}' not found`);
            }

            const integration = integrationResult.rows[0];
            const config = this.decryptConfig(integration.config);

            // Route to appropriate handler based on type
            switch (integration.integration_type) {
                case 'vector_db':
                    return await this.queryVectorDB(config, query, options);
                case 'api':
                    return await this.queryAPI(config, query, options);
                case 'database':
                    return await this.queryDatabase(config, query, options);
                case 'file_system':
                    return await this.queryFileSystem(config, query, options);
                default:
                    throw new Error(`Unsupported integration type: ${integration.integration_type}`);
            }
        } catch (error) {
            logger.error('Error querying MCP integration:', error);
            throw error;
        }
    }

    /**
     * Query vector database via MCP
     */
    async queryVectorDB(config, query, options) {
        // Example: Pinecone, Weaviate, Qdrant, etc.
        // This is a placeholder - implement based on your vector DB choice
        logger.info('Querying vector database via MCP:', { config: '***', query });
        
        // Return mock data structure
        return {
            results: [],
            count: 0,
            integration_type: 'vector_db'
        };
    }

    /**
     * Query external API via MCP
     */
    async queryAPI(config, query, options) {
        const axios = require('axios');
        
        try {
            const { url, method = 'GET', headers = {}, auth } = config;
            
            const response = await axios({
                method,
                url: url + (query ? `?${new URLSearchParams(query).toString()}` : ''),
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                auth,
                data: options.body
            });

            return {
                data: response.data,
                status: response.status,
                integration_type: 'api'
            };
        } catch (error) {
            logger.error('Error querying API via MCP:', error);
            throw error;
        }
    }

    /**
     * Query external database via MCP
     */
    async queryDatabase(config, query, options) {
        // Example: Connect to external PostgreSQL, MySQL, etc.
        // This is a placeholder - implement based on your needs
        logger.info('Querying database via MCP:', { config: '***', query });
        
        return {
            results: [],
            count: 0,
            integration_type: 'database'
        };
    }

    /**
     * Query file system via MCP
     */
    async queryFileSystem(config, query, options) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const { base_path, allowed_extensions = [] } = config;
            const searchPath = path.join(base_path, query || '');

            const files = await fs.readdir(searchPath, { withFileTypes: true });
            const results = [];

            for (const file of files) {
                if (file.isFile()) {
                    const ext = path.extname(file.name);
                    if (allowed_extensions.length === 0 || allowed_extensions.includes(ext)) {
                        const content = await fs.readFile(path.join(searchPath, file.name), 'utf-8');
                        results.push({
                            name: file.name,
                            path: path.join(searchPath, file.name),
                            content: content.substring(0, 10000) // Limit content size
                        });
                    }
                }
            }

            return {
                results,
                count: results.length,
                integration_type: 'file_system'
            };
        } catch (error) {
            logger.error('Error querying file system via MCP:', error);
            throw error;
        }
    }

    /**
     * Encrypt config (placeholder - use proper encryption in production)
     */
    encryptConfig(config) {
        // In production, use crypto or a library like node-forge
        // For now, just return as-is (store encrypted in production!)
        return config;
    }

    /**
     * Decrypt config (placeholder - use proper decryption in production)
     */
    decryptConfig(encryptedConfig) {
        // In production, decrypt here
        return encryptedConfig;
    }

    /**
     * Get MCP data for agent context
     */
    async getDataForAgent(agentId, query = null) {
        try {
            const agentResult = await this.db.query(
                'SELECT user_id FROM ai_agents WHERE id = $1',
                [agentId]
            );

            if (agentResult.rows.length === 0) {
                return [];
            }

            const userId = agentResult.rows[0].user_id;
            const integrations = await this.getIntegrations(userId);

            const allData = [];
            for (const integration of integrations) {
                try {
                    const data = await this.queryIntegration(userId, integration.integration_name, query);
                    allData.push({
                        integration: integration.integration_name,
                        type: integration.integration_type,
                        data: data
                    });
                } catch (error) {
                    logger.warn(`Failed to query integration ${integration.integration_name}:`, error.message);
                }
            }

            return allData;
        } catch (error) {
            logger.error('Error getting MCP data for agent:', error);
            return [];
        }
    }
}

module.exports = MCPIntegrationService;

