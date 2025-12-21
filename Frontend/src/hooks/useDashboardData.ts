import { useState, useEffect, useCallback } from 'react';
import { blockchainService, Balance, Transaction } from '@/services/blockchainService';
import { useWallet } from '@/contexts/WalletContext';

interface DashboardData {
  balances: Balance[];
  transactions: Transaction[];
  totalValue: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDashboardData = (): DashboardData => {
  const { address, isConnected } = useWallet();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    if (!address || !isConnected) {
      setBalances([]);
      setTransactions([]);
      setTotalValue(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch balances and total value first
      const [balancesData, totalValueData] = await Promise.allSettled([
        blockchainService.getAllBalances(address),
        blockchainService.getTotalValue(address),
      ]);

      // Handle balances
      if (balancesData.status === 'fulfilled') {
        setBalances(balancesData.value);
      } else {
        console.error('Failed to fetch balances:', balancesData.reason);
        if (balancesData.reason?.message?.includes('Rate limit')) {
          setError('Rate limit exceeded. Please wait a moment and try again.');
          setIsLoading(false);
          return;
        }
      }

      // Handle total value
      if (totalValueData.status === 'fulfilled') {
        setTotalValue(totalValueData.value);
      } else {
        console.error('Failed to fetch total value:', totalValueData.reason);
      }

      // Fetch transactions separately (can take longer)
      try {
        const transactionsData = await blockchainService.getAllTransactions(address, forceRefresh);
        setTransactions(transactionsData);
      } catch (txError: any) {
        console.error('Failed to fetch transactions:', txError);
        if (txError?.message?.includes('Rate limit')) {
          setError('Rate limit exceeded while fetching transactions. Please wait a moment and try again.');
        }
        // Don't fail completely, just show empty transactions
        setTransactions([]);
      }

      // Check if all balance/value requests failed
      const balancesFailed = balancesData.status === 'rejected';
      const valueFailed = totalValueData.status === 'rejected';
      
      if (balancesFailed && valueFailed) {
        setError('Failed to fetch blockchain data. Please check your connection and try again.');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      if (err?.message?.includes('Rate limit')) {
        setError('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  // Fetch data on mount and when address changes
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Manual refresh function that forces cache clear
  const refetch = useCallback(async () => {
    console.log('🔄 Manual refresh triggered - clearing cache');
    await fetchData(true); // Force refresh by clearing cache
  }, [fetchData]);

  return {
    balances,
    transactions,
    totalValue,
    isLoading,
    error,
    refetch, // Use the refetch function, not fetchData
  };
};
