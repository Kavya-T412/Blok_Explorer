const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { NETWORK_CONFIGS, ALCHEMY_API_KEY, ALCHEMY_ENDPOINTS, getRpcUrl } = require('./networkconfig');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to fetch block timestamp using eth_getBlockByNumber
async function fetchBlockTimestamp(blockNum, rpcUrl) {
  try {
    const requestBody = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBlockByNumber",
      params: [blockNum, false] // false = don't include transaction details
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.result && data.result.timestamp) {
      // Convert hex timestamp to decimal, then to ISO string
      const timestampDecimal = parseInt(data.result.timestamp, 16);
      const date = new Date(timestampDecimal * 1000);
      return date.toISOString();
    }
  } catch (error) {
    console.error(`Failed to fetch block timestamp for ${blockNum}:`, error.message);
  }
  return null;
}

// Helper function to batch fetch transaction receipts to get status (success/failed)
async function fetchTransactionReceiptsBatch(txHashes, rpcUrl, batchSize = 10) {
  const results = new Map();
  
  for (let i = 0; i < txHashes.length; i += batchSize) {
    const batch = txHashes.slice(i, i + batchSize);
    const batchRequests = batch.map((hash, index) => ({
      jsonrpc: "2.0",
      id: i + index,
      method: "eth_getTransactionReceipt",
      params: [hash]
    }));
    
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchRequests)
      });
      
      if (response.ok) {
        const data = await response.json();
        const responses = Array.isArray(data) ? data : [data];
        
        responses.forEach((item, index) => {
          if (item.result) {
            const txHash = batch[index];
            const status = item.result.status;
            results.set(txHash, {
              status: status === '0x1' ? 'success' : status === '0x0' ? 'failed' : 'pending',
              contractAddress: item.result.contractAddress
            });
          }
        });
      }
    } catch (error) {
      console.error(`Batch receipt fetch error:`, error.message);
    }
    
    if (i + batchSize < txHashes.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Helper function to get network RPC URL with priority
function getNetworkRpcUrl(chainId) {
  const config = NETWORK_CONFIGS[chainId];
  if (!config) return null;
  return config.rpcUrl;
}

// Main function to fetch transaction history
async function getTransactionHistory(walletAddress, networkMode = 'mainnet') {
  try {
    // Validate wallet address
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid wallet address format');
    }

    // Validate network mode
    if (!['mainnet', 'testnet'].includes(networkMode)) {
      throw new Error('Invalid network mode. Must be "mainnet" or "testnet"');
    }

    // Categories for different networks
    // IMPORTANT: Alchemy only supports 'internal' category for Ethereum (all testnets) and Polygon Mainnet
    const ethCategories = ["external", "internal", "erc20", "erc721", "erc1155"];
    const polygonMainnetCategories = ["external", "internal", "erc20", "erc721", "erc1155"];
    // All other networks (L2s, BNB, Avalanche, Polygon testnets) don't support 'internal'
    const standardCategories = ["external", "erc20", "erc721", "erc1155"];

    // Build comprehensive network list from centralized config
    const allNetworks = [];
    
    if (networkMode === 'mainnet') {
      allNetworks.push(
        { name: NETWORK_CONFIGS[1].name, url: NETWORK_CONFIGS[1].rpcUrl, categories: ethCategories },
        { name: NETWORK_CONFIGS[137].name, url: NETWORK_CONFIGS[137].rpcUrl, categories: polygonMainnetCategories },
        { name: NETWORK_CONFIGS[56].name, url: NETWORK_CONFIGS[56].rpcUrl, categories: standardCategories },
        { name: NETWORK_CONFIGS[42161].name, url: NETWORK_CONFIGS[42161].rpcUrl, categories: standardCategories },
        { name: NETWORK_CONFIGS[10].name, url: NETWORK_CONFIGS[10].rpcUrl, categories: standardCategories },
        { name: NETWORK_CONFIGS[8453].name, url: NETWORK_CONFIGS[8453].rpcUrl, categories: standardCategories },
        { name: NETWORK_CONFIGS[43114].name, url: NETWORK_CONFIGS[43114].rpcUrl, categories: standardCategories }
      );
    } else {
      allNetworks.push(
        { name: NETWORK_CONFIGS[11155111].name, url: NETWORK_CONFIGS[11155111].rpcUrl, categories: ethCategories },
        { name: NETWORK_CONFIGS[80002].name, url: NETWORK_CONFIGS[80002].rpcUrl, categories: standardCategories },
        { name: NETWORK_CONFIGS[97].name, url: NETWORK_CONFIGS[97].rpcUrl, categories: standardCategories },
        { name: NETWORK_CONFIGS[421614].name, url: NETWORK_CONFIGS[421614].rpcUrl, categories: standardCategories },
        { name: NETWORK_CONFIGS[11155420].name, url: NETWORK_CONFIGS[11155420].rpcUrl, categories: standardCategories },
        { name: NETWORK_CONFIGS[84532].name, url: NETWORK_CONFIGS[84532].rpcUrl, categories: standardCategories },
        { name: NETWORK_CONFIGS[43113].name, url: NETWORK_CONFIGS[43113].rpcUrl, categories: standardCategories }
      );
    }
    
    console.log(`\n🔍 Fetching transactions for ${networkMode.toUpperCase()} networks (${allNetworks.length} chains)`);

    const allTransactions = [];

    for (const network of allNetworks) {
      try {
        console.log(`\n========== Fetching from ${network.name} ==========`);
        console.log(`📋 Categories: [${network.categories.join(', ')}]`);
        
        // Fetch both 'from' and 'to' transactions
        const fromData = {
          jsonrpc: "2.0",
          id: 0,
          method: "alchemy_getAssetTransfers",
          params: [{
            fromBlock: "0x0",
            fromAddress: walletAddress,
            category: network.categories,
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: "0x3e8" // 1000 transactions max
          }]
        };

        const toData = {
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getAssetTransfers",
          params: [{
            fromBlock: "0x0",
            toAddress: walletAddress,
            category: network.categories,
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: "0x3e8" // 1000 transactions max
          }]
        };

        // Fetch sent transactions with timeout
        const fromResponse = await Promise.race([
          fetch(network.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fromData)
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout (30s)')), 30000)
          )
        ]);

        // Fetch received transactions with timeout
        const toResponse = await Promise.race([
          fetch(network.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toData)
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout (30s)')), 30000)
          )
        ]);

        let networkTransactions = [];

        // Process 'from' transactions
        if (fromResponse && fromResponse.ok) {
          const contentType = fromResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const fromResult = await fromResponse.json();
            if (fromResult.error) {
              console.log(`❌ ${network.name} (Sent): API Error - ${fromResult.error.message}`);
            } else if (fromResult.result && fromResult.result.transfers) {
              console.log(`✅ ${network.name} (Sent): Found ${fromResult.result.transfers.length} transfers`);
              networkTransactions.push(...fromResult.result.transfers.map(tx => ({
                ...tx,
                direction: 'sent',
                network: network.name
              })));
            }
          }
        } else if (fromResponse) {
          console.log(`⚠️  ${network.name} (Sent): HTTP ${fromResponse.status} - ${fromResponse.statusText}`);
        }

        // Process 'to' transactions
        if (toResponse && toResponse.ok) {
          const contentType = toResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const toResult = await toResponse.json();
            if (toResult.error) {
              console.log(`❌ ${network.name} (Received): API Error - ${toResult.error.message}`);
            } else if (toResult.result && toResult.result.transfers) {
              console.log(`✅ ${network.name} (Received): Found ${toResult.result.transfers.length} transfers`);
              networkTransactions.push(...toResult.result.transfers.map(tx => ({
                ...tx,
                direction: 'received',
                network: network.name
              })));
            }
          }
        } else if (toResponse) {
          console.log(`⚠️  ${network.name} (Received): HTTP ${toResponse.status} - ${toResponse.statusText}`);
        }

        // Remove duplicates based on hash
        const uniqueTransactions = Array.from(
          new Map(networkTransactions.map(tx => [tx.hash, tx])).values()
        );

        // Fetch transaction receipts to get actual status (success/failed)
        if (uniqueTransactions.length > 0) {
          console.log(`📋 Fetching receipts for ${uniqueTransactions.length} transactions...`);
          const txHashes = uniqueTransactions.map(tx => tx.hash);
          const receipts = await fetchTransactionReceiptsBatch(txHashes, network.url);
          
          uniqueTransactions.forEach(tx => {
            const receipt = receipts.get(tx.hash);
            if (receipt) {
              tx.txStatus = receipt.status;
              if (receipt.contractAddress && !tx.contractAddress) {
                tx.contractAddress = receipt.contractAddress;
              }
            } else {
              tx.txStatus = 'success';
            }
          });
          
          const failedCount = uniqueTransactions.filter(tx => tx.txStatus === 'failed').length;
          console.log(`✅ Status: ${uniqueTransactions.length - failedCount} success, ${failedCount} failed`);
        }

        // Fetch missing timestamps for transactions without metadata.blockTimestamp
        for (const tx of uniqueTransactions) {
          if (!tx.metadata?.blockTimestamp && tx.blockNum) {
            console.log(`⏱️  Fetching timestamp for block ${tx.blockNum}...`);
            const timestamp = await fetchBlockTimestamp(tx.blockNum, network.url);
            if (timestamp) {
              if (!tx.metadata) {
                tx.metadata = {};
              }
              tx.metadata.blockTimestamp = timestamp;
              console.log(`✅ Retrieved timestamp: ${timestamp}`);
            }
          }
        }

        // Sort by block number
        uniqueTransactions.sort((a, b) => {
          const blockA = parseInt(a.blockNum, 16);
          const blockB = parseInt(b.blockNum, 16);
          return blockA - blockB;
        });

        allTransactions.push(...uniqueTransactions);

        // Display transactions for this network
        if (uniqueTransactions.length > 0) {
          console.log(`\n--- All Transactions for ${network.name} (${uniqueTransactions.length} total) ---`);
          uniqueTransactions.forEach((tx, index) => {
            const isContractDeployment = !tx.to || tx.to === null;
            console.log(`\nTransaction ${index + 1}:`);
            console.log(`  Hash: ${tx.hash}`);
            console.log(`  Block: ${tx.blockNum} (${parseInt(tx.blockNum, 16)})`);
            console.log(`  From: ${tx.from}`);
            console.log(`  To: ${tx.to || 'Contract Deployment'}`);
            console.log(`  Value: ${tx.value || '0'} ${tx.asset || ''}`);
            console.log(`  Category: ${tx.category}`);
            console.log(`  Direction: ${tx.direction}`);
            console.log(`  Type: ${isContractDeployment ? 'Contract Deployment' : 'Transfer'}`);
            if (isContractDeployment) {
              console.log(`  Contract Address: ${tx.contractAddress || 'Not available from API'}`);
            }
            if (tx.metadata) {
              console.log(`  Block Timestamp: ${tx.metadata.blockTimestamp || 'N/A'}`);
            }
          });
        } else {
          console.log(`⚠️  ${network.name}: No transactions found`);
        }
      } catch (err) {
        // Enhanced error logging for better debugging
        if (err.type === 'invalid-json' || err.message?.includes('invalid json')) {
          console.log(`❌ ${network.name}: Invalid JSON response from API`);
        } else if (err.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
          console.log(`❌ ${network.name}: Network unreachable - DNS resolution failed`);
        } else if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
          console.log(`❌ ${network.name}: Connection refused`);
        } else if (err.message?.includes('fetch failed')) {
          console.log(`❌ ${network.name}: Network request failed - possible endpoint or network issue`);
        } else {
          console.log(`❌ ${network.name}: ${err.message}`);
        }
      }
    }

    // Summary
    console.log('\n\n========== SUMMARY ==========');
    console.log(`Total transactions across all networks: ${allTransactions.length}`);
    
    const byNetwork = allTransactions.reduce((acc, tx) => {
      acc[tx.network] = (acc[tx.network] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nTransactions per network:');
    Object.entries(byNetwork).forEach(([network, count]) => {
      console.log(`  ${network}: ${count}`);
    });

    const byDirection = allTransactions.reduce((acc, tx) => {
      acc[tx.direction] = (acc[tx.direction] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nTransactions by direction:');
    Object.entries(byDirection).forEach(([direction, count]) => {
      console.log(`  ${direction}: ${count}`);
    });

    const contractDeployments = allTransactions.filter(tx => !tx.to || tx.to === null);
    console.log(`\nContract Deployments: ${contractDeployments.length}`);

    // Sort all transactions by timestamp (most recent first) for frontend display
    allTransactions.sort((a, b) => {
      const timeA = a.metadata?.blockTimestamp ? new Date(a.metadata.blockTimestamp).getTime() : 0;
      const timeB = b.metadata?.blockTimestamp ? new Date(b.metadata.blockTimestamp).getTime() : 0;
      return timeB - timeA; // Descending order (newest first)
    });

    console.log(`\n📋 Transactions sorted by timestamp (newest first)`);

    return allTransactions;
  } catch (error) {
    console.error('Fatal Error:', error);
    throw error;
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Transaction History API is running' });
});

app.get('/api/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { mode } = req.query; // Get network mode from query params (mainnet or testnet)
    
    // Default to mainnet if mode is not specified
    const networkMode = mode && ['mainnet', 'testnet'].includes(mode.toLowerCase()) 
      ? mode.toLowerCase() 
      : 'mainnet';
    
    console.log(`\n📡 API Request: Fetching ${networkMode.toUpperCase()} transactions for ${address}`);
    
    const transactions = await getTransactionHistory(address, networkMode);
    
    res.json({
      success: true,
      address: address,
      networkMode: networkMode,
      totalTransactions: transactions.length,
      transactions: transactions
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transaction history'
    });
  }
});

// New endpoint for custom network transactions
app.post('/api/transactions/custom/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { rpcUrl, networkName, categories } = req.body;
    
    if (!rpcUrl || !networkName) {
      return res.status(400).json({
        success: false,
        error: 'rpcUrl and networkName are required'
      });
    }
    
    console.log(`\n📡 API Request: Fetching transactions for custom network ${networkName}`);
    
    // Use standard categories if not provided
    const txCategories = categories || ["external", "erc20", "erc721", "erc1155"];
    
    const transactions = await getCustomNetworkTransactions(address, rpcUrl, networkName, txCategories);
    
    res.json({
      success: true,
      address: address,
      network: networkName,
      totalTransactions: transactions.length,
      transactions: transactions
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transaction history'
    });
  }
});

