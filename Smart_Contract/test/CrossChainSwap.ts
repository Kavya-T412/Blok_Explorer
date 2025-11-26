import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

describe("CrossChainSwap", function () {
  async function deployCrossChainSwapFixture() {
    const [owner, addr1, addr2] = await hre.viem.getWalletClients();

    const crossChainSwap = await hre.viem.deployContract("CrossChainSwap");

    const publicClient = await hre.viem.getPublicClient();

    return {
      crossChainSwap,
      owner,
      addr1,
      addr2,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should start with swap counter at 0", async function () {
      const { crossChainSwap } = await loadFixture(deployCrossChainSwapFixture);

      expect(await crossChainSwap.read.getSwapCounter()).to.equal(0n);
    });
  });

  describe("Swap Initiation", function () {
    it("Should initiate a new swap", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const fromChain = 1;
      const toChain = 2;
      const amount = 1000n;

      const hash = await crossChainSwap.write.initiateSwap(
        [fromChain, toChain, amount],
        { account: addr1.account }
      );

      await publicClient.waitForTransactionReceipt({ hash });

      const swapCounter = await crossChainSwap.read.getSwapCounter();
      expect(swapCounter).to.equal(1n);

      const swap = await crossChainSwap.read.getSwap([0n]);
      expect(swap[0]).to.equal(0n); // swapId
      expect(swap[1]).to.equal(fromChain); // fromChain
      expect(swap[2]).to.equal(toChain); // toChain
      expect(swap[3].toLowerCase()).to.equal(addr1.account.address.toLowerCase()); // userWallet
      expect(swap[4]).to.equal(amount); // tokenAmount
      expect(swap[5]).to.equal(0); // status (Initiated)
    });

    it("Should emit SwapInitiated event", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const fromChain = 1;
      const toChain = 2;
      const amount = 1000n;

      const hash = await crossChainSwap.write.initiateSwap(
        [fromChain, toChain, amount],
        { account: addr1.account }
      );

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = await crossChainSwap.getEvents.SwapInitiated();

      expect(logs).to.have.lengthOf(1);
      expect(logs[0].args.user?.toLowerCase()).to.equal(
        addr1.account.address.toLowerCase()
      );
      expect(logs[0].args.amount).to.equal(amount);
      expect(logs[0].args.fromChain).to.equal(fromChain);
      expect(logs[0].args.toChain).to.equal(toChain);
    });

    it("Should revert if amount is 0", async function () {
      const { crossChainSwap, addr1 } = await loadFixture(
        deployCrossChainSwapFixture
      );

      await expect(
        crossChainSwap.write.initiateSwap([1, 2, 0n], {
          account: addr1.account,
        })
      ).to.be.rejectedWith("Amount must be greater than 0");
    });

    it("Should revert if fromChain equals toChain", async function () {
      const { crossChainSwap, addr1 } = await loadFixture(
        deployCrossChainSwapFixture
      );

      await expect(
        crossChainSwap.write.initiateSwap([1, 1, 1000n], {
          account: addr1.account,
        })
      ).to.be.rejectedWith("Cannot swap to same chain");
    });

    it("Should track multiple swaps for a user", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      // Create first swap
      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Create second swap
      const hash2 = await crossChainSwap.write.initiateSwap(
        [2, 3, 2000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const userSwaps = await crossChainSwap.read.getUserSwaps([
        addr1.account.address,
      ]);
      expect(userSwaps).to.have.lengthOf(2);
      expect(userSwaps[0]).to.equal(0n);
      expect(userSwaps[1]).to.equal(1n);
    });
  });

  describe("Swap Completion", function () {
    it("Should complete a swap", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      // Initiate swap
      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Complete swap
      const hash2 = await crossChainSwap.write.completeSwap([0n]);
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const swap = await crossChainSwap.read.getSwap([0n]);
      expect(swap[5]).to.equal(1); // status (Completed)
    });

    it("Should emit SwapCompleted event", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await crossChainSwap.write.completeSwap([0n]);
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const logs = await crossChainSwap.getEvents.SwapCompleted();
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].args.swapId).to.equal(0n);
    });

    it("Should revert if swap does not exist", async function () {
      const { crossChainSwap } = await loadFixture(
        deployCrossChainSwapFixture
      );

      await expect(
        crossChainSwap.write.completeSwap([999n])
      ).to.be.rejectedWith("Swap does not exist");
    });

    it("Should revert if swap is not in Initiated status", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await crossChainSwap.write.completeSwap([0n]);
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      await expect(
        crossChainSwap.write.completeSwap([0n])
      ).to.be.rejectedWith("Swap is not in Initiated status");
    });
  });

  describe("Swap Failure", function () {
    it("Should mark swap as failed", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await crossChainSwap.write.failSwap([0n, "Insufficient liquidity"]);
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const swap = await crossChainSwap.read.getSwap([0n]);
      expect(swap[5]).to.equal(2); // status (Failed)
    });

    it("Should emit SwapFailed event", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const reason = "Insufficient liquidity";
      const hash2 = await crossChainSwap.write.failSwap([0n, reason]);
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const logs = await crossChainSwap.getEvents.SwapFailed();
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].args.swapId).to.equal(0n);
      expect(logs[0].args.reason).to.equal(reason);
    });
  });

  describe("Swap Refund", function () {
    it("Should refund a failed swap", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await crossChainSwap.write.failSwap([0n, "Test failure"]);
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const hash3 = await crossChainSwap.write.refundSwap([0n]);
      await publicClient.waitForTransactionReceipt({ hash: hash3 });

      const swap = await crossChainSwap.read.getSwap([0n]);
      expect(swap[5]).to.equal(3); // status (Refunded)
    });

    it("Should emit SwapRefunded event", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const amount = 1000n;

      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, amount],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await crossChainSwap.write.failSwap([0n, "Test failure"]);
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const hash3 = await crossChainSwap.write.refundSwap([0n]);
      await publicClient.waitForTransactionReceipt({ hash: hash3 });

      const logs = await crossChainSwap.getEvents.SwapRefunded();
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].args.swapId).to.equal(0n);
      expect(logs[0].args.amount).to.equal(amount);
    });

    it("Should revert if swap is not in Failed status", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      await expect(
        crossChainSwap.write.refundSwap([0n])
      ).to.be.rejectedWith("Swap must be in Failed status to refund");
    });
  });

  describe("Query Functions", function () {
    it("Should get swap status as string", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      const hash = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const status = await crossChainSwap.read.getSwapStatus([0n]);
      expect(status).to.equal("Initiated");
    });

    it("Should get user swaps by status", async function () {
      const { crossChainSwap, addr1, publicClient } = await loadFixture(
        deployCrossChainSwapFixture
      );

      // Create multiple swaps with different statuses
      const hash1 = await crossChainSwap.write.initiateSwap(
        [1, 2, 1000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash1 });

      const hash2 = await crossChainSwap.write.initiateSwap(
        [2, 3, 2000n],
        { account: addr1.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: hash2 });

      const hash3 = await crossChainSwap.write.completeSwap([0n]);
      await publicClient.waitForTransactionReceipt({ hash: hash3 });

      // Query initiated swaps
      const initiatedSwaps = await crossChainSwap.read.getUserSwapsByStatus([
        addr1.account.address,
        0, // Initiated
      ]);
      expect(initiatedSwaps).to.have.lengthOf(1);
      expect(initiatedSwaps[0]).to.equal(1n);

      // Query completed swaps
      const completedSwaps = await crossChainSwap.read.getUserSwapsByStatus([
        addr1.account.address,
        1, // Completed
      ]);
      expect(completedSwaps).to.have.lengthOf(1);
      expect(completedSwaps[0]).to.equal(0n);
    });
  });
});
