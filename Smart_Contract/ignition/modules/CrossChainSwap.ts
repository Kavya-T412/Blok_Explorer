import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CrossChainSwapModule = buildModule("CrossChainSwapModule", (m) => {
  const crossChainSwap = m.contract("CrossChainSwap");

  return { crossChainSwap };
});

export default CrossChainSwapModule;
