/**
 * ZTR Price Service
 * Fetches current $ZTR token price in USD from DEX pools via Solana RPC
 */

const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');

class ZTRPriceService {
  constructor() {
    this.ztrTokenAddress = 'AwJpEPLHaTHHSzfrt3AFu3kcuwSozudvQ1RaU1Fq9ray';
    this.usdcTokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on Solana
    this.solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://lb.drpc.org/solana/AlwNrDhsrEZXoXJDet6LGcYqdigSZtkR8K9yEklbR4ac';
    this.connection = new Connection(this.solanaRpcUrl, 'confirmed');
    
    // ZTR/USDC Pool address on Raydium
    this.ztrUsdcPoolAddress = '2TU28nFY9y51coGxxHPFmRwoQ326LBFyzQw5C9KdpSC6';
    
    // Solana Tracker API - reliable Solana price API
    this.solanaTrackerApiUrl = process.env.SOLANA_TRACKER_BASE_URL || 'https://data.solanatracker.io';
    this.solanaTrackerApiKey = process.env.SOLANA_TRACKER_API_KEY || '';
    
    // Birdeye API - reliable Solana price API (correct endpoint)
    this.birdeyeApiUrl = 'https://public-api.birdeye.so';
    
    // Jupiter API v6 (fallback)
    this.jupiterApiUrl = 'https://quote-api.jup.ag/v6';
    
    // Default price fallback (can be updated via environment variable)
    this.defaultPriceUSD = parseFloat(process.env.ZTR_DEFAULT_PRICE_USD) || 0.001; // Default $0.001 per ZTR
    this.priceCache = {
      price: null,
      timestamp: null,
      ttl: 300000 // 5 minutes cache
    };
  }

  /**
   * Get current $ZTR price in USD
   * Tries multiple methods: Solana RPC (primary) -> Solana Tracker -> Jupiter API -> Default
   * RPC is primary since it's working reliably and has no API limits
   * @returns {Promise<number>} Price per ZTR token in USD
   */
  /**
   * Validate price is within reasonable range
   * @param {number} price - Price to validate
   * @returns {boolean} True if price is valid
   */
  isValidPrice(price) {
    // ZTR can be very low (micro-cap tokens), so we only check:
    // - Price must be positive
    // - Price must be a valid number
    // - Price must be less than $1000 per token (to catch obvious errors)
    return price > 0 && price < 1000 && !isNaN(price) && isFinite(price);
  }

  async getZTRPriceUSD() {
    try {
      // Check cache first (but validate the cached price)
      if (this.priceCache.price && this.priceCache.timestamp) {
        const cacheAge = Date.now() - this.priceCache.timestamp;
        if (cacheAge < this.priceCache.ttl) {
          // Validate cached price is still reasonable
          if (this.isValidPrice(this.priceCache.price)) {
            console.log(`📊 Using cached ZTR price: $${this.priceCache.price.toFixed(6)}`);
            return this.priceCache.price;
          } else {
            console.log(`⚠️ Cached price is invalid (${this.priceCache.price}), clearing cache`);
            this.priceCache.price = null;
            this.priceCache.timestamp = null;
          }
        }
      }

      // Try Solana Tracker API first (most accurate, returns correct price)
      if (this.solanaTrackerApiKey) {
        try {
          console.log('🔍 Fetching ZTR price from Solana Tracker API...');
          const price = await this.getZTRPriceFromSolanaTracker();
          
          // Validate Tracker price before caching
          if (!this.isValidPrice(price)) {
            throw new Error(`Solana Tracker returned invalid price: $${price} (outside expected range)`);
          }
          
          this.priceCache.price = price;
          this.priceCache.timestamp = Date.now();
          console.log(`✅ ZTR price fetched from Solana Tracker: $${price.toFixed(9)} per token`);
          return price;
        } catch (trackerError) {
          // Don't log if it's a 403 (insufficient credits) - expected
          if (trackerError.response?.status !== 403) {
            console.log('⚠️ Solana Tracker API failed:', trackerError.message);
          } else {
            console.log('⚠️ Solana Tracker API: Insufficient credits (403) - trying RPC...');
          }
        }
      }

      // Fallback: Try Solana RPC (may have calculation issues, but better than nothing)
      try {
        console.log('🔍 Fetching ZTR price from Solana RPC (direct pool query)...');
        const price = await this.getZTRPriceFromRPC();
        
        // Validate RPC price before caching
        // Note: RPC may return incorrect prices due to pool calculation issues
        // We'll accept it but log a warning if it seems off
        if (!this.isValidPrice(price)) {
          throw new Error(`RPC returned invalid price: $${price} (outside expected range)`);
        }
        
        // Warn if price seems too high (RPC calculation may be inverted)
        if (price > 0.1) {
          console.warn(`⚠️ RPC returned price $${price.toFixed(6)} which seems high. Solana Tracker returned $0.000002. RPC calculation may be incorrect.`);
        }
        
        this.priceCache.price = price;
        this.priceCache.timestamp = Date.now();
        console.log(`✅ ZTR price fetched from RPC: $${price.toFixed(9)} per token`);
        return price;
      } catch (rpcError) {
        console.log('⚠️ RPC query failed:', rpcError.message);
        console.log('⚠️ Trying Jupiter...');
      }

      // Fallback: Try Jupiter API
      try {
        console.log('🔍 Fetching ZTR price from Jupiter API...');
        const price = await this.getZTRPriceFromJupiter();
        this.priceCache.price = price;
        this.priceCache.timestamp = Date.now();
        console.log(`✅ ZTR price fetched from Jupiter: $${price.toFixed(6)} per token`);
        return price;
      } catch (jupiterError) {
        console.log('⚠️ Jupiter API failed, using cached or default price...');
      }

      // Last resort: Use cached price or default
      if (this.priceCache.price) {
        console.log('⚠️ Using stale cached price as last resort');
        return this.priceCache.price;
      }
      
      // Ultimate fallback: Use default price
      console.log(`⚠️ Using default ZTR price: $${this.defaultPriceUSD} (all price fetches failed)`);
      return this.defaultPriceUSD;
    } catch (error) {
      console.error('❌ All price fetch methods failed:', error.message);
      if (this.priceCache.price) {
        return this.priceCache.price;
      }
      return this.defaultPriceUSD;
    }
  }

