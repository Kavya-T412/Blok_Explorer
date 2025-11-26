export const mockBalances = [
  {
    chain: 'Ethereum',
    symbol: 'ETH',
    balance: '2.456',
    usdValue: '$4,523.45',
    color: 'from-blue-500 to-purple-500',
  },
  {
    chain: 'Polygon',
    symbol: 'MATIC',
    balance: '1,234.56',
    usdValue: '$1,456.78',
    color: 'from-purple-500 to-pink-500',
  },
  {
    chain: 'BSC',
    symbol: 'BNB',
    balance: '8.92',
    usdValue: '$2,134.56',
    color: 'from-yellow-500 to-orange-500',
  },
];

export const mockTransactions = [
  {
    hash: '0x1a2b3c4d5e6f...',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    value: '0.5 ETH',
    gas: '21000',
    chain: 'Ethereum',
    status: 'success',
    time: '2 mins ago',
  },
  {
    hash: '0x2b3c4d5e6f7g...',
    from: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    value: '100 MATIC',
    gas: '45000',
    chain: 'Polygon',
    status: 'success',
    time: '15 mins ago',
  },
  {
    hash: '0x3c4d5e6f7g8h...',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
    value: '2 BNB',
    gas: '32000',
    chain: 'BSC',
    status: 'pending',
    time: '1 hour ago',
  },
];

export const mockChainComparison = [
  {
    chain: 'Ethereum',
    speed: 'Moderate',
    cost: 'High',
    efficiency: 75,
  },
  {
    chain: 'Polygon',
    speed: 'Fast',
    cost: 'Low',
    efficiency: 92,
  },
  {
    chain: 'BSC',
    speed: 'Fast',
    cost: 'Medium',
    efficiency: 85,
  },
];

export const mockGasData = [
  { time: '00:00', slow: 15, standard: 25, fast: 35 },
  { time: '04:00', slow: 12, standard: 22, fast: 32 },
  { time: '08:00', slow: 20, standard: 30, fast: 45 },
  { time: '12:00', slow: 25, standard: 35, fast: 50 },
  { time: '16:00', slow: 18, standard: 28, fast: 40 },
  { time: '20:00', slow: 22, standard: 32, fast: 48 },
  { time: '24:00', slow: 16, standard: 26, fast: 38 },
];

export const mockNotifications = [
  {
    id: '1',
    type: 'success',
    title: 'Transaction Completed',
    message: 'Your swap of 0.5 ETH to MATIC was successful',
    time: '5 mins ago',
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Gas Fee Spike',
    message: 'Ethereum gas fees have increased by 45%',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    type: 'success',
    title: 'Swap Successful',
    message: 'Cross-chain swap from BSC to Polygon completed',
    time: '3 hours ago',
    read: true,
  },
  {
    id: '4',
    type: 'info',
    title: 'Price Alert',
    message: 'ETH has reached your target price of $2,300',
    time: '1 day ago',
    read: true,
  },
];
