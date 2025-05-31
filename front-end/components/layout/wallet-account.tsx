"use client";

import { useAccount, useBalance, useEnsName } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function WalletAccount() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: ensName } = useEnsName({ address });
  const { toast } = useToast();

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const openEtherscan = () => {
    if (address && chain) {
      const explorerUrl = chain.blockExplorers?.default?.url;
      if (explorerUrl) {
        window.open(`${explorerUrl}/address/${address}`, '_blank');
      }
    }
  };

  if (!isConnected || !address) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Your Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Connect your wallet to view your account details and interact with the platform.
          </p>
          <ConnectButton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Wallet Account
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Connected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ensName && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">ENS Name</label>
            <p className="text-lg font-mono">{ensName}</p>
          </div>
        )}
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">Address</label>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={copyAddress}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={openEtherscan}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {balance && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Balance</label>
            <p className="text-lg font-semibold">
              {Number(balance.formatted).toFixed(4)} {balance.symbol}
            </p>
          </div>
        )}

        {chain && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Network</label>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-medium">{chain.name}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 