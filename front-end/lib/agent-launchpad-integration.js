/**
 * AgentLaunchpad Multi-Chain Integration
 * Support for Flow Testnet, Rootstock Testnet, and Hedera Testnet
 */

// =============================================================================
// NETWORK CONFIGURATIONS
// =============================================================================

const NETWORK_CONFIGS = {
  FLOW_TESTNET: {
    name: "Flow Testnet",
    chainId: 545,
    rpcUrl: "https://testnet.evm.nodes.onflow.org",
    blockExplorer: "https://evm-testnet.flowscan.io",
    contracts: {
      LAUNCHPAD_CORE: "0xD8857d39F9F7956cAc9fDE2F202da3Fe6D01afa4",
      SIMPLE_AMM: "0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083"
    },
    nativeCurrency: {
      name: "Flow",
      symbol: "FLOW",
      decimals: 18
    },
    txUrlFormat: "tx" // Uses /tx/ format
  },
  ROOTSTOCK_TESTNET: {
    name: "Rootstock Testnet",
    chainId: 31,
    rpcUrl: "https://public-node.testnet.rsk.co",
    blockExplorer: "https://explorer.testnet.rootstock.io",
    contracts: {
      LAUNCHPAD_CORE: "0x0000000000000000000000000000000000000000", // Deploy needed
      SIMPLE_AMM: "0x0000000000000000000000000000000000000000" // Deploy needed
    },
    nativeCurrency: {
      name: "Test Rootstock Bitcoin",
      symbol: "tRBTC",
      decimals: 18
    },
    txUrlFormat: "tx" // Uses /tx/ format
  },
  HEDERA_TESTNET: {
    name: "Hedera Testnet",
    chainId: 296,
    rpcUrl: "https://testnet.hashio.io/api",
    blockExplorer: "https://hashscan.io/testnet",
    contracts: {
      LAUNCHPAD_CORE: "0x0000000000000000000000000000000000000000", // Deploy needed
      SIMPLE_AMM: "0x0000000000000000000000000000000000000000" // Deploy needed
    },
    nativeCurrency: {
      name: "HBAR",
      symbol: "HBAR",
      decimals: 18
    },
    txUrlFormat: "transaction" // Uses /transaction/ format
  }
};

// =============================================================================
// CONTRACT ABIs
// =============================================================================

const LAUNCHPAD_CORE_ABI = [
  "function createAgent(string name, string symbol, string agentName, string archetype, string metadataURI, uint256 fundingTarget, uint256 tokenSupply, string agentConfigJSON) external returns (uint256)",
  "function contribute(uint256 id) external payable",
  "function getAllBondedTokens() external view returns (address[] tokens, string[] names, string[] symbols, address[] lps, uint256[] ids)",
  "function getAgent(uint256 id) external view returns (string name, string agentName, uint256 target, uint256 raised, bool bonded, address creator, address token, address lp, string config)",
  "function getAgentByToken(address token) external view returns (uint256)",
  "function isBonded(uint256 id) external view returns (bool)",
  "function getLp(uint256 id) external view returns (address)",
  "function agents(uint256) external view returns (string name, string symbol, string agentName, uint256 fundingTarget, uint256 tokenSupply, address creator, bool isBonded, uint256 totalRaised, address tokenAddress, address lpPairAddress, string agentConfigJSON, uint256 createdAt, uint256 bondedAt)",
  "function contributions(uint256, address) external view returns (uint256)",
  "function bondedIds(uint256) external view returns (uint256)",
  "function inProgressIds(uint256) external view returns (uint256)",
  "function tokenToAgent(address) external view returns (uint256)",
  "event AgentCreated(uint256 indexed id, address indexed creator, address token)",
  "event Contributed(uint256 indexed id, address indexed contributor, uint256 amount)",
  "event AgentBonded(uint256 indexed id, address indexed token, address lp)"
];

