// Replace with your own API keys for each explorer
const ETHERSCAN_API_KEY = "YOUR_ETHERSCAN_API_KEY";
const POLYGONSCAN_API_KEY = "YOUR_POLYGONSCAN_API_KEY";
const BSCSCAN_API_KEY = "YOUR_BSCSCAN_API_KEY";

// Gas limit for a simple transfer (ETH, Polygon, BSC)
const GAS_LIMIT = 21000;

// Helper: calculate fee in native token
function calculateFee(gasPriceGwei, gasLimit) {
  return (gasPriceGwei * gasLimit) / 1e9; // Convert Gwei → ETH/MATIC/BNB
}

// ---------------- Ethereum ----------------
async function getEthereumGas() {
  const url = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = data.result;

  console.log("Ethereum Gas Fees:");
  console.log("Low:", calculateFee(parseInt(SafeGasPrice), GAS_LIMIT), "ETH");
  console.log("Average:", calculateFee(parseInt(ProposeGasPrice), GAS_LIMIT), "ETH");
  console.log("High:", calculateFee(parseInt(FastGasPrice), GAS_LIMIT), "ETH");
}

// ---------------- Polygon ----------------
async function getPolygonGas() {
  const url = `https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=${POLYGONSCAN_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = data.result;

  console.log("\nPolygon Gas Fees:");
  console.log("Low:", calculateFee(parseInt(SafeGasPrice), GAS_LIMIT), "MATIC");
  console.log("Average:", calculateFee(parseInt(ProposeGasPrice), GAS_LIMIT), "MATIC");
  console.log("High:", calculateFee(parseInt(FastGasPrice), GAS_LIMIT), "MATIC");
}

// ---------------- Binance Smart Chain ----------------
async function getBscGas() {
  const url = `https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=${BSCSCAN_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = data.result;

  console.log("\nBinance Smart Chain Gas Fees:");
  console.log("Low:", calculateFee(parseInt(SafeGasPrice), GAS_LIMIT), "BNB");
  console.log("Average:", calculateFee(parseInt(ProposeGasPrice), GAS_LIMIT), "BNB");
  console.log("High:", calculateFee(parseInt(FastGasPrice), GAS_LIMIT), "BNB");
}

// ---------------- Solana ----------------
async function getSolanaFee() {
  const url = "https://api.mainnet-beta.solana.com";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getRecentBlockhash"
    })
  });
  const data = await response.json();
  const lamportsPerSignature = data.result.value.feeCalculator.lamportsPerSignature;

  console.log("\nSolana Fee:");
  console.log("Flat Fee:", lamportsPerSignature / 1e9, "SOL");
}

// ---------------- Run All ----------------
async function runAll() {
  await getEthereumGas();
  await getPolygonGas();
  await getBscGas();
  await getSolanaFee();
}

runAll();
