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
      // OPTIMIZATION: Fetch balances and transactions in parallel for faster load
      // Total value is calculated from balances, so we fetch it after balances
      const [balancesData, transactionsData] = await Promise.allSettled([
        blockchainService.getAllBalances(address),
        blockchainService.getAllTransactions(address, forceRefresh),
      ]);

      // Handle balances
      if (balancesData.status === 'fulfilled') {
        setBalances(balancesData.value);
        
        // Calculate total value from fetched balances (faster than separate API call)
        const total = balancesData.value.reduce((sum, balance) => {
          const value = balance.usdValueNum;
          if (value === undefined || value === null || isNaN(value) || !isFinite(value) || value < 0) {
            return sum;
          }
          return Number((sum + value).toFixed(2));
        }, 0);
        
        setTotalValue(isNaN(total) || !isFinite(total) || total < 0 ? 0 : Number(total.toFixed(2)));
      } else {
        console.error('Failed to fetch balances:', balancesData.reason);
        if (balancesData.reason?.message?.includes('Rate limit')) {
          setError('Rate limit exceeded. Please wait a moment and try again.');
          setIsLoading(false);
          return;
        }
        setBalances([]);
        setTotalValue(0);
      }

      // Handle transactions
      if (transactionsData.status === 'fulfilled') {
        setTransactions(transactionsData.value);
      } else {
        console.error('Failed to fetch transactions:', transactionsData.reason);
        if (transactionsData.reason?.message?.includes('Rate limit')) {
          setError('Rate limit exceeded while fetching transactions. Please wait a moment and try again.');
        }
        setTransactions([]);
      }

      // Check if both requests failed
      if (balancesData.status === 'rejected' && transactionsData.status === 'rejected') {
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

  // Listen for custom network changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Refresh data when custom networks are modified
      if (e.key === 'blok_explorer_custom_networks') {
        console.log('🔄 Custom networks changed, refreshing dashboard...');
        fetchData(true); // Force refresh
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom event (from same tab)
    const handleCustomEvent = () => {
      console.log('🔄 Custom networks updated in same tab, refreshing dashboard...');
      setTimeout(() => fetchData(true), 500); // Small delay to ensure localStorage is updated
    };

    window.addEventListener('customNetworksChanged', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customNetworksChanged', handleCustomEvent);
    };
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
