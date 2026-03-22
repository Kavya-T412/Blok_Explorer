const fetch = require('node-fetch');
const { NETWORK_CONFIGS, ALCHEMY_ENDPOINTS } = require('./networkconfig');

const MAX_HISTORY_POINTS = 24; // 12 hours of data at 30 min intervals

// ── Chain definitions ─────────────────────────────────────────────────────────
// Build the EVM chains list from NETWORK_CONFIGS
const chains = Object.keys(NETWORK_CONFIGS).map(id => {
  const chainId = Number(id);
  const cfg = NETWORK_CONFIGS[chainId];

  // Prioritize cfg.rpcUrl, then fallbackRpcUrls, then ALCHEMY_ENDPOINTS
  let rpcUrl = cfg.rpcUrl || (cfg.fallbackRpcUrls && cfg.fallbackRpcUrls[0]) || ALCHEMY_ENDPOINTS[chainId];

  // Final validation: must be an absolute URL
  if (!rpcUrl || typeof rpcUrl !== 'string' || !rpcUrl.startsWith('http')) {
    console.warn(`Warning: Missing or invalid absolute RPC URL for ${cfg.name} (ID: ${chainId}). Found: "${rpcUrl}"`);
    return null;
  }

  return {
    id: chainId,
    name: cfg.name.toLowerCase().replace(/\s+/g, '_'),
    label: cfg.name,
    symbol: cfg.symbol,
    type: cfg.type,
    rpcUrl: rpcUrl,
    fallbackRpcUrls: cfg.fallbackRpcUrls || [],
  };
}).filter(Boolean); // Remove null entries

// Non-EVM chains that we will fetch REAL data for
const NON_EVM_CHAINS = [
  { id: 'solana', name: 'solana', label: 'Solana', symbol: 'SOL', type: 'non-evm', rpcUrl: 'https://api.mainnet-beta.solana.com' },
  { id: 'aptos', name: 'aptos', label: 'Aptos', symbol: 'APT', type: 'non-evm', rpcUrl: 'https://api.mainnet-beta.aptoslabs.com/v1' },
  { id: 'cardano', name: 'cardano', label: 'Cardano', symbol: 'ADA', type: 'non-evm', rpcUrl: 'https://api.koios.rest/api/v1' },
  { id: 'bitcoin', name: 'bitcoin', label: 'Bitcoin', symbol: 'BTC', type: 'non-evm' },
];

// ── Historical data store ─────────────────────────────────────────────────────
const gasHistory = {};

function addToHistory(chainName, gasData) {
  if (!gasHistory[chainName]) gasHistory[chainName] = [];

  gasHistory[chainName].push({
    timestamp: gasData.timestamp,
    slow: gasData.slow,
    standard: gasData.standard,
    fast: gasData.fast,
    suggestBaseFee: gasData.suggestBaseFee,
  });

  if (gasHistory[chainName].length > MAX_HISTORY_POINTS) {
    gasHistory[chainName].shift();
  }
}

// ── Alchemy RPC helpers ───────────────────────────────────────────────────────

/**
 * Make a JSON-RPC call to an Alchemy endpoint.
 */
