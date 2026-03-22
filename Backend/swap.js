const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { NETWORK_CONFIGS, TESTNET_TOKENS, UNISWAP_V3_ROUTERS, UNISWAP_V3_QUOTERS, WRAPPED_NATIVE } = require('./networkconfig');

const UNISWAP_V3_QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const RUBIC_API_BASE = 'https://api-v2.rubic.exchange/api';
const REFERRER = 'rubic.exchange';

// ---- Low-level helpers ------------------------------------------------------

function extractRubicError(data, statusText) {
  // Format: { error: { code, reason } }
  if (data?.error && typeof data.error === 'object') {
    return data.error.reason || data.error.message || JSON.stringify(data.error);
  }
  // Format: { error: "string" }
  if (typeof data?.error === 'string' && data.error) return data.error;
  // Format: { errors: [{ code, reason }] }
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map(e => e.reason || e.message || JSON.stringify(e)).join('; ');
  }
  // Format: { message: string | string[] | object[] }
  const msg = data?.message;
  if (Array.isArray(msg)) {
    return msg.map(m =>
      typeof m === 'string' ? m
        : m?.constraints ? Object.values(m.constraints).join(', ')
          : JSON.stringify(m)
    ).join('; ');
  }
  if (typeof msg === 'string' && msg) return msg;
  if (msg != null && typeof msg === 'object') return JSON.stringify(msg);
  return statusText || 'Unknown error';
}

async function rubicGet(path, params) {
  const qs = params
    ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
    : '';
  const url = `${RUBIC_API_BASE}${path}${qs}`;
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Non-JSON response from Rubic: ${text.substring(0, 200)}`); }
  if (!response.ok) {
    throw new Error(extractRubicError(data, response.statusText));
  }
  return data;
}

async function rubicPost(path, body) {
  const url = `${RUBIC_API_BASE}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Non-JSON response from Rubic: ${text.substring(0, 200)}`); }
  if (!response.ok) {
    throw new Error(extractRubicError(data, response.statusText));
  }
  return data;
}

// ---- Price Helpers ------------------------------------------------------------
const COIN_IDS = {
  ETH: 'ethereum', WETH: 'ethereum',
  MATIC: 'matic-network', WMATIC: 'matic-network', POL: 'matic-network',
  TBNB: 'binancecoin', WBNB: 'binancecoin', BNB: 'binancecoin',
  BUSD: 'binance-usd',
  AVAX: 'avalanche-2', WAVAX: 'avalanche-2',
  SOL: 'solana', WSOL: 'solana',
  APT: 'aptos',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai'
};

const priceCache = {};
const CACHE_TTL = 60000; // 1 minute

async function getTokenPriceUsd(symbol) {
  const sym = symbol.toUpperCase();
  if (sym === 'USDC' || sym === 'USDT' || sym === 'DAI' || sym === 'BUSD') return 1.0;
  const id = COIN_IDS[sym];
  if (!id) return 1.0;

  if (priceCache[id] && Date.now() - priceCache[id].timestamp < CACHE_TTL) {
    return priceCache[id].price;
  }

  try {
    const res = await fetch(`https://api.coincap.io/v2/assets/${id}`);
    const data = await res.json();
    if (data && data.data && data.data.priceUsd) {
      const price = parseFloat(data.data.priceUsd);
      priceCache[id] = { price, timestamp: Date.now() };
      return price;
    }
  } catch (e) {
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
      const data = await res.json();
      if (data && data[id] && data[id].usd) {
        const price = data[id].usd;
        priceCache[id] = { price, timestamp: Date.now() };
        return price;
      }
    } catch(err) {}
  }
  return priceCache[id]?.price || 1.0;
}

// ---- Helpers ------------------------------------------------------------------

/**
 * Normalize a raw Rubic route object to a stable shape for the frontend.
 * Rubic v2 API uses: providerType, swapType, estimate.destinationTokenAmount, etc.
 */