const SIMPLE_AMM_ABI = [
  "function createLiquidityPool(uint256 agentId, address tokenAddress, uint256 tokenAmount, string agentConfigJSON) external payable returns (address)",
  "function addLiquidity(uint256 agentId, uint256 tokenAmountDesired, uint256 tokenAmountMin, uint256 ethAmountMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
  "function removeLiquidity(uint256 agentId, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountETH)",
  "function swapETHForTokens(uint256 agentId, uint256 amountOutMin, address to, uint256 deadline) external payable returns (uint256[] amounts)",
  "function swapTokensForETH(uint256 agentId, uint256 amountIn, uint256 amountOutMin, address to, uint256 deadline) external returns (uint256[] amounts)",
  "function getLiquidityPool(uint256 agentId) external view returns (address)",
  "function getReserves(uint256 agentId) external view returns (uint256 reserveETH, uint256 reserveToken)",
  "function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) external pure returns (uint256 amountB)",
  "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256 amountOut)",
  "function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256 amountIn)",
  "event LiquidityPoolCreated(uint256 indexed agentId, address indexed tokenAddress, address indexed lpPairAddress, uint256 ethAmount, uint256 tokenAmount)"
];

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
// MAIN AGENTLAUNCHPAD CLASS
// =============================================================================

class AgentLaunchpadMultiChain {
  constructor(chainId = 545) {
    this.chainId = chainId;
    this.networkConfig = this.getNetworkConfig(chainId);
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.eventListeners = new Map();
  }

  getNetworkConfig(chainId) {
    switch (chainId) {
      case 545:
        return NETWORK_CONFIGS.FLOW_TESTNET;
      case 31:
        return NETWORK_CONFIGS.ROOTSTOCK_TESTNET;
      case 296:
        return NETWORK_CONFIGS.HEDERA_TESTNET;
      default:
        return NETWORK_CONFIGS.FLOW_TESTNET;
    }
  }

  async initialize(provider, signer = null) {
    this.provider = provider;
    this.signer = signer;
    
    // Verify network
    const network = await provider.getNetwork();
    if (network.chainId !== this.chainId) {
      throw new Error(`Wrong network. Expected ${this.networkConfig.name} (${this.chainId}), got ${network.chainId}`);
    }

    this._initializeContracts();
    
    if (signer) {
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      
      return {
        address,
        balance: ethers.formatEther(balance),
        chainId: network.chainId,
        networkName: this.networkConfig.name,
        nativeCurrency: this.networkConfig.nativeCurrency
      };
    }

    return { chainId: network.chainId, networkName: this.networkConfig.name };
  }

  _initializeContracts() {
    // Read-only contracts
    this.contracts.core = new ethers.Contract(
      this.networkConfig.contracts.LAUNCHPAD_CORE,
      LAUNCHPAD_CORE_ABI,
      this.provider
    );
    
    this.contracts.amm = new ethers.Contract(
      this.networkConfig.contracts.SIMPLE_AMM,
      SIMPLE_AMM_ABI,
      this.provider
    );

    // Write contracts (if signer available)
    if (this.signer) {
      this.contracts.coreWrite = new ethers.Contract(
        this.networkConfig.contracts.LAUNCHPAD_CORE,
        LAUNCHPAD_CORE_ABI,
        this.signer
      );
      
      this.contracts.ammWrite = new ethers.Contract(
        this.networkConfig.contracts.SIMPLE_AMM,
        SIMPLE_AMM_ABI,
        this.signer
      );
    }
  }

