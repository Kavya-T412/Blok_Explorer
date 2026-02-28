const fetch = require('node-fetch');

const RUBIC_API_BASE = 'https://api-v2.rubic.exchange/api';
const REFERRER = 'rubic.exchange';

// ---- Low-level helpers ------------------------------------------------------

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
    const msg = (Array.isArray(data?.message) ? data.message.join(', ') : data?.message) || data?.error || response.statusText;
    throw new Error(`Rubic API error (${response.status}): ${msg}`);
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
    const msg = (Array.isArray(data?.message) ? data.message.join(', ') : data?.message) || data?.error || response.statusText;
    throw new Error(`Rubic API error (${response.status}): ${msg}`);
  }
  return data;
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
  return {
    id: r.id,
    provider: r.providerType || r.provider || 'Unknown',
    type: r.swapType || r.type || 'on-chain',
    fromAmount: srcTokenAmount || r.tokens?.from?.amount || '0',
    toAmount:    est.destinationTokenAmount    || r.toAmount    || '0',
    toAmountMin: est.destinationTokenMinAmount || r.toAmountMin || '0',
    toAmountUsd: est.destinationUsdAmount ?? 0,
    priceImpact: est.priceImpact ?? null,
    estimatedTime: est.durationInMinutes != null ? est.durationInMinutes * 60 : undefined,
    fees: pctFee ? [{
      nativeTokenAddress: pctFee.token?.address || '',
      percent: pctFee.percent || 0,
      tokenSymbol: pctFee.token?.symbol || '',
    }] : [],
    tags: [],
    // preserve raw fields needed for swap execution
    transaction:      r.transaction,
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
    const data = await rubicGet('/info/chains', {
      includeTestnets: String(includeTestnets),
    });
    const chains = Array.isArray(data) ? data : (data.chains || []);
    return chains.map((c) => ({
      id: c.id || null,
      blockchainName: c.name,
      displayName: c.name,
      type: c.type || 'EVM',
      proxyAvailable: c.proxyAvailable || false,
      testnet: c.testnet || false,
      providers: {
        crossChain: c.providers?.crossChain || [],
        onChain:    c.providers?.onChain    || [],
      },
    }));
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
    const params = {
      network: blockchain.toUpperCase(),
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
    const result = await rubicPost('/routes/quoteAll', {
      srcTokenAddress,
      srcTokenBlockchain: srcTokenBlockchain.toUpperCase(),
      dstTokenAddress,
      dstTokenBlockchain: dstTokenBlockchain.toUpperCase(),
      srcTokenAmount: String(srcTokenAmount),
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
    } = params;
    if (!id || !fromAddress) throw new Error('Route id and fromAddress are required');
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

const rubicSwapService = new RubicSwapService();

module.exports = {
  RubicSwapService,
  rubicSwapService,
};