function normalizeRoute(r, srcTokenAmount) {
  if (!r || typeof r !== 'object') return r;
  const est = r.estimate || {};
  const pctFee = r.fees?.percentFees;

  // Gas extraction: Rubic v2 nesting can be r.fees.gasTokenFees.gas.totalUsdAmount 
  // or sometimes r.fees.gasTokenFees.totalUsdAmount depending on route type.
  // We sum up gas, protocol, and provider fees for a more complete "Gas/Fees" view.
  const gas = parseFloat(r.fees?.gasTokenFees?.gas?.totalUsdAmount || 0);
  const protocol = parseFloat(r.fees?.gasTokenFees?.protocol?.fixedUsdAmount || 0);
  const provider = parseFloat(r.fees?.gasTokenFees?.provider?.fixedUsdAmount || 0);

  // Also calculate percentage fees in USD if possible
  let pctFeeUsd = 0;
  if (pctFee && pctFee.percent > 0) {
    const fromAmount = parseFloat(srcTokenAmount || r.tokens?.from?.amount || 0);
    const fromPrice = parseFloat(r.tokens?.from?.price || 0);
    if (fromAmount > 0 && fromPrice > 0) {
      pctFeeUsd = (fromAmount * fromPrice * pctFee.percent) / 100;
    }
  }

  let gasUsd = gas + protocol + provider + pctFeeUsd;

  // Fallback to estimate.gasUsd if gasUsd is still 0
  if (gasUsd === 0 && est.gasUsd) {
    gasUsd = parseFloat(est.gasUsd);
  }

  // Time extraction: durationInMinutes is usually what Rubic provides
  const duration = est.durationInMinutes != null ? parseFloat(est.durationInMinutes) : (r.durationInMinutes != null ? parseFloat(r.durationInMinutes) : null);
  const estimatedTime = duration !== null ? duration * 60 : undefined;

  return {
    id: r.id,
    provider: r.providerType || r.provider || 'Unknown',
    type: r.swapType || r.type || 'on-chain',
    fromAmount: srcTokenAmount || r.tokens?.from?.amount || '0',
    toAmount: est.destinationTokenAmount || r.toAmount || '0',
    toAmountMin: est.destinationTokenMinAmount || r.toAmountMin || '0',
    toAmountUsd: est.destinationUsdAmount ?? 0,
    priceImpact: est.priceImpact ?? null,
    fees: pctFee ? [{
      nativeTokenAddress: pctFee.token?.address || '',
      percent: pctFee.percent || 0,
      tokenSymbol: pctFee.token?.symbol || '',
    }] : [],
    gasUsd,
    estimatedTime,
    tags: [],
    // preserve raw fields needed for swap execution
    transaction: r.transaction,
    useRubicContract: r.useRubicContract,
  };
}

// ---- RubicSwapService -------------------------------------------------------

class RubicSwapService {

  /**
   * Fetch all supported blockchains directly from the Rubic API.
   * @param {boolean} includeTestnets - whether to include testnets
   * @returns {Promise<Array>}
   */
  async getSupportedChains(includeTestnets = false) {
    let chains = [];
    try {
      const data = await rubicGet('/info/chains', {
        includeTestnets: 'false',
      });
      const fetchedChains = Array.isArray(data) ? data : (data.chains || []);
      chains = fetchedChains.map((c) => ({
        id: c.id || null,
        blockchainName: c.name,
        displayName: c.name,
        image: c.image || null,
        type: c.type || 'EVM',
        proxyAvailable: c.proxyAvailable || false,
        testnet: c.testnet || false,
        providers: {
          crossChain: c.providers?.crossChain || [],
          onChain: c.providers?.onChain || [],
        },
      }));
    } catch (err) {
      console.warn('[RubicSwapService] Failed to fetch mainnet chains from Rubic, using fallback:', err.message);
    }

    if (includeTestnets) {
      const testnets = Object.keys(NETWORK_CONFIGS)
        .filter(k => NETWORK_CONFIGS[k].type === 'testnet')
        .map(k => {
          const c = NETWORK_CONFIGS[k];
          return {
            id: parseInt(k),
            blockchainName: c.name.toUpperCase().replace(/ /g, '_'),
            displayName: c.name,
            image: null,
            type: 'EVM', // Force EVM so the frontend Swap component includes them in the list
            proxyAvailable: true,
            testnet: true,
            providers: {
              crossChain: ['Xswapink'],
              onChain: ['Xswapink'],
            },
          };
        });
      return [...chains, ...testnets];
    }

    return chains;
  }