  /**
   * Get ZTR price from Solana Tracker API
   * Solana Tracker provides reliable token price data
   * @returns {Promise<number>} Price per ZTR token in USD
   */
  async getZTRPriceFromSolanaTracker() {
    try {
      // Solana Tracker API - search for token by mint address
      // Based on docs: https://docs.solanatracker.io/data-api/search/token-search
      const response = await axios.get(`${this.solanaTrackerApiUrl}/search`, {
        params: {
          query: this.ztrTokenAddress,
          limit: 1
        },
        headers: {
          'x-api-key': this.solanaTrackerApiKey
        },
        timeout: 10000
      });

      console.log('Solana Tracker API response status:', response.status);
      
      if (response.data) {
        // Log full response for debugging
        console.log('Solana Tracker API full response:', JSON.stringify(response.data).substring(0, 500));
        
        // Check for success response
        if (response.data.status === 'success' && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          const tokenData = response.data.data[0];
          console.log('Solana Tracker token data:', JSON.stringify(tokenData).substring(0, 500));
          
          // Try multiple possible price fields
          const priceUSD = parseFloat(tokenData.priceUsd || tokenData.price || tokenData.usdPrice || tokenData.priceUSD);
          
          // Validate price is reasonable (positive, valid number, less than $1000)
          if (priceUSD && priceUSD > 0 && !isNaN(priceUSD) && isFinite(priceUSD)) {
            if (priceUSD >= 1000) {
              console.error(`⚠️ Solana Tracker: Price seems incorrect (${priceUSD}). Too high, likely an error. Rejecting.`);
              throw new Error(`Solana Tracker returned invalid price: $${priceUSD} (too high)`);
            }
            
            console.log('Solana Tracker found token:', tokenData.symbol || tokenData.name, 'Price:', priceUSD);
            return priceUSD;
          } else {
            console.error('Solana Tracker: Invalid price value:', tokenData.priceUsd || tokenData.price || tokenData.usdPrice);
          }
        } else {
          console.error('Solana Tracker: Unexpected response structure:', {
            status: response.data.status,
            hasData: !!response.data.data,
            dataLength: response.data.data?.length || 0
          });
        }
      }
      
      throw new Error('Invalid response from Solana Tracker API - no valid price found');
    } catch (error) {
      // Handle 403 (insufficient credits) gracefully - don't spam logs
      if (error.response?.status === 403) {
        console.log('⚠️ Solana Tracker API: Insufficient credits (403)');
        throw new Error('Solana Tracker API: Insufficient credits');
      }
      
      console.error('Solana Tracker API error:', error.message);
      if (error.response) {
        console.error('Solana Tracker API response status:', error.response.status);
        if (error.response.data) {
          const errorData = typeof error.response.data === 'string' 
            ? error.response.data.substring(0, 300) 
            : JSON.stringify(error.response.data).substring(0, 300);
          console.error('Solana Tracker API response data:', errorData);
        }
      } else if (error.request) {
        console.error('Solana Tracker API: No response received');
      }
      throw error;
    }
  }

