const lighthouse = require('@lighthouse-web3/sdk');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class IPFSService {
  constructor() {
    this.apiKey = process.env.LIGHTHOUSE_API_KEY;
    this.gateway = process.env.LIGHTHOUSE_GATEWAY || 'https://gateway.lighthouse.storage';
    this.uploadEndpoint = process.env.LIGHTHOUSE_UPLOAD_ENDPOINT || 'https://node.lighthouse.storage';
    
    if (!this.apiKey) {
      logger.warn('LIGHTHOUSE_API_KEY not found in environment variables');
    }
  }

  /**
   * Upload a file to IPFS via Lighthouse
   * @param {string} filePath - Path to the file to upload
   * @param {string} fileName - Name of the file
   * @returns {Promise<Object>} - IPFS upload result
   */
  async uploadFile(filePath, fileName) {
    try {
      if (!this.apiKey) {
        throw new Error('Lighthouse API key not configured');
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      logger.info(`Uploading file to IPFS: ${fileName}`);

      // Upload file to IPFS
      const uploadResponse = await lighthouse.uploadFile(filePath, this.apiKey);
      
      if (!uploadResponse.data || !uploadResponse.data.Hash) {
        throw new Error('Invalid upload response from Lighthouse');
      }

      const ipfsHash = uploadResponse.data.Hash;
      const ipfsUri = `${this.gateway}/ipfs/${ipfsHash}`;

      logger.info(`File uploaded to IPFS successfully: ${fileName} -> ${ipfsHash}`);

      return {
        success: true,
        ipfsHash,
        ipfsUri,
        fileName,
        size: uploadResponse.data.Size || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Failed to upload file to IPFS: ${fileName}`, error);
      throw error;
    }
  }

  /**
   * Upload multiple files to IPFS
   * @param {Array<{filePath: string, fileName: string}>} files - Array of files to upload
   * @returns {Promise<Array>} - Array of upload results
   */
  async uploadMultipleFiles(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.uploadFile(file.filePath, file.fileName);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to upload file: ${file.fileName}`, error);
        results.push({
          success: false,
          fileName: file.fileName,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get file info from IPFS
   * @param {string} ipfsHash - IPFS hash of the file
   * @returns {Promise<Object>} - File information
   */
  async getFileInfo(ipfsHash) {
    try {
      const response = await fetch(`${this.gateway}/ipfs/${ipfsHash}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file info: ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');

      return {
        success: true,
        ipfsHash,
        size: parseInt(contentLength) || 0,
        contentType,
        accessible: true
      };

    } catch (error) {
      logger.error(`Failed to get file info from IPFS: ${ipfsHash}`, error);
      throw error;
    }
  }

  /**
   * Check if IPFS service is properly configured
   * @returns {boolean} - True if service is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }
}

module.exports = new IPFSService();
