/**
 * BSC Gas Price Fetcher - Demo & Test File
 * 
 * This demonstrates how to use ethers.js to fetch real-time gas prices
 * for Binance Smart Chain (BSC) using the legacy gas model (getGasPrice()).
 * 
 * Key Differences:
 * - Ethereum uses EIP-1559 (baseFee, maxPriorityFee)
 * - BSC uses Legacy Model (gasPrice only)
 */

const { BSCGasFetcher, bscFetcher } = require('./bscGasFetcher');

// =============================================================================
// EXAMPLE 1: Basic Gas Price Fetching
// =============================================================================
async function example1_FetchGasPrices() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 1: Fetch Real-Time BSC Gas Prices (Gwei)');
  console.log('='.repeat(70));

  try {
    const gasPrices = await bscFetcher.getGasPrices();
    
    console.log('\n📊 Current BSC Gas Prices:');
    console.log(`  Slow:       ${gasPrices.slow} Gwei`);
    console.log(`  Standard:   ${gasPrices.standard} Gwei`);
    console.log(`  Fast:       ${gasPrices.fast} Gwei`);
    console.log(`\n📍 Block:       ${gasPrices.blockNumber}`);
    console.log(`⏱️  Timestamp:    ${new Date(gasPrices.timestamp).toISOString()}`);
    console.log(`🔗 RPC:         ${gasPrices.rpcUrl}`);
    console.log(`📝 Note:        ${gasPrices.note}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 2: Estimate Transaction Cost in USD
// =============================================================================
async function example2_EstimateTransactionCost() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 2: Estimate BSC Transaction Cost (in USD)');
  console.log('='.repeat(70));

  try {
    // Parameters
    const gasLimit = 100000;           // Standard ERC20 transfer ~21,000, swap ~100,000-150,000
    const bnbPrice = 595;              // Current BNB price in USD (update this)
    const speeds = ['slow', 'standard', 'fast'];

    console.log(`\n⚙️  Transaction Parameters:`);
    console.log(`  Gas Limit:    ${gasLimit} units`);
    console.log(`  BNB Price:    $${bnbPrice}`);
    console.log(`\n💰 Cost Estimates:`);

    for (const speed of speeds) {
      const estimate = await bscFetcher.estimateTransactionCost(gasLimit, bnbPrice, speed);
      console.log(`\n  ${speed.toUpperCase()}:`);
      console.log(`    Gas Price:    ${estimate.gasPriceGwei} Gwei`);
      console.log(`    Gas Cost:     ${estimate.gasCostBNB} BNB`);
      console.log(`    Gas Cost USD: $${estimate.gasCostUSD}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 3: Get Network Information
// =============================================================================
async function example3_GetNetworkInfo() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 3: Get BSC Network Information');
  console.log('='.repeat(70));

  try {
    const networkInfo = await bscFetcher.getNetworkInfo();
    
    console.log(`\n🌐 Network Info:`);
    console.log(`  Chain ID:     ${networkInfo.chainId}`);
    console.log(`  Chain Name:   ${networkInfo.chainName}`);
    console.log(`  Block Number: ${networkInfo.blockNumber}`);
    console.log(`  Timestamp:    ${new Date(networkInfo.timestamp).toISOString()}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 4: Use Custom RPC or Multiple Instances
// =============================================================================
async function example4_CustomRPC() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 4: Using Custom RPC URL');
  console.log('='.repeat(70));

  try {
    // Create a new instance with custom RPC
    const customFetcher = new BSCGasFetcher(
      'https://bsc-dataseed1.binance.org/',
      'https://bsc-dataseed2.binance.org/'
    );

    console.log('\n✅ Custom fetcher created');
    
    const gasPrices = await customFetcher.getGasPrices();
    console.log(`\n📊 Gas Prices from Custom RPC:`);
    console.log(`  Standard: ${gasPrices.standard} Gwei`);
    console.log(`  RPC:      ${gasPrices.rpcUrl}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 5: Fetch Prices Similar to Ethereum/Polygon
// =============================================================================
async function example5_ComparisonFormat() {
  console.log('\n' + '='.repeat(70));
  console.log('EXAMPLE 5: BSC Gas Prices in Standardized Format');
  console.log('='.repeat(70) + '\n');

  try {
    const bscGas = await bscFetcher.getGasPrices();
    
    // Format similar to Ethereum/Polygon gas estimators
    const formattedData = {
      chainId: bscGas.chainId,
      chainName: bscGas.chainName,
      gasPrice: {
        slow: `${bscGas.slow} Gwei`,
        standard: `${bscGas.standard} Gwei`,
        fast: `${bscGas.fast} Gwei`
      },
      metadata: {
        blockNumber: bscGas.blockNumber,
        gasModel: 'Legacy (gasPrice)',
        unit: 'Gwei',
        timestamp: new Date(bscGas.timestamp).toISOString(),
        rpcSource: bscGas.rpcUrl
      }
    };

    console.log('📋 Formatted Response:');
    console.log(JSON.stringify(formattedData, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =============================================================================
// RUN ALL EXAMPLES
// =============================================================================
async function runAllExamples() {
  console.log('\n🚀 BSC GAS PRICE FETCHER - LIVE EXAMPLES\n');
  console.log('Using ethers.js JsonRpcProvider with Ankr RPC');
  console.log('(Ankr offers free, reliable public RPC for BSC)\n');

  try {
    await example1_FetchGasPrices();
    await example2_EstimateTransactionCost();
    await example3_GetNetworkInfo();
    await example4_CustomRPC();
    await example5_ComparisonFormat();

    console.log('\n' + '='.repeat(70));
    console.log('✅ All examples completed successfully!');
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

// Export for testing
module.exports = {
  example1_FetchGasPrices,
  example2_EstimateTransactionCost,
  example3_GetNetworkInfo,
  example4_CustomRPC,
  example5_ComparisonFormat,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
