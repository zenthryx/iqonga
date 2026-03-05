const database = require('../database/connection');
const logger = require('../utils/logger');
const VectorDatabaseService = require('./VectorDatabaseService');

class CustomDataService {
    constructor() {
        this.db = database;
        this.vectorService = new VectorDatabaseService();
    }

    /**
     * Create or update a custom data schema
     */
    async createSchema(userId, schemaData) {
        try {
            const { schema_name, schema_definition, country_code, region } = schemaData;

            // Get company profile
            const profileResult = await this.db.query(
                'SELECT id FROM company_profiles WHERE user_id = $1',
                [userId]
            );

            if (profileResult.rows.length === 0) {
                throw new Error('Company profile not found');
            }

            const companyProfileId = profileResult.rows[0].id;

            // Check if schema exists
            const existing = await this.db.query(
                `SELECT id FROM custom_data_schemas 
                 WHERE company_profile_id = $1 AND schema_name = $2 
                 AND (country_code = $3 OR (country_code IS NULL AND $3 IS NULL))`,
                [companyProfileId, schema_name, country_code || null]
            );

            let schemaId;
            let fullSchema;
            if (existing.rows.length > 0) {
                // Update existing schema
                const result = await this.db.query(
                    `UPDATE custom_data_schemas 
                     SET schema_definition = $1, region = $2, updated_at = NOW()
                     WHERE id = $3
                     RETURNING id, schema_name, schema_version, schema_definition, 
                               country_code, region, is_active, created_at, updated_at`,
                    [schema_definition, region || null, existing.rows[0].id]
                );
                fullSchema = result.rows[0];
                schemaId = fullSchema.id;
                logger.info(`Updated custom data schema: ${schema_name} for user ${userId}`);
            } else {
                // Create new schema
                const result = await this.db.query(
                    `INSERT INTO custom_data_schemas 
                     (company_profile_id, schema_name, schema_definition, country_code, region)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id, schema_name, schema_version, schema_definition, 
                               country_code, region, is_active, created_at, updated_at`,
                    [companyProfileId, schema_name, schema_definition, country_code || null, region || null]
                );
                fullSchema = result.rows[0];
                schemaId = fullSchema.id;
                logger.info(`Created custom data schema: ${schema_name} for user ${userId}`);
            }

            return fullSchema;
        } catch (error) {
            logger.error('Error creating custom data schema:', error);
            throw error;
        }
    }

    /**
     * Delete a custom data schema
     * @param {number} userId - User ID
     * @param {string} schemaId - Schema ID to delete
     * @param {boolean} hardDelete - If true, permanently delete. If false, soft delete (set is_active = false)
     * @returns {Promise<Object>}
     */
    async deleteSchema(userId, schemaId, hardDelete = false) {
        try {
            // Get company profile
            const profileResult = await this.db.query(
                'SELECT id FROM company_profiles WHERE user_id = $1',
                [userId]
            );

            if (profileResult.rows.length === 0) {
                throw new Error('Company profile not found');
            }

            const companyProfileId = profileResult.rows[0].id;

            // Verify ownership
            const schemaCheck = await this.db.query(
                `SELECT id, schema_name, 
                 (SELECT COUNT(*) FROM custom_business_data WHERE schema_id = custom_data_schemas.id) as data_count,
                 (SELECT COUNT(*) FROM agent_custom_data_access WHERE schema_id = custom_data_schemas.id) as access_count
                 FROM custom_data_schemas 
                 WHERE id = $1 AND company_profile_id = $2`,
                [schemaId, companyProfileId]
            );

            if (schemaCheck.rows.length === 0) {
                throw new Error('Schema not found or access denied');
            }

            const schema = schemaCheck.rows[0];
            const dataCount = parseInt(schema.data_count) || 0;
            const accessCount = parseInt(schema.access_count) || 0;

            if (hardDelete) {
                // Hard delete - permanently remove schema and all related data
                // Note: CASCADE will automatically delete:
                // - All custom_business_data entries (ON DELETE CASCADE)
                // - All agent_custom_data_access entries (ON DELETE CASCADE)
                await this.db.query(
                    'DELETE FROM custom_data_schemas WHERE id = $1',
                    [schemaId]
                );
                logger.info(`Hard deleted schema ${schemaId} (${schema.schema_name}) with ${dataCount} data entries and ${accessCount} access grants`);
                return { 
                    success: true, 
                    action: 'deleted',
                    deleted_data_entries: dataCount,
                    deleted_access_grants: accessCount
                };
            } else {
                // Soft delete - just deactivate the schema
                await this.db.query(
                    'UPDATE custom_data_schemas SET is_active = false, updated_at = NOW() WHERE id = $1',
                    [schemaId]
                );
                logger.info(`Soft deleted (deactivated) schema ${schemaId} (${schema.schema_name})`);
                return { 
                    success: true, 
                    action: 'deactivated',
                    data_entries_preserved: dataCount,
                    access_grants_preserved: accessCount
                };
            }
        } catch (error) {
            logger.error('Error deleting schema:', error);
            throw error;
        }
    }

