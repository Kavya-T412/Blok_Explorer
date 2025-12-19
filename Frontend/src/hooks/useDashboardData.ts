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
      // Fetch all data in parallel - get ALL transactions (no limit)
      const [balancesData, transactionsData, totalValueData] = await Promise.allSettled([
        blockchainService.getAllBalances(address),
        blockchainService.getAllTransactions(address, forceRefresh), // Pass forceRefresh flag
        blockchainService.getTotalValue(address),
      ]);

      // Handle balances
      if (balancesData.status === 'fulfilled') {
        setBalances(balancesData.value);
      } else {
        console.error('Failed to fetch balances:', balancesData.reason);
      }

      // Handle transactions
      if (transactionsData.status === 'fulfilled') {
        setTransactions(transactionsData.value);
      } else {
        console.error('Failed to fetch transactions:', transactionsData.reason);
      }

      // Handle total value
      if (totalValueData.status === 'fulfilled') {
        setTotalValue(totalValueData.value);
      } else {
        console.error('Failed to fetch total value:', totalValueData.reason);
      }

      // Check if all requests failed
      const allFailed = [balancesData, transactionsData, totalValueData]
        .every(result => result.status === 'rejected');
      
      if (allFailed) {
        setError('Failed to fetch blockchain data. Please check your connection and try again.');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('An unexpected error occurred. Please try again.');
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
