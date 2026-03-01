import { motion } from 'framer-motion';
import { TrendingUp, Activity, ArrowUpRight, RefreshCw, Wallet, AlertCircle, FileCode, Send, Code, ExternalLink, Search, X, Filter } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useWallet } from '@/contexts/WalletContext';
import { NetworkModeIndicator } from '@/components/NetworkModeToggle';
import { blockchainService, Transaction } from '@/services/blockchainService';
import { getCustomNetworks } from '@/types/customNetworks';
import { useState, useMemo } from 'react';

const Dashboard = () => {
  const { address, isConnected } = useWallet();
  const { balances, transactions, totalValue, isLoading, error, refetch } = useDashboardData();
  const [searchHash, setSearchHash] = useState('');
  const [searchResult, setSearchResult] = useState<Transaction | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchResult, setShowSearchResult] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string>('all');

  // Get all available chains (configured chains + chains with transactions)
  const availableChains = useMemo(() => {
    // Get all configured chains
    const allConfiguredChains = blockchainService.getAllAvailableChains();

    // Get chains that have transactions
    const chainsWithTransactions = new Set(transactions.map(tx => tx.chain));

    // Combine both and remove duplicates, then sort
    const allChains = new Set([...allConfiguredChains]);

    return Array.from(allChains).sort();
  }, [transactions]);

  // Get transaction count for a specific chain
  const getChainTransactionCount = (chain: string) => {
    return transactions.filter(tx => tx.chain === chain).length;
  };

  // Filter transactions by selected chain
  const filteredTransactions = useMemo(() => {
    if (selectedChain === 'all') {
      return transactions;
    }
    return transactions.filter(tx => tx.chain === selectedChain);
  }, [transactions, selectedChain]);

  const handleSearch = async () => {
    if (!searchHash.trim()) {
      setSearchError('Please enter a transaction hash');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);
    setShowSearchResult(false);

    try {
      const result = await blockchainService.searchTransactionByHash(searchHash.trim());
      if (result) {
        setSearchResult(result);
        setShowSearchResult(true);
      } else {
        setSearchError('Transaction not found on any supported chain');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Error searching for transaction');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchHash('');
    setSearchResult(null);
    setSearchError(null);
    setShowSearchResult(false);
  };

  const getChainStyle = (chainName: string) => {
    // Check if it's a custom network first
    const customNetworks = getCustomNetworks();
    const customNetwork = customNetworks.find(n => n.name === chainName);

    if (customNetwork) {
      return {
        gradient: customNetwork.color,
        badge: `bg-gradient-to-r ${customNetwork.color} border-0 text-white font-bold shadow-lg opacity-100`,
        icon: customNetwork.icon || '●'
      };
    }

    const chainStyles: Record<string, { gradient: string; badge: string; icon: string }> = {
      // Ethereum networks
      'Ethereum': { gradient: 'from-blue-500 to-purple-500', badge: 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-blue-500/50 text-blue-600 dark:text-blue-200', icon: '⟠' },
      'Ethereum Mainnet': { gradient: 'from-blue-500 to-purple-500', badge: 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-blue-500/50 text-blue-600 dark:text-blue-200', icon: '⟠' },
      'Sepolia': { gradient: 'from-cyan-500 to-blue-500', badge: 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-cyan-500/50 text-cyan-600 dark:text-cyan-200', icon: '⟠' },
      'Ethereum Sepolia': { gradient: 'from-cyan-500 to-blue-500', badge: 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-cyan-500/50 text-cyan-600 dark:text-cyan-200', icon: '⟠' },
      'Hoodi': { gradient: 'from-cyan-400 to-blue-400', badge: 'bg-gradient-to-r from-cyan-400/30 to-blue-400/30 border-cyan-400/50 text-cyan-600 dark:text-cyan-200', icon: '⟠' },
      'Ethereum Hoodi': { gradient: 'from-cyan-400 to-blue-400', badge: 'bg-gradient-to-r from-cyan-400/30 to-blue-400/30 border-cyan-400/50 text-cyan-600 dark:text-cyan-200', icon: '⟠' },
      // Polygon networks
      'Polygon': { gradient: 'from-purple-500 to-pink-500', badge: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 text-purple-600 dark:text-purple-200', icon: '⬡' },
      'Polygon Mainnet': { gradient: 'from-purple-500 to-pink-500', badge: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 text-purple-600 dark:text-purple-200', icon: '⬡' },
      'Polygon Amoy': { gradient: 'from-purple-400 to-pink-400', badge: 'bg-gradient-to-r from-purple-400/30 to-pink-400/30 border-purple-400/50 text-purple-600 dark:text-purple-200', icon: '⬡' },
      // BNB networks
      'BSC': { gradient: 'from-yellow-500 to-orange-500', badge: 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-500/50 text-orange-600 dark:text-yellow-200', icon: '◆' },
      'BNB Chain': { gradient: 'from-yellow-500 to-orange-500', badge: 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-500/50 text-orange-600 dark:text-yellow-200', icon: '◆' },
      'BNB Mainnet': { gradient: 'from-yellow-500 to-orange-500', badge: 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-500/50 text-orange-600 dark:text-yellow-200', icon: '◆' },
      'BNB Testnet': { gradient: 'from-yellow-400 to-orange-400', badge: 'bg-gradient-to-r from-yellow-400/30 to-orange-400/30 border-yellow-400/50 text-orange-600 dark:text-yellow-200', icon: '◆' },
      'BSC Testnet': { gradient: 'from-yellow-400 to-orange-400', badge: 'bg-gradient-to-r from-yellow-400/30 to-orange-400/30 border-yellow-400/50 text-orange-600 dark:text-yellow-200', icon: '◆' },
      // Arbitrum networks
      'Arbitrum': { gradient: 'from-blue-400 to-cyan-400', badge: 'bg-gradient-to-r from-blue-400/30 to-cyan-400/30 border-blue-400/50 text-cyan-600 dark:text-cyan-200', icon: '▲' },
      'Arbitrum One': { gradient: 'from-blue-400 to-cyan-400', badge: 'bg-gradient-to-r from-blue-400/30 to-cyan-400/30 border-blue-400/50 text-cyan-600 dark:text-cyan-100', icon: '▲' },
      'Arbitrum Sepolia': { gradient: 'from-blue-300 to-cyan-300', badge: 'bg-gradient-to-r from-blue-300/30 to-cyan-300/30 border-blue-300/50 text-cyan-600 dark:text-cyan-100', icon: '▲' },
      // Optimism networks
      'Optimism': { gradient: 'from-red-500 to-pink-500', badge: 'bg-gradient-to-r from-red-500/30 to-pink-500/30 border-red-500/50 text-red-600 dark:text-red-200', icon: '🔴' },
      'Optimism Sepolia': { gradient: 'from-red-400 to-pink-400', badge: 'bg-gradient-to-r from-red-400/30 to-pink-400/30 border-red-400/50 text-red-600 dark:text-red-200', icon: '🔴' },
      // Base networks
      'Base': { gradient: 'from-blue-600 to-indigo-600', badge: 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border-blue-600/50 text-indigo-600 dark:text-blue-200', icon: '🔵' },
      'Base Sepolia': { gradient: 'from-blue-500 to-indigo-500', badge: 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 border-blue-500/50 text-indigo-600 dark:text-blue-200', icon: '🔵' },
      // Avalanche networks
      'Avalanche': { gradient: 'from-red-600 to-orange-600', badge: 'bg-gradient-to-r from-red-600/30 to-orange-600/30 border-red-600/50 text-red-600 dark:text-red-200', icon: '❄' },
      'Avalanche C-Chain': { gradient: 'from-red-600 to-orange-600', badge: 'bg-gradient-to-r from-red-600/30 to-orange-600/30 border-red-600/50 text-red-600 dark:text-red-200', icon: '❄' },
      'Avalanche Fuji': { gradient: 'from-red-500 to-orange-500', badge: 'bg-gradient-to-r from-red-500/30 to-orange-500/30 border-red-500/50 text-red-600 dark:text-red-200', icon: '❄' },
    };

    return chainStyles[chainName] || {
      gradient: 'from-gray-500 to-gray-600',
      badge: 'bg-gray-500/30 border-gray-500/50 text-gray-700 dark:text-gray-200',
      icon: '●'
    };
  };

  const getTransactionTypeInfo = (tx: typeof transactions[0]) => {
    if (tx.type === 'contract-deployment' || tx.isContractCreation) {
      return {
        Icon: FileCode,
        variant: 'default' as const,
        label: 'Contract Deploy',
        description: 'Deployed new contract',
        isContract: true
      };
    }
    if (tx.type === 'contract-interaction') {
      // Check if it has methodId for function call detection
      const hasMethod = tx.methodId && tx.methodId !== '0x';
      return {
        Icon: Code,
        variant: 'secondary' as const,
        label: hasMethod ? 'Function Call' : 'Contract Call',
        description: hasMethod ? `Called: ${tx.methodId}` : 'Interacted with contract',
        isContract: true
      };
    }
    return {
      Icon: Send,
      variant: 'outline' as const,
      label: 'Transfer',
      description: 'To account',
      isContract: false
    };
  };

  const getDirectionInfo = (tx: typeof transactions[0]) => {
    if (tx.direction === 'received') {
      return {
        icon: '↓',
        color: 'text-green-500',
        label: 'Received',
        prefix: '+',
        from: tx.from
      };
    }
    if (tx.direction === 'sent') {
      return {
        icon: '↑',
        color: 'text-red-500',
        label: tx.type === 'contract-deployment' ? 'Deployed' : 'Sent',
        prefix: '-',
        to: tx.to
      };
    }
    // self transaction
    return {
      icon: '⟲',
      color: 'text-yellow-500',
      label: 'Self',
      prefix: '±',
      to: tx.to
    };
  };

  const MotionCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      {children}
    </motion.div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto">
          <MotionCard>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your multi-chain portfolio</p>
              </div>
              <Button onClick={refetch} disabled={isLoading || !isConnected} variant="outline" size="sm" className="gap-2">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </MotionCard>

          <MotionCard><NetworkModeIndicator /></MotionCard>

          {!isConnected && (
            <MotionCard>
              <Alert className="mb-8">
                <Wallet className="h-4 w-4" />
                <AlertDescription>Please connect your wallet to view your dashboard data.</AlertDescription>
              </Alert>
            </MotionCard>
          )}

          {error && isConnected && (
            <MotionCard>
              <Alert variant="destructive" className="mb-8">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </MotionCard>
          )}

          {isConnected && (
            <MotionCard>
              <div className="glass-card p-6 rounded-xl mb-8">
                <h3 className="text-sm text-muted-foreground mb-2">Total Portfolio Value</h3>
                {isLoading ? (
                  <Skeleton className="h-10 w-48" />
                ) : (
                  <p className="text-3xl font-bold gradient-text">
                    ${(totalValue && isFinite(totalValue) ? totalValue : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
                {address && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Wallet: {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                )}
              </div>
            </MotionCard>
          )}

          {/* Wallet Balances */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {isLoading && !balances.length ? (
              Array.from({ length: 3 }, (_, i) => (
                <MotionCard key={i} delay={i * 0.1}>
                  <div className="glass-card p-6 rounded-xl">
                    <Skeleton className="w-12 h-12 rounded-lg mb-4" />
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </MotionCard>
              ))
            ) : balances.length > 0 ? (
              balances.map((balance, i) => (
                <MotionCard key={balance.chain} delay={i * 0.1}>
                  <div className="glass-card-hover p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${balance.color} flex items-center justify-center`}>
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-green-500" />
                    </div>
                    <h3 className="text-sm text-muted-foreground mb-1">{balance.chain}</h3>
                    <p className="text-2xl font-bold mb-1">{balance.balance} {balance.symbol}</p>
                    <p className="text-sm text-muted-foreground">{balance.usdValue}</p>
                  </div>
                </MotionCard>
              ))
            ) : isConnected ? (
              <MotionCard>
                <Alert className="col-span-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No balance data available. Please ensure your wallet is connected and try refreshing.
                  </AlertDescription>
                </Alert>
              </MotionCard>
            ) : null}
          </div>

          {/* All Transactions */}
          <MotionCard delay={0.3}>
            <div className="glass-card p-6 rounded-xl mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">All Transactions</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {transactions.length > 0
                      ? selectedChain === 'all'
                        ? `Complete transaction history across all chains (${transactions.length} total) • Sorted by date (newest first)`
                        : `Showing ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} on ${selectedChain}`
                      : 'Complete transaction history across all chains'}
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>

              {/* Search and Filter Controls */}
              <div className="mb-6 space-y-3">
                {/* Chain Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-muted-foreground">Filter by Chain:</label>
                  <Select value={selectedChain} onValueChange={setSelectedChain}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="font-semibold">All Chains</span>
                        {transactions.length > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">({transactions.length})</span>
                        )}
                      </SelectItem>
                      {availableChains.map((chain) => {
                        const count = getChainTransactionCount(chain);
                        const chainStyle = getChainStyle(chain);
                        return (
                          <SelectItem key={chain} value={chain}>
                            <span className="flex items-center gap-2">
                              <span>{chainStyle.icon}</span>
                              <span>{chain}</span>
                              <span className="text-xs text-muted-foreground">({count})</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedChain !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedChain('all')}
                      className="gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear Filter
                    </Button>
                  )}
                </div>

                {/* Search by Transaction Hash */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by transaction hash (0x...)"
                      value={searchHash}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSearchHash(value);
                        // Clear search results when input is emptied
                        if (!value.trim()) {
                          setSearchResult(null);
                          setSearchError(null);
                          setShowSearchResult(false);
                        }
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 pr-10"
                      disabled={isSearching}
                    />
                    {searchHash && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Button onClick={handleSearch} disabled={isSearching || !searchHash.trim()} className="gap-2">
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                {searchError && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{searchError}</AlertDescription>
                  </Alert>
                )}

                {showSearchResult && searchResult && (
                  <div className="mt-4 p-4 glass-card rounded-lg border-2 border-primary/50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-primary">Search Result</h3>
                      <Button variant="ghost" size="sm" onClick={clearSearch}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            {['Type', 'Amount', 'From/To', 'Tx Hash', 'Chain', 'Status', 'Date'].map(h => (
                              <th key={h} className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const tx = searchResult;
                            const { Icon, variant, label } = getTransactionTypeInfo(tx);
                            const chainStyle = getChainStyle(tx.chain);

                            const valueParts = (tx.value || '0 ETH').split(' ');
                            const valueNum = parseFloat(valueParts[0]) || 0;
                            const symbol = valueParts[1] || 'ETH';

                            return (
                              <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-4 px-2">
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-muted-foreground" />
                                    <Badge variant={variant} className="text-xs">{label}</Badge>
                                  </div>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="font-semibold">
                                    {valueNum.toFixed(6)} {symbol}
                                  </div>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="text-xs space-y-1">
                                    <div>
                                      <span className="text-muted-foreground">From: </span>
                                      <code className="text-primary">{tx.from.slice(0, 10)}...{tx.from.slice(-8)}</code>
                                    </div>
                                    {tx.to && tx.to !== 'Contract Deployment' && (
                                      <div>
                                        <span className="text-muted-foreground">To: </span>
                                        <code className="text-primary">{tx.to.slice(0, 10)}...{tx.to.slice(-8)}</code>
                                      </div>
                                    )}
                                    {tx.isContractCreation && tx.contractAddress && (
                                      <div>
                                        <span className="text-muted-foreground">Contract: </span>
                                        <code className="text-primary">{tx.contractAddress.slice(0, 10)}...{tx.contractAddress.slice(-8)}</code>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-2">
                                  <a
                                    href={blockchainService.getExplorerUrl(tx.chain, tx.hash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer group"
                                    title={`View on ${tx.chain} Explorer: ${tx.hash}`}
                                  >
                                    <code>{tx.hash.slice(0, 8)}...</code>
                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </a>
                                </td>
                                <td className="py-4 px-2">
                                  <Badge
                                    variant="outline"
                                    className={`${chainStyle.badge} font-semibold border-2 px-3 py-1`}
                                  >
                                    {tx.chain}
                                  </Badge>
                                </td>
                                <td className="py-4 px-2">
                                  <Badge variant={tx.status === 'success' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}>
                                    {tx.status}
                                  </Badge>
                                </td>
                                <td className="py-4 px-2 text-sm text-muted-foreground whitespace-nowrap">{tx.date}</td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {isLoading && !transactions.length ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['Direction', 'Type', 'Amount', 'From/To', 'Tx Hash', 'Chain', 'Status', 'Date'].map(h => (
                          <th key={h} className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => {
                        const { Icon, variant, label, description } = getTransactionTypeInfo(tx);
                        const directionInfo = getDirectionInfo(tx);
                        const chainStyle = getChainStyle(tx.chain);

                        // Safely parse value and symbol
                        const valueParts = (tx.value || '0 ETH').split(' ');
                        const valueNum = parseFloat(valueParts[0]) || 0;
                        const symbol = valueParts[1] || 'ETH';

                        return (
                          <tr key={tx.hash} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-xl font-bold ${directionInfo.color}`}>{directionInfo.icon}</span>
                                <div className="text-xs">
                                  <div className={`font-semibold ${directionInfo.color}`}>{directionInfo.label}</div>
                                  <div className="text-muted-foreground">{description}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <Badge variant={variant} className="text-xs">{label}</Badge>
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <div className={`font-semibold ${directionInfo.color}`}>
                                {valueNum > 0 && directionInfo.prefix}
                                {valueNum.toFixed(6)} {symbol}
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <div className="text-xs">
                                {tx.direction === 'received' && tx.from ? (
                                  <>
                                    <div className="text-muted-foreground">From:</div>
                                    <code className="text-primary">{tx.from.slice(0, 10)}...{tx.from.slice(-8)}</code>
                                  </>
                                ) : tx.isContractCreation ? (
                                  <>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                      <FileCode className="w-3 h-3" />
                                      Contract:
                                    </div>
                                    <code className="text-primary">
                                      {tx.contractAddress && tx.contractAddress !== ''
                                        ? `${tx.contractAddress.slice(0, 10)}...${tx.contractAddress.slice(-8)}`
                                        : tx.to && tx.to !== 'Contract Deployment'
                                          ? `${tx.to.slice(0, 10)}...${tx.to.slice(-8)}`
                                          : `${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`}
                                    </code>
                                  </>
                                ) : tx.to && tx.to !== 'Contract Deployment' ? (
                                  <>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                      {tx.type === 'contract-interaction' ? (
                                        <>
                                          <Code className="w-3 h-3" />
                                          To Contract:
                                        </>
                                      ) : (
                                        <>
                                          <Send className="w-3 h-3" />
                                          To Account:
                                        </>
                                      )}
                                    </div>
                                    <code className="text-primary">{tx.to.slice(0, 10)}...{tx.to.slice(-8)}</code>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-muted-foreground">To:</div>
                                    <code className="text-primary">Contract</code>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <a
                                href={blockchainService.getExplorerUrl(tx.chain, tx.hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer group"
                                title={`View on ${tx.chain} Explorer: ${tx.hash}`}
                              >
                                <code>{tx.hash.slice(0, 8)}...</code>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            </td>
                            <td className="py-4 px-2">
                              <Badge
                                variant="outline"
                                className={`${chainStyle.badge} font-semibold border-2 px-3 py-1`}
                              >
                                {tx.chain}
                              </Badge>
                            </td>
                            <td className="py-4 px-2">
                              <Badge variant={tx.status === 'success' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}>
                                {tx.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-2 text-sm text-muted-foreground whitespace-nowrap">{tx.date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Alert>
                  {isConnected ? <AlertCircle className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                  <AlertDescription>
                    {isConnected
                      ? selectedChain !== 'all'
                        ? `No transactions found on ${selectedChain}. Try selecting a different chain or view all chains.`
                        : (
                          <>
                            No transactions found in the current network mode.
                            {typeof window !== 'undefined' && localStorage.getItem('useTestnet') === 'true'
                              ? ' Switch to Mainnet in Settings to view mainnet transactions.'
                              : ' Switch to Testnet in Settings to view testnet transactions.'}
                          </>
                        )
                      : "Connect your wallet to view your transaction history."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </MotionCard>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