  /**
   * Search / list tokens for a given blockchain via the Rubic Token API.
   * @param {string} blockchain - Rubic blockchain name, e.g. "ETH"
   * @param {string} [search]   - optional symbol filter
   * @param {number} [page]
   * @param {number} [pageSize]
   * @returns {Promise<Array>}
   */
  async getTokens(blockchain, search = '', page = 1, pageSize = 50) {
    const blockchainUpper = blockchain.toUpperCase();
    if (TESTNET_TOKENS[blockchainUpper]) {
      let tokens = TESTNET_TOKENS[blockchainUpper];
      if (search) {
        const s = search.toLowerCase();
        tokens = tokens.filter(t => t.symbol.toLowerCase().includes(s) || t.name.toLowerCase().includes(s) || t.address.toLowerCase() === s);
      }
      return tokens;
    }

    const params = {
      network: blockchainUpper,
      page: String(page),
      pageSize: String(pageSize),
    };
    if (search) params.symbol = search;  // Rubic accepts case-insensitive symbol search

    const data = await rubicGet('/tokens/', params);
    const tokens = Array.isArray(data) ? data : (data.results || data.tokens || []);
    return tokens.map((t) => ({
      symbol: t.symbol || '',
      address: t.address || '0x0000000000000000000000000000000000000000',
      decimals: t.decimals || 18,
      name: t.name || t.symbol || '',
      image: t.image || null,
      rank: t.rank || 0,
    }));
  }

