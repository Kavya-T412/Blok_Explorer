/**
 * Example integration script for CrossChainSwap contract
 * This file demonstrates how to interact with the contract from a frontend
 */

import { ethers } from "ethers";

/**
 * Local copies of types and helpers that were expected from
 * ../contracts/CrossChainSwap.types (inlined to avoid missing-module errors)
 */

export enum SwapStatus {
  Initiated = 0,
  Completed = 1,
  Failed = 2,
  Refunded = 3,
}

export function getChainName(chainId: number): string {
  switch (chainId) {
    case 1:
      return "Ethereum";
    case 137:
      return "Polygon";
    case 56:
      return "BSC";
    default:
      return `Chain ${chainId}`;
  }
}

export function getStatusLabel(status: SwapStatus | number): string {
  switch (Number(status)) {
    case SwapStatus.Initiated:
      return "Initiated";
    case SwapStatus.Completed:
      return "Completed";
    case SwapStatus.Failed:
      return "Failed";
    case SwapStatus.Refunded:
      return "Refunded";
    default:
      return "Unknown";
  }
}

/**
 * Parse a decimal token amount string (e.g. "10.5") into an integer amount using `decimals` (default 18).
 * Returns a bigint suitable for passing to a contract method that expects integer token units.
 */
export function parseTokenAmount(amountStr: string, decimals = 18): bigint {
  if (typeof amountStr !== "string") {
    throw new Error("amount must be a string");
  }
  const parts = amountStr.split(".");
  const whole = parts[0] || "0";
  const fraction = parts[1] || "";
  if (fraction.length > decimals) {
    // truncate extra precision (alternatively you could round)
    const truncated = fraction.slice(0, decimals);
    const combined = whole + truncated.padEnd(decimals, "0");
    return BigInt(combined);
  } else {
    const combined = whole + fraction.padEnd(decimals, "0");
    return BigInt(combined);
  }
}

/**
 * Format an integer token amount (bigint or numeric string) into a human-readable decimal using `decimals` (default 18).
 */
export function formatTokenAmount(amount: bigint | number | string, decimals = 18): string {
  const bn = typeof amount === "bigint" ? amount : BigInt(amount);
  const negative = bn < 0n;
  const abs = negative ? -bn : bn;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  if (frac === 0n) {
    return (negative ? "-" : "") + whole.toString();
  }
  // pad fraction with leading zeros
  let fracStr = frac.toString().padStart(decimals, "0");
  // trim trailing zeros
  fracStr = fracStr.replace(/0+$/, "");
  return (negative ? "-" : "") + `${whole.toString()}.${fracStr}`;
}

export type Swap = {
  swapId: bigint;
  fromChain: number;
  toChain: number;
  userWallet: string;
  tokenAmount: bigint;
  status: SwapStatus;
  timestamp: bigint;
};

// Contract ABI (simplified - you would get this from the compiled contract)
const CROSS_CHAIN_SWAP_ABI = [
  "function initiateSwap(uint16 _fromChain, uint16 _toChain, uint96 _tokenAmount) external returns (uint256)",
  "function completeSwap(uint256 _swapId) external",
  "function failSwap(uint256 _swapId, string memory _reason) external",
  "function refundSwap(uint256 _swapId) external",
  "function getSwap(uint256 _swapId) external view returns (tuple(uint256 swapId, uint16 fromChain, uint16 toChain, address userWallet, uint96 tokenAmount, uint8 status, uint256 timestamp))",
  "function getUserSwaps(address _user) external view returns (uint256[])",
  "function getSwapCounter() external view returns (uint256)",
  "function getSwapStatus(uint256 _swapId) external view returns (string)",
  "function getUserSwapsByStatus(address _user, uint8 _status) external view returns (uint256[])",
  "event SwapInitiated(address indexed user, uint96 amount, uint16 fromChain, uint16 toChain, uint256 timestamp, uint256 swapId)",
  "event SwapCompleted(address indexed user, uint256 indexed swapId, uint256 timestamp)",
  "event SwapFailed(address indexed user, uint256 indexed swapId, string reason, uint256 timestamp)",
  "event SwapRefunded(address indexed user, uint256 indexed swapId, uint96 amount, uint256 timestamp)",
];

export class CrossChainSwapService {
  private contract: ethers.Contract;
  private signer?: ethers.Signer;

  constructor(
    contractAddress: string,
    providerOrSigner: ethers.Provider | ethers.Signer
  ) {
    if ("getAddress" in providerOrSigner) {
      // It's a signer
      this.signer = providerOrSigner as ethers.Signer;
      this.contract = new ethers.Contract(
        contractAddress,
        CROSS_CHAIN_SWAP_ABI,
        this.signer
      );
    } else {
      // It's a provider
      this.contract = new ethers.Contract(
        contractAddress,
        CROSS_CHAIN_SWAP_ABI,
        providerOrSigner
      );
    }
  }

