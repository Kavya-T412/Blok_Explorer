const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { NETWORK_CONFIGS, WRAPPED_NATIVE, STABLECOINS, DEX_ROUTERS, UNISWAP_V3_QUOTER } = require('./networkconfig');
const { SwapService, MultiChainSwapManager } = require('./swap');
const { getGasPrices, chains } = require('./gasEstimate');
const { generateAiResponse } = require('./ai_service');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Add BigInt serialization support for JSON
BigInt.prototype.toJSON = function () { return this.toString(); };

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

// Swap API Routes

app.get('/api/swap/chains', (req, res) => {
  try {
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
    if (req.query.mode) chains = chains.filter(c => c.type === req.query.mode);
    res.json({ success: true, chains, count: chains.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/swap/tokens/:chainId', (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const config = NETWORK_CONFIGS[chainId];
    if (!config) return res.status(404).json({ success: false, error: `Chain ${chainId} not supported` });

    const tokens = {
      native: { symbol: config.symbol, name: `${config.name} Native Token`, address: 'native', decimals: 18 },
      wrappedNative: { symbol: `W${config.symbol}`, name: `Wrapped ${config.symbol}`, address: WRAPPED_NATIVE[chainId], decimals: 18 }
    };

    const stables = STABLECOINS[chainId];
    if (stables) {
      Object.entries(stables).forEach(([symbol, address]) => {
        tokens[symbol.toLowerCase()] = { symbol, address, decimals: symbol === 'DAI' ? 18 : 6 };
      });
    }
    res.json({ success: true, chainId, network: config.name, tokens });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/swap/dexes/:chainId', (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const config = NETWORK_CONFIGS[chainId];
    if (!config) return res.status(404).json({ success: false, error: `Chain ${chainId} not supported` });

    const dexes = DEX_ROUTERS[chainId] || {};
    res.json({
      success: true,
      chainId,
      network: config.name,
      defaultDex: config.defaultDex,
      dexes: Object.entries(dexes).map(([name, address]) => ({ name, address, isDefault: name === config.defaultDex }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/swap/quote', async (req, res) => {
  try {
    const { chainId, tokenIn, tokenOut, amountIn, fromDecimals, toDecimals } = req.body;
    if (!chainId || tokenIn === undefined || tokenOut === undefined || !amountIn) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const config = NETWORK_CONFIGS[chainId];
    if (!config) return res.status(404).json({ success: false, error: `Chain ${chainId} not supported` });

    const tokenInAddress = getTokenAddress(tokenIn, chainId);
    const tokenOutAddress = getTokenAddress(tokenOut, chainId);

    if ((tokenIn === 'native' && tokenOut === 'wrappedNative') || (tokenIn === 'wrappedNative' && tokenOut === 'native')) {
      return res.json({ success: true, chainId, network: config.name, tokenIn, tokenOut, amountIn, estimatedOutput: amountIn, feeTier: 0, isWrapUnwrap: true });
    }

    const quoterAddress = UNISWAP_V3_QUOTER[chainId];
    if (!quoterAddress) {
      return res.json({ success: true, chainId, network: config.name, tokenIn, tokenOut, amountIn, estimatedOutput: (parseFloat(amountIn) * 0.98).toString(), feeTier: 3000, note: 'Estimated (quoter unavailable)' });
    }

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const quoter = new ethers.Contract(quoterAddress, ['function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'], provider);

    const amountInWei = ethers.parseUnits(amountIn.toString(), fromDecimals || 18);
    let bestQuote = null, bestFee = 3000;

    for (const fee of [500, 3000, 10000]) {
      try {
        const result = await quoter.quoteExactInputSingle.staticCall({ tokenIn: tokenInAddress, tokenOut: tokenOutAddress, amountIn: amountInWei, fee, sqrtPriceLimitX96: 0 });
        const quote = result.amountOut || result[0];
        if (!bestQuote || quote > bestQuote) {
          bestQuote = quote;
          bestFee = fee;
        }
      } catch { continue; }
    }

    if (bestQuote) {
      res.json({ success: true, chainId, network: config.name, tokenIn, tokenOut, amountIn, estimatedOutput: ethers.formatUnits(bestQuote, toDecimals || 18), feeTier: bestFee });
    } else {
      res.json({ success: false, error: 'No liquidity pool found', chainId, network: config.name });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/swap/pool-details', async (req, res) => {
  try {
    const { chainId, tokenIn, tokenOut } = req.body;
    if (!chainId || !tokenIn || !tokenOut) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const config = NETWORK_CONFIGS[chainId];
    if (!config) return res.status(404).json({ success: false, error: `Chain ${chainId} not supported` });

    const tokenInAddress = getTokenAddress(tokenIn, chainId);
    const tokenOutAddress = getTokenAddress(tokenOut, chainId);

    const tempKey = process.env.REACT_APP_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
    const service = new SwapService(tempKey, chainId);
    const poolDetails = await service.getPoolDetails(tokenInAddress, tokenOutAddress);

    // Convert all BigInt values to strings/numbers for JSON serialization
    const safePoolDetails = poolDetails.map(pool => ({
      ...pool,
      fee: Number(pool.fee),
      tick: Number(pool.tick),
      sqrtPriceX96: pool.sqrtPriceX96.toString(),
      liquidity: pool.liquidity.toString()
    }));

    res.json({ success: true, chainId, network: config.name, tokenIn, tokenOut, pools: safePoolDetails });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/swap/quote-detailed', async (req, res) => {
  try {
    const { chainId, tokenIn, tokenOut, amountIn, fromDecimals, toDecimals } = req.body;
    if (!chainId || tokenIn === undefined || tokenOut === undefined || !amountIn) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const config = NETWORK_CONFIGS[chainId];
    if (!config) return res.status(404).json({ success: false, error: `Chain ${chainId} not supported` });

    const tokenInAddress = getTokenAddress(tokenIn, chainId);
    const tokenOutAddress = getTokenAddress(tokenOut, chainId);

    if ((tokenIn === 'native' && tokenOut === 'wrappedNative') || (tokenIn === 'wrappedNative' && tokenOut === 'native')) {
      return res.json({ success: true, chainId, network: config.name, tokenIn, tokenOut, amountIn, estimatedOutput: amountIn, feeTier: 0, isWrapUnwrap: true, pools: [], allQuotes: [] });
    }

    const amountInWei = ethers.parseUnits(amountIn.toString(), fromDecimals || 18);
    const tempKey = process.env.REACT_APP_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
    const service = new SwapService(tempKey, chainId);

    const poolDetails = await service.getPoolDetails(tokenInAddress, tokenOutAddress);
    const { fee, quote, gasEstimate, allQuotes, estimated } = await service.fetchQuote(tokenInAddress, tokenOutAddress, amountInWei);

    const decimalsOut = toDecimals || 18;

    // Convert all BigInt values to strings/numbers for JSON serialization
    const safePoolDetails = poolDetails.map(pool => ({
      ...pool,
      fee: Number(pool.fee),
      tick: Number(pool.tick),
      sqrtPriceX96: pool.sqrtPriceX96.toString(),
      liquidity: pool.liquidity.toString(),
      simulated: pool.simulated || false
    }));

    res.json({
      success: true,
      chainId,
      network: config.name,
      tokenIn,
      tokenOut,
      amountIn,
      estimatedOutput: ethers.formatUnits(quote, decimalsOut),
      feeTier: fee,
      gasEstimate: gasEstimate.toString(),
      pools: safePoolDetails,
      allQuotes: allQuotes.map(q => ({
        fee: q.fee,
        amountOut: q.amountOut.toString(),
        gasEstimate: q.gasEstimate.toString(),
        estimated: q.estimated || false
      })),
      estimated: estimated || false,
      warning: estimated ? 'Quote is estimated. Actual DEX may not be available on this chain.' : undefined
    });
  } catch (error) {
    console.error('❌ Quote-detailed error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/swap/create-payload', async (req, res) => {
  try {
    const { chainId, tokenIn, tokenOut, amountIn, slippagePercent, fromDecimals } = req.body;
    if (!chainId || !tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const config = NETWORK_CONFIGS[chainId];
    if (!config) return res.status(404).json({ success: false, error: `Chain ${chainId} not supported` });

    const tokenInAddress = getTokenAddress(tokenIn, chainId);
    const tokenOutAddress = getTokenAddress(tokenOut, chainId);

    // Sanitize amountIn - limit to appropriate decimals
    const decimalsIn = fromDecimals || 18;
    const amountStr = typeof amountIn === 'number' ? amountIn.toFixed(decimalsIn) : String(amountIn);
    // Truncate to max decimals to avoid overflow
    const parts = amountStr.split('.');
    const truncatedAmount = parts[1] ? `${parts[0]}.${parts[1].slice(0, decimalsIn)}` : parts[0];
    const amountInWei = ethers.parseUnits(truncatedAmount, decimalsIn);

    const tempKey = process.env.REACT_APP_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
    const service = new SwapService(tempKey, chainId);
    const payload = await service.createSwapPayload(tokenInAddress, tokenOutAddress, amountInWei, slippagePercent || 5);

    res.json({
      success: true,
      chainId,
      network: config.name,
      payload: {
        ...payload,
        swapParams: {
          ...payload.swapParams,
          amountIn: payload.swapParams.amountIn.toString(),
          amountOutMinimum: payload.swapParams.amountOutMinimum.toString()
        }
      }
    });
  } catch (error) {
    console.error('❌ Create-payload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/swap/execute', async (req, res) => {
  try {
    const { chainId, swapType, params, privateKey } = req.body;
    if (!chainId || !swapType || !params) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const key = privateKey || process.env.REACT_APP_PRIVATE_KEY;
    if (!key) return res.status(400).json({ success: false, error: 'Private key required' });

    const manager = new MultiChainSwapManager(key);
    const result = await manager.executeSwap(chainId, swapType, params);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/swap/account/:chainId/:address', async (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const config = NETWORK_CONFIGS[chainId];
    if (!config) return res.status(404).json({ success: false, error: `Chain ${chainId} not supported` });

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const balance = await provider.getBalance(req.params.address);
    const blockNumber = await provider.getBlockNumber();

    res.json({
      success: true,
      account: {
        address: req.params.address,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString(),
        network: config.name,
        chainId,
        symbol: config.symbol,
        blockNumber
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/swap/token-balance', async (req, res) => {
  try {
    const { chainId, tokenAddress, userAddress } = req.body;
    if (!chainId || !tokenAddress || !userAddress) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const config = NETWORK_CONFIGS[chainId];
    if (!config) return res.status(404).json({ success: false, error: `Chain ${chainId} not supported` });

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const tokenContract = new ethers.Contract(tokenAddress, [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)'
    ], provider);

    const [balance, decimals, symbol] = await Promise.all([
      tokenContract.balanceOf(userAddress),
      tokenContract.decimals(),
      tokenContract.symbol()
    ]);

    res.json({
      success: true,
      tokenAddress,
      userAddress,
      balance: ethers.formatUnits(balance, decimals),
      balanceRaw: balance.toString(),
      decimals,
      symbol,
      chainId,
      network: config.name
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// AI Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    const response = await generateAiResponse(message, history || []);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/api/health`);
  console.log(`📍 Transactions: /api/transactions/:address?mode=mainnet|testnet`);
  console.log(`📍 Swap: /api/swap/chains, /tokens/:chainId, /dexes/:chainId\n`);
});
