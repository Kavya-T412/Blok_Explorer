const fetch = require('node-fetch');
const { NETWORK_CONFIGS, ALCHEMY_ENDPOINTS } = require('./networkconfig');

// ── Chain definitions ─────────────────────────────────────────────────────────
// Build the EVM chains list from NETWORK_CONFIGS (all chains have Alchemy endpoints)
const chains = Object.keys(NETWORK_CONFIGS).map(id => {
  const chainId = Number(id);
  const cfg = NETWORK_CONFIGS[chainId];
  return {
    id: chainId,
    // Internal snake_case key used as the map key in results
    name: cfg.name.toLowerCase().replace(/\s+/g, '_'),
    label: cfg.name,
    symbol: cfg.symbol,
    type: cfg.type, // 'mainnet' | 'testnet'
    rpcUrl: ALCHEMY_ENDPOINTS[chainId],
  };
});

// Non-EVM chains that we know about but cannot support
const NON_EVM_CHAINS = [
  { id: 'solana', name: 'solana', label: 'Solana', symbol: 'SOL', type: 'non-evm' },
  { id: 'bitcoin', name: 'bitcoin', label: 'Bitcoin', symbol: 'BTC', type: 'non-evm' },
  { id: 'ton', name: 'ton', label: 'TON', symbol: 'TON', type: 'non-evm' },
  { id: 'cosmos', name: 'cosmos', label: 'Cosmos', symbol: 'ATOM', type: 'non-evm' },
  { id: 'near', name: 'near', label: 'NEAR', symbol: 'NEAR', type: 'non-evm' },
];

// ── Historical data store ─────────────────────────────────────────────────────
const gasHistory = {};
const MAX_HISTORY_POINTS = 48; // ~24 hours at 1 point per 30 minutes

function initializeHistory() {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  chains.forEach(chain => {
    if (!gasHistory[chain.name]) {
      gasHistory[chain.name] = [];
    }
    if (gasHistory[chain.name].length === 0) {
      // Seed with simulated historical data so the chart is populated immediately
      const baseGwei = getBaseGwei(chain.id);
      for (let i = MAX_HISTORY_POINTS - 1; i >= 0; i--) {
        const timestamp = now - i * thirtyMinutes;
        const variance = Math.random() * 0.3 - 0.15; // ±15%
        gasHistory[chain.name].push({
          timestamp,
          slow: +(baseGwei * (0.85 + variance)).toFixed(4),
          standard: +(baseGwei * (1.0 + variance)).toFixed(4),
          fast: +(baseGwei * (1.2 + variance)).toFixed(4),
          suggestBaseFee: +(baseGwei * (0.80 + variance)).toFixed(4),
        });
      }
    }
  });
}

/** Rough baseline Gwei for each chain (used only for seed data) */
function getBaseGwei(chainId) {
  const bases = {
    1: 30,        // Ethereum
    137: 80,      // Polygon
    56: 3,        // BSC
    42161: 0.1,   // Arbitrum
    10: 0.1,      // Optimism
    8453: 0.05,   // Base
    43114: 25,    // Avalanche
    11155111: 5,  // Sepolia
    80002: 30,    // Polygon Amoy
    97: 3,        // BSC Testnet
    421614: 0.1,  // Arb Sepolia
    11155420: 0.1,// Op Sepolia
    84532: 0.05,  // Base Sepolia
    43113: 25,    // Avax Fuji
  };
  return bases[chainId] || 10;
}

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

  // Fetch all EVM chains in parallel
  const promises = chains.map(chain =>
    fetchChainGasPrices(chain).then(data => {
      results[chain.name] = data;
    })
  );
  await Promise.allSettled(promises);

  // Add non-EVM chains as "not-supported"
  NON_EVM_CHAINS.forEach(c => {
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

// Initialize simulated history on module load
initializeHistory();

module.exports = { getGasPrices, chains, NON_EVM_CHAINS };
