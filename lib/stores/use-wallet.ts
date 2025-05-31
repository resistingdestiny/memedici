"use client";

import { create } from "zustand";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  connect: () => void;
  disconnect: () => void;
}

export const useWallet = create<WalletState>((set) => ({
  isConnected: false,
  address: null,
  balance: 0,
  
  connect: () => {
    // Mock implementation - would connect to real wallet in production
    console.log("Connecting wallet...");
    
    // Simulate successful connection
    setTimeout(() => {
      set({
        isConnected: true,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        balance: 1.234
      });
      
      console.log("Wallet connected!");
    }, 500);
  },
  
  disconnect: () => {
    console.log("Disconnecting wallet...");
    
    set({
      isConnected: false,
      address: null,
      balance: 0
    });
  }
}));