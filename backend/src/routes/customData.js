const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const CustomDataService = require('../services/CustomDataService');
const MCPIntegrationService = require('../services/MCPIntegrationService');
const logger = require('../utils/logger');

const customDataService = new CustomDataService();
const mcpService = new MCPIntegrationService();

/**
 * Custom Data Schema Management
 */

// Create or update a custom data schema
router.post('/schemas', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await customDataService.createSchema(userId, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error creating schema:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create schema' 
        });
    }
});

// Get all schemas for company
router.get('/schemas', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const schemas = await customDataService.getSchemas(userId);
        res.json({ success: true, data: schemas });
    } catch (error) {
        logger.error('Error fetching schemas:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch schemas' 
        });
    }
});

// Delete a schema
router.delete('/schemas/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { hardDelete } = req.query; // Optional query parameter for hard delete
        
        const result = await customDataService.deleteSchema(userId, id, hardDelete === 'true');
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error deleting schema:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to delete schema' 
        });
    }
});

/**
 * Custom Business Data Management
 */

// Add or update custom data entry
router.post('/data', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { schema_name, data, tags, status, metadata } = req.body;
        
        const result = await customDataService.upsertData(userId, schema_name, data, {
            tags: tags || [],
            status: status || 'active',
            metadata: metadata || {}
        });
        
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error upserting custom data:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to save data' 
        });
    }
});

// Get custom data entries
router.get('/data', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { schema_name, status, tags, search, limit, offset } = req.query;
        
        const filters = {
            schema_name: schema_name || null,
            status: status || 'active',
            tags: tags ? tags.split(',') : [],
            search: search || null,
            limit: parseInt(limit) || 100,
            offset: parseInt(offset) || 0
        };
        
        const data = await customDataService.getData(userId, filters.schema_name, filters);
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Error fetching custom data:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch data' 
        });
    }
});

// Semantic search in custom data
router.post('/data/search', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { query, schema_name, threshold, limit } = req.body;
        
        if (!query) {
            return res.status(400).json({ 
                success: false, 
                error: 'Search query is required' 
            });
        }
        
        const results = await customDataService.semanticSearch(userId, query, {
            schemaName: schema_name || null,
            threshold: threshold || 0.7,
            limit: limit || 10
        });
        
        res.json({ success: true, data: results });
    } catch (error) {
        logger.error('Error in semantic search:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Search failed' 
        });
    }
});

// Delete custom data entry
router.delete('/data/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const result = await customDataService.deleteData(userId, id);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error deleting custom data:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to delete data' 
        });
    }
});

/**
 * Agent Access Management
 */

// Grant agent access to custom data schema
router.post('/agent-access', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { agent_id, schema_id, access_level, filters } = req.body;
        
        if (!agent_id || !schema_id) {
            return res.status(400).json({
                success: false,
                error: 'agent_id and schema_id are required'
            });
        }
        
        const database = require('../database/connection');
        
        const result = await database.query(
            `INSERT INTO agent_custom_data_access 
             (agent_id, schema_id, access_level, filters)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (agent_id, schema_id)
             DO UPDATE SET 
                 access_level = EXCLUDED.access_level,
                 filters = EXCLUDED.filters,
                 is_active = true
             RETURNING id`,
            [agent_id, schema_id, access_level || 'read', JSON.stringify(filters || {})]
        );
        
        res.json({ success: true, data: { id: result.rows[0].id } });
    } catch (error) {
        logger.error('Error granting agent access:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to grant access' 
        });
    }
});

// Get agent accesses for a schema or all schemas
router.get('/agent-access', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { schema_id } = req.query;
        
        const database = require('../database/connection');
        
        let query = `
            SELECT 
                acda.id,
                acda.agent_id,
                acda.schema_id,
                acda.access_level,
                acda.filters,
                acda.is_active,
                acda.created_at,
                a.name as agent_name,
                cs.schema_name
            FROM agent_custom_data_access acda
            JOIN ai_agents a ON acda.agent_id = a.id
            JOIN custom_data_schemas cs ON acda.schema_id = cs.id
            JOIN company_profiles cp ON cs.company_profile_id = cp.id
            WHERE cp.user_id = $1
        `;
        const params = [userId];
        
        if (schema_id) {
            query += ` AND acda.schema_id = $2`;
            params.push(schema_id);
        }
        
        query += ` ORDER BY acda.created_at DESC`;
        
        const result = await database.query(query, params);
        
        const accesses = result.rows.map(row => ({
            ...row,
            filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters
        }));
        
        res.json({ success: true, data: accesses });
    } catch (error) {
        logger.error('Error fetching agent accesses:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch agent accesses' 
        });
    }
});

// Revoke agent access
router.delete('/agent-access/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const database = require('../database/connection');
        
        // Verify ownership through schema
        const verifyResult = await database.query(
            `SELECT acda.id 
             FROM agent_custom_data_access acda
             JOIN custom_data_schemas cs ON acda.schema_id = cs.id
             JOIN company_profiles cp ON cs.company_profile_id = cp.id
             WHERE acda.id = $1 AND cp.user_id = $2`,
            [id, userId]
        );
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Access grant not found'
            });
        }
        
        await database.query(
            `DELETE FROM agent_custom_data_access WHERE id = $1`,
            [id]
        );
        
        res.json({ success: true, message: 'Access revoked successfully' });
    } catch (error) {
        logger.error('Error revoking agent access:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to revoke access' 
        });
    }
});

/**
 * MCP Integration Management
 */

// Register MCP integration
router.post('/mcp/integrations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await mcpService.registerIntegration(userId, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error registering MCP integration:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to register integration' 
        });
    }
});

// Get MCP integrations
router.get('/mcp/integrations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const integrations = await mcpService.getIntegrations(userId);
        res.json({ success: true, data: integrations });
    } catch (error) {
        logger.error('Error fetching MCP integrations:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch integrations' 
        });
    }
});

// Query MCP integration
router.post('/mcp/query', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { integration_name, query, options } = req.body;
        
        if (!integration_name || !query) {
            return res.status(400).json({ 
                success: false, 
                error: 'Integration name and query are required' 
            });
        }
        
        const result = await mcpService.queryIntegration(userId, integration_name, query, options || {});
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error querying MCP integration:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Query failed' 
        });
    }
});

module.exports = router;

