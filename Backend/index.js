const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { NETWORK_CONFIGS, WRAPPED_NATIVE, STABLECOINS, DEX_ROUTERS, UNISWAP_V3_QUOTER } = require('./networkconfig');
const { rubicSwapService } = require('./swap');
const { getGasPrices, chains } = require('./gasEstimate');

const app = express();
const PORT = process.env.PORT || 3001;

// Add BigInt serialization support for JSON
BigInt.prototype.toJSON = function() { return this.toString(); };

app.use(cors());
app.use(express.json());

// Helper: Get token address from key
const getTokenAddress = (tokenKey, chainId) => {
  if (tokenKey === 'native' || tokenKey === 'wrappedNative') return WRAPPED_NATIVE[chainId];
  if (tokenKey.startsWith('0x')) return tokenKey;
  const stables = STABLECOINS[chainId];
  return stables?.[tokenKey.toUpperCase()] || tokenKey;
};

async function fetchBlockTimestamp(blockNum, rpcUrl) {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBlockByNumber",
        params: [blockNum, false]
      })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.result?.timestamp) {
        return new Date(parseInt(data.result.timestamp, 16) * 1000).toISOString();
      }
    }
  } catch (error) {
    console.error(`Failed to fetch block timestamp: ${error.message}`);
  }
  return null;
}


async function fetchTransactionReceiptsBatch(txHashes, rpcUrl, batchSize = 10) {
  const results = new Map();
  for (let i = 0; i < txHashes.length; i += batchSize) {
    const batch = txHashes.slice(i, i + batchSize);
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.map((hash, index) => ({
          jsonrpc: "2.0",
          id: i + index,
          method: "eth_getTransactionReceipt",
          params: [hash]
        })))
      });
      
      if (response.ok) {
        const data = await response.json();
        (Array.isArray(data) ? data : [data]).forEach((item, index) => {
          if (item.result) {
            results.set(batch[index], {
              status: item.result.status === '0x1' ? 'success' : item.result.status === '0x0' ? 'failed' : 'pending',
              contractAddress: item.result.contractAddress
            });
          }
        });
      }
    } catch (error) {
      console.error(`Batch receipt fetch error: ${error.message}`);
    }
    if (i + batchSize < txHashes.length) await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
}

async function fetchNetworkTransactions(walletAddress, network, rpcUrl, categories) {
  const createRequest = (id, address, isFrom) => ({
    jsonrpc: "2.0",
    id,
    method: "alchemy_getAssetTransfers",
    params: [{
      fromBlock: "0x0",
      [isFrom ? 'fromAddress' : 'toAddress']: address,
      category: categories,
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: "0x3e8"
    }]
  });

  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout')), 10000)
  );

  try {
    const [fromResponse, toResponse] = await Promise.all([
      Promise.race([fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequest(0, walletAddress, true))
      }), timeout]).catch(err => null),
      Promise.race([fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequest(1, walletAddress, false))
      }), timeout]).catch(err => null)
    ]);

    const transactions = [];
    for (const [response, direction] of [[fromResponse, 'sent'], [toResponse, 'received']]) {
      if (response?.ok && response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.json();
        if (result.error) {
          console.log(`❌ ${network} (${direction}): ${result.error.message}`);
        } else if (result.result?.transfers) {
          console.log(`✅ ${network} (${direction}): ${result.result.transfers.length} transfers`);
          transactions.push(...result.result.transfers.map(tx => ({ ...tx, direction, network })));
        }
      }
    }

    const unique = Array.from(new Map(transactions.map(tx => [tx.hash, tx])).values());

    if (unique.length > 0) {
      const receipts = await fetchTransactionReceiptsBatch(unique.map(tx => tx.hash), rpcUrl);
      unique.forEach(tx => {
        const receipt = receipts.get(tx.hash);
        tx.txStatus = receipt?.status || 'success';
        if (receipt?.contractAddress && !tx.contractAddress) tx.contractAddress = receipt.contractAddress;
      });

      for (const tx of unique) {
        if (!tx.metadata?.blockTimestamp && tx.blockNum) {
          const timestamp = await fetchBlockTimestamp(tx.blockNum, rpcUrl);
          if (timestamp) {
            if (!tx.metadata) tx.metadata = {};
            tx.metadata.blockTimestamp = timestamp;
          }
        }
      }
    }

    return unique;
  } catch (err) {
    console.error(`❌ ${network}: ${err.message}`);
    return [];
  }
}


