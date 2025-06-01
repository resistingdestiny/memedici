/**
 * AgentLaunchpad Frontend Integration
 * Complete JavaScript integration for AgentLaunchpad contracts on Flow Testnet
 * 
 * Deployed Contracts:
 * - AgentLaunchpadCore: 0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE
 * - AgentLiquidityManager: 0xB4DA9838fAbA1A6195662DFED22f840b52aa4169
 * 
 * Network: Flow Testnet (Chain ID: 545)
 * RPC: https://testnet.evm.nodes.onflow.org
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  NETWORK: {
    name: "Flow Testnet",
    chainId: 545,
    rpcUrl: "https://testnet.evm.nodes.onflow.org",
    blockExplorer: "https://evm-testnet.flowscan.io"
  },
  CONTRACTS: {
    LAUNCHPAD_CORE: "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE",
    LIQUIDITY_MANAGER: "0xB4DA9838fAbA1A6195662DFED22f840b52aa4169"
  }
};

// =============================================================================
// FULL CONTRACT ABIs
// =============================================================================

const LAUNCHPAD_CORE_ABI = [
  // Write Functions
  "function createAgent(string name, string symbol, string agentName, string archetype, string metadataURI, uint256 fundingTarget, uint256 tokenSupply, string agentConfigJSON) external returns (uint256)",
  "function contribute(uint256 agentId) external payable",
  "function bondAgent(uint256 agentId) external",
  
  // Read Functions
  "function getAgentInfo(uint256 agentId) external view returns (string name, string agentName, uint256 fundingTarget, uint256 totalRaised, bool isBonded, address creator, address tokenAddress, address lpPairAddress, string agentConfigJSON)",
  "function getAgentConfigJSON(uint256 agentId) external view returns (string)",
  "function getContribution(uint256 agentId, address contributor) external view returns (uint256)",
  "function getCurrentAgentId() external view returns (uint256)",
  "function isAgentBonded(uint256 agentId) external view returns (bool)",
  "function getLiquidityPool(uint256 agentId) external view returns (address)",
  "function treasuryAddress() external view returns (address)",
  "function protocolFeePercentage() external view returns (uint256)",
  
  // Owner Functions
  "function setTreasuryAddress(address newTreasury) external",
  "function setProtocolFeePercentage(uint256 newFeePercentage) external",
  "function setLiquidityManager(address newLiquidityManager) external",
  "function pause() external",
  "function unpause() external",
  "function owner() external view returns (address)",
  "function paused() external view returns (bool)",
  
  // Events
  "event AgentCreated(uint256 indexed agentId, address indexed creator, address tokenAddress, string agentName, string agentConfigJSON)",
  "event Contributed(uint256 indexed agentId, address indexed contributor, uint256 amount, uint256 totalRaised)",
  "event AgentBonded(uint256 indexed agentId, address indexed tokenAddress, address indexed lpPairAddress, string agentConfigJSON)",
  "event LiquidityPoolCreated(uint256 indexed agentId, address indexed tokenAddress, address indexed lpPairAddress, uint256 ethAmount, uint256 tokenAmount)",
  "event TreasuryAddressUpdated(address indexed oldTreasury, address indexed newTreasury)",
  "event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee)",
  "event LiquidityManagerUpdated(address indexed oldManager, address indexed newManager)",
  
  // Standard Functions
  "function renounceOwnership() external",
  "function transferOwnership(address newOwner) external"
];

const LIQUIDITY_MANAGER_ABI = [
  // Write Functions
  "function createLiquidityPool(uint256 agentId, address tokenAddress, uint256 tokenAmount, string agentConfigJSON) external payable returns (address)",
  
  // Read Functions
  "function getLiquidityPool(uint256 agentId) external view returns (address)",
  "function isAuthorized(address account) external view returns (bool)",
  "function router() external view returns (address)",
  "function factory() external view returns (address)",
  "function weth() external view returns (address)",
  
  // Owner Functions
  "function setAuthorization(address account, bool authorized) external",
  "function setRouter(address newRouter) external",
  "function emergencyWithdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)",
  
  // Events
  "event LiquidityPoolCreated(uint256 indexed agentId, address indexed tokenAddress, address indexed lpPairAddress, uint256 ethAmount, uint256 tokenAmount)",
  "event AuthorizationUpdated(address indexed account, bool authorized)",
  "event RouterUpdated(address indexed oldRouter, address indexed newRouter)",
  "event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed to)",
  
  // Standard Functions
  "function renounceOwnership() external",
  "function transferOwnership(address newOwner) external"
];

// =============================================================================
// AGENTLAUNCHPAD CLASS
// =============================================================================

class AgentLaunchpad {
  constructor(provider, signer = null) {
    this.provider = provider;
    this.signer = signer;
    this.contracts = {};
    this.eventListeners = new Map();
    
    // Initialize contracts
    this._initializeContracts();
  }

  _initializeContracts() {
    // Read-only contracts with provider
    this.contracts.core = new ethers.Contract(
      CONFIG.CONTRACTS.LAUNCHPAD_CORE,
      LAUNCHPAD_CORE_ABI,
      this.provider
    );
    
    this.contracts.liquidityManager = new ethers.Contract(
      CONFIG.CONTRACTS.LIQUIDITY_MANAGER,
      LIQUIDITY_MANAGER_ABI,
      this.provider
    );

    // If signer is available, create write-enabled contracts
    if (this.signer) {
      this.contracts.coreWrite = new ethers.Contract(
        CONFIG.CONTRACTS.LAUNCHPAD_CORE,
        LAUNCHPAD_CORE_ABI,
        this.signer
      );
      
      this.contracts.liquidityManagerWrite = new ethers.Contract(
        CONFIG.CONTRACTS.LIQUIDITY_MANAGER,
        LIQUIDITY_MANAGER_ABI,
        this.signer
      );
    }
  }

  // Connect wallet and enable write operations
  async connectWallet(signer) {
    this.signer = signer;
    this._initializeContracts();
    
    const address = await signer.getAddress();
    const balance = await this.provider.getBalance(address);
    
    return {
      address,
      balance: ethers.formatEther(balance),
      chainId: (await this.provider.getNetwork()).chainId
    };
  }

  // =============================================================================
  // READ FUNCTIONS
  // =============================================================================

  /**
   * Get the total number of agents created
   */
  async getCurrentAgentId() {
    try {
      const agentId = await this.contracts.core.getCurrentAgentId();
      return agentId.toString();
    } catch (error) {
      throw this._handleError("Failed to get current agent ID", error);
    }
  }

  /**
   * Get complete information about an agent
   */
  async getAgentInfo(agentId) {
    try {
      const info = await this.contracts.core.getAgentInfo(agentId);
      
      return {
        name: info[0],
        agentName: info[1],
        fundingTarget: info[2].toString(),
        fundingTargetFormatted: ethers.formatEther(info[2]),
        totalRaised: info[3].toString(),
        totalRaisedFormatted: ethers.formatEther(info[3]),
        isBonded: info[4],
        creator: info[5],
        tokenAddress: info[6],
        lpPairAddress: info[7],
        agentConfigJSON: info[8],
        fundingProgress: this._calculateProgress(info[3], info[2])
      };
    } catch (error) {
      throw this._handleError(`Failed to get agent info for ID ${agentId}`, error);
    }
  }

  /**
   * Get agent configuration JSON
   */
  async getAgentConfigJSON(agentId) {
    try {
      const configJSON = await this.contracts.core.getAgentConfigJSON(agentId);
      return JSON.parse(configJSON);
    } catch (error) {
      throw this._handleError(`Failed to get agent config for ID ${agentId}`, error);
    }
  }

  /**
   * Get user's contribution to an agent
   */
  async getUserContribution(agentId, userAddress) {
    try {
      const contribution = await this.contracts.core.getContribution(agentId, userAddress);
      return {
        amount: contribution.toString(),
        formatted: ethers.formatEther(contribution)
      };
    } catch (error) {
      throw this._handleError(`Failed to get contribution for agent ${agentId}`, error);
    }
  }

  /**
   * Check if an agent is bonded
   */
  async isAgentBonded(agentId) {
    try {
      return await this.contracts.core.isAgentBonded(agentId);
    } catch (error) {
      throw this._handleError(`Failed to check bond status for agent ${agentId}`, error);
    }
  }

  /**
   * Get liquidity pool address for an agent
   */
  async getLiquidityPool(agentId) {
    try {
      return await this.contracts.core.getLiquidityPool(agentId);
    } catch (error) {
      throw this._handleError(`Failed to get LP address for agent ${agentId}`, error);
    }
  }

  /**
   * Get treasury address
   */
  async getTreasuryAddress() {
    try {
      return await this.contracts.core.treasuryAddress();
    } catch (error) {
      throw this._handleError("Failed to get treasury address", error);
    }
  }

  /**
   * Get protocol fee percentage (in basis points)
   */
  async getProtocolFee() {
    try {
      const fee = await this.contracts.core.protocolFeePercentage();
      return {
        basisPoints: fee.toString(),
        percentage: (Number(fee) / 100).toString() + "%"
      };
    } catch (error) {
      throw this._handleError("Failed to get protocol fee", error);
    }
  }

  /**
   * Get all agents with pagination
   */
  async getAllAgents(offset = 0, limit = 10) {
    try {
      const totalAgents = Number(await this.getCurrentAgentId());
      const agents = [];
      
      const start = Math.max(0, offset);
      const end = Math.min(totalAgents, start + limit);
      
      for (let i = start; i < end; i++) {
        try {
          const agentInfo = await this.getAgentInfo(i);
          agents.push({
            id: i,
            ...agentInfo
          });
        } catch (error) {
          console.warn(`Failed to load agent ${i}:`, error.message);
        }
      }
      
      return {
        agents,
        total: totalAgents,
        offset: start,
        limit,
        hasMore: end < totalAgents
      };
    } catch (error) {
      throw this._handleError("Failed to get all agents", error);
    }
  }

  // =============================================================================
  // WRITE FUNCTIONS
  // =============================================================================

  /**
   * Create a new agent
   */
  async createAgent(agentData) {
    if (!this.signer) throw new Error("Wallet not connected");

    try {
      const {
        name,
        symbol,
        agentName,
        archetype,
        metadataURI,
        fundingTarget, // in ETH/FLOW
        tokenSupply, // in tokens
        agentConfigJSON
      } = agentData;

      const fundingTargetWei = ethers.parseEther(fundingTarget.toString());
      const tokenSupplyWei = ethers.parseUnits(tokenSupply.toString(), 18);
      const configString = typeof agentConfigJSON === 'string' 
        ? agentConfigJSON 
        : JSON.stringify(agentConfigJSON);

      // Estimate gas
      const gasEstimate = await this.contracts.coreWrite.createAgent.estimateGas(
        name,
        symbol,
        agentName,
        archetype,
        metadataURI,
        fundingTargetWei,
        tokenSupplyWei,
        configString
      );

      // Send transaction
      const tx = await this.contracts.coreWrite.createAgent(
        name,
        symbol,
        agentName,
        archetype,
        metadataURI,
        fundingTargetWei,
        tokenSupplyWei,
        configString,
        {
          gasLimit: gasEstimate * 110n / 100n // 10% buffer
        }
      );

      const receipt = await tx.wait();
      
      // Parse agent ID from events
      const agentId = this._parseAgentCreatedEvent(receipt);

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        agentId: agentId?.toString(),
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`
      };

    } catch (error) {
      throw this._handleError("Failed to create agent", error);
    }
  }

  /**
   * Contribute to an agent
   */
  async contribute(agentId, amount) {
    if (!this.signer) throw new Error("Wallet not connected");

    try {
      const contributionAmount = ethers.parseEther(amount.toString());

      // Estimate gas
      const gasEstimate = await this.contracts.coreWrite.contribute.estimateGas(
        agentId,
        { value: contributionAmount }
      );

      // Send transaction
      const tx = await this.contracts.coreWrite.contribute(agentId, {
        value: contributionAmount,
        gasLimit: gasEstimate * 110n / 100n
      });

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        amount: amount.toString(),
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`
      };

    } catch (error) {
      throw this._handleError(`Failed to contribute to agent ${agentId}`, error);
    }
  }

  /**
   * Manually bond an agent (if funding target is met)
   */
  async bondAgent(agentId) {
    if (!this.signer) throw new Error("Wallet not connected");

    try {
      // Check if agent can be bonded
      const agentInfo = await this.getAgentInfo(agentId);
      
      if (agentInfo.isBonded) {
        throw new Error("Agent is already bonded");
      }
      
      if (BigInt(agentInfo.totalRaised) < BigInt(agentInfo.fundingTarget)) {
        throw new Error("Funding target not yet met");
      }

      // Estimate gas
      const gasEstimate = await this.contracts.coreWrite.bondAgent.estimateGas(agentId);

      // Send transaction
      const tx = await this.contracts.coreWrite.bondAgent(agentId, {
        gasLimit: gasEstimate * 110n / 100n
      });

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`
      };

    } catch (error) {
      throw this._handleError(`Failed to bond agent ${agentId}`, error);
    }
  }

  // =============================================================================
  // EVENT MONITORING
  // =============================================================================

  /**
   * Listen for AgentCreated events
   */
  onAgentCreated(callback) {
    const filter = this.contracts.core.filters.AgentCreated();
    
    const listener = (agentId, creator, tokenAddress, agentName, agentConfigJSON, event) => {
      callback({
        agentId: agentId.toString(),
        creator,
        tokenAddress,
        agentName,
        agentConfigJSON,
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash
      });
    };

    this.contracts.core.on(filter, listener);
    this.eventListeners.set('AgentCreated', { filter, listener });
    
    return () => this._removeEventListener('AgentCreated');
  }

  /**
   * Listen for Contributed events
   */
  onContributed(callback) {
    const filter = this.contracts.core.filters.Contributed();
    
    const listener = (agentId, contributor, amount, totalRaised, event) => {
      callback({
        agentId: agentId.toString(),
        contributor,
        amount: amount.toString(),
        amountFormatted: ethers.formatEther(amount),
        totalRaised: totalRaised.toString(),
        totalRaisedFormatted: ethers.formatEther(totalRaised),
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash
      });
    };

    this.contracts.core.on(filter, listener);
    this.eventListeners.set('Contributed', { filter, listener });
    
    return () => this._removeEventListener('Contributed');
  }

  /**
   * Listen for AgentBonded events
   */
  onAgentBonded(callback) {
    const filter = this.contracts.core.filters.AgentBonded();
    
    const listener = (agentId, tokenAddress, lpPairAddress, agentConfigJSON, event) => {
      callback({
        agentId: agentId.toString(),
        tokenAddress,
        lpPairAddress,
        agentConfigJSON,
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash
      });
    };

    this.contracts.core.on(filter, listener);
    this.eventListeners.set('AgentBonded', { filter, listener });
    
    return () => this._removeEventListener('AgentBonded');
  }

  /**
   * Listen for LiquidityPoolCreated events
   */
  onLiquidityPoolCreated(callback) {
    const filter = this.contracts.core.filters.LiquidityPoolCreated();
    
    const listener = (agentId, tokenAddress, lpPairAddress, ethAmount, tokenAmount, event) => {
      callback({
        agentId: agentId.toString(),
        tokenAddress,
        lpPairAddress,
        ethAmount: ethAmount.toString(),
        ethAmountFormatted: ethers.formatEther(ethAmount),
        tokenAmount: tokenAmount.toString(),
        tokenAmountFormatted: ethers.formatUnits(tokenAmount, 18),
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash
      });
    };

    this.contracts.core.on(filter, listener);
    this.eventListeners.set('LiquidityPoolCreated', { filter, listener });
    
    return () => this._removeEventListener('LiquidityPoolCreated');
  }

  /**
   * Remove all event listeners
   */
  removeAllEventListeners() {
    for (const [eventName] of this.eventListeners) {
      this._removeEventListener(eventName);
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Get transaction status and details
   */
  async getTransactionStatus(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { status: 'pending', transaction: tx };
      }

      return {
        status: receipt.status === 1 ? 'success' : 'failed',
        transaction: tx,
        receipt,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${txHash}`
      };
    } catch (error) {
      throw this._handleError(`Failed to get transaction status for ${txHash}`, error);
    }
  }

  /**
   * Estimate gas for create agent transaction
   */
  async estimateCreateAgentGas(agentData) {
    if (!this.signer) throw new Error("Wallet not connected");

    try {
      const {
        name, symbol, agentName, archetype, metadataURI,
        fundingTarget, tokenSupply, agentConfigJSON
      } = agentData;

      const fundingTargetWei = ethers.parseEther(fundingTarget.toString());
      const tokenSupplyWei = ethers.parseUnits(tokenSupply.toString(), 18);
      const configString = typeof agentConfigJSON === 'string' 
        ? agentConfigJSON 
        : JSON.stringify(agentConfigJSON);

      const gasEstimate = await this.contracts.coreWrite.createAgent.estimateGas(
        name, symbol, agentName, archetype, metadataURI,
        fundingTargetWei, tokenSupplyWei, configString
      );

      return {
        gasEstimate: gasEstimate.toString(),
        gasEstimateWithBuffer: (gasEstimate * 110n / 100n).toString()
      };
    } catch (error) {
      throw this._handleError("Failed to estimate gas for create agent", error);
    }
  }

  /**
   * Estimate gas for contribution
   */
  async estimateContributeGas(agentId, amount) {
    if (!this.signer) throw new Error("Wallet not connected");

    try {
      const contributionAmount = ethers.parseEther(amount.toString());
      const gasEstimate = await this.contracts.coreWrite.contribute.estimateGas(
        agentId,
        { value: contributionAmount }
      );

      return {
        gasEstimate: gasEstimate.toString(),
        gasEstimateWithBuffer: (gasEstimate * 110n / 100n).toString()
      };
    } catch (error) {
      throw this._handleError(`Failed to estimate gas for contribution to agent ${agentId}`, error);
    }
  }

  /**
   * Format agent data for display
   */
  formatAgentDisplay(agentInfo) {
    const config = typeof agentInfo.agentConfigJSON === 'string'
      ? JSON.parse(agentInfo.agentConfigJSON)
      : agentInfo.agentConfigJSON;

    return {
      id: agentInfo.id,
      name: agentInfo.agentName,
      tokenName: agentInfo.name,
      archetype: config.archetype,
      creator: agentInfo.creator,
      funding: {
        target: agentInfo.fundingTargetFormatted + " FLOW",
        raised: agentInfo.totalRaisedFormatted + " FLOW",
        progress: agentInfo.fundingProgress
      },
      status: {
        isBonded: agentInfo.isBonded,
        hasLP: agentInfo.lpPairAddress !== "0x0000000000000000000000000000000000000000"
      },
      token: {
        address: agentInfo.tokenAddress,
        lpAddress: agentInfo.lpPairAddress
      },
      metadata: {
        avatarUrl: config.avatar_url,
        coreTraits: config.core_traits,
        originStory: config.origin_story,
        influences: config.influences,
        colourPalette: config.colour_palette
      }
    };
  }

  // =============================================================================
  // PRIVATE HELPER FUNCTIONS
  // =============================================================================

  _removeEventListener(eventName) {
    const listener = this.eventListeners.get(eventName);
    if (listener) {
      this.contracts.core.off(listener.filter, listener.listener);
      this.eventListeners.delete(eventName);
    }
  }

  _parseAgentCreatedEvent(receipt) {
    try {
      const agentCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = this.contracts.core.interface.parseLog(log);
          return parsed.name === "AgentCreated";
        } catch {
          return false;
        }
      });

      if (agentCreatedEvent) {
        const parsed = this.contracts.core.interface.parseLog(agentCreatedEvent);
        return parsed.args[0]; // agentId
      }
      return null;
    } catch (error) {
      console.warn("Failed to parse AgentCreated event:", error);
      return null;
    }
  }

  _calculateProgress(raised, target) {
    if (target === 0n) return 0;
    return Math.floor((Number(raised) / Number(target)) * 100);
  }

  _handleError(message, originalError) {
    console.error(message, originalError);
    
    // Extract meaningful error messages
    let errorMessage = message;
    
    if (originalError?.reason) {
      errorMessage += `: ${originalError.reason}`;
    } else if (originalError?.message) {
      errorMessage += `: ${originalError.message}`;
    }

    return new Error(errorMessage);
  }
}

