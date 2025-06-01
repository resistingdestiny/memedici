import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// Define custom testnet chains
const flowTestnet = defineChain({
  id: 545,
  name: 'Flow Testnet',
  nativeCurrency: { name: 'FLOW', symbol: 'FLOW', decimals: 8 },
  rpcUrls: {
    default: { http: ['https://testnet.evm.nodes.onflow.org'] },
  },
  blockExplorers: {
    default: { name: 'Flow Explorer', url: 'https://testnet.flowscan.org' },
  },
  testnet: true,
});

const hederaTestnet = defineChain({
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: { name: 'HBAR', symbol: 'HBAR', decimals: 8 },
  rpcUrls: {
    default: { http: ['https://testnet.hashio.io/api'] },
  },
  blockExplorers: {
    default: { name: 'Hedera Explorer', url: 'https://hashscan.io/testnet' },
  },
  testnet: true,
});

const rootstockTestnet = defineChain({
  id: 31,
  name: 'Rootstock Testnet',
  nativeCurrency: { name: 'Test Bitcoin', symbol: 'tRBTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public-node.testnet.rsk.co'] },
  },
  blockExplorers: {
    default: { name: 'RSK Explorer', url: 'https://explorer.testnet.rsk.co' },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'Memedici City',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your_project_id_here', // Get this from https://cloud.walletconnect.com
  chains: [
    flowTestnet,
    hederaTestnet,
    rootstockTestnet,
  ],
  ssr: true, // If your dApp uses server side rendering (SSR)
}); 