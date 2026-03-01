const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { NETWORK_CONFIGS } = require('./networkconfig');

/**
 * Fetch the block timestamp using standard JSON-RPC.
 */
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

/**
 * Fetch receipts for a batch of transactions to get status and contract addresses.
 */
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

/**
 * Fetch asset transfers for a given wallet address and network using Alchemy SDK.
 */
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

/**
 * Get aggregated transaction history across all supported networks.
 */
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

    const networkPromises = networks.map(network =>
        fetchNetworkTransactions(walletAddress, network.name, network.url, network.categories)
            .catch(err => {
                console.error(`Failed to fetch from ${network.name}: ${err.message}`);
                return [];
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

module.exports = {
    fetchBlockTimestamp,
    fetchTransactionReceiptsBatch,
    fetchNetworkTransactions,
    getTransactionHistory
};