// =============================================================================
// STANDALONE HELPER FUNCTIONS
// =============================================================================

/**
 * Initialize AgentLaunchpad with MetaMask/wallet
 */
async function initializeAgentLaunchpad() {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask or another Web3 wallet.");
  }

  // Request account access
  await window.ethereum.request({ method: 'eth_requestAccounts' });

  // Create provider and signer
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Check network
  const network = await provider.getNetwork();
  if (network.chainId !== CONFIG.NETWORK.chainId) {
    throw new Error(`Please switch to ${CONFIG.NETWORK.name} (Chain ID: ${CONFIG.NETWORK.chainId})`);
  }

  // Create AgentLaunchpad instance
  const agentLaunchpad = new AgentLaunchpad(provider, signer);
  
  // Connect wallet
  const walletInfo = await agentLaunchpad.connectWallet(signer);

  return { agentLaunchpad, walletInfo };
}

/**
 * Switch to Flow Testnet
 */
async function switchToFlowTestnet() {
  if (!window.ethereum) {
    throw new Error("No wallet detected");
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${CONFIG.NETWORK.chainId.toString(16)}` }],
    });
  } catch (switchError) {
    // Chain not added, try to add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${CONFIG.NETWORK.chainId.toString(16)}`,
          chainName: CONFIG.NETWORK.name,
          nativeCurrency: {
            name: 'FLOW',
            symbol: 'FLOW',
            decimals: 18,
          },
          rpcUrls: [CONFIG.NETWORK.rpcUrl],
          blockExplorerUrls: [CONFIG.NETWORK.blockExplorer],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Parse agent configuration from various formats
 */
function parseAgentConfig(config) {
  if (typeof config === 'string') {
    try {
      return JSON.parse(config);
    } catch {
      throw new Error("Invalid JSON configuration");
    }
  }
  return config;
}

/**
 * Validate agent creation data
 */
function validateAgentData(agentData) {
  const required = ['name', 'symbol', 'agentName', 'archetype', 'fundingTarget', 'tokenSupply'];
  const missing = required.filter(field => !agentData[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  if (agentData.fundingTarget <= 0) {
    throw new Error("Funding target must be greater than 0");
  }

  if (agentData.tokenSupply <= 0) {
    throw new Error("Token supply must be greater than 0");
  }

  return true;
}

// =============================================================================
// EXPORTS
// =============================================================================

// For ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AgentLaunchpad,
    CONFIG,
    LAUNCHPAD_CORE_ABI,
    LIQUIDITY_MANAGER_ABI,
    initializeAgentLaunchpad,
    switchToFlowTestnet,
    parseAgentConfig,
    validateAgentData
  };
}

// For browser global
if (typeof window !== 'undefined') {
  window.AgentLaunchpad = {
    AgentLaunchpad,
    CONFIG,
    LAUNCHPAD_CORE_ABI,
    LIQUIDITY_MANAGER_ABI,
    initializeAgentLaunchpad,
    switchToFlowTestnet,
    parseAgentConfig,
    validateAgentData
  };
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*

// BASIC SETUP
const { agentLaunchpad, walletInfo } = await initializeAgentLaunchpad();
console.log("Connected wallet:", walletInfo);

// CREATE AGENT
const agentData = {
  name: "MyAgent Token",
  symbol: "MAT",
  agentName: "MyAgent",
  archetype: "digital artist",
  metadataURI: "ipfs://QmYourMetadataHash",
  fundingTarget: 5, // 5 FLOW
  tokenSupply: 1000000, // 1M tokens
  agentConfigJSON: {
    display_name: "MyAgent",
    archetype: "digital artist",
    core_traits: ["creative", "innovative"],
    origin_story: "Born from imagination...",
    // ... more config
  }
};

const result = await agentLaunchpad.createAgent(agentData);
console.log("Agent created:", result);

// CONTRIBUTE TO AGENT
const contribution = await agentLaunchpad.contribute(0, 1); // 1 FLOW to agent 0
console.log("Contribution successful:", contribution);

// READ AGENT INFO
const agentInfo = await agentLaunchpad.getAgentInfo(0);
console.log("Agent info:", agentInfo);

// LISTEN FOR EVENTS
const unsubscribe = agentLaunchpad.onAgentCreated((event) => {
  console.log("New agent created:", event);
});

// BOND AGENT (when funding target is met)
const bondResult = await agentLaunchpad.bondAgent(0);
console.log("Agent bonded:", bondResult);

// GET ALL AGENTS
const allAgents = await agentLaunchpad.getAllAgents(0, 10);
console.log("All agents:", allAgents);

*/ 