  async connectWallet(signer) {
    this.signer = signer;
    this._initializeContracts();
    
    const address = await signer.getAddress();
    const balance = await this.provider.getBalance(address);
    
    return {
      address,
      balance: ethers.formatEther(balance),
      chainId: this.chainId,
      networkName: this.networkConfig.name,
      nativeCurrency: this.networkConfig.nativeCurrency
    };
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

      const gasEstimate = await this.contracts.coreWrite.createAgent.estimateGas(
        name, symbol, agentName, archetype, metadataURI,
        fundingTargetWei, tokenSupplyWei, configString
      );

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
        explorerUrl: this._generateExplorerUrl(tx.hash)
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
        explorerUrl: this._generateExplorerUrl(tx.hash)
      };

    } catch (error) {
      throw this._handleError(`Failed to contribute to agent ${agentId}`, error);
    }
  }

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

  async isAgentBonded(agentId) {
    try {
      return await this.contracts.core.isBonded(agentId);
    } catch (error) {
      throw this._handleError(`Failed to check if agent ${agentId} is bonded`, error);
    }
  }

  // =============================================================================
  // AMM FUNCTIONS
  // =============================================================================

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

  async getTokenPrice(agentId) {
    try {
      const reserves = await this.getPoolReserves(agentId);
      
      if (!reserves.hasLiquidity) {
        return {
          priceInETH: "0",
          priceInETHFormatted: "0",
          marketCap: "0",
          hasLiquidity: false
        };
      }

      const priceInETH = (BigInt(reserves.reserveETH) * ethers.parseEther("1")) / BigInt(reserves.reserveToken);
      
      const agent = await this.getAgent(agentId);
      const tokenContract = new ethers.Contract(agent.tokenAddress, ERC20_ABI, this.provider);
      const totalSupply = await tokenContract.totalSupply();
      
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

  async calculateSwapAmounts(agentId, inputAmount, isETHInput = true, slippage = 1) {
    try {
      const reserves = await this.getPoolReserves(agentId);
      
      if (!reserves.hasLiquidity) {
        throw new Error("No liquidity available");
      }

      const inputAmountWei = ethers.parseEther(inputAmount.toString());
      let amountOut;
      
      if (isETHInput) {
        amountOut = await this.contracts.amm.getAmountOut(
          inputAmountWei,
          ethers.parseEther(reserves.reserveETHFormatted),
          ethers.parseUnits(reserves.reserveTokenFormatted, 18)
        );
      } else {
        amountOut = await this.contracts.amm.getAmountOut(
          ethers.parseUnits(inputAmount.toString(), 18),
          ethers.parseUnits(reserves.reserveTokenFormatted, 18),
          ethers.parseEther(reserves.reserveETHFormatted)
        );
      }
      
      const minAmountOut = amountOut * BigInt(100 - slippage) / 100n;
      const inputReserve = isETHInput ? 
        ethers.parseEther(reserves.reserveETHFormatted) : 
        ethers.parseUnits(reserves.reserveTokenFormatted, 18);
      const priceImpact = (inputAmountWei * 10000n) / inputReserve;
      
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
        priceImpact: Number(priceImpact) / 100,
        slippage,
        isETHInput
      };
    } catch (error) {
      throw this._handleError(`Failed to calculate swap amounts for agent ${agentId}`, error);
    }
  }

  async swapETHForTokens(agentId, ethAmount, options = {}) {
    if (!this.signer) throw new Error("Wallet not connected");

    const { slippage = 1, deadline = 300, recipient = null } = options;

    try {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
      const ethAmountWei = ethers.parseEther(ethAmount.toString());
      const to = recipient || await this.signer.getAddress();
      
      const swapCalc = await this.calculateSwapAmounts(agentId, ethAmount, true, slippage);
      const amountOutMin = ethers.parseUnits(swapCalc.minAmountOutFormatted, 18);

      const gasEstimate = await this.contracts.ammWrite.swapETHForTokens.estimateGas(
        agentId,
        amountOutMin,
        to,
        deadlineTimestamp,
        { value: ethAmountWei }
      );

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
        explorerUrl: this._generateExplorerUrl(tx.hash)
      };

    } catch (error) {
      throw this._handleError(`Failed to swap ${this.networkConfig.nativeCurrency.symbol} for tokens for agent ${agentId}`, error);
    }
  }

  async swapTokensForETH(agentId, tokenAmount, options = {}) {
    if (!this.signer) throw new Error("Wallet not connected");

    const { slippage = 1, deadline = 300, recipient = null } = options;

    try {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
      const tokenAmountWei = ethers.parseUnits(tokenAmount.toString(), 18);
      const to = recipient || await this.signer.getAddress();
      
      const swapCalc = await this.calculateSwapAmounts(agentId, tokenAmount, false, slippage);
      const amountOutMin = ethers.parseEther(swapCalc.minAmountOutFormatted);

      const gasEstimate = await this.contracts.ammWrite.swapTokensForETH.estimateGas(
        agentId,
        tokenAmountWei,
        amountOutMin,
        to,
        deadlineTimestamp
      );

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
        explorerUrl: this._generateExplorerUrl(tx.hash)
      };

    } catch (error) {
      throw this._handleError(`Failed to swap tokens for ${this.networkConfig.nativeCurrency.symbol} for agent ${agentId}`, error);
    }
  }

  async addLiquidity(agentId, tokenAmount, ethAmount, options = {}) {
    if (!this.signer) throw new Error("Wallet not connected");

    const { slippage = 1, deadline = 300, recipient = null } = options;

    try {
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline;
      const tokenAmountWei = ethers.parseUnits(tokenAmount.toString(), 18);
      const ethAmountWei = ethers.parseEther(ethAmount.toString());
      const to = recipient || await this.signer.getAddress();
      
      const tokenAmountMin = tokenAmountWei * BigInt(100 - slippage) / 100n;
      const ethAmountMin = ethAmountWei * BigInt(100 - slippage) / 100n;

      const gasEstimate = await this.contracts.ammWrite.addLiquidity.estimateGas(
        agentId,
        tokenAmountWei,
        tokenAmountMin,
        ethAmountMin,
        to,
        deadlineTimestamp,
        { value: ethAmountWei }
      );

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
        explorerUrl: this._generateExplorerUrl(tx.hash)
      };

    } catch (error) {
      throw this._handleError(`Failed to add liquidity for agent ${agentId}`, error);
    }
  }

  // =============================================================================
  // DASHBOARD FUNCTIONS
  // =============================================================================

  async getDashboardData() {
    try {
      const bondedTokens = await this.getAllBondedTokens();
      
      // Get pricing data for bonded tokens
      const bondedTokensWithPricing = await Promise.all(
        bondedTokens.agentIds.slice(0, 10).map(async (agentId) => {
          try {
            const [agent, price, reserves] = await Promise.all([
              this.getAgent(parseInt(agentId)),
              this.getTokenPrice(parseInt(agentId)),
              this.getPoolReserves(parseInt(agentId))
            ]);
            return { agentId, agent, price, reserves };
          } catch (error) {
            return { agentId, error: error.message };
          }
        })
      );

      // Calculate total counts
      let totalAgents = 0;
      let inProgressCount = 0;
      
      if (bondedTokens.agentIds.length > 0) {
        const maxBondedId = Math.max(...bondedTokens.agentIds.map(id => parseInt(id)));
        totalAgents = maxBondedId + 1;
        
        for (let i = 0; i < totalAgents; i++) {
          try {
            const isBonded = await this.isAgentBonded(i);
            if (!isBonded) {
              try {
                const agent = await this.getAgent(i);
                if (agent.creator !== ethers.ZeroAddress) {
                  inProgressCount++;
                }
              } catch {}
            }
          } catch {}
        }
      }

      return {
        counts: {
          totalAgents,
          bondedAgents: bondedTokens.count,
          inProgressAgents: inProgressCount
        },
        bondedTokens: bondedTokensWithPricing,
        networkInfo: {
          name: this.networkConfig.name,
          chainId: this.chainId,
          nativeCurrency: this.networkConfig.nativeCurrency
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw this._handleError("Failed to get dashboard data", error);
    }
  }

  async getInProgressAgents(limit = 20) {
    try {
      const bondedTokens = await this.getAllBondedTokens();
      const inProgressAgents = [];
      
      // Find max agent ID
      let maxId = 0;
      if (bondedTokens.agentIds.length > 0) {
        maxId = Math.max(...bondedTokens.agentIds.map(id => parseInt(id)));
      }

      // Check agents 0 to maxId + some buffer
      const checkLimit = Math.min(maxId + 20, 100); // Don't check too many
      
      for (let i = 0; i <= checkLimit && inProgressAgents.length < limit; i++) {
        try {
          const isBonded = await this.isAgentBonded(i);
          if (!isBonded) {
            try {
              const agent = await this.getAgent(i);
              if (agent.creator !== ethers.ZeroAddress) {
                inProgressAgents.push({
                  id: i.toString(),
                  ...agent
                });
              }
            } catch {}
          }
        } catch {}
      }

      return inProgressAgents;
    } catch (error) {
      throw this._handleError("Failed to get in-progress agents", error);
    }
  }

  async getUserTokenBalance(agentId, userAddress) {
    try {
      const agent = await this.getAgent(agentId);
      if (agent.tokenAddress === ethers.ZeroAddress) {
        return { balance: "0", balanceFormatted: "0" };
      }

      const tokenContract = new ethers.Contract(agent.tokenAddress, ERC20_ABI, this.provider);
      const balance = await tokenContract.balanceOf(userAddress);
      
      return {
        balance: balance.toString(),
        balanceFormatted: ethers.formatUnits(balance, 18)
      };
    } catch (error) {
      return { balance: "0", balanceFormatted: "0" };
    }
  }

  async getUserContribution(agentId, userAddress) {
    try {
      const contribution = await this.contracts.core.contributions(agentId, userAddress);
      return {
        contribution: contribution.toString(),
        contributionFormatted: ethers.formatEther(contribution)
      };
    } catch (error) {
      return { contribution: "0", contributionFormatted: "0" };
    }
  }

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  _generateExplorerUrl(txHash) {
    const baseUrl = this.networkConfig.blockExplorer;
    const format = this.networkConfig.txUrlFormat || "tx";
    return `${baseUrl}/${format}/${txHash}`;
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
// UTILITY FUNCTIONS
// =============================================================================

function openExplorerUrl(url) {
  if (url && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
    document.body.removeChild(textArea);
  }
}

function formatTransactionHash(hash, length = 10) {
  if (!hash) return '';
  if (hash.length <= length * 2) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
}

function getNetworkDisplayName(chainId) {
  const configs = Object.values(NETWORK_CONFIGS);
  const config = configs.find(c => c.chainId === chainId);
  return config?.name || `Chain ${chainId}`;
}

// =============================================================================
// INITIALIZATION FUNCTIONS
// =============================================================================

async function initializeAgentLaunchpad(chainId = 545) {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask or another Web3 wallet.");
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  
  const agentLaunchpad = new AgentLaunchpadMultiChain(chainId);
  
  // Switch network if needed
  if (network.chainId !== chainId) {
    await switchNetwork(chainId);
    // Re-get provider after network switch
    const newProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await newProvider.getSigner();
    const walletInfo = await agentLaunchpad.initialize(newProvider, signer);
    return { agentLaunchpad, walletInfo };
  }

  const signer = await provider.getSigner();
  const walletInfo = await agentLaunchpad.initialize(provider, signer);

  return { agentLaunchpad, walletInfo };
}

async function switchNetwork(chainId) {
  const networkConfig = new AgentLaunchpadMultiChain(chainId).networkConfig;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${chainId.toString(16)}`,
            chainName: networkConfig.name,
            nativeCurrency: networkConfig.nativeCurrency,
            rpcUrls: [networkConfig.rpcUrl],
            blockExplorerUrls: [networkConfig.blockExplorer]
          }],
        });
      } catch (addError) {
        throw new Error('Failed to add network to wallet');
      }
    } else {
      throw new Error('Failed to switch network');
    }
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AgentLaunchpadMultiChain,
    NETWORK_CONFIGS,
    initializeAgentLaunchpad,
    switchNetwork,
    openExplorerUrl,
    copyToClipboard,
    formatTransactionHash,
    getNetworkDisplayName
  };
}

if (typeof window !== 'undefined') {
  window.AgentLaunchpadV2 = {
    AgentLaunchpadMultiChain,
    NETWORK_CONFIGS,
    initializeAgentLaunchpad,
    switchNetwork,
    openExplorerUrl,
    copyToClipboard,
    formatTransactionHash,
    getNetworkDisplayName
  };
} 