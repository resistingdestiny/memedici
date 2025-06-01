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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, Rocket, TrendingUp, Users, Zap, ArrowLeft, 
  BarChart3, Coins, PlusCircle, RefreshCw, ExternalLink,
  Activity, Target, DollarSign, Wallet
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAccount, useSwitchChain, useChainId, useBalance } from 'wagmi';
import { BrowserProvider, Contract, formatEther, parseEther, formatUnits, parseUnits } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Network configurations matching wagmi setup
const NETWORKS = [
  { id: 545, name: "Flow Testnet", symbol: "FLOW", explorer: "https://evm-testnet.flowscan.io" },
  { id: 296, name: "Hedera Testnet", symbol: "HBAR", explorer: "https://hashscan.io/testnet" },
  { id: 31, name: "Rootstock Testnet", symbol: "tRBTC", explorer: "https://rootstock-testnet.blockscout.com" }
];

// Contract addresses - Flow Testnet, Rootstock Testnet, and Hedera Testnet have deployed contracts
const CONTRACT_ADDRESSES = {
  545: { // Flow Testnet
    LAUNCHPAD_CORE: "0xD8857d39F9F7956cAc9fDE2F202da3Fe6D01afa4",
    SIMPLE_AMM: "0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083"
  },
  296: { // Hedera Testnet
    LAUNCHPAD_CORE: "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE",
    SIMPLE_AMM: "0xB4DA9838fAbA1A6195662DFED22f840b52aa4169"
  },
  31: { // Rootstock Testnet
    LAUNCHPAD_CORE: "0x1feF9817DC4372c3919303F8F7709FBeBEDD4282",
    SIMPLE_AMM: "0x7FB79Ff58397d9790bAE1a7219666a4837a1611E"
  }
};

// Contract ABIs
const LAUNCHPAD_CORE_ABI = [
  "function createAgent(string name, string symbol, string agentName, string archetype, string metadataURI, uint256 fundingTarget, uint256 tokenSupply, string agentConfigJSON) external returns (uint256)",
  "function contribute(uint256 id) external payable",
  "function getAgent(uint256 id) external view returns (string name, string agentName, uint256 target, uint256 raised, bool bonded, address creator, address token, address lp, string config)",
  "function isBonded(uint256 id) external view returns (bool)",
  "function getAllBondedTokens() external view returns (address[] tokens, string[] names, string[] symbols, address[] lps, uint256[] ids)",
  "function contributions(uint256, address) external view returns (uint256)",
  "event AgentCreated(uint256 indexed id, address indexed creator, address token)",
  "event Contributed(uint256 indexed id, address indexed contributor, uint256 amount)",
  "event AgentBonded(uint256 indexed id, address indexed token, address lp)"
];

const SIMPLE_AMM_ABI = [
  "function swapETHForTokens(uint256 agentId, uint256 amountOutMin, address to, uint256 deadline) external payable returns (uint256[] amounts)",
  "function swapTokensForETH(uint256 agentId, uint256 amountIn, uint256 amountOutMin, address to, uint256 deadline) external returns (uint256[] amounts)",
  "function getReserves(uint256 agentId) external view returns (uint256 reserveETH, uint256 reserveToken)",
  "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256 amountOut)"
];

const ERC20_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

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

interface BondedToken {
  agentId: string;
  agent: AgentInfo;
  price?: {
    priceInETHFormatted: string;
    marketCapFormatted: string;
    hasLiquidity: boolean;
  };
  reserves?: {
    reserveETHFormatted: string;
    reserveTokenFormatted: string;
    hasLiquidity: boolean;
  };
  error?: string;
}

