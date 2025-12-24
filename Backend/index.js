const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());


const apiKey = "ivn1pyvI9XKDlq_0bKxTj";

// Comprehensive Network Configuration for Mainnet
const MAINNET_NETWORKS = {
  ethereum: `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
  polygon: `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`,
  bnb: `https://bnb-mainnet.g.alchemy.com/v2/${apiKey}`,
  arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`,
  optimism: `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`,
  base: `https://base-mainnet.g.alchemy.com/v2/${apiKey}`,
  avalanche: `https://avax-mainnet.g.alchemy.com/v2/${apiKey}`,
};

// Comprehensive Network Configuration for Testnet
const TESTNET_NETWORKS = {
  sepolia: `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
  hoodi: `https://eth-holesky.g.alchemy.com/v2/${apiKey}`,
  polygonAmoy: `https://polygon-amoy.g.alchemy.com/v2/${apiKey}`,
  bnbTestnet: `https://bnb-testnet.g.alchemy.com/v2/${apiKey}`,
  arbitrumSepolia: `https://arb-sepolia.g.alchemy.com/v2/${apiKey}`,
  optimismSepolia: `https://opt-sepolia.g.alchemy.com/v2/${apiKey}`,
  baseSepolia: `https://base-sepolia.g.alchemy.com/v2/${apiKey}`,
  avalancheFuji: `https://avax-fuji.g.alchemy.com/v2/${apiKey}`,
};

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

    // Build comprehensive network list
    const allNetworks = [];
    
    if (networkMode === 'mainnet') {
      allNetworks.push(
        { name: 'Ethereum Mainnet', url: MAINNET_NETWORKS.ethereum, categories: ethCategories },
        { name: 'Polygon Mainnet', url: MAINNET_NETWORKS.polygon, categories: polygonMainnetCategories },
        { name: 'BNB Chain', url: MAINNET_NETWORKS.bnb, categories: standardCategories },
        { name: 'Arbitrum One', url: MAINNET_NETWORKS.arbitrum, categories: standardCategories },
        { name: 'Optimism', url: MAINNET_NETWORKS.optimism, categories: standardCategories },
        { name: 'Base', url: MAINNET_NETWORKS.base, categories: standardCategories },
        { name: 'Avalanche C-Chain', url: MAINNET_NETWORKS.avalanche, categories: standardCategories }
      );
    } else {
      allNetworks.push(
        { name: 'Ethereum Sepolia', url: TESTNET_NETWORKS.sepolia, categories: ethCategories },
        { name: 'Ethereum Hoodi', url: TESTNET_NETWORKS.hoodi, categories: ethCategories },
        { name: 'Polygon Amoy', url: TESTNET_NETWORKS.polygonAmoy, categories: standardCategories },
        { name: 'BNB Testnet', url: TESTNET_NETWORKS.bnbTestnet, categories: standardCategories },
        { name: 'Arbitrum Sepolia', url: TESTNET_NETWORKS.arbitrumSepolia, categories: standardCategories },
        { name: 'Optimism Sepolia', url: TESTNET_NETWORKS.optimismSepolia, categories: standardCategories },
        { name: 'Base Sepolia', url: TESTNET_NETWORKS.baseSepolia, categories: standardCategories },
        { name: 'Avalanche Fuji', url: TESTNET_NETWORKS.avalancheFuji, categories: standardCategories }
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

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Transaction History API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Get transactions: http://localhost:${PORT}/api/transactions/:address?mode=mainnet`);
  console.log(`📍                    http://localhost:${PORT}/api/transactions/:address?mode=testnet\n`);
});