  /**
   * Get ZTR price from Birdeye API
   * Birdeye is a reliable Solana price API
   * NOTE: Currently disabled due to endpoint issues - will re-enable when correct endpoint is found
   * @returns {Promise<number>} Price per ZTR token in USD
   */
  async getZTRPriceFromBirdeye() {
    // Temporarily skip Birdeye as endpoints are returning HTML
    throw new Error('Birdeye API temporarily disabled - endpoint issues');
    
    /* 
    try {
      // Birdeye API endpoints need to be verified
      // The public API seems to return HTML documentation pages
      // This will be re-enabled once correct endpoint is confirmed
      throw new Error('Birdeye API endpoint needs verification');
    } catch (error) {
      console.error('Birdeye API error:', error.message);
      throw error;
    }
    */
  }

  /**
   * Get ZTR price from Jupiter API
   * @returns {Promise<number>} Price per ZTR token in USD
   */
  async getZTRPriceFromJupiter() {
    try {
      const quoteUrl = `${this.jupiterApiUrl}/quote`;
      const quoteParams = {
        inputMint: this.ztrTokenAddress,
        outputMint: this.usdcTokenAddress,
        amount: 1000000000, // 1 ZTR (assuming 9 decimals)
        slippageBps: 50 // 0.5% slippage tolerance
      };

      const response = await axios.get(quoteUrl, { 
        params: quoteParams,
        timeout: 5000
      });

      if (!response.data || !response.data.outAmount) {
        throw new Error('Invalid response from Jupiter API');
      }

      // Convert outAmount (USDC with 6 decimals) to USD
      const usdcAmount = parseFloat(response.data.outAmount) / 1e6;
      return usdcAmount; // 1 ZTR = X USDC (which is ~USD)
    } catch (error) {
      console.error('Jupiter API error:', error.message);
      throw error;
    }
  }

