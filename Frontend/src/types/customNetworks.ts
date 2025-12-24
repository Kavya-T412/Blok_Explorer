export interface CustomNetwork {
  id: string;
  name: string;
  chainId: number;
  symbol: string;
  rpcUrl: string;
  fallbackRpcUrls?: string[];
  explorerUrl?: string;
  decimals: number;
  type: 'mainnet' | 'testnet';
  color: string;
  icon?: string;
  isCustom: true;
  createdAt: number;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  fallbackRpcUrls?: string[];
  explorer: string;
  decimals: number;
  color: string;
  isCustom?: boolean;
  key?: string;
}

export const CUSTOM_NETWORKS_STORAGE_KEY = 'blok_explorer_custom_networks';

export const getCustomNetworks = (): CustomNetwork[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_NETWORKS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading custom networks:', error);
    return [];
  }
};

export const saveCustomNetworks = (networks: CustomNetwork[]): void => {
  try {
    localStorage.setItem(CUSTOM_NETWORKS_STORAGE_KEY, JSON.stringify(networks));
    // Dispatch custom event to notify components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('customNetworksChanged'));
    }
  } catch (error) {
    console.error('Error saving custom networks:', error);
  }
};

export const addCustomNetwork = (network: Omit<CustomNetwork, 'id' | 'isCustom' | 'createdAt'>): CustomNetwork => {
  const customNetworks = getCustomNetworks();
  const newNetwork: CustomNetwork = {
    ...network,
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isCustom: true,
    createdAt: Date.now(),
  };
  customNetworks.push(newNetwork);
  saveCustomNetworks(customNetworks);
  return newNetwork;
};

export const removeCustomNetwork = (id: string): void => {
  const customNetworks = getCustomNetworks();
  const filtered = customNetworks.filter(n => n.id !== id);
  saveCustomNetworks(filtered);
};

export const updateCustomNetwork = (id: string, updates: Partial<CustomNetwork>): void => {
  const customNetworks = getCustomNetworks();
  const index = customNetworks.findIndex(n => n.id === id);
  if (index !== -1) {
    customNetworks[index] = { ...customNetworks[index], ...updates };
    saveCustomNetworks(customNetworks);
  }
};
