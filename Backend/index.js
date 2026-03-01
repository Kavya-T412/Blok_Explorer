const express = require('express');
const cors = require('cors');
const { rubicSwapService } = require('./swap');
const { getGasPrices } = require('./gasEstimate');
const { getTransactionHistory, fetchNetworkTransactions } = require('./txHis');

const app = express();
const PORT = process.env.PORT || 3001;

// Add BigInt serialization support for JSON
BigInt.prototype.toJSON = function () { return this.toString(); };

app.use(cors());
app.use(express.json());


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
      slippage = 0.01,
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
      slippage: Number(slippage),
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
