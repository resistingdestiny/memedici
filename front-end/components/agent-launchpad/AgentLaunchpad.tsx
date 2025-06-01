"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Rocket, TrendingUp, Users, Zap, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

declare global {
  interface Window {
    AgentLaunchpadV2?: any;
    ethereum?: any;
    ethers?: any;
  }
}

interface AgentData {
  name: string;
  symbol: string;
  agentName: string;
  archetype: string;
  metadataURI: string;
  fundingTarget: number;
  tokenSupply: number;
  agentConfigJSON: any;
}

interface WalletInfo {
  address: string;
  balance: string;
  chainId: number;
}

interface AgentInfo {
  id: string;
  name: string;
  agentName: string;
  fundingTarget: string;
  fundingTargetFormatted: string;
  totalRaised: string;
  totalRaisedFormatted: string;
  isBonded: boolean;
  creator: string;
  tokenAddress: string;
  lpPairAddress: string;
  agentConfigJSON: string;
  fundingProgress: number;
}

export default function AgentLaunchpad({ onClose }: { onClose: () => void }) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [agentLaunchpad, setAgentLaunchpad] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('create');
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [inProgressAgents, setInProgressAgents] = useState<AgentInfo[]>([]);
  const [bondedTokens, setBondedTokens] = useState<any[]>([]);
  
  // Create agent form
  const [agentData, setAgentData] = useState<AgentData>({
    name: '',
    symbol: '',
    agentName: '',
    archetype: '',
    metadataURI: '',
    fundingTarget: 1,
    tokenSupply: 1000000,
    agentConfigJSON: {
      display_name: '',
      archetype: '',
      core_traits: [],
      origin_story: '',
      influences: [],
      colour_palette: ['#ff6b6b', '#4ecdc4', '#45b7d1']
    }
  });
  
  // Contribution form
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [contributionAmount, setContributionAmount] = useState<number>(0.1);

  useEffect(() => {
    loadScripts();
  }, []);

  useEffect(() => {
    if (isConnected && agentLaunchpad) {
      loadDashboardData();
    }
  }, [isConnected, agentLaunchpad]);

  const loadScripts = async () => {
    try {
      if (!window.ethers) {
        const script = document.createElement('script');
        script.src = 'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js';
        script.onload = () => {
          loadAgentLaunchpadScript();
        };
        document.head.appendChild(script);
      } else {
        loadAgentLaunchpadScript();
      }
    } catch (error) {
      setError('Failed to load required scripts');
    }
  };

  const loadAgentLaunchpadScript = () => {
    // Load the JavaScript integration file
    const script = document.createElement('script');
    script.src = '/lib/agent-launchpad-integration.js';
    script.onload = () => {
      console.log('AgentLaunchpad integration loaded');
    };
    script.onerror = (error) => {
      console.error('Failed to load AgentLaunchpad integration:', error);
      setError('Failed to load AgentLaunchpad integration scripts');
    };
    document.head.appendChild(script);
  };

  const connectWallet = async (walletType: 'metamask' | 'walletconnect' = 'metamask') => {
    try {
      setLoading(true);
      setError(null);

      if (!window.AgentLaunchpadV2?.initializeAgentLaunchpadV2) {
        throw new Error("AgentLaunchpad scripts not loaded properly");
      }

      let result;
      if (walletType === 'walletconnect') {
        result = await window.AgentLaunchpadV2.initializeWithWalletConnect();
      } else {
        if (!window.ethereum) {
          throw new Error("No wallet detected. Please install MetaMask.");
        }
        result = await window.AgentLaunchpadV2.initializeWithMetaMask();
      }

      const { agentLaunchpad: launchpad, walletInfo: wallet } = result;

      setAgentLaunchpad(launchpad);
      setWalletInfo(wallet);
      setIsConnected(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    if (!agentLaunchpad) return;

    try {
      const [dashboard, inProgress, bonded] = await Promise.all([
        agentLaunchpad.getDashboardData(),
        agentLaunchpad.getInProgressAgentsPaginated(0, 10),
        agentLaunchpad.getBondedTokensPaginated(0, 10)
      ]);

      setDashboardData(dashboard);
      setInProgressAgents(inProgress.agentIds.map((id: string, index: number) => ({
        id,
        name: inProgress.agentNames[index],
        agentName: inProgress.agentNames[index],
        fundingTarget: inProgress.fundingTargets[index],
        fundingTargetFormatted: inProgress.fundingTargetsFormatted[index],
        totalRaised: inProgress.totalRaised[index],
        totalRaisedFormatted: inProgress.totalRaisedFormatted[index],
        fundingProgress: inProgress.fundingProgress[index] * 100,
        tokenAddress: inProgress.tokenAddresses[index],
        isBonded: false,
        creator: '',
        lpPairAddress: '',
        agentConfigJSON: ''
      })));
      setBondedTokens(bonded.agentIds.map((id: string, index: number) => ({
        id,
        name: bonded.names[index],
        symbol: bonded.symbols[index],
        tokenAddress: bonded.tokenAddresses[index],
        lpPair: bonded.lpPairs[index]
      })));
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleCreateAgent = async () => {
    if (!agentLaunchpad) return;

    try {
      setLoading(true);
      setError(null);

      const result = await agentLaunchpad.createAgent(agentData);
      
      if (result.success) {
        alert(`Agent created successfully! Agent ID: ${result.agentId}`);
        // Reset form
        setAgentData({
          name: '',
          symbol: '',
          agentName: '',
          archetype: '',
          metadataURI: '',
          fundingTarget: 1,
          tokenSupply: 1000000,
          agentConfigJSON: {
            display_name: '',
            archetype: '',
            core_traits: [],
            origin_story: '',
            influences: [],
            colour_palette: ['#ff6b6b', '#4ecdc4', '#45b7d1']
          }
        });
        // Reload dashboard data
        loadDashboardData();
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async () => {
    if (!agentLaunchpad || !selectedAgentId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await agentLaunchpad.contribute(selectedAgentId, contributionAmount);
      
      if (result.success) {
        alert(`Contribution successful! Amount: ${result.amount} FLOW`);
        loadDashboardData();
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[9999]">
        <Card className="w-full max-w-md bg-gradient-to-br from-gray-900/95 to-black/95 border-orange-400/70">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Rocket className="w-8 h-8 text-orange-400" />
            </div>
            <CardTitle className="text-2xl text-white">🚀 Agent Launchpad</CardTitle>
            <CardDescription className="text-gray-300">
              Create and launch AI agents on Flow Testnet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="border-red-400/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={() => connectWallet()}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
            
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to City
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[9999] p-4">
      <div className="w-full max-w-6xl h-full max-h-[90vh] bg-gradient-to-br from-gray-900/95 to-black/95 border-2 border-orange-400/70 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-orange-400/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Rocket className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">🚀 Agent Launchpad</h1>
                <p className="text-orange-300">Flow Testnet • Connected: {walletInfo?.address.slice(0, 6)}...{walletInfo?.address.slice(-4)}</p>
              </div>
            </div>
            <Button 
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to City
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4 bg-black/50 border-b border-orange-400/30">
              <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-orange-600">Dashboard</TabsTrigger>
              <TabsTrigger value="create" className="text-white data-[state=active]:bg-orange-600">Create Agent</TabsTrigger>
              <TabsTrigger value="contribute" className="text-white data-[state=active]:bg-orange-600">Contribute</TabsTrigger>
              <TabsTrigger value="trade" className="text-white data-[state=active]:bg-orange-600">Trade</TabsTrigger>
            </TabsList>

            <div className="p-6">
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-black/50 border-orange-400/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-orange-400 text-lg">Total Agents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{dashboardData?.counts?.totalAgents || 0}</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/50 border-green-400/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-green-400 text-lg">Bonded Agents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{dashboardData?.counts?.bondedAgents || 0}</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/50 border-blue-400/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-blue-400 text-lg">In Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{dashboardData?.counts?.inProgressAgents || 0}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* In Progress Agents */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">🔥 Active Fundraising</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inProgressAgents.map((agent) => (
                      <Card key={agent.id} className="bg-black/50 border-blue-400/50">
                        <CardHeader>
                          <CardTitle className="text-white">{agent.agentName}</CardTitle>
                          <CardDescription className="text-gray-300">
                            Target: {agent.fundingTargetFormatted} FLOW
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">Progress</span>
                              <span className="text-blue-400">{agent.fundingProgress.toFixed(1)}%</span>
                            </div>
                            <Progress value={agent.fundingProgress} className="h-2" />
                            <div className="text-sm text-gray-300">
                              {agent.totalRaisedFormatted} / {agent.fundingTargetFormatted} FLOW
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Bonded Tokens */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">💎 Bonded Tokens</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {bondedTokens.map((token) => (
                      <Card key={token.id} className="bg-black/50 border-green-400/50">
                        <CardHeader>
                          <CardTitle className="text-white">{token.name}</CardTitle>
                          <CardDescription className="text-gray-300">
                            ${token.symbol}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Badge className="bg-green-500/20 text-green-400 border-green-400/50">
                            Tradeable
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Create Agent Tab */}
              <TabsContent value="create" className="space-y-6">
                <Card className="bg-black/50 border-orange-400/50">
                  <CardHeader>
                    <CardTitle className="text-white">Create New Agent</CardTitle>
                    <CardDescription className="text-gray-300">
                      Launch your AI agent and start fundraising
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Agent Name</Label>
                        <Input
                          value={agentData.agentName}
                          onChange={(e) => setAgentData({...agentData, agentName: e.target.value})}
                          className="bg-black/50 border-gray-600 text-white"
                          placeholder="My AI Agent"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Token Symbol</Label>
                        <Input
                          value={agentData.symbol}
                          onChange={(e) => setAgentData({...agentData, symbol: e.target.value})}
                          className="bg-black/50 border-gray-600 text-white"
                          placeholder="AGENT"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white">Token Name</Label>
                      <Input
                        value={agentData.name}
                        onChange={(e) => setAgentData({...agentData, name: e.target.value})}
                        className="bg-black/50 border-gray-600 text-white"
                        placeholder="My Agent Token"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Archetype</Label>
                      <Input
                        value={agentData.archetype}
                        onChange={(e) => setAgentData({...agentData, archetype: e.target.value})}
                        className="bg-black/50 border-gray-600 text-white"
                        placeholder="digital artist, trader, researcher..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Funding Target (FLOW)</Label>
                        <Input
                          type="number"
                          value={agentData.fundingTarget}
                          onChange={(e) => setAgentData({...agentData, fundingTarget: parseFloat(e.target.value)})}
                          className="bg-black/50 border-gray-600 text-white"
                          min="0.1"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Token Supply</Label>
                        <Input
                          type="number"
                          value={agentData.tokenSupply}
                          onChange={(e) => setAgentData({...agentData, tokenSupply: parseInt(e.target.value)})}
                          className="bg-black/50 border-gray-600 text-white"
                          min="1000"
                        />
                      </div>
                    </div>

                    {error && (
                      <Alert className="border-red-400/50 bg-red-500/10">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-400">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleCreateAgent}
                      disabled={loading || !agentData.agentName || !agentData.symbol}
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white"
                    >
                      {loading ? 'Creating Agent...' : 'Create Agent'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contribute Tab */}
              <TabsContent value="contribute" className="space-y-6">
                <Card className="bg-black/50 border-blue-400/50">
                  <CardHeader>
                    <CardTitle className="text-white">Contribute to Agent</CardTitle>
                    <CardDescription className="text-gray-300">
                      Support an agent's fundraising campaign
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-white">Select Agent</Label>
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="w-full p-2 bg-black/50 border border-gray-600 rounded text-white"
                      >
                        <option value="">Select an agent...</option>
                        {inProgressAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.agentName} ({agent.fundingProgress.toFixed(1)}% funded)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-white">Contribution Amount (FLOW)</Label>
                      <Input
                        type="number"
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(parseFloat(e.target.value))}
                        className="bg-black/50 border-gray-600 text-white"
                        min="0.01"
                        step="0.01"
                      />
                    </div>

                    <Button
                      onClick={handleContribute}
                      disabled={loading || !selectedAgentId || contributionAmount <= 0}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      {loading ? 'Contributing...' : `Contribute ${contributionAmount} FLOW`}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trade Tab */}
              <TabsContent value="trade" className="space-y-6">
                <Card className="bg-black/50 border-green-400/50">
                  <CardHeader>
                    <CardTitle className="text-white">🚧 Trading Interface</CardTitle>
                    <CardDescription className="text-gray-300">
                      Trade bonded agent tokens (Coming Soon)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <TrendingUp className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-300">Trading interface will be available once agents are bonded and have liquidity pools.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 