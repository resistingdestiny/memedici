"use client";

import { create } from "zustand";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { useEffect } from "react";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  isConnecting: boolean;
  error: string | null;
}

export const useWallet = create<WalletState>(() => ({
  isConnected: false,
  address: null,
  balance: 0,
  isConnecting: false,
  error: null,
}));

// Custom hook that combines wagmi hooks with zustand store
export const useWalletConnection = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address: address,
  });

  const setWalletState = useWallet((state) => state);

  useEffect(() => {
    useWallet.setState({
      isConnected,
      address: address || null,
      balance: balance ? parseFloat(balance.formatted) : 0,
      isConnecting: isPending,
      error: error?.message || null,
    });
  }, [address, isConnected, balance, isPending, error]);

  return {
    connect,
    disconnect,
    connectors,
    isConnecting: isPending,
    error,
  };
};