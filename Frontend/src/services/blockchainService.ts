import { ethers } from 'ethers';

// Chain configurations with public RPC endpoints (Mainnet)
const MAINNET_CONFIGS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/MQSJzwwzYvnt8EXGn_akh',
    explorer: 'https://etherscan.io',
    decimals: 18,
    color: 'from-blue-500 to-purple-500',
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/MQSJzwwzYvnt8EXGn_akh',
    explorer: 'https://polygonscan.com',
    decimals: 18,
    color: 'from-purple-500 to-pink-500',
  },
  bsc: {
    chainId: 56,
    name: 'BSC',
    symbol: 'BNB',
    rpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2/MQSJzwwzYvnt8EXGn_akh',
    explorer: 'https://bscscan.com',
    decimals: 18,
    color: 'from-yellow-500 to-orange-500',
  },
};

// Chain configurations with public RPC endpoints (Testnet)
const TESTNET_CONFIGS = {
  sepolia: {
    chainId: 11155111, // Sepolia
    name: 'Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/MQSJzwwzYvnt8EXGn_akh',
    explorer: 'https://sepolia.etherscan.io',
    decimals: 18,
    color: 'from-cyan-500 to-blue-500',
  },
  polygonAmoy: {
    chainId: 80002, // Amoy (new Polygon testnet)
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2/MQSJzwwzYvnt8EXGn_akh',
    explorer: 'https://amoy.polygonscan.com',
    decimals: 18,
    color: 'from-purple-400 to-pink-400',
  },
  bscTestnet: {
    chainId: 97, // BSC Testnet
    name: 'BSC Testnet',
    symbol: 'tBNB',
    rpcUrl: 'https://bnb-testnet.g.alchemy.com/v2/MQSJzwwzYvnt8EXGn_akh',
    explorer: 'https://testnet.bscscan.com',
    decimals: 18,
    color: 'from-yellow-400 to-orange-400',
  },
};

// Combined configurations for chain ID lookup
const ALL_CONFIGS = [...Object.entries(MAINNET_CONFIGS), ...Object.entries(TESTNET_CONFIGS)]
  .reduce((acc, [key, config]) => ({ ...acc, [config.chainId]: { ...config, key } }), {} as Record<number, any>);

// API endpoints and constants
const PRICE_API = 'https://api.coingecko.com/api/v3/simple/price';
const BACKEND_API_URL = 'http://localhost:3001'; // Backend transaction history API
const API_DOMAINS: Record<number, string> = {
  1: 'api.etherscan.io', 11155111: 'api-sepolia.etherscan.io',
  137: 'api.polygonscan.com', 80002: 'api-amoy.polygonscan.com',
  56: 'api.bscscan.com', 97: 'api-testnet.bscscan.com',
};
// API Keys (add your own from respective explorers)
const API_KEYS: Record<number, string> = {
  1: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K', // Add your Etherscan API key
  11155111: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K', // Etherscan API key works for Sepolia too
  137: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K', // Add your PolygonScan API key
  80002: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K', // PolygonScan API key works for Amoy too
  56: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K', // Add your BscScan API key
  97: '3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K', // BscScan API key works for testnet too
};
const COIN_IDS = { ETH: 'ethereum', MATIC: 'matic-network', BNB: 'binancecoin' };
const SYMBOL_MAP: Record<string, string> = { tBNB: 'BNB', ETH: 'ETH', MATIC: 'MATIC', BNB: 'BNB' };

export interface Balance {
  chain: string;
  symbol: string;
  balance: string;
  usdValue: string;
  usdValueNum: number; // Numeric USD value for calculations
  color: string;
  rawBalance: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  chain: string;
  status: 'success' | 'pending' | 'failed';
  time: string;
  date: string; // Formatted date (e.g., "Nov 25, 2025, 10:30 AM")
  timestamp: number;
  gasPrice?: string;
  blockNumber?: number;
  type?: 'transfer' | 'contract-deployment' | 'contract-interaction';
  direction?: 'sent' | 'received' | 'self';
  valueRaw?: string; // Raw value in wei for calculations
  isContractCreation?: boolean;
  contractAddress?: string;
  methodId?: string;
  input?: string;
}