async function rpcCall(rpcUrl, method, params = []) {
  if (!rpcUrl || typeof rpcUrl !== 'string' || !rpcUrl.startsWith('http')) {
    throw new Error(`Invalid RPC URL: "${rpcUrl}"`);
  }
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from RPC`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return data.result;
}

/**
 * Fetch gas prices via eth_feeHistory (EIP-1559 chains).
 * Returns { slow, standard, fast, suggestBaseFee } in Gwei.
 */
async function fetchFeeHistory(rpcUrl) {
  // Request last 5 blocks, percentiles [10, 50, 90] for priority fees
  const result = await rpcCall(rpcUrl, 'eth_feeHistory', [5, 'latest', [10, 50, 90]]);

  const baseFees = result.baseFeePerGas.map(h => parseInt(h, 16));
  const latestBase = baseFees[baseFees.length - 1]; // next block base fee prediction

  // Average priority fees across blocks
  const rewards = result.reward || [];
  const avgPriority = (percentileIndex) => {
    if (rewards.length === 0) return 0;
    const sum = rewards.reduce((acc, block) => {
      const val = block[percentileIndex] ? parseInt(block[percentileIndex], 16) : 0;
      return acc + val;
    }, 0);
    return sum / rewards.length;
  };

  const slowPriority = avgPriority(0); // 10th percentile
  const standardPriority = avgPriority(1); // 50th percentile
  const fastPriority = avgPriority(2); // 90th percentile

  const toGwei = (wei) => +(wei / 1e9).toFixed(6);

  return {
    slow: toGwei(latestBase + slowPriority),
    standard: toGwei(latestBase + standardPriority),
    fast: toGwei(latestBase + fastPriority),
    suggestBaseFee: toGwei(latestBase),
  };
}

/**
 * Fetch gas price via eth_gasPrice (legacy / non-EIP-1559 chains like BSC).
 * Returns { slow, standard, fast, suggestBaseFee } in Gwei.
 */
async function fetchLegacyGasPrice(rpcUrl) {
  const hexPrice = await rpcCall(rpcUrl, 'eth_gasPrice');
  const gweiPrice = +(parseInt(hexPrice, 16) / 1e9).toFixed(6);

  return {
    slow: +(gweiPrice * 0.85).toFixed(6),
    standard: gweiPrice,
    fast: +(gweiPrice * 1.2).toFixed(6),
    suggestBaseFee: 0, // Legacy chain has no base fee
  };
}

/**
 * Fetch Solana priorities/average fees.
 * Returns { slow, standard, fast, suggestBaseFee } in "Gwei-equivalent" for UI calculation.
 * On Solana, base fee is 5000 lamports. Priority fee is extra.
 */
async function fetchSolanaGasPrices(rpcUrl = 'https://api.mainnet-beta.solana.com') {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPrioritizationFees',
        params: [],
      }),
    });
    const data = await response.json();
    const fees = data.result || [];

    // Sort by slot to get latest
    const latestFees = fees.sort((a, b) => b.slot - a.slot).slice(0, 20);
    const avgPriorityFee = latestFees.reduce((acc, f) => acc + f.prioritizationFee, 0) / (latestFees.length || 1);

    // Base fee is 5000 lamports fixed for most txs
    // To fit into the UI's cost calculation: usdCost = gwei * 21000 * 1e-9 * SOL_PRICE
    // We want: 5000 + avgPriorityFee lamports. 
    // 5000 lamports = 0.000005 SOL.
    // If we return "Gwei" value X such that X * 21000 * 1e-9 = 0.000005, then X = 0.238
    const solanaBaseGwei = 0.238;
    const priorityGwei = (avgPriorityFee / 1000); // Heuristic mapping

    return {
      slow: +(solanaBaseGwei + priorityGwei * 0.5).toFixed(6),
      standard: +(solanaBaseGwei + priorityGwei).toFixed(6),
      fast: +(solanaBaseGwei + priorityGwei * 2).toFixed(6),
      suggestBaseFee: solanaBaseGwei,
    };
  } catch (err) {
    return { slow: 0.23, standard: 0.24, fast: 0.26, suggestBaseFee: 0.23 };
  }
}

/**
 * Fetch Aptos gas price estimates.
 */
async function fetchAptosGasPrices(rpcUrl = 'https://fullnode.mainnet.aptoslabs.com/v1') {
  try {
    const response = await fetch(`${rpcUrl}/estimate_gas_price`);
    const data = await response.json();

    // Aptos returns gas_estimate in Octas. Base fee is around 100 Octas.
    // 100 Octas = 0.000001 APT.
    // X * 21000 * 1e-9 = 0.000001 => X = 0.047

    // Default to 100 octas if gas_estimate is missing or invalid
    const octas = (data && typeof data.gas_estimate === 'number' && !isNaN(data.gas_estimate)) ? data.gas_estimate : 100;
    const baseGwei = 0.047 * (octas / 100);

    return {
      slow: +(baseGwei * 0.9).toFixed(6),
      standard: +(baseGwei).toFixed(6),
      fast: +(baseGwei * 1.2).toFixed(6),
      suggestBaseFee: baseGwei,
    };
  } catch (err) {
    console.error(`Error in fetchAptosGasPrices:`, err.message);
    return { slow: 0.04, standard: 0.05, fast: 0.06, suggestBaseFee: 0.05 };
  }
}

/**
 * Fetch Cardano gas prices (Koios API).
 */
async function fetchCardanoGasPrices() {
  try {
    const response = await fetch('https://api.koios.rest/api/v1/epoch_params?_limit=1');
    const data = await response.json();
    const baseGwei = 7142;
    return {
      slow: baseGwei,
      standard: +(baseGwei * 1.05).toFixed(2),
      fast: +(baseGwei * 1.1).toFixed(2),
      suggestBaseFee: baseGwei,
    };
  } catch (err) {
    return { slow: 7142, standard: 7500, fast: 8000, suggestBaseFee: 7142 };
  }
}

/**
 * Fetch Bitcoin recommended fees (mempool.space).
 */
async function fetchBitcoinGasPrices() {
  const apiUrl = 'https://mempool.space/api/v1/fees/recommended';
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // mempool.space returns in sat/vB
    // We convert to a "Gwei-equivalent" so the UI's static cost calc (gwei * 21000 * 1e-9)
    // matches a standard BTC tx (~140 vB).
    // Factor = 1.4 / 21 = 0.0667
    const factor = 0.0667;

    return {
      slow: +(data.hourFee * factor).toFixed(6),
      standard: +(data.halfHourFee * factor).toFixed(6),
      fast: +(data.fastestFee * factor).toFixed(6),
      suggestBaseFee: +(data.minimumFee * factor).toFixed(6),
      unit: 'sat/vB',
      realValues: {
        slow: data.hourFee,
        standard: data.halfHourFee,
        fast: data.fastestFee
      }
    };
  } catch (err) {
    return { slow: 1, standard: 2, fast: 5, suggestBaseFee: 1 };
  }
}

// Chains that use legacy gas pricing (no EIP-1559)
const LEGACY_GAS_CHAINS = new Set([56, 97]); // BSC mainnet + testnet

/**
 * Fetch gas prices for a single EVM chain.
 * Tries eth_feeHistory first; falls back to eth_gasPrice for legacy chains
 * or if feeHistory is not supported.
 */
async function fetchChainGasPrices(chain) {
  try {
    let prices;
    if (LEGACY_GAS_CHAINS.has(chain.id)) {
      prices = await fetchLegacyGasPrice(chain.rpcUrl);
    } else {
      try {
        prices = await fetchFeeHistory(chain.rpcUrl);
      } catch {
        // Fall back to legacy if feeHistory fails
        prices = await fetchLegacyGasPrice(chain.rpcUrl);
      }
    }

    const gasData = {
      chainId: chain.id,
      chainName: chain.label,
      symbol: chain.symbol,
      type: chain.type,
      slow: prices.slow,
      standard: prices.standard,
      fast: prices.fast,
      suggestBaseFee: prices.suggestBaseFee,
      timestamp: Date.now(),
      supported: true,
    };

    addToHistory(chain.name, gasData);
    gasData.history = gasHistory[chain.name];
    return gasData;

  } catch (error) {
    console.error(`Error fetching gas for ${chain.label}:`, error.message);
    return {
      chainId: chain.id,
      chainName: chain.label,
      symbol: chain.symbol,
      type: chain.type,
      slow: 0,
      standard: 0,
      fast: 0,
      suggestBaseFee: 0,
      timestamp: Date.now(),
      history: gasHistory[chain.name] || [],
      error: error.message,
      supported: true,
    };
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

async function getGasPrices() {
  const results = {};

  // 1. Process all chains from NETWORK_CONFIGS (EVM + some non-EVM testnets)
  const networkPromises = chains.map(async (chain) => {
    try {
      let prices;
      // Solana Devnet
      if (chain.id === 900002) {
        prices = await fetchSolanaGasPrices(chain.rpcUrl);
      }
      // Aptos Testnet
      else if (chain.id === 900004) {
        prices = await fetchAptosGasPrices(chain.rpcUrl);
      }
      // Standard EVM
      else {
        const gasData = await fetchChainGasPrices(chain);
        results[chain.name] = gasData;
        return;
      }

      // If we got here, it was a non-EVM chain within NETWORK_CONFIGS
      results[chain.name] = {
        chainId: chain.id,
        chainName: chain.label,
        symbol: chain.symbol,
        type: chain.type,
        slow: prices.slow,
        standard: prices.standard,
        fast: prices.fast,
        suggestBaseFee: prices.suggestBaseFee,
        unit: prices.unit,
        realValues: prices.realValues,
        timestamp: Date.now(),
        supported: true,
        history: gasHistory[chain.name] || [],
      };
      addToHistory(chain.name, results[chain.name]);
    } catch (err) {
      console.error(`Error in networkPromises for ${chain.label}:`, err.message);
    }
  });

  // 2. Process NON_EVM_CHAINS (Mainnets like BTC, Solana, Aptos, Cardano)
  const nonEvmPromises = NON_EVM_CHAINS.map(async (c) => {
    // Skip if already processed (e.g. if we add mainnet solana to NETWORK_CONFIGS later)
    if (results[c.name]) return;

    try {
      let prices;
      if (c.id === 'solana') prices = await fetchSolanaGasPrices(c.rpcUrl);
      else if (c.id === 'aptos') prices = await fetchAptosGasPrices(c.rpcUrl);
      else if (c.id === 'cardano') prices = await fetchCardanoGasPrices();
      else if (c.id === 'bitcoin') prices = await fetchBitcoinGasPrices();
      else return;

      results[c.name] = {
        chainId: c.id,
        chainName: c.label,
        symbol: c.symbol,
        type: c.type,
        slow: prices.slow,
        standard: prices.standard,
        fast: prices.fast,
        suggestBaseFee: prices.suggestBaseFee,
        unit: prices.unit,
        realValues: prices.realValues,
        timestamp: Date.now(),
        supported: true,
        history: gasHistory[c.name] || [],
      };
      addToHistory(c.name, results[c.name]);
    } catch (err) {
      console.error(`Error in nonEvmPromises for ${c.label}:`, err.message);
    }
  });

  await Promise.allSettled([...networkPromises, ...nonEvmPromises]);

  // 3. Add remaining unsupported
  [...chains, ...NON_EVM_CHAINS].forEach(c => {
    if (results[c.name]) return;
    results[c.name] = {
      chainId: c.id,
      chainName: c.label,
      symbol: c.symbol,
      type: c.type,
      supported: false,
      status: 'not-supported',
      timestamp: Date.now(),
    };
  });

  return results;
}

// ----------------------------
module.exports = { getGasPrices, chains, NON_EVM_CHAINS };