async function getTransactionHistory(walletAddress, networkMode = 'mainnet') {
  if (!walletAddress?.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid wallet address format');
  }
  if (!['mainnet', 'testnet'].includes(networkMode)) {
    throw new Error('Invalid network mode');
  }

  const ethCategories = ["external", "internal", "erc20", "erc721", "erc1155"];
  const standardCategories = ["external", "erc20", "erc721", "erc1155"];

  const networks = networkMode === 'mainnet' ? [
    { name: NETWORK_CONFIGS[1].name, url: NETWORK_CONFIGS[1].rpcUrl, categories: ethCategories },
    { name: NETWORK_CONFIGS[137].name, url: NETWORK_CONFIGS[137].rpcUrl, categories: ethCategories },
    { name: NETWORK_CONFIGS[56].name, url: NETWORK_CONFIGS[56].rpcUrl, categories: standardCategories },
    { name: NETWORK_CONFIGS[42161].name, url: NETWORK_CONFIGS[42161].rpcUrl, categories: standardCategories },
    { name: NETWORK_CONFIGS[10].name, url: NETWORK_CONFIGS[10].rpcUrl, categories: standardCategories },
    { name: NETWORK_CONFIGS[8453].name, url: NETWORK_CONFIGS[8453].rpcUrl, categories: standardCategories },
    { name: NETWORK_CONFIGS[43114].name, url: NETWORK_CONFIGS[43114].rpcUrl, categories: standardCategories }
  ] : [
    { name: NETWORK_CONFIGS[11155111].name, url: NETWORK_CONFIGS[11155111].rpcUrl, categories: ethCategories },
    { name: NETWORK_CONFIGS[80002].name, url: NETWORK_CONFIGS[80002].rpcUrl, categories: standardCategories },
    { name: NETWORK_CONFIGS[97].name, url: NETWORK_CONFIGS[97].rpcUrl, categories: standardCategories },
    { name: NETWORK_CONFIGS[421614].name, url: NETWORK_CONFIGS[421614].rpcUrl, categories: standardCategories },
    { name: NETWORK_CONFIGS[11155420].name, url: NETWORK_CONFIGS[11155420].rpcUrl, categories: standardCategories },
    { name: NETWORK_CONFIGS[84532].name, url: NETWORK_CONFIGS[84532].rpcUrl, categories: standardCategories },
    { name: NETWORK_CONFIGS[43113].name, url: NETWORK_CONFIGS[43113].rpcUrl, categories: standardCategories }
  ];

  console.log(`\n🔍 Fetching ${networkMode.toUpperCase()} transactions (${networks.length} chains in parallel)`);

  // Fetch from all networks in parallel for better performance
  const networkPromises = networks.map(network => 
    fetchNetworkTransactions(walletAddress, network.name, network.url, network.categories)
      .catch(err => {
        console.error(`Failed to fetch from ${network.name}: ${err.message}`);
        return []; // Return empty array on error, don't fail entire request
      })
  );
  
  const allNetworkResults = await Promise.all(networkPromises);
  const allTransactions = allNetworkResults.flat();

  allTransactions.sort((a, b) => {
    const timeA = a.metadata?.blockTimestamp ? new Date(a.metadata.blockTimestamp).getTime() : 0;
    const timeB = b.metadata?.blockTimestamp ? new Date(b.metadata.blockTimestamp).getTime() : 0;
    return timeB - timeA;
  });

  console.log(`\n📋 Total: ${allTransactions.length} transactions`);
  return allTransactions;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Transaction History API is running' });
});