export interface ChainComparison {
  chain: string;
  speed: string;
  cost: string;
  efficiency: number;
  avgBlockTime: number;
  avgGasPrice: string;
  txCount: number;
}

class BlockchainService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private transactionCache: Map<string, { transactions: Transaction[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute
  private readonly TX_CACHE_DURATION = 30000; // 30 seconds for transactions
  private currentChainId: number | null = null;
  private pendingRequests: Map<string, Promise<Transaction[]>> = new Map();

  constructor() {
    // Initialize providers for all chains (both mainnet and testnet)
    const allConfigs = { ...MAINNET_CONFIGS, ...TESTNET_CONFIGS };
    Object.entries(allConfigs).forEach(([key, config]) => {
      try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.providers.set(key, provider);
      } catch (error) {
        console.error(`Failed to initialize provider for ${config.name}:`, error);
      }
    });

    // Listen for chain changes
    this.detectConnectedChain();
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        this.detectConnectedChain();
      });
    }
  }

  // Detect the currently connected chain from wallet
  private async detectConnectedChain(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        this.currentChainId = parseInt(chainId, 16);
        console.log('Connected to chain:', this.currentChainId, ALL_CONFIGS[this.currentChainId]?.name || 'Unknown');
      }
    } catch (error) {
      console.error('Failed to detect connected chain:', error);
      this.currentChainId = null;
    }
  }

  // Get active configuration based on settings (not wallet chain)
  private getActiveConfigs(): typeof MAINNET_CONFIGS | typeof TESTNET_CONFIGS {
    // Read from localStorage (set by NetworkModeToggle in Settings)
    const useTestnet = typeof window !== 'undefined' 
      ? localStorage.getItem('useTestnet') === 'true'
      : false;
    
    console.log(`Active mode from settings: ${useTestnet ? 'TESTNET' : 'MAINNET'}`);
    return useTestnet ? TESTNET_CONFIGS : MAINNET_CONFIGS;
  }

  private getProvider(chain: string): ethers.JsonRpcProvider | null {
    return this.providers.get(chain) || null;
  }

  // Helper: Parse transaction and determine direction/type
  private parseTransaction(tx: any, address: string, config: any, isExplorerAPI: boolean = true): Transaction {
    const isContractCreation = !tx.to || tx.to === '';
    const type: Transaction['type'] = isContractCreation ? 'contract-deployment'
      : (tx.input && tx.input !== '0x') ? 'contract-interaction' : 'transfer';

    const fromAddr = (tx.from || '').toLowerCase();
    const toAddr = (tx.to || '').toLowerCase();
    const userAddr = address.toLowerCase();
    
    const direction: Transaction['direction'] = isContractCreation ? 'sent'
      : fromAddr === userAddr && toAddr === userAddr ? 'self'
      : fromAddr === userAddr ? 'sent' : 'received';

    const valueInEther = parseFloat(ethers.formatEther(tx.value));
    const valueFormatted = valueInEther > 0 ? valueInEther.toFixed(6) : '0';
    
    const txTimestamp = isExplorerAPI ? parseInt(tx.timeStamp) : tx.timestamp;

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || tx.contractAddress || 'Contract Creation',
      value: `${valueFormatted} ${config.symbol}`,
      valueRaw: tx.value?.toString?.() || tx.value,
      gas: tx.gas || tx.gasLimit?.toString(),
      chain: config.name,
      status: isExplorerAPI 
        ? ((tx.txreceipt_status === '1' || tx.isError === '0') ? 'success' : 'failed')
        : (tx.status === 1 ? 'success' : tx.status === 0 ? 'failed' : 'pending'),
      time: this.formatTimeAgo(txTimestamp),
      date: this.formatDate(txTimestamp),
      timestamp: txTimestamp,
      gasPrice: tx.gasPrice?.toString?.() || tx.gasPrice,
      blockNumber: isExplorerAPI ? parseInt(tx.blockNumber) : tx.blockNumber,
      type, direction, isContractCreation,
      contractAddress: tx.contractAddress || '',
      methodId: tx.methodId || (tx.input?.length >= 10 ? tx.input.slice(0, 10) : undefined),
      input: tx.input || tx.data,
    };
  }

  // Fetch native token price from CoinGecko
  private async fetchPrice(symbol: string, isTestnet: boolean = false): Promise<number> {
    if (isTestnet) return 0;
    const cacheKey = symbol.toLowerCase();
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) return cached.price;

    try {
      const mappedSymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol.toUpperCase();
      const coinId = COIN_IDS[mappedSymbol as keyof typeof COIN_IDS];
      if (!coinId) return 0;

      const response = await fetch(`${PRICE_API}?ids=${coinId}&vs_currencies=usd`);
      const price = (await response.json())[coinId]?.usd || 0;
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return price;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      return 0;
    }
  }

  // Get wallet balance for a specific chain
  async getBalance(address: string, chain: string, config: any): Promise<Balance | null> {
    const provider = this.getProvider(chain);

    if (!provider || !address) return null;

    try {
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);
      
      // Check if this is a testnet
      const isTestnet = Object.values(TESTNET_CONFIGS).some(c => c.chainId === config.chainId);
      const price = await this.fetchPrice(config.symbol, isTestnet);
      const usdValueNum = parseFloat(balanceEth) * price;

      return {
        chain: config.name,
        symbol: config.symbol,
        balance: parseFloat(balanceEth).toFixed(4),
        usdValue: isTestnet ? 'Testnet' : `$${usdValueNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        usdValueNum: isTestnet ? 0 : usdValueNum,
        color: config.color,
        rawBalance: balanceWei.toString(),
      };
    } catch (error) {
      console.error(`Failed to get balance for ${config.name}:`, error);
      return null;
    }
  }

  // Get balances across all chains
  async getAllBalances(address: string): Promise<Balance[]> {
    if (!address) return [];

    // Get active configs based on connected chain
    const activeConfigs = this.getActiveConfigs();
    const chains = Object.entries(activeConfigs);
    const balancePromises = chains.map(([key, config]) => this.getBalance(address, key, config));
    
    const results = await Promise.allSettled(balancePromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<Balance | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
  }

  // Get ALL transactions for an address using backend API (Alchemy-powered)
  async getTransactionsFromBackend(address: string): Promise<Transaction[]> {
    try {
      console.log(`📡 Fetching transactions from backend API for ${address}`);
      
      const response = await fetch(`${BACKEND_API_URL}/api/transactions/${address}`);
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch from backend');
      }
      
      // Transform backend response to match our Transaction interface
      const transactions: Transaction[] = data.transactions.map((tx: any) => {
        const value = parseFloat(tx.value || '0');
        const valueFormatted = value > 0 ? value.toFixed(6) : '0';
        
        // Parse timestamp correctly - backend returns ISO string in metadata.blockTimestamp
        let txTimestamp: number;
        if (tx.metadata?.blockTimestamp) {
          // Convert ISO string to Unix timestamp (in seconds)
          txTimestamp = new Date(tx.metadata.blockTimestamp).getTime() / 1000;
        } else {
          txTimestamp = Date.now() / 1000;
        }
        
        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to || 'Contract Deployment',
          value: `${valueFormatted} ${tx.asset || 'ETH'}`,
          valueRaw: tx.value?.toString() || '0',
          gas: '0', // Backend doesn't provide gas info
          chain: tx.network,
          status: 'success' as const, // Alchemy only returns successful transactions
          time: this.formatTimeAgo(txTimestamp),
          date: this.formatDate(txTimestamp),
          timestamp: txTimestamp,
          blockNumber: parseInt(tx.blockNum || '0', 16),
          type: (!tx.to || tx.to === null) ? 'contract-deployment' : 'transfer',
          direction: tx.direction as 'sent' | 'received',
          isContractCreation: !tx.to || tx.to === null,
          contractAddress: tx.contractAddress,
        };
      });
      
      console.log(`✅ Backend API returned ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      console.error('Failed to fetch from backend API:', error);
      return [];
    }
  }

  // Get ALL transactions for an address using block explorer APIs
  async getTransactionsFromExplorer(address: string, chain: string, config: any): Promise<Transaction[]> {
    const apiDomain = API_DOMAINS[config.chainId];
    if (!apiDomain) {
      return [];
    }

    try {
      const apiKey = API_KEYS[config.chainId];
      const apiKeyParam = apiKey ? `&apikey=${apiKey}` : '';
      const apiUrl = `https://${apiDomain}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc${apiKeyParam}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === '1' && Array.isArray(data.result)) {
        const transactions = data.result.map((tx: any) => this.parseTransaction(tx, address, config, true));
        console.log(`✓ Explorer: Found ${transactions.length} transactions on ${config.name}`);
        return transactions;
      } else if (data.status === '0' && data.message === 'No transactions found') {
        console.log(`✓ Explorer: No transactions on ${config.name}`);
        return [];
      }
      
      // For any other status (including NOTOK), return empty and let RPC handle it
      if (data.status === '0' && data.message === 'NOTOK') {
        // This usually means API key is required, silently fall back to RPC
        return [];
      }
      
      return [];
    } catch (error) {
      // Silent fail, let RPC handle it
      return [];
    }
  }

  // Get ALL transactions for an address (RPC fallback method)
  async getTransactions(address: string, chain: string, config: any, limit: number = 50): Promise<Transaction[]> {
    const provider = this.getProvider(chain);
    if (!provider || !address) return [];

    try {
      const currentBlock = await provider.getBlockNumber();
      const blocksToCheck = Math.min(50, currentBlock); // Scan only last 50 blocks for speed
      const transactions: Transaction[] = [];
      const BATCH_SIZE = 10; // Check 10 blocks at a time
      
      // Process blocks in batches
      for (let i = 0; i < blocksToCheck && transactions.length < limit; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, blocksToCheck);
        const blockNumbers = Array.from(
          { length: batchEnd - i }, 
          (_, idx) => currentBlock - i - idx
        );

        try {
          // Fetch blocks WITHOUT transaction details (just hashes)
          const blocks = await Promise.all(
            blockNumbers.map(async blockNum => {
              try {
                return await provider.getBlock(blockNum, false);
              } catch (e) {
                return null;
              }
            })
          );

          // Check each block
          for (const block of blocks) {
            if (!block || !block.transactions || transactions.length >= limit) continue;

            const txHashes = block.transactions as string[];
            if (txHashes.length === 0) continue;
            
            // Check first few transactions in parallel
            const txPromises = txHashes.slice(0, 10).map(async (txHash) => {
              try {
                const txDetails = await provider.getTransaction(txHash);
                if (!txDetails) return null;

                // Quick address check
                if (txDetails.from?.toLowerCase() !== address.toLowerCase() && 
                    txDetails.to?.toLowerCase() !== address.toLowerCase()) {
                  return null;
                }

                const receipt = await provider.getTransactionReceipt(txHash);
                
                return {
                  ...txDetails,
                  value: txDetails.value,
                  gasLimit: txDetails.gasLimit,
                  status: receipt?.status || 0,
                  timestamp: block.timestamp,
                  contractAddress: receipt?.contractAddress,
                  data: txDetails.data,
                };
              } catch {
                return null;
              }
            });

            const txResults = await Promise.all(txPromises);
            
            for (const txData of txResults) {
              if (txData && transactions.length < limit) {
                transactions.push(this.parseTransaction(txData, address, config, false));
              }
            }

            if (transactions.length >= limit) break;
          }
        } catch (batchError) {
          // Continue with next batch
          continue;
        }
      }

      if (transactions.length > 0) {
        console.log(`  ✓ ${config.name}: ${transactions.length} txs`);
      } else {
        console.log(`  ○ ${config.name}: No recent txs`);
      }
      
      return transactions;
    } catch (error) {
      console.error(`${config.name} scan failed:`, error);
      return [];
    }
  }

  // Get ALL transactions from all chains (with caching and deduplication)
  async getAllTransactions(address: string): Promise<Transaction[]> {
    if (!address) return [];

    const cacheKey = `${address}-txs`;
    
    // Check cache first
    const cached = this.transactionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.TX_CACHE_DURATION) {
      console.log(`📦 Returning cached transactions (${cached.transactions.length} txs)`);
      return cached.transactions;
    }

    // Check if there's already a pending request for this address
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Waiting for existing request...`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new request promise
    const requestPromise = this.fetchTransactionsInternal(address);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const transactions = await requestPromise;
      
      // Cache the results
      this.transactionCache.set(cacheKey, {
        transactions,
        timestamp: Date.now()
      });
      
      return transactions;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Internal method to fetch transactions
  private async fetchTransactionsInternal(address: string): Promise<Transaction[]> {
    console.log(`🔍 Starting transaction fetch for ${address}...`);
    
    // Try backend API first (Alchemy-powered - most comprehensive)
    const backendTxs = await this.getTransactionsFromBackend(address);
    
    if (backendTxs.length > 0) {
      console.log(`✅ Using backend API results: ${backendTxs.length} transactions`);
      // Sort by timestamp (most recent first)
      return backendTxs.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    // Fallback to explorer + RPC if backend fails
    console.log(`⚠️ Backend API returned no results, falling back to explorers...`);
    
    const activeConfigs = this.getActiveConfigs();
    const chains = Object.entries(activeConfigs);
    
    console.log(`🔍 Searching transactions across ${chains.length} chains...`);
    
    // Fetch from all chains in parallel
    const txPromises = chains.map(async ([key, config]) => {
      try {
        // Try explorer API first (silent - no logs if it fails)
        const explorerTxs = await this.getTransactionsFromExplorer(address, key, config);
        
        if (explorerTxs.length > 0) {
          return explorerTxs;
        }
        
        // Fallback to RPC method if explorer returns empty
        console.log(`🔎 Scanning ${config.name} blocks...`);
        const rpcTxs = await this.getTransactions(address, key, config, 50);
        return rpcTxs;
      } catch (error) {
        console.error(`❌ ${config.name} error:`, error);
        return [];
      }
    });
    
    const results = await Promise.allSettled(txPromises);
    
    const allTxs = results
      .filter((result): result is PromiseFulfilledResult<Transaction[]> => 
        result.status === 'fulfilled'
      )
      .flatMap(result => result.value);

    // Sort by timestamp (most recent first)
    const sortedTxs = allTxs.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`✅ Found ${sortedTxs.length} total transactions`);
    return sortedTxs;
  }

  // Get chain comparison data
  async getChainComparison(): Promise<ChainComparison[]> {
    const activeConfigs = this.getActiveConfigs();
    
    return Promise.all(Object.entries(activeConfigs).map(async ([key, config]) => {
      const provider = this.getProvider(key);
      const defaultReturn = { chain: config.name, speed: 'Unknown', cost: 'Unknown', efficiency: 0, avgBlockTime: 0, avgGasPrice: '0', txCount: 0 };
      if (!provider) return defaultReturn;

      try {
        const currentBlock = await provider.getBlockNumber();
        const [block, prevBlock, feeData] = await Promise.all([
          provider.getBlock(currentBlock), provider.getBlock(currentBlock - 10), provider.getFeeData()
        ]);
        
        const avgBlockTime = (block && prevBlock) ? (block.timestamp - prevBlock.timestamp) / 10 : 0;
        const gasPriceGwei = parseFloat(ethers.formatUnits(feeData.gasPrice || BigInt(0), 'gwei'));
        const speed = avgBlockTime < 5 ? 'Very Fast' : avgBlockTime < 15 ? 'Fast' : avgBlockTime > 30 ? 'Slow' : 'Moderate';
        const cost = gasPriceGwei < 10 ? 'Low' : gasPriceGwei < 50 ? 'Medium' : 'High';
        const speedScore = speed === 'Very Fast' ? 25 : speed === 'Fast' ? 20 : speed === 'Moderate' ? 10 : 0;
        const costScore = cost === 'Low' ? 25 : cost === 'Medium' ? 15 : 5;
        const efficiency = Math.min(50 + speedScore + costScore, 100);

        return { chain: config.name, speed, cost, efficiency, avgBlockTime, avgGasPrice: gasPriceGwei.toFixed(2), txCount: currentBlock };
      } catch (error) {
        console.error(`Failed to get chain comparison for ${config.name}:`, error);
        return defaultReturn;
      }
    }));
  }

  // Format timestamp to relative time
  private formatTimeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return `${diff} secs ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  // Format timestamp to readable date
  private formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  }

  // Get total portfolio value
  async getTotalValue(address: string): Promise<number> {
    const balances = await this.getAllBalances(address);
    
    // Sum up the numeric USD values (will be 0 for testnet balances)
    return balances.reduce((total, balance) => {
      return total + (balance.usdValueNum || 0);
    }, 0);
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
