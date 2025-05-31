# Crypto Wallet Integration with RainbowKit

This project now includes crypto wallet connectivity using RainbowKit, Wagmi, and Viem. Users can connect their wallets directly from the navbar to interact with the platform.

## Features Added

- **Multi-wallet support**: MetaMask, WalletConnect, Coinbase Wallet, Rainbow, and more
- **Multi-chain support**: Ethereum, Polygon, Optimism, Arbitrum, Base, and Sepolia (testnet)
- **Custom UI integration**: Seamlessly integrated with the existing design system
- **ENS support**: Shows ENS names when available
- **Account management**: View balance, copy address, view on block explorer
- **Theme integration**: Automatically matches dark/light theme

## Setup Instructions

### 1. Get a WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a new project
3. Copy your Project ID

### 2. Set Environment Variables

Create a `.env.local` file in the front-end directory:

```bash
# Required: WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Optional: Better RPC performance
NEXT_PUBLIC_ALCHEMY_ID=your_alchemy_api_key
NEXT_PUBLIC_INFURA_ID=your_infura_api_key
```

### 3. Configuration

The wallet configuration is located in `lib/wagmi.ts`. You can:

- Add/remove supported chains
- Customize the app name
- Add custom RPC endpoints

Current supported chains:
- Ethereum Mainnet
- Polygon
- Optimism
- Arbitrum
- Base
- Sepolia (development only)

## Components

### NavBar Updates
- **Desktop**: Custom connect button with chain selector and account details
- **Mobile**: Full RainbowKit connect button in mobile menu
- **Connected state**: Shows truncated address, balance, and chain info

### WalletAccount Component
A reusable component (`components/layout/wallet-account.tsx`) that shows:
- Connection status
- ENS name (if available)
- Full address with copy/explorer buttons
- Current balance
- Connected network

### Wallet Store
Updated store (`lib/stores/use-wallet.ts`) provides:
- Connection state
- Address and balance
- Loading and error states
- Integrates with wagmi hooks

## Usage Examples

### Check if wallet is connected
```tsx
import { useWallet } from '@/lib/stores/use-wallet';

function MyComponent() {
  const { isConnected, address, balance } = useWallet();
  
  if (!isConnected) {
    return <div>Please connect your wallet</div>;
  }
  
  return <div>Welcome, {address}</div>;
}
```

### Get wallet connection functions
```tsx
import { useWalletConnection } from '@/lib/stores/use-wallet';

function MyComponent() {
  const { connect, disconnect, connectors } = useWalletConnection();
  
  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      Connect MetaMask
    </button>
  );
}
```

### Use RainbowKit components directly
```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';

function MyComponent() {
  return <ConnectButton />;
}
```

## Styling

RainbowKit automatically inherits the theme from next-themes. The connect buttons use the existing design system classes:
- `tech-border` for outlined buttons
- Consistent with the existing button components
- Supports both light and dark themes

## Testing

To test the wallet integration:

1. Start the development server: `npm run dev`
2. Open the app in a browser with a wallet extension installed
3. Click "Connect Wallet" in the navbar
4. Select your preferred wallet and connect
5. Test switching between networks
6. Verify the account details display correctly

## Troubleshooting

### Common Issues

1. **"Wrong network" button appears**: The user is connected to an unsupported chain
2. **Connection fails**: Check if the wallet extension is installed and unlocked
3. **RPC errors**: Add custom RPC endpoints in the wagmi config
4. **Build warnings**: The `pino-pretty` warning is cosmetic and doesn't affect functionality

### Development Mode

In development, Sepolia testnet is automatically included for testing. Make sure to:
- Use testnet ETH for transactions
- Switch to Sepolia in your wallet for testing
- Check the console for any connection logs

## Next Steps

Consider adding:
- Transaction history
- Token balance display
- NFT collection viewing
- Smart contract interactions
- Wallet-gated features 