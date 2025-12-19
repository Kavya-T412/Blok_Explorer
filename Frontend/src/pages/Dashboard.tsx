import { motion } from 'framer-motion';
import { TrendingUp, Activity, ArrowUpRight, RefreshCw, Wallet, AlertCircle, FileCode, Send, Code, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useWallet } from '@/contexts/WalletContext';
import { NetworkModeIndicator } from '@/components/NetworkModeToggle';
import { blockchainService } from '@/services/blockchainService';

const Dashboard = () => {
  const { address, isConnected } = useWallet();
  const { balances, transactions, totalValue, isLoading, error, refetch } = useDashboardData();

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
                    ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <div>
                  <h2 className="text-2xl font-bold">All Transactions</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {transactions.length > 0 
                      ? `Complete transaction history across all chains (${transactions.length} total) • Sorted by date (newest first)` 
                      : 'Complete transaction history across all chains'}
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              
              {isLoading && !transactions.length ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : transactions.length > 0 ? (
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
                      {transactions.map((tx) => {
                        const { Icon, variant, label, description } = getTransactionTypeInfo(tx);
                        const directionInfo = getDirectionInfo(tx);
                        
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
                            <td className="py-4 px-2"><Badge variant="outline">{tx.chain}</Badge></td>
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
                      ? "No transactions found. This wallet may not have any transaction history yet."
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
