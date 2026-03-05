const { OpenAI } = require('openai');
const logger = require('../utils/logger');

class VectorDatabaseService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
        this.dimension = process.env.EMBEDDING_DIMENSION || 1536;
    }

    /**
     * Generate embedding for text
     */
    async generateEmbedding(text) {
        try {
            if (!text || typeof text !== 'string') {
                throw new Error('Text must be a non-empty string');
            }

            // Truncate if too long (OpenAI has token limits)
            const maxLength = 8000; // Approximate token limit
            const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: truncatedText,
                dimensions: parseInt(this.dimension)
            });

            if (!response.data || response.data.length === 0) {
                throw new Error('No embedding returned from OpenAI');
            }

            return response.data[0].embedding;
        } catch (error) {
            logger.error('Error generating embedding:', error);
            throw error;
        }
    }

    /**
     * Generate embeddings for multiple texts (batch)
     */
    async generateEmbeddings(texts) {
        try {
            if (!Array.isArray(texts) || texts.length === 0) {
                throw new Error('Texts must be a non-empty array');
            }

            // Truncate texts if needed
            const truncatedTexts = texts.map(text => {
                const str = typeof text === 'string' ? text : String(text);
                return str.length > 8000 ? str.substring(0, 8000) : str;
            });

            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: truncatedTexts,
                dimensions: parseInt(this.dimension)
            });

            return response.data.map(item => item.embedding);
        } catch (error) {
            logger.error('Error generating batch embeddings:', error);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

module.exports = VectorDatabaseService;

