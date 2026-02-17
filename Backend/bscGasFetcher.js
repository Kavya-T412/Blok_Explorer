const { ethers } = require('ethers');

/**
 * BSC Gas Price Fetcher using ethers.js JsonRpcProvider
 * BSC uses legacy gas model (gasPrice), not EIP-1559 (baseFee/maxPriorityFee)
 * 
 * Public RPC: https://rpc.ankr.com/bsc
 * Fallback RPC: https://bsc-dataseed1.binance.org/
 */

class BSCGasFetcher {
  constructor(rpcUrl = 'https://rpc.ankr.com/bsc', fallbackRpc = 'https://bsc-dataseed1.binance.org/') {
    this.rpcUrl = rpcUrl;
    this.fallbackRpc = fallbackRpc;
    this.provider = null;
    this.currentRpc = null;
    this.initProvider();
  }

  /**
   * Initialize ethers.js provider
   */
  initProvider() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      this.currentRpc = this.rpcUrl;
      console.log('✅ BSC Provider initialized with Ankr RPC');
    } catch (error) {
      console.error('Failed to initialize primary RPC:', error.message);
      // Fallback to secondary RPC
      try {
        this.provider = new ethers.JsonRpcProvider(this.fallbackRpc);
        this.currentRpc = this.fallbackRpc;
        console.log('✅ BSC Provider initialized with fallback RPC');
      } catch (fallbackError) {
        console.error('Failed to initialize fallback RPC:', fallbackError.message);
      }
    }
  }

  /**
   * Convert Wei to Gwei
   * @param {BigInt} weiValue - Value in Wei
   * @returns {number} Value in Gwei
   */
  weiToGwei(weiValue) {
    return parseFloat(ethers.formatUnits(weiValue, 'gwei'));
  }

  /**
   * Fetch real-time gas prices for BSC using legacy model
   * Returns gasPrice in Gwei with different speed estimates
   * 
   * @returns {Promise<Object>} Gas price data with slow, standard, fast estimates
   */
  async getGasPrices() {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      // Get current gas price (in Wei)
      const gasPrice = await this.provider.getGasPrice();

      // Convert to Gwei for readability
      const gasPriceGwei = this.weiToGwei(gasPrice);

      // Estimate different speeds based on current gas price
      // BSC doesn't have mempool insights like Ethereum, so we use static multipliers
      const slow = gasPriceGwei * 0.9;  // 90% of current
      const standard = gasPriceGwei;     // Current price
      const fast = gasPriceGwei * 1.2;   // 120% of current

      // Get block number for reference
      const blockNumber = await this.provider.getBlockNumber();

      const gasData = {
        chainId: 56,
        chainName: 'Binance Smart Chain',
        slow: parseFloat(slow.toFixed(4)),
        standard: parseFloat(standard.toFixed(4)),
        fast: parseFloat(fast.toFixed(4)),
        suggestBaseFee: parseFloat(standard.toFixed(4)), // BSC uses gasPrice, not baseFee
        timestamp: Date.now(),
        blockNumber,
        unit: 'Gwei',
        rpcUrl: this.currentRpc,
        note: 'BSC uses legacy gas model (gasPrice). Estimates are multipliers of current gas price.'
      };

      console.log(`✅ BSC Gas Prices (Block ${blockNumber}):`, gasData);
      return gasData;
    } catch (error) {
      console.error('❌ Error fetching BSC gas prices:', error.message);
      return this.getErrorResponse(error.message);
    }
  }

  /**
   * Get error response object
   * @param {string} errorMessage - Error message
   * @returns {Object} Error response
   */
  getErrorResponse(errorMessage) {
    return {
      chainId: 56,
      chainName: 'Binance Smart Chain',
      slow: 0,
      standard: 0,
      fast: 0,
      suggestBaseFee: 0,
      timestamp: Date.now(),
      unit: 'Gwei',
      error: errorMessage,
      rpcUrl: this.currentRpc
    };
  }

  /**
   * Estimate transaction cost in USD
   * @param {number} gasLimit - Gas limit for transaction
   * @param {number} bnbPrice - Current BNB price in USD
   * @param {string} speed - 'slow', 'standard', or 'fast'
   * @returns {Promise<Object>} Cost estimate in USD and BNB
   */
  async estimateTransactionCost(gasLimit, bnbPrice, speed = 'standard') {
    try {
      const gasPrices = await this.getGasPrices();

      if (gasPrices.error) {
        throw new Error(gasPrices.error);
      }

      // Get gas price in Gwei for selected speed
      const gasPriceGwei = gasPrices[speed];

      // Convert to BNB (1 BNB = 10^18 Wei, 1 Gwei = 10^9 Wei)
      const gasPriceBNB = gasPriceGwei / 1e9;

      // Calculate total cost
      const gasCostBNB = (gasLimit * gasPriceBNB);
      const gasCostUSD = gasCostBNB * bnbPrice;

      return {
        gasLimit,
        gasPriceGwei,
        gasCostBNB: parseFloat(gasCostBNB.toFixed(8)),
        gasCostUSD: parseFloat(gasCostUSD.toFixed(2)),
        speed,
        bnbPrice,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Error estimating transaction cost:', error.message);
      throw error;
    }
  }

  /**
   * Get network info (ChainId, Network name, etc.)
   * @returns {Promise<Object>} Network information
   */
  async getNetworkInfo() {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();

      return {
        chainId: network.chainId,
        chainName: network.name,
        blockNumber,
        currentBlock: blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Error fetching network info:', error.message);
      throw error;
    }
  }

  /**
   * Switch RPC provider
   * @param {string} newRpcUrl - New RPC URL
   */
  switchRPC(newRpcUrl) {
    try {
      this.provider = new ethers.JsonRpcProvider(newRpcUrl);
      this.currentRpc = newRpcUrl;
      console.log(`✅ Switched to RPC: ${newRpcUrl}`);
    } catch (error) {
      console.error('Failed to switch RPC:', error.message);
      throw error;
    }
  }
}

// Export singleton instance and class
const bscFetcher = new BSCGasFetcher();

module.exports = {
  BSCGasFetcher,
  bscFetcher,
  getGasPrices: () => bscFetcher.getGasPrices(),
  estimateTransactionCost: (gasLimit, bnbPrice, speed) => 
    bscFetcher.estimateTransactionCost(gasLimit, bnbPrice, speed),
  getNetworkInfo: () => bscFetcher.getNetworkInfo()
};
