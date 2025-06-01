/**
 * AgentLaunchpad Frontend Integration V2 Ultra
 * Complete JavaScript integration for enhanced AgentLaunchpad contracts on Flow Testnet
 * 
 * Deployed Contracts:
 * - AgentLaunchpadCoreV2Ultra: 0xD8857d39F9F7956cAc9fDE2F202da3Fe6D01afa4 (✅ WORKING!)
 * - SimpleAMM: 0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083 (✅ WORKING!)
 * 
 * Features:
 * - Automatic bonding when funding target is reached
 * - Enhanced V2 tracking and analytics
 * - Full AMM trading with price calculations
 * - LP token management and pricing
 * - Multi-wallet support (MetaMask, WalletConnect, Rainbow Kit, etc.)
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
    LAUNCHPAD_CORE: "0xD8857d39F9F7956cAc9fDE2F202da3Fe6D01afa4", // ✅ V2 Ultra contract (WORKING!)
    SIMPLE_AMM: "0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083" // ✅ Successfully deployed V2 AMM
  }
};

// =============================================================================
// FULL CONTRACT ABIs
// =============================================================================

// V2 Ultra ABI (Currently deployed and working)
const LAUNCHPAD_CORE_V2_ULTRA_ABI = [
  // Write Functions
  "function createAgent(string name, string symbol, string agentName, string archetype, string metadataURI, uint256 fundingTarget, uint256 tokenSupply, string agentConfigJSON) external returns (uint256)",
  "function contribute(uint256 id) external payable",
  
  // V2 Enhanced Read Functions
  "function getAllBondedTokens() external view returns (address[] tokens, string[] names, string[] symbols, address[] lps, uint256[] ids)",
  "function getAgent(uint256 id) external view returns (string name, string agentName, uint256 target, uint256 raised, bool bonded, address creator, address token, address lp, string config)",
  "function getAgentByToken(address token) external view returns (uint256)",
  "function isBonded(uint256 id) external view returns (bool)",
  "function getLp(uint256 id) external view returns (address)",
  
  // Public Variables
  "function agents(uint256) external view returns (string name, string symbol, string agentName, uint256 fundingTarget, uint256 tokenSupply, address creator, bool isBonded, uint256 totalRaised, address tokenAddress, address lpPairAddress, string agentConfigJSON, uint256 createdAt, uint256 bondedAt)",
  "function contributions(uint256, address) external view returns (uint256)",
  "function bondedIds(uint256) external view returns (uint256)",
  "function inProgressIds(uint256) external view returns (uint256)",
  "function tokenToAgent(address) external view returns (uint256)",
  "function treasury() external view returns (address)",
  "function amm() external view returns (address)",
  "function fee() external view returns (uint256)",
  "function lpPercent() external view returns (uint256)",
  "function tokenLpPercent() external view returns (uint256)",
  
  // Admin Functions
  "function setAmm(address _amm) external",
  "function setTreasury(address _treasury) external",
  "function setFee(uint256 _fee) external",
  "function withdraw() external",
  "function owner() external view returns (address)",
  
  // Events
  "event AgentCreated(uint256 indexed id, address indexed creator, address token)",
  "event Contributed(uint256 indexed id, address indexed contributor, uint256 amount)",
  "event AgentBonded(uint256 indexed id, address indexed token, address lp)"
];

const SIMPLE_AMM_ABI = [
  // Write Functions
  "function createLiquidityPool(uint256 agentId, address tokenAddress, uint256 tokenAmount, string agentConfigJSON) external payable returns (address)",
  "function addLiquidity(uint256 agentId, uint256 tokenAmountDesired, uint256 tokenAmountMin, uint256 ethAmountMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
  "function removeLiquidity(uint256 agentId, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountETH)",
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
  "function getAmountsOut(uint256 amountIn, address[] path) external view returns (uint256[] amounts)",
  "function getAmountsIn(uint256 amountOut, address[] path) external view returns (uint256[] amounts)",
  
  // Owner Functions
  "function setAuthorization(address account, bool authorized) external",
  "function emergencyWithdraw(address to, uint256 amount) external",
  "function emergencyTokenWithdraw(address token, address to, uint256 amount) external",
  "function owner() external view returns (address)",
  
  // Events
  "event LiquidityPoolCreated(uint256 indexed agentId, address indexed tokenAddress, address indexed lpPairAddress, uint256 ethAmount, uint256 tokenAmount)",
  "event AuthorizationUpdated(address indexed account, bool authorized)",
  "event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed to)"
];

// ERC20 ABI for token interactions
const ERC20_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

// =============================================================================
// ENHANCED AGENTLAUNCHPAD CLASS (V2 ULTRA)
// =============================================================================

class AgentLaunchpadV2Ultra {
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
      LAUNCHPAD_CORE_V2_ULTRA_ABI,
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
        LAUNCHPAD_CORE_V2_ULTRA_ABI,
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
  // V2 ULTRA CORE FUNCTIONS
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
   * Get comprehensive agent information
   */
  async getAgent(agentId) {
    try {
      const result = await this.contracts.core.getAgent(agentId);
      
      return {
        name: result[0],
        agentName: result[1],
        fundingTarget: result[2].toString(),
        fundingTargetFormatted: ethers.formatEther(result[2]),
        totalRaised: result[3].toString(),
        totalRaisedFormatted: ethers.formatEther(result[3]),
        isBonded: result[4],
        creator: result[5],
        tokenAddress: result[6],
        lpPairAddress: result[7],
        agentConfigJSON: result[8],
        fundingProgress: this._calculateProgress(result[3], result[2])
      };
    } catch (error) {
      throw this._handleError(`Failed to get agent info for ID ${agentId}`, error);
    }
  }

  /**
   * Get agent ID by token address
   */
  async getAgentByToken(tokenAddress) {
    try {
      const agentId = await this.contracts.core.getAgentByToken(tokenAddress);
      return agentId.toString();
    } catch (error) {
      throw this._handleError(`Failed to get agent by token address ${tokenAddress}`, error);
    }
  }

  /**
   * Check if agent is bonded
   */
  async isAgentBonded(agentId) {
    try {
      return await this.contracts.core.isBonded(agentId);
    } catch (error) {
      throw this._handleError(`Failed to check if agent ${agentId} is bonded`, error);
    }
  }

  /**
   * Get comprehensive counts (calculated from arrays)
   */
  async getTotalCounts() {
    try {
      // Get bonded tokens count
      const bondedTokens = await this.getAllBondedTokens();
      
      // Calculate in-progress by iterating through possible agent IDs
      let totalAgents = 0;
      let inProgressCount = 0;
      
      // Find the highest agent ID by checking bonded tokens
      if (bondedTokens.agentIds.length > 0) {
        const maxBondedId = Math.max(...bondedTokens.agentIds.map(id => parseInt(id)));
        totalAgents = maxBondedId + 1; // Assuming sequential IDs
        
        // Count in-progress agents
        for (let i = 0; i < totalAgents; i++) {
          try {
            const isBonded = await this.isAgentBonded(i);
            if (!isBonded) {
              // Verify agent exists by checking if it has a creator
              try {
                const agent = await this.getAgent(i);
                if (agent.creator !== ethers.ZeroAddress) {
                  inProgressCount++;
                }
              } catch {
                // Agent doesn't exist, don't count
              }
            }
          } catch {
            // Agent doesn't exist or error, skip
          }
        }
      }
      
      return {
        totalAgents,
        bondedAgents: bondedTokens.count,
        inProgressAgents: inProgressCount
      };
    } catch (error) {
      throw this._handleError("Failed to get total counts", error);
    }
  }

  // =============================================================================
  // ENHANCED AMM FUNCTIONS WITH PRICING
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
        reserveTokenFormatted: ethers.formatUnits(result[1], 18),
        hasLiquidity: result[0] > 0n && result[1] > 0n
      };
    } catch (error) {
      throw this._handleError(`Failed to get pool reserves for agent ${agentId}`, error);
    }
  }

  /**
   * Calculate token price in ETH
   */
  async getTokenPrice(agentId) {
    try {
      const reserves = await this.getPoolReserves(agentId);
      
      if (!reserves.hasLiquidity) {
        return {
          priceInETH: "0",
          priceInETHFormatted: "0",
          priceInUSD: "0", // Would need ETH/USD oracle
          marketCap: "0",
          hasLiquidity: false
        };
      }

      // Price = ETH Reserve / Token Reserve
      const priceInETH = (BigInt(reserves.reserveETH) * ethers.parseEther("1")) / BigInt(reserves.reserveToken);
      
      // Get token total supply for market cap calculation
      const agent = await this.getAgent(agentId);
      const tokenContract = new ethers.Contract(agent.tokenAddress, ERC20_ABI, this.provider);
      const totalSupply = await tokenContract.totalSupply();
      
      // Market cap = price * total supply
      const marketCapWei = (priceInETH * totalSupply) / ethers.parseEther("1");
      
      return {
        priceInETH: priceInETH.toString(),
        priceInETHFormatted: ethers.formatEther(priceInETH),
        marketCap: marketCapWei.toString(),
        marketCapFormatted: ethers.formatEther(marketCapWei),
        totalSupply: totalSupply.toString(),
        totalSupplyFormatted: ethers.formatUnits(totalSupply, 18),
        hasLiquidity: true
      };
    } catch (error) {
      throw this._handleError(`Failed to get token price for agent ${agentId}`, error);
    }
  }

  /**
   * Get LP token information
   */
  async getLPTokenInfo(agentId) {
    try {
      const agent = await this.getAgent(agentId);
      
      if (!agent.isBonded || agent.lpPairAddress === ethers.ZeroAddress) {
        return { hasLPToken: false };
      }

      const lpContract = new ethers.Contract(agent.lpPairAddress, ERC20_ABI, this.provider);
      const reserves = await this.getPoolReserves(agentId);
      
      const [lpTotalSupply, lpName, lpSymbol] = await Promise.all([
        lpContract.totalSupply(),
        lpContract.name(),
        lpContract.symbol()
      ]);
      
      // Calculate LP token price (total value / total supply)
      const totalValueETH = BigInt(reserves.reserveETH) * 2n; // ETH value * 2 for total pool value
      const lpTokenPrice = lpTotalSupply > 0n ? 
        (totalValueETH * ethers.parseEther("1")) / lpTotalSupply : 0n;
      
      return {
        hasLPToken: true,
        lpAddress: agent.lpPairAddress,
        lpTotalSupply: lpTotalSupply.toString(),
        lpTotalSupplyFormatted: ethers.formatUnits(lpTotalSupply, 18),
        lpTokenPrice: lpTokenPrice.toString(),
        lpTokenPriceFormatted: ethers.formatEther(lpTokenPrice),
        lpName,
        lpSymbol,
        totalValueETH: totalValueETH.toString(),
        totalValueETHFormatted: ethers.formatEther(totalValueETH)
      };
    } catch (error) {
      throw this._handleError(`Failed to get LP token info for agent ${agentId}`, error);
    }
  }

  /**
   * Get comprehensive trading data for an agent
   */
  async getTradingData(agentId) {
    try {
      const [agent, reserves, tokenPrice, lpInfo] = await Promise.all([
        this.getAgent(agentId),
        this.getPoolReserves(agentId),
        this.getTokenPrice(agentId),
        this.getLPTokenInfo(agentId)
      ]);

      return {
        agent,
        reserves,
        tokenPrice,
        lpInfo,
        isTradeable: agent.isBonded && reserves.hasLiquidity,
        canAddLiquidity: agent.isBonded
      };
    } catch (error) {
      throw this._handleError(`Failed to get trading data for agent ${agentId}`, error);
    }
  }

  /**
   * Calculate swap amounts with slippage
   */
  async calculateSwapAmounts(agentId, inputAmount, isETHInput = true, slippage = 1) {
    try {
      const reserves = await this.getPoolReserves(agentId);
      
      if (!reserves.hasLiquidity) {
        throw new Error("No liquidity available");
      }

      const inputAmountWei = ethers.parseEther(inputAmount.toString());
      let amountOut;
      
      if (isETHInput) {
        // ETH -> Token
        amountOut = await this.contracts.amm.getAmountOut(
          inputAmountWei,
          ethers.parseEther(reserves.reserveETHFormatted),
          ethers.parseUnits(reserves.reserveTokenFormatted, 18)
        );
      } else {
        // Token -> ETH
        amountOut = await this.contracts.amm.getAmountOut(
          ethers.parseUnits(inputAmount.toString(), 18),
          ethers.parseUnits(reserves.reserveTokenFormatted, 18),
          ethers.parseEther(reserves.reserveETHFormatted)
        );
      }
      
      // Calculate minimum amount out with slippage
      const minAmountOut = amountOut * BigInt(100 - slippage) / 100n;
      
      // Calculate price impact
      const inputReserve = isETHInput ? 
        ethers.parseEther(reserves.reserveETHFormatted) : 
        ethers.parseUnits(reserves.reserveTokenFormatted, 18);
      const priceImpact = (inputAmountWei * 10000n) / inputReserve; // in basis points
      
      return {
        inputAmount: inputAmount.toString(),
        amountOut: amountOut.toString(),
        amountOutFormatted: isETHInput ? 
          ethers.formatUnits(amountOut, 18) : 
          ethers.formatEther(amountOut),
        minAmountOut: minAmountOut.toString(),
        minAmountOutFormatted: isETHInput ? 
          ethers.formatUnits(minAmountOut, 18) : 
          ethers.formatEther(minAmountOut),
        priceImpact: Number(priceImpact) / 100, // percentage
        slippage,
        isETHInput
      };
    } catch (error) {
      throw this._handleError(`Failed to calculate swap amounts for agent ${agentId}`, error);
    }
  }

  // =============================================================================
  // ENHANCED TRADING FUNCTIONS
  // =============================================================================

  /**
   * Swap ETH for tokens with advanced options
   */
  async swapETHForTokens(agentId, ethAmount, options = {}) {
    if (!this.signer) throw new Error("Wallet not connected");

    const {
      slippage = 1,
      deadline = 300,
      recipient = null
    } = options;

    try {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
      const ethAmountWei = ethers.parseEther(ethAmount.toString());
      const to = recipient || await this.signer.getAddress();
      
      // Calculate expected output and minimum
      const swapCalc = await this.calculateSwapAmounts(agentId, ethAmount, true, slippage);
      const amountOutMin = ethers.parseUnits(swapCalc.minAmountOutFormatted, 18);

      // Estimate gas
      const gasEstimate = await this.contracts.ammWrite.swapETHForTokens.estimateGas(
        agentId,
        amountOutMin,
        to,
        deadlineTimestamp,
        { value: ethAmountWei }
      );

      // Send transaction
      const tx = await this.contracts.ammWrite.swapETHForTokens(
        agentId,
        amountOutMin,
        to,
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
        ethAmount: ethAmount.toString(),
        expectedTokens: swapCalc.amountOutFormatted,
        minTokens: swapCalc.minAmountOutFormatted,
        priceImpact: swapCalc.priceImpact,
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`
      };

    } catch (error) {
      throw this._handleError(`Failed to swap ETH for tokens for agent ${agentId}`, error);
    }
  }

  /**
   * Swap tokens for ETH with advanced options
   */
  async swapTokensForETH(agentId, tokenAmount, options = {}) {
    if (!this.signer) throw new Error("Wallet not connected");

    const {
      slippage = 1,
      deadline = 300,
      recipient = null
    } = options;

    try {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
      const tokenAmountWei = ethers.parseUnits(tokenAmount.toString(), 18);
      const to = recipient || await this.signer.getAddress();
      
      // Calculate expected output and minimum
      const swapCalc = await this.calculateSwapAmounts(agentId, tokenAmount, false, slippage);
      const amountOutMin = ethers.parseEther(swapCalc.minAmountOutFormatted);

      // Estimate gas
      const gasEstimate = await this.contracts.ammWrite.swapTokensForETH.estimateGas(
        agentId,
        tokenAmountWei,
        amountOutMin,
        to,
        deadlineTimestamp
      );

      // Send transaction
      const tx = await this.contracts.ammWrite.swapTokensForETH(
        agentId,
        tokenAmountWei,
        amountOutMin,
        to,
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
        tokenAmount: tokenAmount.toString(),
        expectedETH: swapCalc.amountOutFormatted,
        minETH: swapCalc.minAmountOutFormatted,
        priceImpact: swapCalc.priceImpact,
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`
      };

    } catch (error) {
      throw this._handleError(`Failed to swap tokens for ETH for agent ${agentId}`, error);
    }
  }

  /**
   * Add liquidity to existing pool
   */
  async addLiquidity(agentId, tokenAmount, ethAmount, options = {}) {
    if (!this.signer) throw new Error("Wallet not connected");

    const {
      slippage = 1,
      deadline = 300,
      recipient = null
    } = options;

    try {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
      const tokenAmountWei = ethers.parseUnits(tokenAmount.toString(), 18);
      const ethAmountWei = ethers.parseEther(ethAmount.toString());
      const to = recipient || await this.signer.getAddress();
      
      // Calculate minimum amounts with slippage
      const tokenAmountMin = tokenAmountWei * BigInt(100 - slippage) / 100n;
      const ethAmountMin = ethAmountWei * BigInt(100 - slippage) / 100n;

      // Estimate gas
      const gasEstimate = await this.contracts.ammWrite.addLiquidity.estimateGas(
        agentId,
        tokenAmountWei,
        tokenAmountMin,
        ethAmountMin,
        to,
        deadlineTimestamp,
        { value: ethAmountWei }
      );

      // Send transaction
      const tx = await this.contracts.ammWrite.addLiquidity(
        agentId,
        tokenAmountWei,
        tokenAmountMin,
        ethAmountMin,
        to,
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
        tokenAmount: tokenAmount.toString(),
        ethAmount: ethAmount.toString(),
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`
      };

    } catch (error) {
      throw this._handleError(`Failed to add liquidity for agent ${agentId}`, error);
    }
  }

  // =============================================================================
  // CORE AGENT FUNCTIONS
  // =============================================================================

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
        explorerUrl: `${CONFIG.NETWORK.blockExplorer}/tx/${tx.hash}`,
        note: "Token automatically bonds when funding target is reached!"
      };

    } catch (error) {
      throw this._handleError(`Failed to contribute to agent ${agentId}`, error);
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Get comprehensive dashboard data with pricing
   */
  async getDashboardData() {
    try {
      const [bondedTokens, totalCounts, allPairs] = await Promise.all([
        this.getAllBondedTokens(),
        this.getTotalCounts(),
        this.contracts.amm.getAllPairs()
      ]);

      // Get pricing data for bonded tokens
      const bondedTokensWithPricing = await Promise.all(
        bondedTokens.agentIds.slice(0, 10).map(async (agentId) => {
          try {
            const tradingData = await this.getTradingData(parseInt(agentId));
            return {
              agentId,
              ...tradingData
            };
          } catch (error) {
            return {
              agentId,
              error: error.message
            };
          }
        })
      );

      return {
        counts: totalCounts,
        bondedTokens: bondedTokensWithPricing,
        liquidityPools: { pairs: allPairs, count: allPairs.length },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw this._handleError("Failed to get dashboard data", error);
    }
  }

  /**
   * Get user's token balances and LP positions
   */
  async getUserPortfolio(userAddress) {
    try {
      const bondedTokens = await this.getAllBondedTokens();
      const portfolio = [];

      for (const agentId of bondedTokens.agentIds) {
        try {
          const agent = await this.getAgent(parseInt(agentId));
          
          // Get token balance
          const tokenContract = new ethers.Contract(agent.tokenAddress, ERC20_ABI, this.provider);
          const tokenBalance = await tokenContract.balanceOf(userAddress);
          
          let lpBalance = "0";
          let lpInfo = null;
          
          // Get LP balance if exists
          if (agent.lpPairAddress !== ethers.ZeroAddress) {
            const lpContract = new ethers.Contract(agent.lpPairAddress, ERC20_ABI, this.provider);
            lpBalance = await lpContract.balanceOf(userAddress);
            lpInfo = await this.getLPTokenInfo(parseInt(agentId));
          }

          // Get pricing data
          const tokenPrice = await this.getTokenPrice(parseInt(agentId));
          
          if (tokenBalance > 0n || lpBalance > 0n) {
            portfolio.push({
              agentId,
              agent,
              tokenBalance: tokenBalance.toString(),
              tokenBalanceFormatted: ethers.formatUnits(tokenBalance, 18),
              lpBalance: lpBalance.toString(),
              lpBalanceFormatted: ethers.formatUnits(lpBalance, 18),
              tokenPrice,
              lpInfo,
              totalValueETH: this._calculatePortfolioValue(tokenBalance, lpBalance, tokenPrice, lpInfo)
            });
          }
        } catch (error) {
          console.warn(`Error getting portfolio data for agent ${agentId}:`, error);
        }
      }

      return portfolio;
    } catch (error) {
      throw this._handleError(`Failed to get user portfolio for ${userAddress}`, error);
    }
  }

  // =============================================================================
  // PRIVATE HELPER FUNCTIONS
  // =============================================================================

  _calculatePortfolioValue(tokenBalance, lpBalance, tokenPrice, lpInfo) {
    let totalValueWei = 0n;
    
    // Add token value
    if (tokenBalance > 0n && tokenPrice.hasLiquidity) {
      const tokenValueWei = (tokenBalance * BigInt(tokenPrice.priceInETH)) / ethers.parseEther("1");
      totalValueWei += tokenValueWei;
    }
    
    // Add LP value
    if (lpBalance > 0n && lpInfo && lpInfo.hasLPToken) {
      const lpValueWei = (lpBalance * BigInt(lpInfo.lpTokenPrice)) / ethers.parseEther("1");
      totalValueWei += lpValueWei;
    }
    
    return {
      totalValueWei: totalValueWei.toString(),
      totalValueFormatted: ethers.formatEther(totalValueWei)
    };
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

async function initializeAgentLaunchpadV2Ultra() {
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

  const agentLaunchpad = new AgentLaunchpadV2Ultra(provider, signer);
  const walletInfo = await agentLaunchpad.connectWallet(signer);

  return { agentLaunchpad, walletInfo };
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AgentLaunchpadV2Ultra,
    CONFIG,
    LAUNCHPAD_CORE_V2_ULTRA_ABI,
    SIMPLE_AMM_ABI,
    ERC20_ABI,
    initializeAgentLaunchpadV2Ultra
  };
}

if (typeof window !== 'undefined') {
  window.AgentLaunchpadV2Ultra = {
    AgentLaunchpadV2Ultra,
    CONFIG,
    LAUNCHPAD_CORE_V2_ULTRA_ABI,
    SIMPLE_AMM_ABI,
    ERC20_ABI,
    initializeAgentLaunchpadV2Ultra
  };
}

// =============================================================================
// USAGE EXAMPLES & FEATURES
// =============================================================================

/*

✅ CURRENT DEPLOYMENT STATUS:
🏭 AgentLaunchpadCoreV2Ultra: 0xD8857d39F9F7956cAc9fDE2F202da3Fe6D01afa4 (✅ WORKING!)
🔄 SimpleAMM: 0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083 (✅ WORKING!)

🚀 KEY FEATURES:
✅ Automatic bonding when funding target reached
✅ Enhanced V2 tracking and analytics
✅ Comprehensive price calculations and LP management
✅ Multi-wallet support (MetaMask, WalletConnect, Rainbow Kit, etc.)
✅ Real-time trading data and portfolio tracking

// INITIALIZE V2 ULTRA SYSTEM
const { agentLaunchpad, walletInfo } = await initializeAgentLaunchpadV2Ultra();

// CREATE AGENT (automatically bonds when target reached)
const createResult = await agentLaunchpad.createAgent({
  name: "MyToken",
  symbol: "MTK", 
  agentName: "My Creative Agent",
  archetype: "Digital Artist",
  metadataURI: "ipfs://...",
  fundingTarget: 1, // 1 ETH - auto-bonds when reached!
  tokenSupply: 1000000,
  agentConfigJSON: JSON.stringify({...})
});

// CONTRIBUTE (auto-bonds when target met)
const contributeResult = await agentLaunchpad.contribute(0, 0.5); // 0.5 ETH

// GET COMPREHENSIVE TRADING DATA
const tradingData = await agentLaunchpad.getTradingData(0);
console.log("Token Price:", tradingData.tokenPrice.priceInETHFormatted, "ETH");
console.log("Market Cap:", tradingData.tokenPrice.marketCapFormatted, "ETH");
console.log("LP Token Price:", tradingData.lpInfo.lpTokenPriceFormatted, "ETH");

// CALCULATE SWAP WITH SLIPPAGE
const swapCalc = await agentLaunchpad.calculateSwapAmounts(0, 1, true, 1); // 1 ETH input, 1% slippage
console.log("Expected tokens:", swapCalc.amountOutFormatted);
console.log("Price impact:", swapCalc.priceImpact + "%");

// EXECUTE SWAP
const swapResult = await agentLaunchpad.swapETHForTokens(0, 1, {
  slippage: 1,
  deadline: 300
});

// ADD LIQUIDITY
const liquidityResult = await agentLaunchpad.addLiquidity(0, 1000, 1, {
  slippage: 1
});

// GET USER PORTFOLIO
const portfolio = await agentLaunchpad.getUserPortfolio("0x...");
console.log("Total portfolio value:", portfolio.reduce((sum, item) => 
  sum + parseFloat(item.totalValueETH.totalValueFormatted), 0));

// GET DASHBOARD WITH PRICING
const dashboard = await agentLaunchpad.getDashboardData();
console.log("Total agents:", dashboard.counts.totalAgents);
console.log("Bonded tokens with pricing:", dashboard.bondedTokens);

WALLET COMPATIBILITY:
✅ MetaMask, WalletConnect, Rainbow Kit, Coinbase Wallet
✅ Any EIP-1193 compatible wallet via connectWallet(signer)

*/ 