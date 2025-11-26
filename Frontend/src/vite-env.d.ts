/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_TESTNET?: string
  readonly VITE_REOWN_PROJECT_ID?: string
  readonly VITE_ETHERSCAN_API_KEY?: string
  readonly VITE_POLYGONSCAN_API_KEY?: string
  readonly VITE_BSCSCAN_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Ethereum provider type
interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
    isMetaMask?: boolean;
  };
}