// Gas Estimation Endpoint
app.get('/api/gas-prices', async (req, res) => {
  try {
    const gasPrices = await getGasPrices();
    res.json({ 
      success: true, 
      data: gasPrices,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching gas prices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch gas prices',
      message: error.message 
    });
  }
});

app.get('/api/transactions/:address', async (req, res) => {
  try {
    // Set response timeout to 55 seconds (less than frontend timeout)
    req.setTimeout(55000);
    
    const networkMode = ['mainnet', 'testnet'].includes(req.query.mode?.toLowerCase()) 
      ? req.query.mode.toLowerCase() : 'mainnet';
    const transactions = await getTransactionHistory(req.params.address, networkMode);
    res.json({
      success: true,
      address: req.params.address,
      networkMode,
      totalTransactions: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/transactions/custom/:address', async (req, res) => {
  try {
    const { rpcUrl, networkName, categories } = req.body;
    if (!rpcUrl || !networkName) {
      return res.status(400).json({ success: false, error: 'rpcUrl and networkName required' });
    }
    const txCategories = categories || ["external", "erc20", "erc721", "erc1155"];
    const transactions = await fetchNetworkTransactions(req.params.address, networkName, rpcUrl, txCategories);
    res.json({
      success: true,
      address: req.params.address,
      network: networkName,
      totalTransactions: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Rubic Swap API Routes ──────────────────────────────────────────────────

// GET /api/rubic/chains?testnet=true
// Returns all supported chains from the Rubic API (mainnet by default)
app.get('/api/rubic/chains', async (req, res) => {
  try {
    const includeTestnets = req.query.testnet === 'true';
    const chainList = await rubicSwapService.getSupportedChains(includeTestnets);
    res.json({ success: true, chains: chainList, count: chainList.length });
  } catch (error) {
    console.error('❌ /api/rubic/chains error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/rubic/tokens/:blockchain?search=USDC&page=1&pageSize=50
// Returns tokens for a given Rubic blockchain name via the Rubic Token API
app.get('/api/rubic/tokens/:blockchain', async (req, res) => {
  try {
    const blockchain = req.params.blockchain.toUpperCase();
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const tokens = await rubicSwapService.getTokens(blockchain, search, page, pageSize);
    res.json({ success: true, blockchain, tokens, count: tokens.length });
  } catch (error) {
    console.error('❌ /api/rubic/tokens error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rubic/quote-all
// Body: { srcTokenAddress, srcTokenBlockchain, dstTokenAddress, dstTokenBlockchain, srcTokenAmount }
// Returns all available swap routes (on-chain + cross-chain)
app.post('/api/rubic/quote-all', async (req, res) => {
  try {
    const { srcTokenAddress, srcTokenBlockchain, dstTokenAddress, dstTokenBlockchain, srcTokenAmount } = req.body;

    if (!srcTokenAddress || !srcTokenBlockchain || !dstTokenAddress || !dstTokenBlockchain || !srcTokenAmount) {
      return res.status(400).json({ success: false, error: 'Missing required fields: srcTokenAddress, srcTokenBlockchain, dstTokenAddress, dstTokenBlockchain, srcTokenAmount' });
    }

    const routes = await rubicSwapService.getQuoteAll({
      srcTokenAddress,
      srcTokenBlockchain: srcTokenBlockchain.toUpperCase(),
      dstTokenAddress,
      dstTokenBlockchain: dstTokenBlockchain.toUpperCase(),
      srcTokenAmount,
    });

    res.json({ success: true, routes, count: routes.length });
  } catch (error) {
    console.error('❌ /api/rubic/quote-all error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rubic/quote-best
// Body: { srcTokenAddress, srcTokenBlockchain, dstTokenAddress, dstTokenBlockchain, srcTokenAmount }
// Returns the single best swap route
app.post('/api/rubic/quote-best', async (req, res) => {
  try {
    const { srcTokenAddress, srcTokenBlockchain, dstTokenAddress, dstTokenBlockchain, srcTokenAmount } = req.body;

    if (!srcTokenAddress || !srcTokenBlockchain || !dstTokenAddress || !dstTokenBlockchain || !srcTokenAmount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const route = await rubicSwapService.getQuoteBest({
      srcTokenAddress,
      srcTokenBlockchain: srcTokenBlockchain.toUpperCase(),
      dstTokenAddress,
      dstTokenBlockchain: dstTokenBlockchain.toUpperCase(),
      srcTokenAmount,
    });

    res.json({ success: true, route });
  } catch (error) {
    console.error('❌ /api/rubic/quote-best error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rubic/swap-data
// Body: { srcTokenAddress, srcTokenBlockchain, dstTokenAddress, dstTokenBlockchain, srcTokenAmount, id, fromAddress, receiverAddress? }
// Returns the signed transaction data to execute the swap
app.post('/api/rubic/swap-data', async (req, res) => {
  try {
    const {
      srcTokenAddress, srcTokenBlockchain,
      dstTokenAddress, dstTokenBlockchain,
      srcTokenAmount, id, fromAddress, receiverAddress,
    } = req.body;

    if (!srcTokenAddress || !srcTokenBlockchain || !dstTokenAddress || !dstTokenBlockchain || !srcTokenAmount || !id || !fromAddress) {
      return res.status(400).json({ success: false, error: 'Missing required fields: srcTokenAddress, srcTokenBlockchain, dstTokenAddress, dstTokenBlockchain, srcTokenAmount, id, fromAddress' });
    }

    const data = await rubicSwapService.getSwapData({
      srcTokenAddress,
      srcTokenBlockchain: srcTokenBlockchain.toUpperCase(),
      dstTokenAddress,
      dstTokenBlockchain: dstTokenBlockchain.toUpperCase(),
      srcTokenAmount,
      id,
      fromAddress,
      receiverAddress,
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ /api/rubic/swap-data error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/rubic/status/:txHash?srcBlockchain=ETH
// Returns cross-chain swap status
app.get('/api/rubic/status/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    const { srcBlockchain } = req.query;

    if (!srcBlockchain) {
      return res.status(400).json({ success: false, error: 'srcBlockchain query parameter is required' });
    }

    const status = await rubicSwapService.getSwapStatus(txHash, srcBlockchain.toUpperCase());
    res.json({ success: true, status });
  } catch (error) {
    console.error('❌ /api/rubic/status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/rubic/chain-info/:chainId - kept for backward compat; returns chains from Rubic API
app.get('/api/rubic/chain-info/:chainId', async (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const allChains = await rubicSwapService.getSupportedChains(true);
    const chain = allChains.find(c => c.chainId === chainId);
    if (!chain) {
      return res.status(404).json({ success: false, error: `Chain ID ${chainId} not found in Rubic supported chains` });
    }
    res.json({ success: true, chainId, blockchainName: chain.blockchainName, chain });
  } catch (error) {
    console.error('❌ /api/rubic/chain-info error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Health:       http://localhost:${PORT}/api/health`);
  console.log(`📍 Transactions: /api/transactions/:address?mode=mainnet|testnet`);
  console.log(`📍 Rubic Chains: /api/rubic/chains?testnet=true`);
  console.log(`📍 Rubic Tokens: /api/rubic/tokens/:blockchain`);
  console.log(`📍 Rubic Quotes: POST /api/rubic/quote-all | POST /api/rubic/quote-best`);
  console.log(`📍 Rubic Swap:   POST /api/rubic/swap-data`);
  console.log(`📍 Rubic Status: /api/rubic/status/:txHash?srcBlockchain=ETH\n`);
});
