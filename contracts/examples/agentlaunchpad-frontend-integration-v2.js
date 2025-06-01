/**
 * AgentLaunchpad Frontend Integration V2
 * Complete JavaScript integration for enhanced AgentLaunchpad contracts on Flow Testnet
 * 
 * Deployed Contracts:
 * - AgentLaunchpadCoreV2: [TO BE DEPLOYED]
 * - SimpleAMM: [TO BE DEPLOYED]
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
    LAUNCHPAD_CORE: "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE", // Original V1 contract (working)
    SIMPLE_AMM: "0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083" // ✅ Successfully deployed
  }
};

// =============================================================================
// FULL CONTRACT ABIs
// =============================================================================

const LAUNCHPAD_CORE_V2_ABI = [
  // Write Functions
  "function createAgent(string name, string symbol, string agentName, string archetype, string metadataURI, uint256 fundingTarget, uint256 tokenSupply, string agentConfigJSON) external returns (uint256)",
  "function contribute(uint256 agentId) external payable",
  "function bondAgent(uint256 agentId) external",
  
  // Enhanced Read Functions
  "function getAgentInfo(uint256 agentId) external view returns (string name, string agentName, uint256 fundingTarget, uint256 totalRaised, bool isBonded, address creator, address tokenAddress, address lpPairAddress, string agentConfigJSON)",
  "function getAgentConfigJSON(uint256 agentId) external view returns (string)",
  "function getContribution(uint256 agentId, address contributor) external view returns (uint256)",
  "function getCurrentAgentId() external view returns (uint256)",
  "function isAgentBonded(uint256 agentId) external view returns (bool)",
  "function getLiquidityPool(uint256 agentId) external view returns (address)",
  "function treasuryAddress() external view returns (address)",
  "function protocolFeePercentage() external view returns (uint256)",
  
  // NEW: Bonded Tokens Functions
  "function getAllBondedTokens() external view returns (address[] tokenAddresses, string[] names, string[] symbols, address[] lpPairs, uint256[] agentIds)",
  "function getBondedTokensPaginated(uint256 offset, uint256 limit) external view returns (address[] tokenAddresses, string[] names, string[] symbols, address[] lpPairs, uint256[] agentIds, uint256 totalCount)",
  
  // NEW: In-Progress Agents Functions
  "function getInProgressAgents() external view returns (uint256[] agentIds, string[] agentNames, uint256[] fundingTargets, uint256[] totalRaised, uint256[] fundingProgress, address[] tokenAddresses)",
  "function getInProgressAgentsPaginated(uint256 offset, uint256 limit) external view returns (uint256[] agentIds, string[] agentNames, uint256[] fundingTargets, uint256[] totalRaised, uint256[] fundingProgress, address[] tokenAddresses, uint256 totalCount)",
  
  // NEW: Enhanced Query Functions
  "function getAgentsByCreator(address creator) external view returns (uint256[])",
  "function getAgentByTokenAddress(address tokenAddress) external view returns (uint256)",
  "function getTotalCounts() external view returns (uint256 totalAgents, uint256 bondedAgents, uint256 inProgressAgents)",
  "function getAgentsByTimeRange(uint256 startTime, uint256 endTime, bool onlyBonded) external view returns (uint256[] matchingAgentIds)",
  
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

const SIMPLE_AMM_ABI = [
  // Write Functions
  "function createLiquidityPool(uint256 agentId, address tokenAddress, uint256 tokenAmount, string agentConfigJSON) external payable returns (address)",
  "function addLiquidity(uint256 agentId, uint256 tokenAmountDesired, uint256 tokenAmountMin, uint256 ethAmountMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
  "function swapETHForTokens(uint256 agentId, uint256 amountOutMin, address to, uint256 deadline) external payable returns (uint256[] amounts)",
  "function swapTokensForETH(uint256 agentId, uint256 amountIn, uint256 amountOutMin, address to, uint256 deadline) external returns (uint256[] amounts)",
  
  // Read Functions
  "function getLiquidityPool(uint256 agentId) external view returns (address)",
  "function isAuthorized(address account) external view returns (bool)",
  "function getAllPairs() external view returns (address[])",
  "function allPairsLength() external view returns (uint256)",
  "function getReserves(uint256 agentId) external view returns (uint256 reserveETH, uint256 reserveToken)",
  "function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) external pure returns (uint256 amountB)",
  "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256 amountOut)",
  "function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256 amountIn)",
  
  // Owner Functions
  "function setAuthorization(address account, bool authorized) external",
  "function emergencyWithdraw(address to, uint256 amount) external",
  "function emergencyTokenWithdraw(address token, address to, uint256 amount) external",
  "function owner() external view returns (address)",
  
  // Events
  "event LiquidityPoolCreated(uint256 indexed agentId, address indexed tokenAddress, address indexed lpPairAddress, uint256 ethAmount, uint256 tokenAmount)",
  "event AuthorizationUpdated(address indexed account, bool authorized)",
  "event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed to)",
  
  // Standard Functions
  "function renounceOwnership() external",
  "function transferOwnership(address newOwner) external"
];

// =============================================================================
// ENHANCED AGENTLAUNCHPAD CLASS
// =============================================================================

class AgentLaunchpadV2 {
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
      LAUNCHPAD_CORE_V2_ABI,
      this.provider
    );
    
    this.contracts.amm = new ethers.Contract(
      CONFIG.CONTRACTS.SIMPLE_AMM,
      SIMPLE_AMM_ABI,
      this.provider
    );

    // If signer is available, create write-enabled contracts
    if (this.signer) {
      this.contracts.coreWrite = new ethers.Contract(
        CONFIG.CONTRACTS.LAUNCHPAD_CORE,
        LAUNCHPAD_CORE_V2_ABI,
        this.signer
      );
      
      this.contracts.ammWrite = new ethers.Contract(
        CONFIG.CONTRACTS.SIMPLE_AMM,
        SIMPLE_AMM_ABI,
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
  // ENHANCED READ FUNCTIONS
  // =============================================================================

  /**
   * Get all bonded tokens with their details
   */
  async getAllBondedTokens() {
    try {
      const result = await this.contracts.core.getAllBondedTokens();
      
      return {
        tokenAddresses: result[0],
        names: result[1],
        symbols: result[2],
        lpPairs: result[3],
        agentIds: result[4].map(id => id.toString()),
        count: result[0].length
      };
    } catch (error) {
      throw this._handleError("Failed to get all bonded tokens", error);
    }
  }

  /**
   * Get bonded tokens with pagination
   */
  async getBondedTokensPaginated(offset = 0, limit = 10) {
    try {
      const result = await this.contracts.core.getBondedTokensPaginated(offset, limit);
      
      return {
        tokenAddresses: result[0],
        names: result[1],
        symbols: result[2],
        lpPairs: result[3],
        agentIds: result[4].map(id => id.toString()),
        totalCount: parseInt(result[5].toString()),
        offset,
        limit,
        hasMore: offset + limit < parseInt(result[5].toString())
      };
    } catch (error) {
      throw this._handleError("Failed to get bonded tokens paginated", error);
    }
  }

  /**
   * Get all in-progress agents (not yet bonded)
   */
  async getInProgressAgents() {
    try {
      const result = await this.contracts.core.getInProgressAgents();
      
      return {
        agentIds: result[0].map(id => id.toString()),
        agentNames: result[1],
        fundingTargets: result[2].map(target => target.toString()),
        fundingTargetsFormatted: result[2].map(target => ethers.formatEther(target)),
        totalRaised: result[3].map(raised => raised.toString()),
        totalRaisedFormatted: result[3].map(raised => ethers.formatEther(raised)),
        fundingProgress: result[4].map(progress => parseInt(progress.toString()) / 100), // Convert from basis points to percentage
        tokenAddresses: result[5],
        count: result[0].length
      };
    } catch (error) {
      throw this._handleError("Failed to get in-progress agents", error);
    }
  }

  /**
   * Get in-progress agents with pagination
   */
  async getInProgressAgentsPaginated(offset = 0, limit = 10) {
    try {
      const result = await this.contracts.core.getInProgressAgentsPaginated(offset, limit);
      
      return {
        agentIds: result[0].map(id => id.toString()),
        agentNames: result[1],
        fundingTargets: result[2].map(target => target.toString()),
        fundingTargetsFormatted: result[2].map(target => ethers.formatEther(target)),
        totalRaised: result[3].map(raised => raised.toString()),
        totalRaisedFormatted: result[3].map(raised => ethers.formatEther(raised)),
        fundingProgress: result[4].map(progress => parseInt(progress.toString()) / 100),
        tokenAddresses: result[5],
        totalCount: parseInt(result[6].toString()),
        offset,
        limit,
        hasMore: offset + limit < parseInt(result[6].toString())
      };
    } catch (error) {
      throw this._handleError("Failed to get in-progress agents paginated", error);
    }
  }

  /**
   * Get agents created by a specific creator
   */
  async getAgentsByCreator(creatorAddress) {
    try {
      const agentIds = await this.contracts.core.getAgentsByCreator(creatorAddress);
      return agentIds.map(id => id.toString());
    } catch (error) {
      throw this._handleError(`Failed to get agents by creator ${creatorAddress}`, error);
    }
  }

  /**
   * Get agent ID by token address
   */
  async getAgentByTokenAddress(tokenAddress) {
    try {
      const agentId = await this.contracts.core.getAgentByTokenAddress(tokenAddress);
      return agentId.toString();
    } catch (error) {
      throw this._handleError(`Failed to get agent by token address ${tokenAddress}`, error);
    }
  }

  /**
   * Get total counts of all agent types
   */
  async getTotalCounts() {
    try {
      const result = await this.contracts.core.getTotalCounts();
      
      return {
        totalAgents: parseInt(result[0].toString()),
        bondedAgents: parseInt(result[1].toString()),
        inProgressAgents: parseInt(result[2].toString())
      };
    } catch (error) {
      throw this._handleError("Failed to get total counts", error);
    }
  }

  /**
   * Get agents created/bonded within a time range
   */
  async getAgentsByTimeRange(startTime, endTime, onlyBonded = false) {
    try {
      const agentIds = await this.contracts.core.getAgentsByTimeRange(startTime, endTime, onlyBonded);
      return agentIds.map(id => id.toString());
    } catch (error) {
      throw this._handleError("Failed to get agents by time range", error);
    }
  }

  // =============================================================================
  // AMM FUNCTIONS
  // =============================================================================

  /**
   * Get reserves for an agent's liquidity pool
   */
  async getPoolReserves(agentId) {
    try {
      const result = await this.contracts.amm.getReserves(agentId);
      
      return {
        reserveETH: result[0].toString(),
        reserveETHFormatted: ethers.formatEther(result[0]),
        reserveToken: result[1].toString(),
        reserveTokenFormatted: ethers.formatUnits(result[1], 18)
      };
    } catch (error) {
      throw this._handleError(`Failed to get pool reserves for agent ${agentId}`, error);
    }
  }

  /**
   * Get quote for adding liquidity
   */
  async getAddLiquidityQuote(amountA, reserveA, reserveB) {
    try {
      const quote = await this.contracts.amm.quote(
        ethers.parseEther(amountA.toString()),
        ethers.parseEther(reserveA.toString()),
        ethers.parseEther(reserveB.toString())
      );
      
      return {
        quote: quote.toString(),
        quoteFormatted: ethers.formatEther(quote)
      };
    } catch (error) {
      throw this._handleError("Failed to get add liquidity quote", error);
    }
  }

  /**
   * Get amount out for a swap
   */
  async getSwapAmountOut(amountIn, reserveIn, reserveOut) {
    try {
      const amountOut = await this.contracts.amm.getAmountOut(
        ethers.parseEther(amountIn.toString()),
        ethers.parseEther(reserveIn.toString()),
        ethers.parseEther(reserveOut.toString())
      );
      
      return {
        amountOut: amountOut.toString(),
        amountOutFormatted: ethers.formatEther(amountOut)
      };
    } catch (error) {
      throw this._handleError("Failed to get swap amount out", error);
    }
  }

  /**
   * Get amount in for a desired amount out
   */
  async getSwapAmountIn(amountOut, reserveIn, reserveOut) {
    try {
      const amountIn = await this.contracts.amm.getAmountIn(
        ethers.parseEther(amountOut.toString()),
        ethers.parseEther(reserveIn.toString()),
        ethers.parseEther(reserveOut.toString())
      );
      
      return {
        amountIn: amountIn.toString(),
        amountInFormatted: ethers.formatEther(amountIn)
      };
    } catch (error) {
      throw this._handleError("Failed to get swap amount in", error);
    }
  }

  /**
   * Get all liquidity pairs
   */
  async getAllPairs() {
    try {
      const pairs = await this.contracts.amm.getAllPairs();
      const pairCount = await this.contracts.amm.allPairsLength();
      
      return {
        pairs,
        count: parseInt(pairCount.toString())
      };
    } catch (error) {
      throw this._handleError("Failed to get all pairs", error);
    }
  }

  // =============================================================================
  // AMM WRITE FUNCTIONS
  // =============================================================================

  /**
   * Add liquidity to an existing pool
   */
  async addLiquidity(agentId, tokenAmount, ethAmount, slippage = 1, deadline = 300) {
    if (!this.signer) throw new Error("Wallet not connected");

    try {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
      const tokenAmountDesired = ethers.parseUnits(tokenAmount.toString(), 18);
      const ethAmountWei = ethers.parseEther(ethAmount.toString());
      
      // Calculate minimum amounts with slippage
      const tokenAmountMin = tokenAmountDesired * BigInt(100 - slippage) / 100n;
      const ethAmountMin = ethAmountWei * BigInt(100 - slippage) / 100n;

      // Estimate gas
      const gasEstimate = await this.contracts.ammWrite.addLiquidity.estimateGas(
        agentId,
        tokenAmountDesired,
        tokenAmountMin,
        ethAmountMin,
        await this.signer.getAddress(),
        deadlineTimestamp,
        { value: ethAmountWei }
      );

      // Send transaction
      const tx = await this.contracts.ammWrite.addLiquidity(
        agentId,
        tokenAmountDesired,
        tokenAmountMin,
        ethAmountMin,
        await this.signer.getAddress(),
        deadlineTimestamp,
        {
          value: ethAmountWei,
          gasLimit: gasEstimate * 110n / 100n
        }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`
      };

    } catch (error) {
      throw this._handleError(`Failed to add liquidity for agent ${agentId}`, error);
    }
  }

  /**
   * Swap ETH for tokens
   */
  async swapETHForTokens(agentId, ethAmount, slippage = 1, deadline = 300) {
    if (!this.signer) throw new Error("Wallet not connected");

    try {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
      const ethAmountWei = ethers.parseEther(ethAmount.toString());
      
      // Get expected amount out
      const reserves = await this.getPoolReserves(agentId);
      const expectedOut = await this.getSwapAmountOut(
        ethAmount,
        reserves.reserveETHFormatted,
        reserves.reserveTokenFormatted
      );
      
      // Calculate minimum amount out with slippage
      const amountOutMin = ethers.parseEther(expectedOut.amountOutFormatted) * BigInt(100 - slippage) / 100n;

      // Estimate gas
      const gasEstimate = await this.contracts.ammWrite.swapETHForTokens.estimateGas(
        agentId,
        amountOutMin,
        await this.signer.getAddress(),
        deadlineTimestamp,
        { value: ethAmountWei }
      );

      // Send transaction
      const tx = await this.contracts.ammWrite.swapETHForTokens(
        agentId,
        amountOutMin,
        await this.signer.getAddress(),
        deadlineTimestamp,
        {
          value: ethAmountWei,
          gasLimit: gasEstimate * 110n / 100n
        }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        expectedAmountOut: expectedOut.amountOutFormatted,
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`
      };

    } catch (error) {
      throw this._handleError(`Failed to swap ETH for tokens for agent ${agentId}`, error);
    }
  }

  /**
   * Swap tokens for ETH
   */
  async swapTokensForETH(agentId, tokenAmount, slippage = 1, deadline = 300) {
    if (!this.signer) throw new Error("Wallet not connected");

    try {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
      const tokenAmountWei = ethers.parseUnits(tokenAmount.toString(), 18);
      
      // Get expected amount out
      const reserves = await this.getPoolReserves(agentId);
      const expectedOut = await this.getSwapAmountOut(
        tokenAmount,
        reserves.reserveTokenFormatted,
        reserves.reserveETHFormatted
      );
      
      // Calculate minimum amount out with slippage
      const amountOutMin = ethers.parseEther(expectedOut.amountOutFormatted) * BigInt(100 - slippage) / 100n;

      // Estimate gas
      const gasEstimate = await this.contracts.ammWrite.swapTokensForETH.estimateGas(
        agentId,
        tokenAmountWei,
        amountOutMin,
        await this.signer.getAddress(),
        deadlineTimestamp
      );

      // Send transaction
      const tx = await this.contracts.ammWrite.swapTokensForETH(
        agentId,
        tokenAmountWei,
        amountOutMin,
        await this.signer.getAddress(),
        deadlineTimestamp,
        {
          gasLimit: gasEstimate * 110n / 100n
        }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        expectedAmountOut: expectedOut.amountOutFormatted,
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`
      };

    } catch (error) {
      throw this._handleError(`Failed to swap tokens for ETH for agent ${agentId}`, error);
    }
  }

  // =============================================================================
  // INHERITED FUNCTIONS FROM V1 (with some enhancements)
  // =============================================================================

  async getCurrentAgentId() {
    try {
      const agentId = await this.contracts.core.getCurrentAgentId();
      return agentId.toString();
    } catch (error) {
      throw this._handleError("Failed to get current agent ID", error);
    }
  }

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

  async createAgent(agentData) {
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

      // Estimate gas
      const gasEstimate = await this.contracts.coreWrite.createAgent.estimateGas(
        name, symbol, agentName, archetype, metadataURI,
        fundingTargetWei, tokenSupplyWei, configString
      );

      // Send transaction
      const tx = await this.contracts.coreWrite.createAgent(
        name, symbol, agentName, archetype, metadataURI,
        fundingTargetWei, tokenSupplyWei, configString,
        { gasLimit: gasEstimate * 110n / 100n }
      );

      const receipt = await tx.wait();
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

  async contribute(agentId, amount) {
    if (!this.signer) throw new Error("Wallet not connected");

    try {
      const contributionAmount = ethers.parseEther(amount.toString());

      const gasEstimate = await this.contracts.coreWrite.contribute.estimateGas(
        agentId,
        { value: contributionAmount }
      );

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

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData() {
    try {
      const [
        totalCounts,
        bondedTokens,
        inProgressAgents,
        allPairs
      ] = await Promise.all([
        this.getTotalCounts(),
        this.getBondedTokensPaginated(0, 10),
        this.getInProgressAgentsPaginated(0, 10),
        this.getAllPairs()
      ]);

      return {
        counts: totalCounts,
        recentBondedTokens: bondedTokens,
        activeAgents: inProgressAgents,
        liquidityPools: allPairs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw this._handleError("Failed to get dashboard data", error);
    }
  }

  /**
   * Get agent trading data (if bonded)
   */
  async getAgentTradingData(agentId) {
    try {
      const agentInfo = await this.getAgentInfo(agentId);
      
      if (!agentInfo.isBonded) {
        return { isBonded: false };
      }

      const reserves = await this.getPoolReserves(agentId);
      
      return {
        isBonded: true,
        agentInfo,
        reserves,
        lpAddress: agentInfo.lpPairAddress,
        tokenAddress: agentInfo.tokenAddress
      };
    } catch (error) {
      throw this._handleError(`Failed to get trading data for agent ${agentId}`, error);
    }
  }

  // =============================================================================
  // PRIVATE HELPER FUNCTIONS
  // =============================================================================

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
        return parsed.args[0];
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

async function initializeAgentLaunchpadV2() {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask or another Web3 wallet.");
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const network = await provider.getNetwork();
  if (network.chainId !== CONFIG.NETWORK.chainId) {
    throw new Error(`Please switch to ${CONFIG.NETWORK.name} (Chain ID: ${CONFIG.NETWORK.chainId})`);
  }

  const agentLaunchpad = new AgentLaunchpadV2(provider, signer);
  const walletInfo = await agentLaunchpad.connectWallet(signer);

  return { agentLaunchpad, walletInfo };
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AgentLaunchpadV2,
    CONFIG,
    LAUNCHPAD_CORE_V2_ABI,
    SIMPLE_AMM_ABI,
    initializeAgentLaunchpadV2
  };
}

if (typeof window !== 'undefined') {
  window.AgentLaunchpadV2 = {
    AgentLaunchpadV2,
    CONFIG,
    LAUNCHPAD_CORE_V2_ABI,
    SIMPLE_AMM_ABI,
    initializeAgentLaunchpadV2
  };
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*

// INITIALIZE V2
const { agentLaunchpad, walletInfo } = await initializeAgentLaunchpadV2();

// GET ALL BONDED TOKENS
const bondedTokens = await agentLaunchpad.getAllBondedTokens();
console.log("Bonded tokens:", bondedTokens);

// GET IN-PROGRESS AGENTS
const inProgressAgents = await agentLaunchpad.getInProgressAgents();
console.log("In-progress agents:", inProgressAgents);

// GET DASHBOARD DATA
const dashboardData = await agentLaunchpad.getDashboardData();
console.log("Dashboard:", dashboardData);

// SWAP ETH FOR TOKENS
const swapResult = await agentLaunchpad.swapETHForTokens(
  0,      // agentId
  1,      // 1 ETH
  1,      // 1% slippage
  300     // 5 min deadline
);

// ADD LIQUIDITY
const liquidityResult = await agentLaunchpad.addLiquidity(
  0,      // agentId
  1000,   // 1000 tokens
  1,      // 1 ETH
  1       // 1% slippage
);

// GET POOL RESERVES
const reserves = await agentLaunchpad.getPoolReserves(0);
console.log("Pool reserves:", reserves);

*/ 