  /**
   * Initiate a new cross-chain swap
   */
  async initiateSwap(
    fromChain: number,
    toChain: number,
    tokenAmount: string
  ): Promise<{ swapId: bigint; txHash: string }> {
    if (!this.signer) {
      throw new Error("Signer required for this operation");
    }

    const amount = parseTokenAmount(tokenAmount);

    // Send transaction
    const tx = await this.contract.initiateSwap(fromChain, toChain, amount);
    const receipt = await tx.wait();

    // Parse event to get swapId
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === "SwapInitiated";
      } catch {
        return false;
      }
    });

    let swapId = 0n;
    if (event) {
      const parsed = this.contract.interface.parseLog(event);
      swapId = parsed?.args.swapId || 0n;
    }

    return {
      swapId,
      txHash: receipt.hash,
    };
  }

  /**
   * Complete a swap
   */
  async completeSwap(swapId: bigint): Promise<string> {
    if (!this.signer) {
      throw new Error("Signer required for this operation");
    }

    const tx = await this.contract.completeSwap(swapId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Mark a swap as failed
   */
  async failSwap(swapId: bigint, reason: string): Promise<string> {
    if (!this.signer) {
      throw new Error("Signer required for this operation");
    }

    const tx = await this.contract.failSwap(swapId, reason);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Refund a failed swap
   */
  async refundSwap(swapId: bigint): Promise<string> {
    if (!this.signer) {
      throw new Error("Signer required for this operation");
    }

    const tx = await this.contract.refundSwap(swapId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Get swap details
   */
  async getSwap(swapId: bigint): Promise<Swap> {
    const result = await this.contract.getSwap(swapId);

    return {
      swapId: result[0],
      fromChain: result[1],
      toChain: result[2],
      userWallet: result[3],
      tokenAmount: result[4],
      status: result[5] as SwapStatus,
      timestamp: result[6],
    };
  }

  /**
   * Get all swap IDs for a user
   */
  async getUserSwaps(userAddress: string): Promise<bigint[]> {
    return await this.contract.getUserSwaps(userAddress);
  }

  /**
   * Get total number of swaps
   */
  async getSwapCounter(): Promise<bigint> {
    return await this.contract.getSwapCounter();
  }

  /**
   * Get swap status as string
   */
  async getSwapStatus(swapId: bigint): Promise<string> {
    return await this.contract.getSwapStatus(swapId);
  }

  /**
   * Get user swaps filtered by status
   */
  async getUserSwapsByStatus(
    userAddress: string,
    status: SwapStatus
  ): Promise<bigint[]> {
    return await this.contract.getUserSwapsByStatus(userAddress, status);
  }

  /**
   * Get detailed swap information with formatted data
   */
  async getSwapDetails(swapId: bigint) {
    const swap = await this.getSwap(swapId);

    return {
      ...swap,
      fromChainName: getChainName(swap.fromChain),
      toChainName: getChainName(swap.toChain),
      statusLabel: getStatusLabel(swap.status),
      formattedAmount: formatTokenAmount(swap.tokenAmount),
      timestampDate: new Date(Number(swap.timestamp) * 1000),
    };
  }

  /**
   * Get all swaps for a user with details
   */
  async getUserSwapsWithDetails(userAddress: string) {
    const swapIds = await this.getUserSwaps(userAddress);
    const swaps = await Promise.all(
      swapIds.map((id) => this.getSwapDetails(id))
    );

    return swaps.sort((a, b) => Number(b.timestamp - a.timestamp));
  }

  /**
   * Listen to swap events
   */
  onSwapInitiated(
    callback: (
      user: string,
      amount: bigint,
      fromChain: number,
      toChain: number,
      timestamp: bigint,
      swapId: bigint
    ) => void
  ) {
    this.contract.on(
      "SwapInitiated",
      (user, amount, fromChain, toChain, timestamp, swapId) => {
        callback(user, amount, fromChain, toChain, timestamp, swapId);
      }
    );
  }

  onSwapCompleted(
    callback: (user: string, swapId: bigint, timestamp: bigint) => void
  ) {
    this.contract.on("SwapCompleted", (user, swapId, timestamp) => {
      callback(user, swapId, timestamp);
    });
  }

  onSwapFailed(
    callback: (
      user: string,
      swapId: bigint,
      reason: string,
      timestamp: bigint
    ) => void
  ) {
    this.contract.on("SwapFailed", (user, swapId, reason, timestamp) => {
      callback(user, swapId, reason, timestamp);
    });
  }

  onSwapRefunded(
    callback: (user: string, swapId: bigint, amount: bigint, timestamp: bigint) => void
  ) {
    this.contract.on("SwapRefunded", (user, swapId, amount, timestamp) => {
      callback(user, swapId, amount, timestamp);
    });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this.contract.removeAllListeners();
  }
}

// Example usage
export async function exampleUsage() {
  // Initialize provider and signer
  const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
  const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);

  // Create service instance
  const swapService = new CrossChainSwapService(
    "YOUR_CONTRACT_ADDRESS",
    signer
  );

  try {
    // Initiate a swap
    console.log("Initiating swap...");
    const { swapId, txHash } = await swapService.initiateSwap(
      1, // Ethereum mainnet
      137, // Polygon
      "10.5" // 10.5 tokens
    );
    console.log(`Swap initiated! ID: ${swapId}, TX: ${txHash}`);

    // Get swap details
    const swapDetails = await swapService.getSwapDetails(swapId);
    console.log("Swap details:", swapDetails);

    // Get all user swaps
    const userAddress = await signer.getAddress();
    const userSwaps = await swapService.getUserSwapsWithDetails(userAddress);
    console.log("User swaps:", userSwaps);

    // Listen to events
    swapService.onSwapCompleted((user, swapId, timestamp) => {
      console.log(`Swap ${swapId} completed for ${user} at ${timestamp}`);
    });

    // Complete the swap (in a real scenario, this would be done by an oracle or relayer)
    // await swapService.completeSwap(swapId);

  } catch (error) {
    console.error("Error:", error);
  }
}