  /**
   * Get ZTR price from Solana RPC by querying the pool directly
   * Queries the Raydium pool account to get token reserves and calculate price
   * Uses Raydium API or direct RPC queries
   * @returns {Promise<number>} Price per ZTR token in USD
   */
  async getZTRPriceFromRPC() {
    try {
      // Method 1: Try Raydium API to get pool price
      // Based on docs: https://docs.raydium.io/raydium/protocol/developers/api
      try {
        const raydiumResponse = await axios.get('https://api.raydium.io/v2/main/pairs', {
          params: {
            baseMint: this.ztrTokenAddress,
            quoteMint: this.usdcTokenAddress
          },
          timeout: 5000
        });

        if (raydiumResponse.data && raydiumResponse.data.length > 0) {
          const pool = raydiumResponse.data.find(p => 
            p.baseMint === this.ztrTokenAddress && 
            p.quoteMint === this.usdcTokenAddress
          ) || raydiumResponse.data[0];
          
          if (pool && pool.price) {
            return parseFloat(pool.price);
          }
        }
      } catch (raydiumError) {
        console.log('Raydium API query failed, trying direct RPC...');
      }

      // Method 2: Direct RPC query using getAccountInfo
      // Query pool account info using JSON-RPC with jsonParsed encoding
      const rpcResponse = await axios.post(this.solanaRpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [
          this.ztrUsdcPoolAddress,
          {
            encoding: 'jsonParsed'
          }
        ]
      }, {
        timeout: 10000
      });
      
      if (!rpcResponse.data || !rpcResponse.data.result || !rpcResponse.data.result.value) {
        throw new Error('Pool account not found or invalid response');
      }
      
      const accountData = rpcResponse.data.result.value.data;
      
      // Try to parse pool data - Raydium pools have different structures
      // Log the structure for debugging
      console.log('Pool account data type:', accountData.parsed ? 'parsed' : 'raw');
      
      if (accountData.parsed && accountData.parsed.info) {
        const poolInfo = accountData.parsed.info;
        console.log('Pool info keys:', Object.keys(poolInfo));
        
        // Extract token vault addresses (various possible field names for different pool types)
        const tokenAVault = poolInfo.tokenAccountA || poolInfo.tokenVaultA || 
                          poolInfo.tokenVault0 || poolInfo.vaultA ||
                          poolInfo.tokenAccount0 || poolInfo.baseVault ||
                          poolInfo.mintA || poolInfo.baseMint;
        const tokenBVault = poolInfo.tokenAccountB || poolInfo.tokenVaultB || 
                          poolInfo.tokenVault1 || poolInfo.vaultB ||
                          poolInfo.tokenAccount1 || poolInfo.quoteVault ||
                          poolInfo.mintB || poolInfo.quoteMint;
        
        console.log('Token vaults found:', { tokenAVault, tokenBVault });
        
        if (tokenAVault && tokenBVault) {
          // Query both token account balances
          const [balanceA, balanceB] = await Promise.all([
            this.connection.getTokenAccountBalance(new PublicKey(tokenAVault)).catch(() => null),
            this.connection.getTokenAccountBalance(new PublicKey(tokenBVault)).catch(() => null)
          ]);
          
          if (!balanceA || !balanceB) {
            throw new Error('Failed to query token account balances');
          }
          
          // Get amounts and decimals
          const amountA = parseFloat(balanceA.value.uiAmount || 0);
          const amountB = parseFloat(balanceB.value.uiAmount || 0);
          const decimalsA = balanceA.value.decimals;
          const decimalsB = balanceB.value.decimals;
          
          // USDC has 6 decimals, ZTR has 9 decimals
          // Calculate price: USDC / ZTR
          if (decimalsA === 6 && decimalsB === 9) {
            // A is USDC, B is ZTR
            if (amountB > 0) {
              const price = amountA / amountB;
              console.log(`📊 Calculated price from pool: ${amountA} USDC / ${amountB} ZTR = $${price.toFixed(6)}`);
              return price;
            }
          } else if (decimalsA === 9 && decimalsB === 6) {
            // A is ZTR, B is USDC
            if (amountA > 0) {
              const price = amountB / amountA;
              console.log(`📊 Calculated price from pool: ${amountB} USDC / ${amountA} ZTR = $${price.toFixed(6)}`);
              return price;
            }
          } else {
            console.warn(`⚠️ Unexpected decimals: A=${decimalsA}, B=${decimalsB}. Amounts: A=${amountA}, B=${amountB}`);
            // Try to calculate anyway if we have amounts
            if (amountA > 0 && amountB > 0) {
              // Assume the one with 6 decimals is USDC
              if (decimalsA === 6) {
                const price = amountA / amountB;
                console.log(`📊 Calculated price (assuming A=USDC): $${price.toFixed(6)}`);
                return price;
              } else if (decimalsB === 6) {
                const price = amountB / amountA;
                console.log(`📊 Calculated price (assuming B=USDC): $${price.toFixed(6)}`);
                return price;
              }
            }
          }
        } else {
          console.error('Pool info keys:', Object.keys(poolInfo));
          throw new Error('Token vault addresses not found in pool data');
        }
      } else {
        // Log the actual structure for debugging
        console.error('Account data structure:', JSON.stringify(accountData, null, 2).substring(0, 500));
        throw new Error('Pool account data not in expected format');
      }
      
      throw new Error('Unable to calculate price from pool reserves');
    } catch (error) {
      console.error('RPC pool query error:', error.message);
      if (error.response && error.response.data) {
        const errorData = typeof error.response.data === 'string' 
          ? error.response.data.substring(0, 200) 
          : JSON.stringify(error.response.data).substring(0, 200);
        console.error('RPC response snippet:', errorData);
      }
      throw error;
    }
  }


  /**
   * Calculate ZTR amount needed for a given USD amount
   * User pays full USD price in ZTR, gets bonus credits (not a discount on price)
   * @param {number} usdAmount - USD amount needed (full price)
   * @returns {Promise<number>} ZTR tokens needed
   */
  async calculateZTRAmountNeeded(usdAmount) {
    try {
      const ztrPriceUSD = await this.getZTRPriceUSD();
      
      // User pays full USD price in ZTR (no discount on price)
      // Bonus is in credits, not in price
      const ztrAmountNeeded = usdAmount / ztrPriceUSD;
      
      console.log(`💰 ZTR calculation: $${usdAmount} USD → ${ztrAmountNeeded.toFixed(2)} ZTR (full price, bonus credits apply)`);
      
      return ztrAmountNeeded;
    } catch (error) {
      console.error('Error calculating ZTR amount:', error);
      throw error;
    }
  }

  /**
   * Get price info for display
   * @returns {Promise<Object>} Price information
   */
  async getPriceInfo() {
    try {
      const price = await this.getZTRPriceUSD();
      const isDefault = price === this.defaultPriceUSD || 
                       (this.priceCache.timestamp === null && price === this.defaultPriceUSD);
      
      return {
        priceUSD: price,
        tokenAddress: this.ztrTokenAddress,
        lastUpdated: this.priceCache.timestamp,
        cacheAge: this.priceCache.timestamp ? Date.now() - this.priceCache.timestamp : null,
        isDefaultPrice: isDefault
      };
    } catch (error) {
      // Don't return default price - let the caller handle the error
      // This ensures we only show ZTR option when we have real pricing
      console.log('⚠️ Price fetch failed completely');
      throw error;
    }
  }

  /**
   * Clear price cache (for testing or forced refresh)
   */
  clearCache() {
    this.priceCache = {
      price: null,
      timestamp: null,
      ttl: 300000
    };
    console.log('🗑️ ZTR price cache cleared');
  }
}

module.exports = new ZTRPriceService();

