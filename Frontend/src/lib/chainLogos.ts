/**
 * Chain logo utility using DefiLlama icons CDN.
 * Maps chain names to their DefiLlama slug for logo URL construction.
 * URL pattern: https://icons.llamao.fi/icons/chains/rsz_{slug}.jpg
 */

const CHAIN_LOGO_MAP: Record<string, string> = {
  // ── Ethereum ecosystem ──
  'Ethereum': 'ethereum',
  'Ethereum Mainnet': 'ethereum',
  'Sepolia': 'ethereum',
  'Ethereum Sepolia': 'ethereum',
  'Hoodi': 'ethereum',
  'Ethereum Hoodi': 'ethereum',

  // ── Polygon / zkEVM ──
  'Polygon': 'polygon',
  'Polygon Mainnet': 'polygon',
  'Polygon Amoy': 'polygon',
  'Polygon zkEVM': 'polygon zkevm',
  'Polygon zkEVM Cardona': 'polygon zkevm',

  // ── BNB Chain ──
  'BSC': 'bsc',
  'BNB Chain': 'bsc',
  'BNB Mainnet': 'bsc',
  'BSC Testnet': 'bsc',
  'BNB Testnet': 'bsc',

  // ── Arbitrum ──
  'Arbitrum': 'arbitrum',
  'Arbitrum One': 'arbitrum',
  'Arbitrum Sepolia': 'arbitrum',

  // ── Optimism ──
  'Optimism': 'optimism',
  'Optimism Mainnet': 'optimism',
  'Optimism Sepolia': 'optimism',

  // ── Base ──
  'Base': 'base',
  'Base Sepolia': 'base',

  // ── Avalanche ──
  'Avalanche': 'avax',
  'Avalanche C-Chain': 'avax',
  'Avalanche Fuji': 'avax',

  // ── Fantom ──
  'Fantom': 'fantom',
  'Fantom Opera': 'fantom',
  'Fantom Testnet': 'fantom',

  // ── Gnosis ──
  'Gnosis': 'gnosis',
  'Gnosis Chain': 'gnosis',
  'Chiado': 'gnosis',

  // ── zkSync Era ──
  'zkSync Era': 'zksync era',
  'zkSync Era Mainnet': 'zksync era',
  'zkSync Era Sepolia': 'zksync era',

  // ── Linea ──
  'Linea': 'linea',
  'Linea Mainnet': 'linea',
  'Linea Sepolia': 'linea',

  // ── Scroll ──
  'Scroll': 'scroll',
  'Scroll Sepolia': 'scroll',

  // ── Mantle ──
  'Mantle': 'mantle',
  'Mantle Mainnet': 'mantle',
  'Mantle Sepolia': 'mantle',

  // ── Blast ──
  'Blast': 'blast',
  'Blast Sepolia': 'blast',

  // ── Cronos ──
  'Cronos': 'cronos',
  'Cronos Mainnet': 'cronos',

  // ── Celo ──
  'Celo': 'celo',
  'Celo Mainnet': 'celo',
  'Alfajores': 'celo',
  'Celo Alfajores': 'celo',

  // ── Moonbeam ──
  'Moonbeam': 'moonbeam',

  // ── Moonriver ──
  'Moonriver': 'moonriver',

  // ── Kava ──
  'Kava': 'kava',
  'Kava EVM': 'kava',

  // ── Metis ──
  'Metis': 'metis',
  'Metis Andromeda': 'metis',

  // ── Aurora ──
  'Aurora': 'aurora',
  'Aurora Mainnet': 'aurora',

  // ── Taiko ──
  'Taiko': 'taiko',
  'Taiko Mainnet': 'taiko',

  // ── Zora ──
  'Zora': 'zora',
  'Zora Network': 'zora',

  // ── Mode ──
  'Mode': 'mode',
  'Mode Network': 'mode',
  'Mode Sepolia': 'mode',

  // ── Manta Pacific ──
  'Manta Pacific': 'manta',
  'Manta': 'manta',
  'Manta Sepolia': 'manta',

  // ── Fraxtal ──
  'Fraxtal': 'fraxtal',
  'Fraxtal Mainnet': 'fraxtal',

  // ── Klaytn / Kaia ──
  'Klaytn': 'klaytn',
  'Kaia': 'klaytn',
  'Klaytn Mainnet': 'klaytn',
  'Klaytn Baobab': 'klaytn',

  // ── IoTeX ──
  'IoTeX': 'iotex',
  'IoTeX Mainnet': 'iotex',

  // ── Boba Network ──
  'Boba Network': 'boba',
  'Boba': 'boba',

  // ── Harmony / ONE ──
  'Harmony': 'harmony',
  'Harmony One': 'harmony',

  // ── Sei ──
  'Sei': 'sei',
  'Sei EVM': 'sei',

  // ── Berachain ──
  'Berachain': 'berachain',
  'Berachain bArtio': 'berachain',

  // ── Neon EVM ──
  'Neon EVM': 'neon',

  // ── PulseChain ──
  'PulseChain': 'pulse',

  // ── Fuse ──
  'Fuse': 'fuse',

  // ── Canto ──
  'Canto': 'canto',

  // ── Evmos ──
  'Evmos': 'evmos',

  // ── Astar ──
  'Astar': 'astar',
  'Astar EVM': 'astar',

  // ── Shiden ──
  'Shiden': 'shiden',

  // ── Bittorrent ──
  'BitTorrent Chain': 'bttc',
  'BTTC': 'bttc',

  // ── Syscoin ──
  'Syscoin': 'syscoin',

  // ── OKXChain / OKT ──
  'OKXChain': 'okexchain',
  'OKT Chain': 'okexchain',

  // ── Heco ──
  'HECO': 'heco',

  // ── KCC (KuCoin) ──
  'KCC': 'kucoin',

  // ── Wemix ──
  'WEMIX3.0': 'wemix',

  // ── Oasys ──
  'Oasys': 'oasys',

  // ── Filecoin ──
  'Filecoin': 'filecoin',
  'Filecoin EVM': 'filecoin',
};