  /**
   * Fetch all available swap routes for a token pair.
   */
  async getQuoteAll(params) {
    const { srcTokenAddress, srcTokenBlockchain, dstTokenAddress, dstTokenBlockchain, srcTokenAmount } = params;
    if (!srcTokenAddress || !srcTokenBlockchain || !dstTokenAddress || !dstTokenBlockchain || !srcTokenAmount) {
      throw new Error('Missing required parameters for quoteAll');
    }

    const srcIsTestnet = !!TESTNET_TOKENS[srcTokenBlockchain.toUpperCase()];
    const dstIsTestnet = !!TESTNET_TOKENS[dstTokenBlockchain.toUpperCase()];

    if (srcIsTestnet || dstIsTestnet) {
      const isCrossChain = srcTokenBlockchain.toUpperCase() !== dstTokenBlockchain.toUpperCase();
      if (isCrossChain) throw new Error('Testnet bridging is not supported.');

      // 1. Determine Chain and Provider
      const chainId = Object.keys(NETWORK_CONFIGS).find(k => NETWORK_CONFIGS[k].name.toUpperCase().replace(/ /g, '_') === srcTokenBlockchain.toUpperCase());
      const config = NETWORK_CONFIGS[chainId];
      if (!config) throw new Error(`Network config not found for ${srcTokenBlockchain}`);

      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const quoterAddress = UNISWAP_V3_QUOTERS[chainId];
      const routerAddress = UNISWAP_V3_ROUTERS[chainId];

      if (!quoterAddress || !routerAddress) {
         throw new Error(`Uniswap V3 not supported on ${config.name}`);
      }

      const quoter = new ethers.Contract(quoterAddress, UNISWAP_V3_QUOTER_ABI, provider);

      // 2. Resolve Token Addresses (handle Native vs WNative)
      const nativeZero = '0x0000000000000000000000000000000000000000';
      const nativeE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      
      const resolveAddr = (addr) => {
        if (addr.toLowerCase() === nativeZero || addr.toLowerCase() === nativeE) {
          return WRAPPED_NATIVE[chainId];
        }
        return addr;
      };

      const tokenIn = resolveAddr(srcTokenAddress);
      const tokenOut = resolveAddr(dstTokenAddress);

      // 3. Perform Real Quoting (Check multiple fee tiers)
      const fees = [3000, 500, 10000, 100]; // 0.3%, 0.05%, 1%, 0.01%
      let bestAmountOut = 0n;
      let bestFee = 3000;

      const srcTokenDecimals = 18; // Default, ideally fetch from TESTNET_TOKENS or dynamic
      const amountIn = ethers.parseUnits(String(srcTokenAmount), srcTokenDecimals);

      console.log(`[UniswapQuote] Fetching quote for ${srcTokenAmount} tokens from ${tokenIn} to ${tokenOut} on ${config.name}`);

      for (const fee of fees) {
        try {
          // Try QuoterV2 first (struct params)
          const quote = await quoter.quoteExactInputSingle.staticCall({
            tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0
          }).catch(() => 
            // Fallback to original Quoter (positional params)
            quoter.quoteExactInputSingle.staticCall(tokenIn, tokenOut, fee, amountIn, 0)
          );

          const amountOut = Array.isArray(quote) ? quote[0] : quote;
          if (amountOut > bestAmountOut) {
            bestAmountOut = amountOut;
            bestFee = fee;
          }
        } catch (e) {
          // Fee tier might not exist
        }
      }

      if (bestAmountOut === 0n) {
        throw new Error('No liquidity found for this pair on Uniswap V3 testnet.');
      }

      const srcUsdPrice = await getTokenPriceUsd(srcTokenBlockchain); // Using blockchain name as proxy for native/wrapped price
      const toAmount = ethers.formatUnits(bestAmountOut, 18); // Simplified decimals
      
      const realRoute = {
        id: `uniswap_v3_${chainId}_${bestFee}_${Date.now()}`,
        provider: 'Xswapink', // Brand as Xswapink but it's Uniswap
        type: 'on-chain',
        toAmount: toAmount,
        toAmountMin: String(parseFloat(toAmount) * 0.98),
        durationInMinutes: 1,
        fees: { percentFees: { percent: bestFee / 10000 } },
        tokens: { from: { amount: srcTokenAmount, price: srcUsdPrice } },
        uniswapData: { fee: bestFee, router: routerAddress }
      };

      return [normalizeRoute(realRoute, srcTokenAmount)];
    }

    const result = await rubicPost('/routes/quoteAll', {
      srcTokenAddress,
      srcTokenBlockchain: srcTokenBlockchain.toUpperCase(),
      dstTokenAddress,
      dstTokenBlockchain: dstTokenBlockchain.toUpperCase(),
      srcTokenAmount: String(srcTokenAmount),
      fromAddress: params.fromAddress || undefined,
      referrer: REFERRER,
    });
    let routes;
    if (Array.isArray(result)) routes = result;
    else if (Array.isArray(result?.routes)) routes = result.routes;
    else if (result && typeof result === 'object' && result.id) routes = [result];
    // fallback: Rubic sometimes wraps in result.quote
    else if (result?.quote && typeof result.quote === 'object') routes = [result.quote];
    else routes = [];
    const normalized = routes.map(r => normalizeRoute(r, srcTokenAmount));
    // sort best-first (highest toAmount)
    normalized.sort((a, b) => parseFloat(b.toAmount) - parseFloat(a.toAmount));
    return normalized;
  }

  /**
   * Fetch the single best swap route.
   */
  async getQuoteBest(params) {
    const { srcTokenAddress, srcTokenBlockchain, dstTokenAddress, dstTokenBlockchain, srcTokenAmount } = params;
    if (!srcTokenAddress || !srcTokenBlockchain || !dstTokenAddress || !dstTokenBlockchain || !srcTokenAmount) {
      throw new Error('Missing required parameters for quoteBest');
    }
    const best = await rubicPost('/routes/quoteBest', {
      srcTokenAddress,
      srcTokenBlockchain: srcTokenBlockchain.toUpperCase(),
      dstTokenAddress,
      dstTokenBlockchain: dstTokenBlockchain.toUpperCase(),
      srcTokenAmount: String(srcTokenAmount),
      fromAddress: params.fromAddress || undefined,
      referrer: REFERRER,
    });
    return normalizeRoute(best, String(srcTokenAmount));
  }

