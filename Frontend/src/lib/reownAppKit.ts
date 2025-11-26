import { createAppKit } from '@reown/appkit'
import { mainnet, arbitrum, polygon, bsc, sepolia, polygonAmoy, bscTestnet } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { AppKitNetwork } from '@reown/appkit/networks'

// 1. Get a project ID at https://dashboard.reown.com
const projectId = '6e8cdec996f31d6e5a7c3a2fd8a95189'

// Environment variable to switch between mainnet and testnet
const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true' || false;

// Define all networks (mainnet and testnet)
export const mainnetNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, polygon, bsc, arbitrum];
export const testnetNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia, polygonAmoy, bscTestnet];

// Combine all networks for wallet support
const allNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet, 
  polygon, 
  bsc, 
  arbitrum,
  sepolia, 
  polygonAmoy, 
  bscTestnet
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
  description: 'Blockchain Explorer with Wallet Integration',
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