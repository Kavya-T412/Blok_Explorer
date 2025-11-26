const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Replace with your Alchemy API Key
const apiKey = "ivn1pyvI9XKDlq_0bKxTj";
const baseURL = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
const sepURL = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
const polyURL = `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`;
const amoyUrl = `https://polygon-amoy.g.alchemy.com/v2/${apiKey}`;
const bnbURL = `https://bnb-mainnet.g.alchemy.com/v2/${apiKey}`;
const tbnbURL = `https://bnb-testnet.g.alchemy.com/v2/${apiKey}`;

// Main function to fetch transaction history
async function getTransactionHistory(walletAddress) {
  try {
    // Validate wallet address
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid wallet address format');
    }

    // Categories for ETH mainnet and testnets, and Polygon Mainnet (support 'internal')
    const ethMaticCategories = ["external", "internal", "erc20", "erc721", "erc1155"];
    // Categories for networks without 'internal' support
    const standardCategories = ["external", "erc20", "erc721", "erc1155"];

    const networks = [
      { name: 'Ethereum Mainnet', url: baseURL, categories: ethMaticCategories },
      { name: 'Ethereum Sepolia', url: sepURL, categories: ethMaticCategories },
      { name: 'Polygon Mainnet', url: polyURL, categories: ethMaticCategories },
      { name: 'Polygon Amoy', url: amoyUrl, categories: standardCategories },
      { name: 'BNB Mainnet', url: bnbURL, categories: standardCategories },
      { name: 'BNB Testnet', url: tbnbURL, categories: standardCategories }
    ];

    const allTransactions = [];

    for (const network of networks) {
      try {
        console.log(`\n========== Fetching from ${network.name} ==========`);
        
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

        // Fetch sent transactions
        const fromResponse = await fetch(network.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fromData)
        });

        // Fetch received transactions
        const toResponse = await fetch(network.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toData)
        });

        let networkTransactions = [];

        // Process 'from' transactions
        if (fromResponse.ok) {
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
        }

        // Process 'to' transactions
        if (toResponse.ok) {
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
            if (tx.metadata) {
              console.log(`  Block Timestamp: ${tx.metadata.blockTimestamp || 'N/A'}`);
            }
          });
        } else {
          console.log(`⚠️  ${network.name}: No transactions found`);
        }
      } catch (err) {
        console.log(`❌ ${network.name}: ${err.message}`);
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
    
    console.log(`\n📡 API Request: Fetching transactions for ${address}`);
    
    const transactions = await getTransactionHistory(address);
    
    res.json({
      success: true,
      address: address,
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

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Transaction History API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Get transactions: http://localhost:${PORT}/api/transactions/:address\n`);
});