// Function to fetch transactions from a custom network
async function getCustomNetworkTransactions(walletAddress, rpcUrl, networkName, categories) {
  try {
    // Validate wallet address
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid wallet address format');
    }

    console.log(`\n🔍 Fetching transactions from custom network: ${networkName}`);
    console.log(`📋 RPC URL: ${rpcUrl}`);
    console.log(`📋 Categories: [${categories.join(', ')}]`);
    
    const allTransactions = [];

    try {
      // Fetch both 'from' and 'to' transactions
      const fromData = {
        jsonrpc: "2.0",
        id: 0,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          fromAddress: walletAddress,
          category: categories,
          withMetadata: true,
          excludeZeroValue: false,
          maxCount: "0x3e8" // 1000 transactions max
        }]
      };

      const toData = {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toAddress: walletAddress,
          category: categories,
          withMetadata: true,
          excludeZeroValue: false,
          maxCount: "0x3e8" // 1000 transactions max
        }]
      };

      // Fetch sent transactions with timeout
      const fromResponse = await Promise.race([
        fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fromData)
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout (30s)')), 30000)
        )
      ]);

      // Fetch received transactions with timeout
      const toResponse = await Promise.race([
        fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toData)
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout (30s)')), 30000)
        )
      ]);

      let networkTransactions = [];

      // Process 'from' transactions
      if (fromResponse && fromResponse.ok) {
        const contentType = fromResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const fromResult = await fromResponse.json();
          if (fromResult.error) {
            console.log(`❌ ${networkName} (Sent): API Error - ${fromResult.error.message}`);
          } else if (fromResult.result && fromResult.result.transfers) {
            console.log(`✅ ${networkName} (Sent): Found ${fromResult.result.transfers.length} transfers`);
            networkTransactions.push(...fromResult.result.transfers.map(tx => ({
              ...tx,
              direction: 'sent',
              network: networkName
            })));
          }
        }
      } else if (fromResponse) {
        console.log(`⚠️  ${networkName} (Sent): HTTP ${fromResponse.status} - ${fromResponse.statusText}`);
      }

      // Process 'to' transactions
      if (toResponse && toResponse.ok) {
        const contentType = toResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const toResult = await toResponse.json();
          if (toResult.error) {
            console.log(`❌ ${networkName} (Received): API Error - ${toResult.error.message}`);
          } else if (toResult.result && toResult.result.transfers) {
            console.log(`✅ ${networkName} (Received): Found ${toResult.result.transfers.length} transfers`);
            networkTransactions.push(...toResult.result.transfers.map(tx => ({
              ...tx,
              direction: 'received',
              network: networkName
            })));
          }
        }
      } else if (toResponse) {
        console.log(`⚠️  ${networkName} (Received): HTTP ${toResponse.status} - ${toResponse.statusText}`);
      }

      // Remove duplicates based on hash
      const uniqueTransactions = Array.from(
        new Map(networkTransactions.map(tx => [tx.hash, tx])).values()
      );

      // Fetch transaction receipts to get actual status (success/failed)
      if (uniqueTransactions.length > 0) {
        console.log(`📋 Fetching receipts for ${uniqueTransactions.length} transactions...`);
        const txHashes = uniqueTransactions.map(tx => tx.hash);
        const receipts = await fetchTransactionReceiptsBatch(txHashes, rpcUrl);
        
        uniqueTransactions.forEach(tx => {
          const receipt = receipts.get(tx.hash);
          if (receipt) {
            tx.txStatus = receipt.status;
            if (receipt.contractAddress && !tx.contractAddress) {
              tx.contractAddress = receipt.contractAddress;
            }
          } else {
            tx.txStatus = 'success';
          }
        });
        
        const failedCount = uniqueTransactions.filter(tx => tx.txStatus === 'failed').length;
        console.log(`✅ Status: ${uniqueTransactions.length - failedCount} success, ${failedCount} failed`);
      }

      // Fetch missing timestamps for transactions without metadata.blockTimestamp
      for (const tx of uniqueTransactions) {
        if (!tx.metadata?.blockTimestamp && tx.blockNum) {
          console.log(`⏱️  Fetching timestamp for block ${tx.blockNum}...`);
          const timestamp = await fetchBlockTimestamp(tx.blockNum, rpcUrl);
          if (timestamp) {
            if (!tx.metadata) {
              tx.metadata = {};
            }
            tx.metadata.blockTimestamp = timestamp;
            console.log(`✅ Retrieved timestamp: ${timestamp}`);
          }
        }
      }

      // Sort by timestamp (most recent first)
      uniqueTransactions.sort((a, b) => {
        const timeA = a.metadata?.blockTimestamp ? new Date(a.metadata.blockTimestamp).getTime() : 0;
        const timeB = b.metadata?.blockTimestamp ? new Date(b.metadata.blockTimestamp).getTime() : 0;
        return timeB - timeA;
      });

      allTransactions.push(...uniqueTransactions);

      console.log(`\n✅ ${networkName}: Found ${uniqueTransactions.length} transactions`);
    } catch (err) {
      console.error(`❌ ${networkName}: ${err.message}`);
      throw err;
    }

    return allTransactions;
  } catch (error) {
    console.error('Fatal Error:', error);
    throw error;
  }
}