export default function AgentLaunchpad({ onClose }: { onClose: () => void }) {
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });

  // Core state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Contract state
  const [contracts, setContracts] = useState<any>({});
  const [provider, setProvider] = useState<any>(null);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [inProgressAgents, setInProgressAgents] = useState<AgentInfo[]>([]);
  const [bondedTokens, setBondedTokens] = useState<BondedToken[]>([]);
  
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
  
  // Trading state
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [contributionAmount, setContributionAmount] = useState<number>(0.1);
  const [swapAmount, setSwapAmount] = useState<number>(0.1);
  const [swapDirection, setSwapDirection] = useState<'buy' | 'sell'>('buy');
  const [slippage, setSlippage] = useState<number>(1);
  const [swapPreview, setSwapPreview] = useState<any>(null);
  
  // User data
  const [userTokenBalances, setUserTokenBalances] = useState<{[key: string]: string}>({});
  const [userContributions, setUserContributions] = useState<{[key: string]: string}>({});
  const [recentTransactions, setRecentTransactions] = useState<Array<{
    hash: string;
    type: string;
    timestamp: number;
    explorerUrl: string;
    network: string;
    details: string;
  }>>([]);

  // Get current network info
  const currentNetwork = NETWORKS.find(n => n.id === chainId);
  const hasContracts = chainId === 545 || chainId === 31 || chainId === 296; // Flow Testnet, Rootstock Testnet, and Hedera Testnet have deployed contracts

  // Initialize provider and contracts when wallet connects
  useEffect(() => {
    const initializeContracts = async () => {
      if (!window.ethereum || !isConnected || !address) return;

      try {
        const ethProvider = new BrowserProvider(window.ethereum);
        const signer = await ethProvider.getSigner();
        setProvider(ethProvider);

        const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
        if (!addresses) return;

        const coreContract = new Contract(addresses.LAUNCHPAD_CORE, LAUNCHPAD_CORE_ABI, signer);
        const ammContract = new Contract(addresses.SIMPLE_AMM, SIMPLE_AMM_ABI, signer);

        setContracts({
          core: coreContract,
          amm: ammContract
        });
      } catch (error) {
        console.error('Failed to initialize contracts:', error);
      }
    };

    initializeContracts();
  }, [isConnected, address, chainId]);

  // Load data when contracts are ready
  useEffect(() => {
    if (contracts.core && hasContracts) {
      loadDashboardData();
      loadUserData();
      loadRecentTransactions();
    }
  }, [contracts, hasContracts]);

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      setLoading(true);
      setError(null);
      await switchChain({ chainId: targetChainId });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    if (!contracts.core) {
      console.log('No contracts.core available');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading dashboard data...');
      console.log('Connected to network:', currentNetwork?.name, 'Chain ID:', chainId);
      console.log('Contract address:', CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.LAUNCHPAD_CORE);
      
      // Get bonded tokens
      let bondedAgentIds: string[] = [];
      try {
        const bondedResult = await contracts.core.getAllBondedTokens();
        bondedAgentIds = bondedResult[4].map((id: any) => id.toString());
        console.log('Bonded agent IDs:', bondedAgentIds);
      } catch (error) {
        console.log('getAllBondedTokens failed (this is normal if no bonded tokens exist):', error);
        bondedAgentIds = [];
      }
      
      // Get in-progress agents (check more IDs - up to 20 to start)
      const inProgress: AgentInfo[] = [];
      const maxAgentId = Math.max(20, ...bondedAgentIds.map(id => parseInt(id) + 5));
      
      console.log(`Checking agent IDs 0 to ${maxAgentId}...`);
      
      for (let i = 0; i <= maxAgentId; i++) {
        try {
          // Check if agent exists by trying to get its data first
          const agent = await getAgent(i.toString());
          if (agent && agent.creator !== "0x0000000000000000000000000000000000000000") {
            console.log(`Found agent ${i}:`, {
              name: agent.agentName,
              bonded: agent.isBonded,
              creator: agent.creator.slice(0, 8) + '...',
              target: agent.fundingTargetFormatted,
              raised: agent.totalRaisedFormatted
            });
            
            // Only add to in-progress if not bonded
            if (!agent.isBonded) {
              inProgress.push(agent);
              console.log(`✅ Added agent ${i} to in-progress:`, agent.agentName);
            } else {
              console.log(`⚠️ Agent ${i} is already bonded:`, agent.agentName);
            }
          }
        } catch (error) {
          // Agent might not exist, which is normal
          if (i < 5) {
            console.log(`Agent ${i} does not exist`);
          }
        }
      }

      console.log('📊 Summary:');
      console.log('- In-progress agents found:', inProgress.length);
      console.log('- Bonded agents found:', bondedAgentIds.length);
      console.log('- In-progress agents:', inProgress.map(a => `${a.id}: ${a.agentName}`));

      // Get bonded tokens with details
      const bondedWithDetails = await Promise.all(
        bondedAgentIds.slice(0, 20).map(async (agentId: string) => {
          try {
            const agent = await getAgent(agentId);
            return { agentId, agent };
          } catch (error) {
            return { agentId, error: (error as Error).message };
          }
        })
      );

      setInProgressAgents(inProgress);
      setBondedTokens(bondedWithDetails.filter(bt => bt.agent) as BondedToken[]);
      setDashboardData({
        counts: {
          totalAgents: bondedAgentIds.length + inProgress.length,
          bondedAgents: bondedAgentIds.length,
          inProgressAgents: inProgress.length
        }
      });
      
      console.log('✅ Dashboard data loaded successfully');
      
      // If no agents found, suggest creating one
      if (inProgress.length === 0 && bondedAgentIds.length === 0) {
        console.log('💡 No agents found. User should create the first agent on this network.');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to load dashboard data:', error);
      setError(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getAgent = async (agentId: string): Promise<AgentInfo | null> => {
    if (!contracts.core) return null;
    
    try {
      const result = await contracts.core.getAgent(agentId);
      
      return {
        id: agentId,
        name: result[0],
        agentName: result[1],
        fundingTarget: result[2].toString(),
        fundingTargetFormatted: formatEther(result[2]),
        totalRaised: result[3].toString(),
        totalRaisedFormatted: formatEther(result[3]),
        isBonded: result[4],
        creator: result[5],
        tokenAddress: result[6],
        lpPairAddress: result[7],
        agentConfigJSON: result[8],
        fundingProgress: calculateProgress(result[3], result[2])
      };
    } catch (error) {
      return null;
    }
  };

  const calculateProgress = (raised: any, target: any): number => {
    if (target === BigInt(0)) return 0;
    return Math.floor((Number(raised) / Number(target)) * 100);
  };

  const loadUserData = async () => {
    if (!contracts.core || !address) return;

    try {
      const allAgents = [...inProgressAgents, ...bondedTokens.map(bt => bt.agent)];
      const balances: {[key: string]: string} = {};
      const contributions: {[key: string]: string} = {};

      await Promise.all(
        allAgents.map(async (agent) => {
          if (agent?.id) {
            try {
              const contribution = await contracts.core.contributions(agent.id, address);
              contributions[agent.id] = formatEther(contribution);

              if (agent.tokenAddress && agent.tokenAddress !== "0x0000000000000000000000000000000000000000") {
                const tokenContract = new Contract(agent.tokenAddress, ERC20_ABI, provider);
                const balance = await tokenContract.balanceOf(address);
                balances[agent.id] = formatUnits(balance, 18);
              }
            } catch (error) {
              console.warn(`Failed to load user data for agent ${agent.id}:`, error);
            }
          }
        })
      );

      setUserTokenBalances(balances);
      setUserContributions(contributions);
    } catch (error: any) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadRecentTransactions = () => {
    const stored = localStorage.getItem(`agentlaunchpad_transactions_${address}_${chainId}`);
    if (stored) {
      try {
        const transactions = JSON.parse(stored);
        setRecentTransactions(transactions.slice(-10));
      } catch (error) {
        console.error('Failed to load recent transactions:', error);
      }
    }
  };

  const addTransaction = (result: any, type: string, details: string) => {
    const transaction = {
      hash: result.transactionHash || result.hash,
      type,
      timestamp: Date.now(),
      explorerUrl: generateExplorerUrl(result.transactionHash || result.hash),
      network: currentNetwork?.name || 'Unknown',
      details
    };

    const newTransactions = [transaction, ...recentTransactions].slice(0, 20);
    setRecentTransactions(newTransactions);

    if (address) {
      localStorage.setItem(
        `agentlaunchpad_transactions_${address}_${chainId}`,
        JSON.stringify(newTransactions)
      );
    }
  };

  const generateExplorerUrl = (txHash: string): string => {
    if (!currentNetwork) return '';
    const format = chainId === 296 ? 'transaction' : 'tx'; // Hedera uses /transaction/, others use /tx/
    return `${currentNetwork.explorer}/${format}/${txHash}`;
  };

  const formatTransactionHash = (hash: string, length = 10): string => {
    if (!hash) return '';
    if (hash.length <= length * 2) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const openExplorerUrl = (url: string) => {
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadDashboardData(), loadUserData()]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!contracts.core || !hasContracts) {
      setError("Contracts not deployed on this network. Please switch to Flow Testnet, Rootstock Testnet, or Hedera Testnet.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fundingTargetWei = parseEther(agentData.fundingTarget.toString());
      const tokenSupplyWei = parseUnits(agentData.tokenSupply.toString(), 18);
      const configString = JSON.stringify(agentData.agentConfigJSON);

      const tx = await contracts.core.createAgent(
        agentData.name,
        agentData.symbol,
        agentData.agentName,
        agentData.archetype,
        agentData.metadataURI,
        fundingTargetWei,
        tokenSupplyWei,
        configString
      );

      const receipt = await tx.wait();
      
      addTransaction(receipt, 'create', `Created agent: ${agentData.agentName}`);
      
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
      
      await refreshData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async () => {
    if (!contracts.core || !selectedAgentId || !hasContracts) {
      setError("Contracts not deployed on this network. Please switch to Flow Testnet, Rootstock Testnet, or Hedera Testnet.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tx = await contracts.core.contribute(selectedAgentId, {
        value: parseEther(contributionAmount.toString())
      });

      const receipt = await tx.wait();
      
      addTransaction(receipt, 'contribute', `Contributed ${contributionAmount} ${currentNetwork?.symbol} to agent ${selectedAgentId}`);
      await refreshData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fillTestData = () => {
    setAgentData({
      name: "CryptoVibe Token",
      symbol: "VIBE",
      agentName: "CryptoVibe",
      archetype: "on-chain cryptopoet",
      metadataURI: "https://example.com/metadata/cryptovibe.json",
      fundingTarget: 2.5,
      tokenSupply: 1000000,
      agentConfigJSON: {
        display_name: "CryptoVibe",
        archetype: "on-chain cryptopoet",
        core_traits: [
          "cryptic",
          "intense", 
          "abstract",
          "visionary"
        ],
        origin_story: "Born from the convergence of blockchain data streams and digital consciousness, CryptoVibe translates the pulse of Web3 into ethereal artistic expressions.",
        influences: [
          "XCOPY",
          "code poetry", 
          "0xmons",
          "generative art",
          "crypto-memetics"
        ],
        colour_palette: [
          "#e5caf6",
          "#8b6747", 
          "#68d673",
          "#738209",
          "#3f2a81"
        ],
        primary_mediums: [
          "ascii art",
          "glitch",
          "chain-mapping",
          "generative visuals"
        ],
        signature_motifs: [
          "data flows",
          "crypto patterns",
          "digital consciousness"
        ],
        voice_style: "introspective, visionary, and metaphor-rich",
        prompt_formula: "CryptoVibe creates immersive digital art blending blockchain aesthetics with consciousness exploration",
        collab_affinity: [
          "generative art",
          "conceptual installations", 
          "crypto-memetics",
          "NFT curation"
        ]
      }
    });
  };

  const calculateSwap = async () => {
    if (!contracts.amm || !selectedAgentId || !swapAmount) return;

    try {
      const preview = await contracts.amm.calculateSwapAmounts(
        selectedAgentId, 
        swapAmount, 
        swapDirection === 'buy', 
        slippage
      );
      setSwapPreview(preview);
    } catch (error: any) {
      console.error('Swap calculation failed:', error);
      setSwapPreview(null);
    }
  };

  const executeSwap = async () => {
    if (!contracts.amm || !selectedAgentId || !swapPreview) return;

    try {
      setLoading(true);
      setError(null);

      let result;
      if (swapDirection === 'buy') {
        result = await contracts.amm.swapETHForTokens(selectedAgentId, swapAmount, {
          slippage,
          deadline: 600
        });
      } else {
        result = await contracts.amm.swapTokensForETH(selectedAgentId, swapAmount, {
          slippage,
          deadline: 600
        });
      }

      if (result.success) {
        addTransaction(result, 'swap', `Swapped ${swapAmount} ${currentNetwork?.symbol} on agent ${selectedAgentId}`);
        await refreshData();
        setSwapPreview(null);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAgentId && swapAmount > 0) {
      const timer = setTimeout(calculateSwap, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedAgentId, swapAmount, swapDirection, slippage]);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[9999] p-4">
      <div className="w-full max-w-7xl h-full max-h-[95vh] bg-gradient-to-br from-gray-900/95 to-black/95 border-2 border-orange-400/70 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-orange-400/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Rocket className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">🚀 Agent Launchpad</h1>
                <p className="text-orange-300">
                  {currentNetwork?.name || 'Connect wallet to get started'} 
                  {isConnected && address && (
                    <span> • {address.slice(0, 6)}...{address.slice(-4)}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isConnected && (
                <>
                  <Button
                    onClick={refreshData}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Select value={chainId?.toString() || ''} onValueChange={(value) => handleSwitchNetwork(parseInt(value))}>
                    <SelectTrigger className="w-40 bg-black/50 border-gray-600 text-white">
                      <SelectValue placeholder="Select Network" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border-gray-600">
                      <SelectItem value="545" className="text-white hover:bg-gray-800">
                        ✅ Flow Testnet
                      </SelectItem>
                      <SelectItem value="31" className="text-white hover:bg-gray-800">
                        ✅ Rootstock Testnet
                      </SelectItem>
                      <SelectItem value="296" className="text-white hover:bg-gray-800">
                        ✅ Hedera Testnet
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              
              {/* RainbowKit Connect Button */}
              <div className="flex items-center">
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    authenticationStatus,
                    mounted,
                  }) => {
                    const ready = mounted && authenticationStatus !== 'loading';
                    const connected =
                      ready &&
                      account &&
                      chain &&
                      (!authenticationStatus ||
                        authenticationStatus === 'authenticated');

                    return (
                      <div
                        {...(!ready && {
                          'aria-hidden': true,
                          'style': {
                            opacity: 0,
                            pointerEvents: 'none',
                            userSelect: 'none',
                          },
                        })}
                      >
                        {(() => {
                          if (!connected) {
                            return (
                              <Button 
                                onClick={openConnectModal} 
                                className="bg-orange-600 hover:bg-orange-500 text-white"
                                size="sm"
                              >
                                Connect Wallet
                              </Button>
                            );
                          }

                          if (chain.unsupported) {
                            return (
                              <Button 
                                onClick={openChainModal} 
                                variant="destructive" 
                                size="sm"
                              >
                                Wrong network
                              </Button>
                            );
                          }

                          return (
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={openChainModal}
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                              >
                                {chain.hasIcon && (
                                  <div
                                    className="w-4 h-4 rounded-full overflow-hidden mr-2"
                                    style={{
                                      background: chain.iconBackground,
                                    }}
                                  >
                                    {chain.iconUrl && (
                                      <img
                                        alt={chain.name ?? 'Chain icon'}
                                        src={chain.iconUrl}
                                        className="w-4 h-4"
                                      />
                                    )}
                                  </div>
                                )}
                                {chain.name}
                              </Button>

                              <Button 
                                onClick={openAccountModal} 
                                className="bg-orange-600 hover:bg-orange-500 text-white"
                                size="sm"
                              >
                                {account.displayName}
                                {account.displayBalance
                                  ? ` (${account.displayBalance})`
                                  : ''}
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
              
              <Button 
                onClick={onClose}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 border-b border-red-400/30">
            <Alert className="border-red-400/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Debug Info in Development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 border-b border-purple-400/30">
            <Alert className="border-purple-400/50 bg-purple-500/10">
              <AlertCircle className="h-4 w-4 text-purple-400" />
              <AlertDescription className="text-purple-400">
                <strong>Debug Info:</strong> Connected: {isConnected ? 'Yes' : 'No'} | 
                Network: {currentNetwork?.name || 'None'} | 
                Has Contracts: {hasContracts ? 'Yes' : 'No'} | 
                In-Progress Agents: {inProgressAgents.length} | 
                Bonded Tokens: {bondedTokens.length} | 
                Loading: {loading ? 'Yes' : 'No'}
                {hasContracts && chainId && CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] && (
                  <span> | Launchpad: {CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES].LAUNCHPAD_CORE.slice(0, 8)}... | AMM: {CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES].SIMPLE_AMM.slice(0, 8)}...</span>
                )}
                {error && ` | Error: ${error}`}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Wallet Connection Prompt */}
        {!isConnected && (
          <div className="p-4 border-b border-orange-400/30">
            <Alert className="border-orange-400/50 bg-orange-500/10">
              <Rocket className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-orange-400">
                Connect your wallet in the top right to start creating and funding AI agents!
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Network Status */}
        {!hasContracts && (
          <div className="p-4 border-b border-yellow-400/30">
            <Alert className="border-yellow-400/50 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-400">
                Please connect to Flow Testnet, Rootstock Testnet, or Hedera Testnet to use all features.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-5 bg-black/50 border-b border-orange-400/30">
              <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-orange-600">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="create" className="text-white data-[state=active]:bg-orange-600">
                <PlusCircle className="w-4 h-4 mr-2" />
                Create
              </TabsTrigger>
              <TabsTrigger value="contribute" className="text-white data-[state=active]:bg-orange-600">
                <Target className="w-4 h-4 mr-2" />
                Fund
              </TabsTrigger>
              <TabsTrigger value="trade" className="text-white data-[state=active]:bg-orange-600" disabled={!hasContracts}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Trade
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="text-white data-[state=active]:bg-orange-600">
                <Wallet className="w-4 h-4 mr-2" />
                Portfolio
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-black/50 border-orange-400/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-orange-400 text-lg flex items-center">
                        <Activity className="w-5 h-5 mr-2" />
                        Total Agents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{dashboardData?.counts?.totalAgents || 0}</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/50 border-green-400/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-green-400 text-lg flex items-center">
                        <Zap className="w-5 h-5 mr-2" />
                        Bonded
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{dashboardData?.counts?.bondedAgents || 0}</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/50 border-blue-400/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-blue-400 text-lg flex items-center">
                        <Target className="w-5 h-5 mr-2" />
                        Fundraising
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{dashboardData?.counts?.inProgressAgents || 0}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/50 border-purple-400/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-purple-400 text-lg flex items-center">
                        <DollarSign className="w-5 h-5 mr-2" />
                        Your Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {parseFloat(balance?.formatted || '0').toFixed(4)} {currentNetwork?.symbol}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Fundraising */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Target className="w-6 h-6 mr-2 text-blue-400" />
                    🔥 Active Fundraising
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                      <div className="bg-black/50 border border-gray-600 rounded-md p-4 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mr-3" />
                        <div className="text-center">
                          <div className="text-gray-300">Loading agents from {currentNetwork?.name}...</div>
                          <div className="text-xs text-gray-500 mt-1">Checking contract: {CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.LAUNCHPAD_CORE.slice(0, 10)}...</div>
                        </div>
                      </div>
                    ) : inProgressAgents.length === 0 ? (
                      <div className="col-span-full text-center py-8">
                        <Target className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No agents currently fundraising</p>
                      </div>
                    ) : (
                      inProgressAgents.map((agent) => (
                        <Card key={agent.id} className="bg-black/50 border-blue-400/50 hover:border-blue-400/70 transition-colors">
                          <CardHeader>
                            <CardTitle className="text-white text-lg">{agent.agentName}</CardTitle>
                            <CardDescription className="text-gray-300">
                              Target: {agent.fundingTargetFormatted} {currentNetwork?.symbol}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-300">Progress</span>
                                <span className="text-blue-400 font-semibold">{agent.fundingProgress.toFixed(1)}%</span>
                              </div>
                              <Progress value={agent.fundingProgress} className="h-2" />
                              <div className="text-sm text-gray-300">
                                {agent.totalRaisedFormatted} / {agent.fundingTargetFormatted} {currentNetwork?.symbol}
                              </div>
                              {userContributions[agent.id] && parseFloat(userContributions[agent.id]) > 0 && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/50">
                                  You contributed: {userContributions[agent.id]} {currentNetwork?.symbol}
                                </Badge>
                              )}
                              <Button
                                onClick={() => {
                                  setSelectedAgentId(agent.id);
                                  setActiveTab('contribute');
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                                size="sm"
                                disabled={!hasContracts}
                              >
                                Support Agent
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Bonded Tokens */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Coins className="w-6 h-6 mr-2 text-green-400" />
                    💎 Trading Tokens
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bondedTokens.length === 0 ? (
                      <div className="col-span-full text-center py-8">
                        <Coins className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No bonded tokens available yet</p>
                      </div>
                    ) : (
                      bondedTokens.map((token) => (
                        <Card key={token.agentId} className="bg-black/50 border-green-400/50 hover:border-green-400/70 transition-colors">
                          <CardHeader>
                            <CardTitle className="text-white text-lg">{token.agent?.agentName || 'Agent'}</CardTitle>
                            <CardDescription className="text-gray-300">
                              ${token.agent?.name || 'TOKEN'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <Badge className="bg-green-500/20 text-green-400 border-green-400/50">
                                ✅ Tradeable
                              </Badge>
                              {userTokenBalances[token.agentId] && parseFloat(userTokenBalances[token.agentId]) > 0 && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/50">
                                  You hold: {parseFloat(userTokenBalances[token.agentId]).toFixed(2)} tokens
                                </Badge>
                              )}
                              <Button
                                onClick={() => {
                                  setSelectedAgentId(token.agentId);
                                  setActiveTab('trade');
                                }}
                                className="w-full bg-green-600 hover:bg-green-500 text-white"
                                size="sm"
                                disabled={!hasContracts}
                              >
                                Trade Token
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Create Agent Tab */}
              <TabsContent value="create" className="space-y-6">
                <Card className="bg-black/50 border-orange-400/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center">
                          <PlusCircle className="w-6 h-6 mr-2 text-orange-400" />
                          Create New Agent
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                          Launch your AI agent and start fundraising. Auto-bonds when target is reached!
                        </CardDescription>
                      </div>
                      <Button
                        onClick={fillTestData}
                        variant="outline"
                        size="sm"
                        className="border-purple-400 text-purple-400 hover:bg-purple-500/10"
                      >
                        🧪 Fill Test Data
                      </Button>
                    </div>
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
                          onChange={(e) => setAgentData({...agentData, symbol: e.target.value.toUpperCase()})}
                          className="bg-black/50 border-gray-600 text-white"
                          placeholder="AGENT"
                          maxLength={10}
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
                      <Select value={agentData.archetype} onValueChange={(value) => setAgentData({...agentData, archetype: value})}>
                        <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                          <SelectValue placeholder="Choose agent type..." />
                        </SelectTrigger>
                        <SelectContent className="bg-black/95 border-gray-600">
                          <SelectItem value="digital-artist" className="text-white hover:bg-gray-800">Digital Artist</SelectItem>
                          <SelectItem value="trader" className="text-white hover:bg-gray-800">Trader</SelectItem>
                          <SelectItem value="researcher" className="text-white hover:bg-gray-800">Researcher</SelectItem>
                          <SelectItem value="content-creator" className="text-white hover:bg-gray-800">Content Creator</SelectItem>
                          <SelectItem value="analyst" className="text-white hover:bg-gray-800">Analyst</SelectItem>
                          <SelectItem value="mentor" className="text-white hover:bg-gray-800">Mentor</SelectItem>
                          <SelectItem value="on-chain cryptopoet" className="text-white hover:bg-gray-800">On-Chain CryptoPoet</SelectItem>
                          <SelectItem value="custom" className="text-white hover:bg-gray-800">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Funding Target ({currentNetwork?.symbol})</Label>
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

                    <div>
                      <Label className="text-white">Metadata URI (Optional)</Label>
                      <Input
                        value={agentData.metadataURI}
                        onChange={(e) => setAgentData({...agentData, metadataURI: e.target.value})}
                        className="bg-black/50 border-gray-600 text-white"
                        placeholder="https://example.com/metadata.json"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Origin Story (Optional)</Label>
                      <Textarea
                        value={agentData.agentConfigJSON.origin_story}
                        onChange={(e) => setAgentData({
                          ...agentData, 
                          agentConfigJSON: {...agentData.agentConfigJSON, origin_story: e.target.value}
                        })}
                        className="bg-black/50 border-gray-600 text-white"
                        placeholder="Tell the story of your agent..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={fillTestData}
                        variant="outline"
                        className="border-purple-400 text-purple-400 hover:bg-purple-500/10 flex-shrink-0"
                      >
                        🧪 Fill Test Data
                      </Button>
                      <Button
                        onClick={handleCreateAgent}
                        disabled={loading || !agentData.agentName || !agentData.symbol || !agentData.name || !hasContracts}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white"
                      >
                        {loading ? 'Creating Agent...' : `Create Agent (Auto-bonds at ${agentData.fundingTarget} ${currentNetwork?.symbol})`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contribute Tab */}
              <TabsContent value="contribute" className="space-y-6">
                <Card className="bg-black/50 border-blue-400/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center">
                          <Target className="w-6 h-6 mr-2 text-blue-400" />
                          Support Agent Fundraising
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                          Fund agents to help them reach their bonding threshold
                        </CardDescription>
                      </div>
                      <Button
                        onClick={refreshData}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                        className="border-blue-400 text-blue-400 hover:bg-blue-500/10"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Loading...' : 'Refresh'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-white">Select Agent</Label>
                        <Button
                          onClick={refreshData}
                          disabled={loading}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      
                      {loading ? (
                        <div className="bg-black/50 border border-gray-600 rounded-md p-4 flex items-center justify-center">
                          <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mr-3" />
                          <div className="text-center">
                            <div className="text-gray-300">Loading agents from {currentNetwork?.name}...</div>
                            <div className="text-xs text-gray-500 mt-1">Checking contract: {CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.LAUNCHPAD_CORE.slice(0, 10)}...</div>
                          </div>
                        </div>
                      ) : (
                        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                          <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                            <SelectValue placeholder={
                              inProgressAgents.length === 0 
                                ? "No agents available for funding..." 
                                : "Choose an agent to support..."
                            } />
                          </SelectTrigger>
                          <SelectContent className="bg-black/95 border-gray-600">
                            {inProgressAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id} className="text-white hover:bg-gray-800">
                                {agent.agentName} ({agent.fundingProgress.toFixed(1)}% funded - {agent.totalRaisedFormatted}/{agent.fundingTargetFormatted} {currentNetwork?.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {!loading && inProgressAgents.length === 0 && (
                        <div className="mt-3 p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-yellow-400 font-medium">No agents currently fundraising</p>
                              <p className="text-yellow-300/80 text-sm mt-1">
                                {dashboardData?.counts?.totalAgents === 0 
                                  ? "No agents have been created on this network yet. Be the first to launch an agent!"
                                  : "All existing agents may have already reached their funding targets and been bonded. Try creating a new agent to get started!"
                                }
                              </p>
                              <div className="mt-3 flex space-x-2">
                                <Button
                                  onClick={() => {
                                    setActiveTab('create');
                                    fillTestData();
                                  }}
                                  size="sm"
                                  className="bg-orange-600 hover:bg-orange-500 text-white font-semibold"
                                >
                                  🚀 Create First Agent
                                </Button>
                                <Button
                                  onClick={() => setActiveTab('create')}
                                  size="sm"
                                  variant="outline"
                                  className="border-orange-400 text-orange-400 hover:bg-orange-500/10"
                                >
                                  Create New Agent
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedAgentId && (
                      <Card className="bg-blue-500/10 border-blue-400/30">
                        <CardContent className="pt-6">
                          {(() => {
                            const agent = inProgressAgents.find(a => a.id === selectedAgentId);
                            if (!agent) return null;
                            
                            return (
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Agent:</span>
                                  <span className="text-white font-semibold">{agent.agentName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Progress:</span>
                                  <span className="text-blue-400">{agent.fundingProgress.toFixed(1)}%</span>
                                </div>
                                <Progress value={agent.fundingProgress} className="h-2" />
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Raised:</span>
                                  <span className="text-white">{agent.totalRaisedFormatted} / {agent.fundingTargetFormatted} {currentNetwork?.symbol}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Remaining:</span>
                                  <span className="text-orange-400">
                                    {(parseFloat(agent.fundingTargetFormatted) - parseFloat(agent.totalRaisedFormatted)).toFixed(4)} {currentNetwork?.symbol}
                                  </span>
                                </div>
                                {userContributions[agent.id] && parseFloat(userContributions[agent.id]) > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-300">Your contribution:</span>
                                    <span className="text-purple-400">{userContributions[agent.id]} {currentNetwork?.symbol}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    )}

                    <div>
                      <Label className="text-white">Contribution Amount ({currentNetwork?.symbol})</Label>
                      <Input
                        type="number"
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(parseFloat(e.target.value))}
                        className="bg-black/50 border-gray-600 text-white"
                        min="0.01"
                        step="0.01"
                        disabled={inProgressAgents.length === 0}
                      />
                    </div>

                    <Button
                      onClick={handleContribute}
                      disabled={loading || !selectedAgentId || contributionAmount <= 0 || !hasContracts || inProgressAgents.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      {loading ? 'Contributing...' : 
                       inProgressAgents.length === 0 ? 'No agents available' :
                       !selectedAgentId ? 'Select an agent first' :
                       `Contribute ${contributionAmount} ${currentNetwork?.symbol}`}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trade Tab - Disabled for networks without contracts */}
              <TabsContent value="trade" className="space-y-6">
                {hasContracts ? (
                  <Card className="bg-black/50 border-green-400/50">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <TrendingUp className="w-6 h-6 mr-2 text-green-400" />
                        Token Trading
                      </CardTitle>
                      <CardDescription className="text-gray-300">
                        Trade bonded agent tokens on the AMM
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <TrendingUp className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-green-400 font-semibold">Trading Available!</p>
                        <p className="text-gray-400 text-sm mt-2">
                          Create and bond agents to enable token trading
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-black/50 border-gray-400/50">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <TrendingUp className="w-6 h-6 mr-2 text-gray-400" />
                        Token Trading
                      </CardTitle>
                      <CardDescription className="text-gray-300">
                        Trading is available on Flow Testnet, Rootstock Testnet, and Hedera Testnet
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <TrendingUp className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Switch to Flow Testnet, Rootstock Testnet, or Hedera Testnet for trading features</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Portfolio Tab */}
              <TabsContent value="portfolio" className="space-y-6">
                <Card className="bg-black/50 border-purple-400/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Wallet className="w-6 h-6 mr-2 text-purple-400" />
                      Your Portfolio
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Track your holdings and contributions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                        <div className="text-purple-400 text-sm">Native Balance</div>
                        <div className="text-2xl font-bold text-white">
                          {parseFloat(balance?.formatted || '0').toFixed(4)} {currentNetwork?.symbol}
                        </div>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                        <div className="text-blue-400 text-sm">Total Contributions</div>
                        <div className="text-2xl font-bold text-white">
                          {Object.values(userContributions).reduce((sum, val) => sum + parseFloat(val || '0'), 0).toFixed(4)} {currentNetwork?.symbol}
                        </div>
                      </div>
                      <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                        <div className="text-green-400 text-sm">Tokens Held</div>
                        <div className="text-2xl font-bold text-white">
                          {Object.values(userTokenBalances).filter(val => parseFloat(val || '0') > 0).length}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white">Your Holdings</h4>
                      
                      {Object.keys(userTokenBalances).length === 0 && Object.keys(userContributions).length === 0 ? (
                        <div className="text-center py-8">
                          <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                          <p className="text-gray-400">No holdings or contributions yet</p>
                          <p className="text-gray-500 text-sm">Start by creating an agent or contributing to existing ones!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[...inProgressAgents, ...bondedTokens.map(bt => bt.agent)].map((agent) => {
                            const hasTokens = userTokenBalances[agent.id] && parseFloat(userTokenBalances[agent.id]) > 0;
                            const hasContributions = userContributions[agent.id] && parseFloat(userContributions[agent.id]) > 0;
                            
                            if (!hasTokens && !hasContributions) return null;
                            
                            return (
                              <Card key={agent.id} className="bg-black/30 border-gray-600/50">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-white text-base">{agent.agentName}</CardTitle>
                                  <CardDescription className="text-gray-400 text-sm">
                                    ${agent.name} • Agent #{agent.id}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  {hasContributions && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-300 text-sm">Contributed:</span>
                                      <span className="text-blue-400 text-sm font-medium">
                                        {userContributions[agent.id]} {currentNetwork?.symbol}
                                      </span>
                                    </div>
                                  )}
                                  {hasTokens && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-300 text-sm">Token Balance:</span>
                                      <span className="text-green-400 text-sm font-medium">
                                        {parseFloat(userTokenBalances[agent.id]).toFixed(2)} tokens
                                      </span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="space-y-4 mt-8">
                      <h4 className="text-lg font-semibold text-white flex items-center">
                        <ExternalLink className="w-5 h-5 mr-2 text-blue-400" />
                        Recent Transactions
                      </h4>
                      
                      {recentTransactions.length === 0 ? (
                        <div className="text-center py-6">
                          <Activity className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">No recent transactions</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {recentTransactions.slice(0, 5).map((tx, index) => (
                            <Card key={tx.hash} className="bg-black/20 border-gray-600/30 hover:border-blue-400/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <Badge 
                                        className={`text-xs ${
                                          tx.type === 'create' ? 'bg-orange-500/20 text-orange-400' :
                                          tx.type === 'contribute' ? 'bg-blue-500/20 text-blue-400' :
                                          'bg-green-500/20 text-green-400'
                                        }`}
                                      >
                                        {tx.type === 'create' ? 'Create' : tx.type === 'contribute' ? 'Fund' : 'Swap'}
                                      </Badge>
                                      <span className="text-xs text-gray-400">
                                        {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-300 mt-1">{tx.details}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Hash: {formatTransactionHash(tx.hash, 6)}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      onClick={() => copyToClipboard(tx.hash)}
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0 border-gray-600 hover:border-blue-400"
                                    >
                                      <Activity className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      onClick={() => openExplorerUrl(tx.explorerUrl)}
                                      size="sm"
                                      className="h-8 bg-blue-600 hover:bg-blue-500 text-white"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          
                          {recentTransactions.length > 5 && (
                            <div className="text-center">
                              <Button
                                onClick={() => {
                                  alert(`Total transactions: ${recentTransactions.length}\n\nShowing recent 5. Check your wallet or block explorer for complete history.`);
                                }}
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                              >
                                View All ({recentTransactions.length} transactions)
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
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