    /**
     * Get all schemas for a company
     */
    async getSchemas(userId) {
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
                `SELECT id, schema_name, schema_version, schema_definition, 
                        country_code, region, is_active, created_at
                 FROM custom_data_schemas
                 WHERE company_profile_id = $1 AND is_active = true
                 ORDER BY created_at DESC`,
                [companyProfileId]
            );

            return result.rows;
        } catch (error) {
            logger.error('Error fetching schemas:', error);
            throw error;
        }
    }

    /**
     * Add or update custom business data entry
     */
    async upsertData(userId, schemaName, data, options = {}) {
        try {
            const { tags = [], status = 'active', metadata = {} } = options;

            // Get company profile and schema
            const profileResult = await this.db.query(
                'SELECT id FROM company_profiles WHERE user_id = $1',
                [userId]
            );

            if (profileResult.rows.length === 0) {
                throw new Error('Company profile not found');
            }

            const companyProfileId = profileResult.rows[0].id;

            const schemaResult = await this.db.query(
                `SELECT id FROM custom_data_schemas 
                 WHERE company_profile_id = $1 AND schema_name = $2 AND is_active = true`,
                [companyProfileId, schemaName]
            );

            if (schemaResult.rows.length === 0) {
                throw new Error(`Schema '${schemaName}' not found`);
            }

            const schemaId = schemaResult.rows[0].id;

            // Generate search text from data (flatten JSON for full-text search)
            const searchText = this.generateSearchText(data);

            // Generate embedding for semantic search
            let embedding = null;
            try {
                const embeddingArray = await this.vectorService.generateEmbedding(searchText);
                // Format embedding for pgvector
                if (embeddingArray && Array.isArray(embeddingArray) && embeddingArray.length > 0) {
                    // Check if pgvector extension is available
                    const vectorCheck = await this.db.query(
                        "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector"
                    );
                    if (vectorCheck.rows[0]?.has_vector) {
                        // Store the array - will be formatted as PostgreSQL array literal when inserting
                        embedding = embeddingArray;
                    } else {
                        // pgvector not available, set to null
                        embedding = null;
                        logger.warn('pgvector extension not available, skipping embedding');
                    }
                }
            } catch (error) {
                logger.warn('Failed to generate embedding, continuing without it:', error.message);
                embedding = null;
            }

            // Check if entry exists (by ID in data or by other unique field)
            const dataId = data.id || data._id;
            let entryId = null;

            if (dataId) {
                const existing = await this.db.query(
                    `SELECT id FROM custom_business_data 
                     WHERE schema_id = $1 AND (data->>'id')::text = $2 OR (data->>'_id')::text = $2`,
                    [schemaId, dataId.toString()]
                );

                if (existing.rows.length > 0) {
                    entryId = existing.rows[0].id;
                }
            }

            if (entryId) {
                // Update existing entry
                // Handle vector embedding properly for pgvector
                let embeddingSql = 'NULL';
                let params = [data, searchText, tags, status, metadata, entryId];
                
                if (embedding && Array.isArray(embedding) && embedding.length > 0) {
                    // Format as PostgreSQL array literal with square brackets for pgvector
                    // Embed directly in SQL to avoid parameter type issues
                    const vectorString = '[' + embedding.join(',') + ']';
                    embeddingSql = `'${vectorString}'::vector`;
                }
                
                const result = await this.db.query(
                    `UPDATE custom_business_data 
                     SET data = $1, search_text = $2, 
                         embedding_vector = ${embeddingSql},
                         tags = $3, status = $4, metadata = $5, updated_at = NOW()
                     WHERE id = $6
                     RETURNING id`,
                    params
                );
                logger.info(`Updated custom data entry ${entryId} in schema ${schemaName}`);
                return { success: true, id: result.rows[0].id, action: 'updated' };
            } else {
                // Create new entry
                // Handle vector embedding properly for pgvector
                let embeddingSql = 'NULL';
                let params = [companyProfileId, schemaId, data, searchText, tags, status, metadata];
                
                if (embedding && Array.isArray(embedding) && embedding.length > 0) {
                    // Format as PostgreSQL array literal with square brackets for pgvector
                    // Embed directly in SQL to avoid parameter type issues
                    const vectorString = '[' + embedding.join(',') + ']';
                    embeddingSql = `'${vectorString}'::vector`;
                }
                
                const result = await this.db.query(
                    `INSERT INTO custom_business_data 
                     (company_profile_id, schema_id, data, search_text, embedding_vector, tags, status, metadata)
                     VALUES ($1, $2, $3, $4, ${embeddingSql}, $5, $6, $7)
                     RETURNING id`,
                    params
                );
                logger.info(`Created custom data entry in schema ${schemaName}`);
                return { success: true, id: result.rows[0].id, action: 'created' };
            }
        } catch (error) {
            logger.error('Error upserting custom data:', error);
            throw error;
        }
    }

    /**
     * Get custom data entries
     */
    async getData(userId, schemaName, filters = {}) {
        try {
            const { status = 'active', tags = [], limit = 100, offset = 0, search = null } = filters;

            const profileResult = await this.db.query(
                'SELECT id FROM company_profiles WHERE user_id = $1',
                [userId]
            );

            if (profileResult.rows.length === 0) {
                return [];
            }

            const companyProfileId = profileResult.rows[0].id;

            let query = `
                SELECT cbd.id, cbd.data, cbd.tags, cbd.status, cbd.metadata, 
                       cbd.created_at, cbd.updated_at, cds.schema_name
                FROM custom_business_data cbd
                JOIN custom_data_schemas cds ON cbd.schema_id = cds.id
                WHERE cbd.company_profile_id = $1
            `;

            const params = [companyProfileId];
            let paramIndex = 2;

            if (schemaName) {
                query += ` AND cds.schema_name = $${paramIndex}`;
                params.push(schemaName);
                paramIndex++;
            }

            if (status) {
                query += ` AND cbd.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            if (tags.length > 0) {
                query += ` AND cbd.tags && $${paramIndex}`;
                params.push(tags);
                paramIndex++;
            }

            if (search) {
                query += ` AND (
                    cbd.search_text ILIKE $${paramIndex} OR
                    cbd.data::text ILIKE $${paramIndex}
                )`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            query += ` ORDER BY cbd.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await this.db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching custom data:', error);
            throw error;
        }
    }

    /**
     * Semantic search in custom data
     */
    async semanticSearch(userId, query, options = {}) {
        try {
            const { schemaName = null, threshold = 0.7, limit = 10 } = options;

            const profileResult = await this.db.query(
                'SELECT id FROM company_profiles WHERE user_id = $1',
                [userId]
            );

            if (profileResult.rows.length === 0) {
                return [];
            }

            const companyProfileId = profileResult.rows[0].id;

            // Generate embedding for query
            const queryEmbedding = await this.vectorService.generateEmbedding(query);

            // Use vector similarity search
            const result = await this.db.query(
                `SELECT * FROM match_custom_data($1, $2, $3, $4, $5)`,
                [queryEmbedding, companyProfileId, schemaName, threshold, limit]
            );

            return result.rows;
        } catch (error) {
            logger.error('Error in semantic search:', error);
            throw error;
        }
    }

    /**
     * Get custom data for agent context
     */
    async getDataForAgent(agentId, query = null) {
        try {
            // Get agent's company
            const agentResult = await this.db.query(
                'SELECT user_id FROM ai_agents WHERE id = $1',
                [agentId]
            );

            if (agentResult.rows.length === 0) {
                return [];
            }

            const userId = agentResult.rows[0].user_id;

            // Get schemas this agent has access to
            const accessResult = await this.db.query(
                `SELECT cds.schema_name, acda.filters, acda.access_level
                 FROM agent_custom_data_access acda
                 JOIN custom_data_schemas cds ON acda.schema_id = cds.id
                 WHERE acda.agent_id = $1 AND acda.is_active = true`,
                [agentId]
            );

            if (accessResult.rows.length === 0) {
                // Agent has no specific access, return all active data
                return await this.getData(userId, null, { status: 'active', limit: 50 });
            }

            // Get data for each accessible schema
            const allData = [];
            for (const access of accessResult.rows) {
                const filters = access.filters || {};
                const data = await this.getData(userId, access.schema_name, {
                    ...filters,
                    status: filters.status || 'active'
                });
                allData.push(...data);
            }

            // If query provided, do semantic search
            if (query) {
                const semanticResults = await this.semanticSearch(userId, query, {
                    limit: 20
                });
                // Merge and deduplicate
                const semanticIds = new Set(semanticResults.map(r => r.id));
                return [...semanticResults, ...allData.filter(d => !semanticIds.has(d.id))];
            }

            return allData;
        } catch (error) {
            logger.error('Error getting custom data for agent:', error);
            return [];
        }
    }

    /**
     * Generate searchable text from JSON data
     */
    generateSearchText(data) {
        const flatten = (obj, prefix = '') => {
            let text = '';
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    const newKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        text += flatten(value, newKey) + ' ';
                    } else if (Array.isArray(value)) {
                        text += value.join(' ') + ' ';
                    } else {
                        text += String(value) + ' ';
                    }
                }
            }
            return text;
        };
        return flatten(data).trim();
    }

    /**
     * Delete custom data entry
     */
    async deleteData(userId, entryId) {
        try {
            const profileResult = await this.db.query(
                'SELECT id FROM company_profiles WHERE user_id = $1',
                [userId]
            );

            if (profileResult.rows.length === 0) {
                throw new Error('Company profile not found');
            }

            const companyProfileId = profileResult.rows[0].id;

            // Verify ownership
            const checkResult = await this.db.query(
                'SELECT id FROM custom_business_data WHERE id = $1 AND company_profile_id = $2',
                [entryId, companyProfileId]
            );

            if (checkResult.rows.length === 0) {
                throw new Error('Data entry not found or access denied');
            }

            await this.db.query('DELETE FROM custom_business_data WHERE id = $1', [entryId]);
            logger.info(`Deleted custom data entry ${entryId}`);
            return { success: true };
        } catch (error) {
            logger.error('Error deleting custom data:', error);
            throw error;
        }
    }
}

module.exports = CustomDataService;

