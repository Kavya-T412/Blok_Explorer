import { createAppKit } from '@reown/appkit'
import {
  mainnet,
  arbitrum,
  polygon,
  bsc,
  optimism,
  base,
  avalanche,
  sepolia,
  polygonAmoy,
  bscTestnet,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
  avalancheFuji,
  holesky
} from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { AppKitNetwork } from '@reown/appkit/networks'

// 1. Get a project ID at https://dashboard.reown.com
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || '6e8cdec996f31d6e5a7c3a2fd8a95189'

// Environment variable to switch between mainnet and testnet
const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true' || false;

// Define all mainnet networks
export const mainnetNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  polygon,
  bsc,
  arbitrum,
  optimism,
  base,
  avalanche
];

// Define all testnet networks
export const testnetNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  sepolia,
  holesky,
  polygonAmoy,
  bscTestnet,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
  avalancheFuji
];

// Combine all networks for wallet support
const allNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  ...mainnetNetworks,
  ...testnetNetworks
];

// Select networks based on environment
export const networks = USE_TESTNET ? testnetNetworks : mainnetNetworks;

// 2. Set up Wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: allNetworks // Support both for wallet switching
})

// 3. Configure the metadata
const metadata = {
  name: 'ChainExplorer',
  description: 'Multi-Chain Blockchain Explorer with Wallet Integration',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// 4. Create and export the modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: allNetworks, // Show all networks in wallet
  metadata,
  projectId,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
})

// Export functions to open modal programmatically
export const openConnectModal = () => modal.open()
export const openNetworkModal = () => modal.open({ view: 'Networks' })

// Export current mode
export const isTestnetMode = USE_TESTNET;