// ============================================
// SWAP API ENDPOINTS
// ============================================

const {
  SwapService,
  MultiChainSwapManager,
  getNetworkConfig,
  getMainnetChainIds,
  getTestnetChainIds
} = require('./swap');

// Import remaining constants from networkconfig (already imported at top, but DEX_ROUTERS etc. are needed here)
const { DEX_ROUTERS, WRAPPED_NATIVE, STABLECOINS } = require('./networkconfig');

// Get supported chains
app.get('/api/swap/chains', (req, res) => {
  try {
    const { mode } = req.query;
    
    let chains = Object.entries(NETWORK_CONFIGS).map(([chainId, config]) => ({
      chainId: parseInt(chainId),
      name: config.name,
      symbol: config.symbol,
      type: config.type,
      dexes: Object.keys(DEX_ROUTERS[chainId] || {}),
      explorer: config.explorer,
      wrappedNative: WRAPPED_NATIVE[chainId],
      stablecoins: STABLECOINS[chainId] || {}
    }));
    
    if (mode === 'mainnet') {
      chains = chains.filter(c => c.type === 'mainnet');
    } else if (mode === 'testnet') {
      chains = chains.filter(c => c.type === 'testnet');
    }
    
    res.json({
      success: true,
      chains,
      count: chains.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get tokens for a specific chain
app.get('/api/swap/tokens/:chainId', (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const config = NETWORK_CONFIGS[chainId];
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Chain ${chainId} not supported`
      });
    }
    
    const tokens = {
      native: {
        symbol: config.symbol,
        name: `${config.name} Native Token`,
        address: 'native',
        decimals: 18
      },
      wrappedNative: {
        symbol: `W${config.symbol}`,
        name: `Wrapped ${config.symbol}`,
        address: WRAPPED_NATIVE[chainId],
        decimals: 18
      }
    };
    
    const stables = STABLECOINS[chainId];
    if (stables) {
      Object.entries(stables).forEach(([symbol, address]) => {
        tokens[symbol.toLowerCase()] = {
          symbol,
          address,
          decimals: symbol === 'DAI' ? 18 : 6
        };
      });
    }
    
    res.json({
      success: true,
      chainId,
      network: config.name,
      tokens
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get DEXes for a specific chain
app.get('/api/swap/dexes/:chainId', (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const config = NETWORK_CONFIGS[chainId];
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Chain ${chainId} not supported`
      });
    }
    
    const dexes = DEX_ROUTERS[chainId] || {};
    
    res.json({
      success: true,
      chainId,
      network: config.name,
      defaultDex: config.defaultDex,
      dexes: Object.entries(dexes).map(([name, address]) => ({
        name,
        address,
        isDefault: name === config.defaultDex
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get swap quote (price estimation)
app.post('/api/swap/quote', async (req, res) => {
  try {
    const { chainId, tokenIn, tokenOut, amountIn, dex } = req.body;
    
    if (!chainId || !tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: chainId, tokenIn, tokenOut, amountIn'
      });
    }
    
    const config = NETWORK_CONFIGS[chainId];
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Chain ${chainId} not supported`
      });
    }
    
    // Note: For actual quotes, you'd need to query the DEX
    // This is a placeholder response
    res.json({
      success: true,
      chainId,
      network: config.name,
      tokenIn,
      tokenOut,
      amountIn,
      estimatedOutput: 'Quote requires on-chain query',
      dex: dex || config.defaultDex,
      note: 'Connect wallet and execute swap for actual quote'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute swap (requires private key - for backend use only)
app.post('/api/swap/execute', async (req, res) => {
  try {
    const { chainId, swapType, params, privateKey } = req.body;
    
    if (!chainId || !swapType || !params) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: chainId, swapType, params'
      });
    }
    
    // Use environment private key if not provided
    const key = privateKey || process.env.REACT_APP_PRIVATE_KEY;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Private key required for swap execution'
      });
    }
    
    const manager = new MultiChainSwapManager(key);
    const result = await manager.executeSwap(chainId, swapType, params);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get account info on a specific chain
app.get('/api/swap/account/:chainId/:address', async (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const address = req.params.address;
    
    const config = NETWORK_CONFIGS[chainId];
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Chain ${chainId} not supported`
      });
    }
    
    // Create a read-only provider
    const { ethers } = require('ethers');
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    const balance = await provider.getBalance(address);
    const blockNumber = await provider.getBlockNumber();
    
    res.json({
      success: true,
      account: {
        address,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString(),
        network: config.name,
        chainId,
        symbol: config.symbol,
        blockNumber
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Transaction History API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Get transactions: http://localhost:${PORT}/api/transactions/:address?mode=mainnet`);
  console.log(`📍                    http://localhost:${PORT}/api/transactions/:address?mode=testnet`);
  console.log(`📍 Swap chains: http://localhost:${PORT}/api/swap/chains`);
  console.log(`📍 Swap tokens: http://localhost:${PORT}/api/swap/tokens/:chainId`);
  console.log(`📍 Swap DEXes: http://localhost:${PORT}/api/swap/dexes/:chainId\n`);
});
