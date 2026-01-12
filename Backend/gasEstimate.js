const fetch = require('node-fetch');

// Store for historical gas prices (last 24 hours)
const gasHistory = {
  ethereum: [],
  bsc: [],
  polygon: [],
  arbitrum: [],
  optimism: [],
  base: []
};

const MAX_HISTORY_POINTS = 48; // Store 48 data points (one every 30 minutes for 24 hours)

const chains = [
  { id: 1, name: 'ethereum', label: 'Ethereum' },
  { id: 56, name: 'bsc', label: 'Binance Smart Chain' },
  { id: 137, name: 'polygon', label: 'Polygon' },
  { id: 42161, name: 'arbitrum', label: 'Arbitrum' },
  { id: 10, name: 'optimism', label: 'Optimism' },
  { id: 8453, name: 'base', label: 'Base' }
];

const apiKey = "3TVS5MFI9QU3261QD7VTURNBWFCHRNDX4K";

// Initialize history with mock data for the past 24 hours
function initializeHistory() {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  chains.forEach(chain => {
    if (gasHistory[chain.name].length === 0) {
      // Generate initial historical data (simulated for immediate display)
      for (let i = MAX_HISTORY_POINTS - 1; i >= 0; i--) {
        const timestamp = now - (i * thirtyMinutes);
        const baseValue = chain.id === 1 ? 0.035 : chain.id === 137 ? 140 : 5;
        const variance = Math.random() * 0.3 - 0.15; // ±15% variance
        
        gasHistory[chain.name].push({
          timestamp,
          slow: baseValue * (0.9 + variance),
          standard: baseValue * (1.0 + variance),
          fast: baseValue * (1.15 + variance),
          suggestBaseFee: baseValue * (0.85 + variance)
        });
      }
    }
  });
}

// Add new data point to history
function addToHistory(chainName, gasData) {
  if (!gasHistory[chainName]) {
    gasHistory[chainName] = [];
  }
  
  gasHistory[chainName].push({
    timestamp: gasData.timestamp,
    slow: gasData.slow,
    standard: gasData.standard,
    fast: gasData.fast,
    suggestBaseFee: gasData.suggestBaseFee
  });
  
  // Keep only last MAX_HISTORY_POINTS
  if (gasHistory[chainName].length > MAX_HISTORY_POINTS) {
    gasHistory[chainName].shift();
  }
}

async function getGasPrices() {
  const results = {};
  
  for (const chain of chains) {
    try {
      const url = `https://api.etherscan.io/v2/api?chainid=${chain.id}&module=gastracker&action=gasoracle&apikey=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === '1' && data.result) {
        const gasData = {
          chainId: chain.id,
          chainName: chain.label,
          slow: parseFloat(data.result.SafeGasPrice) || 0,
          standard: parseFloat(data.result.ProposeGasPrice) || 0,
          fast: parseFloat(data.result.FastGasPrice) || 0,
          suggestBaseFee: parseFloat(data.result.suggestBaseFee) || 0,
          timestamp: Date.now()
        };
        
        // Add to history
        addToHistory(chain.name, gasData);
        
        // Add history to results
        gasData.history = gasHistory[chain.name];
        results[chain.name] = gasData;
      } else {
        // Fallback data if API fails
        results[chain.name] = {
          chainId: chain.id,
          chainName: chain.label,
          slow: 0,
          standard: 0,
          fast: 0,
          suggestBaseFee: 0,
          timestamp: Date.now(),
          history: gasHistory[chain.name] || [],
          error: 'Failed to fetch gas prices'
        };
      }
    } catch (error) {
      console.error(`Error fetching gas for ${chain.label}:`, error.message);
      results[chain.name] = {
        chainId: chain.id,
        chainName: chain.label,
        slow: 0,
        standard: 0,
        fast: 0,
        suggestBaseFee: 0,
        timestamp: Date.now(),
        history: gasHistory[chain.name] || [],
        error: error.message
      };
    }
  }
  
  return results;
}

// Initialize history on module load
initializeHistory();

module.exports = { getGasPrices, chains };