const LLAMAO_BASE = 'https://icons.llamao.fi/icons/chains/rsz_';

/**
 * Returns the logo image URL for the given chain name.
 * Falls back to an empty string (caller should render a letter/emoji fallback).
 */
export function getChainLogo(chainName: string): string {
  const slug = CHAIN_LOGO_MAP[chainName];
  if (!slug) return '';
  return `${LLAMAO_BASE}${encodeURIComponent(slug)}.jpg`;
}

/**
 * Returns a chainId → logo URL map for direct chainId lookups.
 */
const CHAIN_ID_LOGO_MAP: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  56: 'bsc',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  43114: 'avax',
  250: 'fantom',
  100: 'gnosis',
  324: 'zksync era',
  1101: 'polygon zkevm',
  59144: 'linea',
  534352: 'scroll',
  5000: 'mantle',
  81457: 'blast',
  25: 'cronos',
  42220: 'celo',
  1284: 'moonbeam',
  1285: 'moonriver',
  2222: 'kava',
  1088: 'metis',
  1313161554: 'aurora',
  167000: 'taiko',
  7777777: 'zora',
  34443: 'mode',
  169: 'manta',
  252: 'fraxtal',
  8217: 'klaytn',
  4689: 'iotex',
  288: 'boba',
  1666600000: 'harmony',
  1329: 'sei',
  369: 'pulse',
  // Testnets
  11155111: 'ethereum',
  17000: 'ethereum',
  80002: 'polygon',
  97: 'bsc',
  421614: 'arbitrum',
  11155420: 'optimism',
  84532: 'base',
  43113: 'avax',
  4002: 'fantom',
  10200: 'gnosis',
  300: 'zksync era',
  59141: 'linea',
  534351: 'scroll',
  5003: 'mantle',
  168587773: 'blast',
  44787: 'celo',
  919: 'mode',
  3441006: 'manta',
};

export function getChainLogoById(chainId: number): string {
  const slug = CHAIN_ID_LOGO_MAP[chainId];
  if (!slug) return '';
  return `${LLAMAO_BASE}${encodeURIComponent(slug)}.jpg`;
}