  /**
   * Get transaction data for executing the swap.
   */
  async getSwapData(params) {
    const {
      srcTokenAddress, srcTokenBlockchain,
      dstTokenAddress, dstTokenBlockchain,
      srcTokenAmount, id, fromAddress, receiverAddress,
      slippage = 0.01,
    } = params;
    if (!id || !fromAddress) throw new Error('Route id and fromAddress are required');

    if (id.startsWith('uniswap_v3')) {
      const srcBlockchainUpper = srcTokenBlockchain.toUpperCase();
      const srcConfigKey = Object.keys(NETWORK_CONFIGS).find(k => NETWORK_CONFIGS[k].name.toUpperCase().replace(/ /g, '_') === srcBlockchainUpper);
      const uniswapRouter = srcConfigKey ? UNISWAP_V3_ROUTERS[srcConfigKey] : '0x0000000000000000000000000000000000000000';
      const isNative = srcTokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000' || srcTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      // Find decimals
      let decimals = 18;
      if (TESTNET_TOKENS[srcBlockchainUpper]) {
        const tokenInfo = TESTNET_TOKENS[srcBlockchainUpper].find(t => t.address.toLowerCase() === srcTokenAddress.toLowerCase());
        if (tokenInfo) decimals = tokenInfo.decimals;
      }

      const amountInWei = ethers.parseUnits(String(srcTokenAmount), decimals).toString();

      // Uniswap V3 exactInputSingle
      const dstBlockchainUpper = dstTokenBlockchain.toUpperCase();
      const dstConfigKey = Object.keys(NETWORK_CONFIGS).find(k => NETWORK_CONFIGS[k].name.toUpperCase().replace(/ /g, '_') === dstBlockchainUpper);
      const isDstNative = dstTokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000' || dstTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      const tokenIn = isNative ? (WRAPPED_NATIVE[srcConfigKey] || '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14') : srcTokenAddress;
      const tokenOut = isDstNative ? (WRAPPED_NATIVE[dstConfigKey || srcConfigKey] || '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14') : dstTokenAddress;

      let validData = '0x';
      let txTo = uniswapRouter;
      let txApproval = uniswapRouter;

      if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
        const WRAPPED_NATIVE_ABI = [
          'function deposit() payable',
          'function withdraw(uint256 wad)'
        ];
        const wrappedNativeIface = new ethers.Interface(WRAPPED_NATIVE_ABI);
        txTo = tokenIn;
        txApproval = tokenIn;

        if (isNative) {
          validData = wrappedNativeIface.encodeFunctionData('deposit');
        } else if (isDstNative) {
          validData = wrappedNativeIface.encodeFunctionData('withdraw', [amountInWei]);
        }
      } else {
        const IRouterABI = ['function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)'];
        const iface = new ethers.Interface(IRouterABI);

        const fee = parseInt(id.split('_')[3]) || 3000;
        validData = iface.encodeFunctionData('exactInputSingle', [{
          tokenIn: tokenIn,
          tokenOut: tokenOut,
          fee: fee,
          recipient: receiverAddress || fromAddress,
          amountIn: amountInWei,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0
        }]);
      }

      const isWrapOrUnwrap = tokenIn.toLowerCase() === tokenOut.toLowerCase();

      return {
        transaction: {
          to: txTo,
          data: validData,
          value: isNative ? amountInWei : '0',
          approvalAddress: isNative || isWrapOrUnwrap ? null : txApproval,
          isWrapOrUnwrap: isWrapOrUnwrap
        }
      };
    }

    return rubicPost('/routes/swap', {
      srcTokenAddress,
      srcTokenBlockchain: srcTokenBlockchain.toUpperCase(),
      dstTokenAddress,
      dstTokenBlockchain: dstTokenBlockchain.toUpperCase(),
      srcTokenAmount: String(srcTokenAmount),
      referrer: REFERRER,
      id,
      fromAddress,
      receiverAddress: receiverAddress || fromAddress,
      slippage: Number(slippage),
    });
  }

  /**
   * Check the cross-chain swap status.
   */
  async getSwapStatus(srcTxHash, srcBlockchain) {
    if (!srcTxHash || !srcBlockchain) throw new Error('srcTxHash and srcBlockchain are required');
    return rubicGet('/info/status', { srcTxHash, srcBlockchain: srcBlockchain.toUpperCase() });
  }
}

// ---- XswapinkSwapService -----------------------------------------------------
// Wraps RubicSwapService to provide Xswapink-branded best route selection.

class XswapinkSwapService extends RubicSwapService {

  /**
   * Fetch all available swap routes and mark the 'Xswapink Best Route'.
   */
  async getQuoteAll(params) {
    console.log(`[Xswapink] Fetching quotes for ${params.srcTokenBlockchain} -> ${params.dstTokenBlockchain}`);
    const routes = await super.getQuoteAll(params);
    if (!routes || routes.length === 0) {
      console.log(`[Xswapink] No routes found.`);
      return routes;
    }

    // Selection Criteria: 
    // 1. Liquidity (Max toAmount)
    // 2. Speed (Min estimatedTime)
    // 3. Gas/Fees (Min percent fees)

    // Normalize values for scoring (0 to 1 range)
    const maxToAmount = Math.max(...routes.map(r => parseFloat(r.toAmount) || 0));
    const minTime = Math.min(...routes.map(r => r.estimatedTime || 999999));
    const minFee = Math.min(...routes.map(r => r.fees?.[0]?.percent || 0.5));

    const scoredRoutes = routes.map(route => {
      const toAmount = parseFloat(route.toAmount) || 0;
      const speed = route.estimatedTime || 999999;
      const fee = route.fees?.[0]?.percent || 0.5;

      // Score: higher is better
      // Liquidity weight: 0.5, Speed weight: 0.3, Fee weight: 0.2
      const liquidityScore = maxToAmount > 0 ? (toAmount / maxToAmount) : 0;
      const speedScore = speed > 0 ? (minTime / speed) : 0;
      const feeScore = fee > 0 ? (minFee / fee) : 0;

      const totalScore = (liquidityScore * 0.5) + (speedScore * 0.3) + (feeScore * 0.2);
      return { ...route, xswapinkScore: totalScore };
    });

    // Sort by Xswapink score
    scoredRoutes.sort((a, b) => b.xswapinkScore - a.xswapinkScore);

    // DEBUG: Log first route estimate
    if (scoredRoutes.length > 0) {
      console.log(`[Xswapink] Top route estimate:`, JSON.stringify(scoredRoutes[0].estimate || scoredRoutes[0].rawEstimate, null, 2));
    }

    // Set Xswapink as the provider for the best one
    if (scoredRoutes.length > 0) {
      console.log(`[Xswapink] Best route identified. Provider: ${scoredRoutes[0].provider}, Score: ${scoredRoutes[0].xswapinkScore}`);
      scoredRoutes[0].provider = 'Xswapink';
      scoredRoutes[0].isXswapinkBest = true; // Still keep internal flag for backend logic
    }

    return scoredRoutes;
  }

  /**
   * Override getSwapData to route through Xswapink contract if selected.
   */
  async getSwapData(params) {
    const { isXswapinkRoute, id } = params;
    const data = await super.getSwapData(params);

    const isTestnetMock = id && id.startsWith('testnet_mock_route');

    if (isXswapinkRoute && !isTestnetMock) {
      const contractAddress = process.env.XSWAPINK_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

      if (data.transaction) {
        return {
          ...data,
          transaction: {
            ...data.transaction,
            xswapinkInfo: {
              contract: contractAddress,
              originalTo: data.transaction.to,
              originalData: data.transaction.data,
              message: "Transaction will be routed through Xswapink protocol"
            }
          }
        };
      } else {
        return {
          ...data,
          xswapinkInfo: {
            contract: contractAddress,
            originalTo: data.to,
            originalData: data.data,
            message: "Transaction will be routed through Xswapink protocol"
          }
        };
      }
    }

    return data;
  }
}

const rubicSwapService = new RubicSwapService();
const xswapinkService = new XswapinkSwapService();

module.exports = {
  RubicSwapService,
  XswapinkSwapService,
  rubicSwapService,
  xswapinkService,
};
