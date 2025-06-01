/**
 * AgentLaunchpad V2 Ultra - Complete Usage Examples
 * 
 * Deployed Contracts:
 * - AgentLaunchpadCoreV2Ultra: 0xD8857d39F9F7956cAc9fDE2F202da3Fe6D01afa4
 * - SimpleAMM: 0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083
 * 
 * Network: Flow Testnet (Chain ID: 545)
 * Features: Automatic bonding, Enhanced pricing, Multi-wallet support
 */

// =============================================================================
// 1. INITIALIZATION & WALLET CONNECTION
// =============================================================================

async function example1_InitializeSystem() {
  console.log("🚀 Example 1: Initialize AgentLaunchpad V2 Ultra");
  
  try {
    // Initialize the system (checks wallet, network, connects)
    const { agentLaunchpad, walletInfo } = await initializeAgentLaunchpadV2Ultra();
    
    console.log("✅ System initialized!");
    console.log("📍 Wallet Address:", walletInfo.address);
    console.log("💰 Wallet Balance:", walletInfo.balance, "FLOW");
    console.log("🌐 Chain ID:", walletInfo.chainId);
    
    return agentLaunchpad;
    
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    throw error;
  }
}

// Alternative: Manual initialization with custom provider
async function example1b_ManualInitialization() {
  console.log("🔧 Example 1b: Manual Initialization");
  
  try {
    // For custom providers (e.g., WalletConnect, Rainbow Kit)
    const provider = new ethers.JsonRpcProvider("https://testnet.evm.nodes.onflow.org");
    const agentLaunchpad = new AgentLaunchpadV2Ultra(provider);
    
    // Later connect a signer
    if (window.ethereum) {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const walletInfo = await agentLaunchpad.connectWallet(signer);
      
      console.log("✅ Custom provider connected!");
      console.log("📍 Address:", walletInfo.address);
    }
    
    return agentLaunchpad;
    
  } catch (error) {
    console.error("❌ Manual initialization failed:", error.message);
    throw error;
  }
}

// =============================================================================
// 2. CREATING AGENTS (AUTO-BONDING)
// =============================================================================

async function example2_CreateAgent(agentLaunchpad) {
  console.log("🎨 Example 2: Create Agent (Auto-bonds when target reached)");
  
  try {
    const agentData = {
      name: "CreativeBot Token",
      symbol: "CBT",
      agentName: "Digital Renaissance Creator",
      archetype: "Neo-Digital Artist",
      metadataURI: "ipfs://QmYourMetadataHash",
      fundingTarget: 0.5, // 0.5 ETH - auto-bonds when reached!
      tokenSupply: 1000000, // 1M tokens
      agentConfigJSON: JSON.stringify({
        personality: {
          traits: ["creative", "innovative", "collaborative"],
          style: "Renaissance meets Digital",
          mediums: ["digital art", "generative art", "mixed media"]
        },
        technical: {
          temperature: 0.8,
          model: "gpt-4",
          tools: ["generate_image", "generate_video"]
        },
        blockchain: {
          seed: Math.floor(Math.random() * 1000000)
        }
      })
    };

    const result = await agentLaunchpad.createAgent(agentData);
    
    console.log("✅ Agent created successfully!");
    console.log("🆔 Agent ID:", result.agentId);
    console.log("🔗 Transaction:", result.explorerUrl);
    console.log("⛽ Gas Used:", result.gasUsed);
    console.log("💡 Note: Agent will auto-bond when 0.5 ETH is raised!");
    
    return parseInt(result.agentId);
    
  } catch (error) {
    console.error("❌ Agent creation failed:", error.message);
    throw error;
  }
}

// =============================================================================
// 3. CONTRIBUTING TO AGENTS (TRIGGERS AUTO-BONDING)
// =============================================================================

async function example3_ContributeToAgent(agentLaunchpad, agentId) {
  console.log("💰 Example 3: Contribute to Agent (Triggers auto-bonding)");
  
  try {
    // Contribute 0.3 ETH (if target is 0.5 ETH, need 0.2 more to trigger bonding)
    const contribution = 0.3;
    
    console.log(`💸 Contributing ${contribution} ETH to Agent ${agentId}...`);
    
    const result = await agentLaunchpad.contribute(agentId, contribution);
    
    console.log("✅ Contribution successful!");
    console.log("💰 Amount:", result.amount, "ETH");
    console.log("🔗 Transaction:", result.explorerUrl);
    console.log("⛽ Gas Used:", result.gasUsed);
    console.log("🔔 Note:", result.note);
    
    // Check if agent bonded
    const isBonded = await agentLaunchpad.isAgentBonded(agentId);
    if (isBonded) {
      console.log("🎉 Agent automatically bonded! Trading is now live!");
    } else {
      console.log("⏳ Agent not yet bonded. Need more contributions.");
    }
    
    return result;
    
  } catch (error) {
    console.error("❌ Contribution failed:", error.message);
    throw error;
  }
}

// Complete funding example (triggers bonding)
async function example3b_CompleteFunding(agentLaunchpad, agentId) {
  console.log("🎯 Example 3b: Complete Funding (Trigger Auto-Bonding)");
  
  try {
    // Get current agent status
    const agent = await agentLaunchpad.getAgent(agentId);
    const needed = parseFloat(agent.fundingTargetFormatted) - parseFloat(agent.totalRaisedFormatted);
    
    if (needed <= 0) {
      console.log("✅ Agent already fully funded!");
      return;
    }
    
    console.log(`💸 Contributing ${needed} ETH to complete funding...`);
    
    const result = await agentLaunchpad.contribute(agentId, needed);
    
    console.log("🎉 Funding completed! Agent should be auto-bonded!");
    console.log("🔗 Transaction:", result.explorerUrl);
    
    // Verify bonding
    const isBonded = await agentLaunchpad.isAgentBonded(agentId);
    console.log("🔗 Bonded:", isBonded ? "YES ✅" : "NO ❌");
    
    if (isBonded) {
      const lpAddress = await agentLaunchpad.contracts.core.getLp(agentId);
      console.log("🏊 LP Pool Address:", lpAddress);
    }
    
    return result;
    
  } catch (error) {
    console.error("❌ Complete funding failed:", error.message);
    throw error;
  }
}

// =============================================================================
// 4. GETTING AGENT DATA & ANALYTICS
// =============================================================================

async function example4_GetAgentData(agentLaunchpad, agentId) {
  console.log("📊 Example 4: Get Comprehensive Agent Data");
  
  try {
    // Basic agent info
    const agent = await agentLaunchpad.getAgent(agentId);
    console.log("\n📋 Basic Agent Info:");
    console.log("  Name:", agent.name);
    console.log("  Agent Name:", agent.agentName);
    console.log("  Creator:", agent.creator);
    console.log("  Token Address:", agent.tokenAddress);
    console.log("  Funding Progress:", agent.fundingProgress + "%");
    console.log("  Is Bonded:", agent.isBonded ? "YES ✅" : "NO ❌");
    
    if (agent.isBonded) {
      // Get comprehensive trading data
      const tradingData = await agentLaunchpad.getTradingData(agentId);
      
      console.log("\n💹 Trading Data:");
      console.log("  Token Price:", tradingData.tokenPrice.priceInETHFormatted, "ETH");
      console.log("  Market Cap:", tradingData.tokenPrice.marketCapFormatted, "ETH");
      console.log("  Has Liquidity:", tradingData.tokenPrice.hasLiquidity ? "YES" : "NO");
      
      if (tradingData.lpInfo.hasLPToken) {
        console.log("\n🏊 LP Pool Info:");
        console.log("  LP Address:", tradingData.lpInfo.lpAddress);
        console.log("  LP Token Price:", tradingData.lpInfo.lpTokenPriceFormatted, "ETH");
        console.log("  Total Pool Value:", tradingData.lpInfo.totalValueETHFormatted, "ETH");
      }
      
      console.log("\n🔄 Pool Reserves:");
      console.log("  ETH Reserve:", tradingData.reserves.reserveETHFormatted, "ETH");
      console.log("  Token Reserve:", tradingData.reserves.reserveTokenFormatted, "tokens");
    }
    
    return { agent, tradingData: agent.isBonded ? await agentLaunchpad.getTradingData(agentId) : null };
    
  } catch (error) {
    console.error("❌ Get agent data failed:", error.message);
    throw error;
  }
}

// Get all bonded tokens
async function example4b_GetAllBondedTokens(agentLaunchpad) {
  console.log("🎯 Example 4b: Get All Bonded Tokens");
  
  try {
    const bondedTokens = await agentLaunchpad.getAllBondedTokens();
    
    console.log(`\n🏆 Found ${bondedTokens.count} bonded tokens:`);
    
    for (let i = 0; i < bondedTokens.count; i++) {
      console.log(`\n  ${i + 1}. ${bondedTokens.names[i]} (${bondedTokens.symbols[i]})`);
      console.log(`     Agent ID: ${bondedTokens.agentIds[i]}`);
      console.log(`     Token: ${bondedTokens.tokenAddresses[i]}`);
      console.log(`     LP Pool: ${bondedTokens.lpPairs[i]}`);
      
      // Get price data
      try {
        const price = await agentLaunchpad.getTokenPrice(parseInt(bondedTokens.agentIds[i]));
        console.log(`     Price: ${price.priceInETHFormatted} ETH`);
        console.log(`     Market Cap: ${price.marketCapFormatted} ETH`);
      } catch (e) {
        console.log("     Price: Unable to fetch");
      }
    }
    
    return bondedTokens;
    
  } catch (error) {
    console.error("❌ Get bonded tokens failed:", error.message);
    throw error;
  }
}

// =============================================================================
// 5. TRADING FUNCTIONS - SWAPPING
// =============================================================================

async function example5_SwapETHForTokens(agentLaunchpad, agentId) {
  console.log("🔄 Example 5: Swap ETH for Tokens");
  
  try {
    const ethAmount = 0.1; // 0.1 ETH
    const slippage = 1; // 1%
    
    // Calculate expected output first
    const swapCalc = await agentLaunchpad.calculateSwapAmounts(agentId, ethAmount, true, slippage);
    
    console.log("\n📊 Swap Calculation:");
    console.log("  Input:", ethAmount, "ETH");
    console.log("  Expected Output:", swapCalc.amountOutFormatted, "tokens");
    console.log("  Minimum Output:", swapCalc.minAmountOutFormatted, "tokens");
    console.log("  Price Impact:", swapCalc.priceImpact.toFixed(2) + "%");
    console.log("  Slippage:", slippage + "%");
    
    // Confirm the swap
    console.log("\n💸 Executing swap...");
    
    const result = await agentLaunchpad.swapETHForTokens(agentId, ethAmount, {
      slippage: slippage,
      deadline: 300, // 5 minutes
      recipient: null // Use connected wallet
    });
    
    console.log("✅ Swap successful!");
    console.log("🔗 Transaction:", result.explorerUrl);
    console.log("⛽ Gas Used:", result.gasUsed);
    console.log("💰 ETH Spent:", result.ethAmount, "ETH");
    console.log("🎯 Expected Tokens:", result.expectedTokens);
    console.log("📉 Price Impact:", result.priceImpact.toFixed(2) + "%");
    
    return result;
    
  } catch (error) {
    console.error("❌ ETH->Token swap failed:", error.message);
    throw error;
  }
}

async function example5b_SwapTokensForETH(agentLaunchpad, agentId) {
  console.log("🔄 Example 5b: Swap Tokens for ETH");
  
  try {
    const tokenAmount = 1000; // 1000 tokens
    const slippage = 1; // 1%
    
    // Calculate expected output
    const swapCalc = await agentLaunchpad.calculateSwapAmounts(agentId, tokenAmount, false, slippage);
    
    console.log("\n📊 Swap Calculation:");
    console.log("  Input:", tokenAmount, "tokens");
    console.log("  Expected Output:", swapCalc.amountOutFormatted, "ETH");
    console.log("  Minimum Output:", swapCalc.minAmountOutFormatted, "ETH");
    console.log("  Price Impact:", swapCalc.priceImpact.toFixed(2) + "%");
    
    // Execute swap
    console.log("\n💸 Executing swap...");
    
    const result = await agentLaunchpad.swapTokensForETH(agentId, tokenAmount, {
      slippage: slippage,
      deadline: 300,
      recipient: null
    });
    
    console.log("✅ Swap successful!");
    console.log("🔗 Transaction:", result.explorerUrl);
    console.log("💰 Tokens Spent:", result.tokenAmount);
    console.log("🎯 Expected ETH:", result.expectedETH, "ETH");
    console.log("📉 Price Impact:", result.priceImpact.toFixed(2) + "%");
    
    return result;
    
  } catch (error) {
    console.error("❌ Token->ETH swap failed:", error.message);
    throw error;
  }
}

// =============================================================================
// 6. LIQUIDITY MANAGEMENT
// =============================================================================

async function example6_AddLiquidity(agentLaunchpad, agentId) {
  console.log("🏊 Example 6: Add Liquidity to Pool");
  
  try {
    const tokenAmount = 5000; // 5000 tokens
    const ethAmount = 0.05; // 0.05 ETH
    const slippage = 2; // 2% slippage for liquidity
    
    console.log("\n💧 Adding Liquidity:");
    console.log("  Tokens:", tokenAmount);
    console.log("  ETH:", ethAmount);
    console.log("  Slippage:", slippage + "%");
    
    const result = await agentLaunchpad.addLiquidity(agentId, tokenAmount, ethAmount, {
      slippage: slippage,
      deadline: 600, // 10 minutes for liquidity
      recipient: null
    });
    
    console.log("✅ Liquidity added successfully!");
    console.log("🔗 Transaction:", result.explorerUrl);
    console.log("⛽ Gas Used:", result.gasUsed);
    console.log("💰 ETH Added:", result.ethAmount, "ETH");
    console.log("🎯 Tokens Added:", result.tokenAmount);
    
    // Get updated LP info
    const lpInfo = await agentLaunchpad.getLPTokenInfo(agentId);
    if (lpInfo.hasLPToken) {
      console.log("\n🏊 Updated LP Pool:");
      console.log("  Total Pool Value:", lpInfo.totalValueETHFormatted, "ETH");
      console.log("  LP Token Price:", lpInfo.lpTokenPriceFormatted, "ETH");
    }
    
    return result;
    
  } catch (error) {
    console.error("❌ Add liquidity failed:", error.message);
    throw error;
  }
}

// =============================================================================
// 7. PORTFOLIO MANAGEMENT
// =============================================================================

async function example7_GetUserPortfolio(agentLaunchpad, userAddress) {
  console.log("👤 Example 7: Get User Portfolio");
  
  try {
    const portfolio = await agentLaunchpad.getUserPortfolio(userAddress);
    
    console.log(`\n💼 Portfolio for ${userAddress}:`);
    console.log(`📊 Total Holdings: ${portfolio.length} different tokens`);
    
    let totalValue = 0;
    
    for (const holding of portfolio) {
      console.log(`\n  🎯 Agent ${holding.agentId} - ${holding.agent.name}`);
      
      if (parseFloat(holding.tokenBalanceFormatted) > 0) {
        console.log(`    💎 Tokens: ${holding.tokenBalanceFormatted}`);
        if (holding.tokenPrice.hasLiquidity) {
          const tokenValue = parseFloat(holding.tokenBalanceFormatted) * parseFloat(holding.tokenPrice.priceInETHFormatted);
          console.log(`    💰 Token Value: ${tokenValue.toFixed(6)} ETH`);
          totalValue += tokenValue;
        }
      }
      
      if (parseFloat(holding.lpBalanceFormatted) > 0) {
        console.log(`    🏊 LP Tokens: ${holding.lpBalanceFormatted}`);
        if (holding.lpInfo && holding.lpInfo.hasLPToken) {
          const lpValue = parseFloat(holding.lpBalanceFormatted) * parseFloat(holding.lpInfo.lpTokenPriceFormatted);
          console.log(`    💰 LP Value: ${lpValue.toFixed(6)} ETH`);
          totalValue += lpValue;
        }
      }
      
      console.log(`    📈 Total Position Value: ${holding.totalValueETH.totalValueFormatted} ETH`);
    }
    
    console.log(`\n💰 Total Portfolio Value: ${totalValue.toFixed(6)} ETH`);
    
    return portfolio;
    
  } catch (error) {
    console.error("❌ Get portfolio failed:", error.message);
    throw error;
  }
}

// =============================================================================
// 8. DASHBOARD & ANALYTICS
// =============================================================================

async function example8_GetDashboardData(agentLaunchpad) {
  console.log("📊 Example 8: Get Dashboard Analytics");
  
  try {
    const dashboard = await agentLaunchpad.getDashboardData();
    
    console.log("\n🏆 Platform Statistics:");
    console.log("  Total Agents:", dashboard.counts.totalAgents);
    console.log("  Bonded Agents:", dashboard.counts.bondedAgents);
    console.log("  In-Progress Agents:", dashboard.counts.inProgressAgents);
    console.log("  Liquidity Pools:", dashboard.liquidityPools.count);
    
    console.log("\n🔥 Top Bonded Tokens:");
    dashboard.bondedTokens.slice(0, 5).forEach((token, index) => {
      if (token.error) {
        console.log(`  ${index + 1}. Agent ${token.agentId} - Error: ${token.error}`);
      } else {
        console.log(`  ${index + 1}. ${token.agent.name} (Agent ${token.agentId})`);
        if (token.tokenPrice && token.tokenPrice.hasLiquidity) {
          console.log(`     Price: ${token.tokenPrice.priceInETHFormatted} ETH`);
          console.log(`     Market Cap: ${token.tokenPrice.marketCapFormatted} ETH`);
        }
        if (token.reserves && token.reserves.hasLiquidity) {
          console.log(`     Liquidity: ${token.reserves.reserveETHFormatted} ETH`);
        }
      }
    });
    
    return dashboard;
    
  } catch (error) {
    console.error("❌ Get dashboard failed:", error.message);
    throw error;
  }
}

// Get platform totals
async function example8b_GetPlatformTotals(agentLaunchpad) {
  console.log("📈 Example 8b: Get Platform Totals");
  
  try {
    const counts = await agentLaunchpad.getTotalCounts();
    const bondedTokens = await agentLaunchpad.getAllBondedTokens();
    
    console.log("\n📊 Platform Overview:");
    console.log("  Total Agents Created:", counts.totalAgents);
    console.log("  Successfully Bonded:", counts.bondedAgents);
    console.log("  Still Fundraising:", counts.inProgressAgents);
    console.log("  Success Rate:", ((counts.bondedAgents / counts.totalAgents) * 100).toFixed(1) + "%");
    
    // Calculate total market cap
    let totalMarketCap = 0;
    let priceableTokens = 0;
    
    for (const agentId of bondedTokens.agentIds) {
      try {
        const price = await agentLaunchpad.getTokenPrice(parseInt(agentId));
        if (price.hasLiquidity) {
          totalMarketCap += parseFloat(price.marketCapFormatted);
          priceableTokens++;
        }
      } catch (e) {
        // Skip tokens with pricing errors
      }
    }
    
    console.log("\n💰 Market Data:");
    console.log("  Tokens with Pricing:", priceableTokens, "/", bondedTokens.count);
    console.log("  Total Market Cap:", totalMarketCap.toFixed(4), "ETH");
    console.log("  Average Market Cap:", (totalMarketCap / priceableTokens).toFixed(4), "ETH");
    
    return { counts, bondedTokens, totalMarketCap, priceableTokens };
    
  } catch (error) {
    console.error("❌ Get platform totals failed:", error.message);
    throw error;
  }
}

// =============================================================================
// 9. PRICE MONITORING & ALERTS
// =============================================================================

async function example9_MonitorPrices(agentLaunchpad, agentIds, intervalSeconds = 30) {
  console.log("📡 Example 9: Monitor Token Prices");
  
  const priceHistory = new Map();
  
  const monitorPrices = async () => {
    console.log(`\n⏰ Price Check - ${new Date().toLocaleTimeString()}`);
    
    for (const agentId of agentIds) {
      try {
        const price = await agentLaunchpad.getTokenPrice(agentId);
        const agent = await agentLaunchpad.getAgent(agentId);
        
        if (price.hasLiquidity) {
          const currentPrice = parseFloat(price.priceInETHFormatted);
          const previousPrice = priceHistory.get(agentId);
          
          let changeEmoji = "📊";
          let changeText = "";
          
          if (previousPrice) {
            const change = ((currentPrice - previousPrice) / previousPrice) * 100;
            if (change > 0) {
              changeEmoji = "📈";
              changeText = ` (+${change.toFixed(2)}%)`;
            } else if (change < 0) {
              changeEmoji = "📉";
              changeText = ` (${change.toFixed(2)}%)`;
            } else {
              changeEmoji = "➡️";
              changeText = " (0%)";
            }
          }
          
          console.log(`  ${changeEmoji} ${agent.name}: ${currentPrice.toFixed(8)} ETH${changeText}`);
          priceHistory.set(agentId, currentPrice);
        } else {
          console.log(`  ❌ ${agent.name}: No liquidity`);
        }
        
      } catch (error) {
        console.log(`  ⚠️  Agent ${agentId}: Error - ${error.message}`);
      }
    }
  };
  
  // Run initial check
  await monitorPrices();
  
  // Set up interval monitoring
  const interval = setInterval(monitorPrices, intervalSeconds * 1000);
  
  console.log(`\n🔄 Price monitoring started. Checking every ${intervalSeconds} seconds.`);
  console.log("⏹️  Call clearInterval() to stop monitoring.");
  
  return interval;
}

// =============================================================================
// 10. ERROR HANDLING EXAMPLES
// =============================================================================

async function example10_ErrorHandling(agentLaunchpad) {
  console.log("⚠️  Example 10: Error Handling Patterns");
  
  // 1. Handle network errors
  try {
    console.log("\n🌐 Testing network error handling...");
    // This will fail if agent doesn't exist
    await agentLaunchpad.getAgent(9999);
  } catch (error) {
    console.log("✅ Caught network error:", error.message);
  }
  
  // 2. Handle insufficient funds
  try {
    console.log("\n💸 Testing insufficient funds error...");
    // This will fail if user doesn't have enough ETH
    await agentLaunchpad.contribute(0, 1000); // 1000 ETH
  } catch (error) {
    console.log("✅ Caught insufficient funds error:", error.message);
  }
  
  // 3. Handle slippage errors
  try {
    console.log("\n📈 Testing slippage error...");
    // This might fail with high slippage
    await agentLaunchpad.swapETHForTokens(0, 0.1, { slippage: 0.1 }); // 0.1% slippage
  } catch (error) {
    console.log("✅ Caught slippage error:", error.message);
  }
  
  // 4. Graceful error handling wrapper
  const safeOperation = async (operation, operationName) => {
    try {
      console.log(`\n🔄 Executing ${operationName}...`);
      const result = await operation();
      console.log(`✅ ${operationName} successful!`);
      return { success: true, result };
    } catch (error) {
      console.log(`❌ ${operationName} failed:`, error.message);
      return { success: false, error: error.message };
    }
  };
  
  // Example usage of safe wrapper
  const results = await Promise.allSettled([
    safeOperation(() => agentLaunchpad.getAgent(0), "Get Agent 0"),
    safeOperation(() => agentLaunchpad.getAgent(1), "Get Agent 1"),
    safeOperation(() => agentLaunchpad.getAgent(999), "Get Agent 999")
  ]);
  
  console.log("\n📋 Batch operation results:");
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      console.log(`  ✅ Operation ${index + 1}: Success`);
    } else {
      console.log(`  ❌ Operation ${index + 1}: Failed`);
    }
  });
}

// =============================================================================
// 11. COMPLETE WORKFLOW EXAMPLE
// =============================================================================

async function example11_CompleteWorkflow() {
  console.log("🚀 Example 11: Complete Agent Lifecycle Workflow");
  
  try {
    // 1. Initialize system
    console.log("\n🔧 Step 1: Initialize System");
    const agentLaunchpad = await example1_InitializeSystem();
    
    // 2. Create agent
    console.log("\n🎨 Step 2: Create Agent");
    const agentId = await example2_CreateAgent(agentLaunchpad);
    
    // 3. Contribute to complete funding (triggers auto-bonding)
    console.log("\n💰 Step 3: Complete Funding");
    await example3b_CompleteFunding(agentLaunchpad, agentId);
    
    // 4. Get comprehensive data
    console.log("\n📊 Step 4: Get Agent Data");
    const agentData = await example4_GetAgentData(agentLaunchpad, agentId);
    
    // 5. Execute a trade
    if (agentData.agent.isBonded) {
      console.log("\n🔄 Step 5: Execute Trade");
      await example5_SwapETHForTokens(agentLaunchpad, agentId);
    }
    
    // 6. Add liquidity
    if (agentData.agent.isBonded) {
      console.log("\n🏊 Step 6: Add Liquidity");
      await example6_AddLiquidity(agentLaunchpad, agentId);
    }
    
    // 7. Check portfolio
    console.log("\n👤 Step 7: Check Portfolio");
    const signer = agentLaunchpad.signer;
    if (signer) {
      const userAddress = await signer.getAddress();
      await example7_GetUserPortfolio(agentLaunchpad, userAddress);
    }
    
    console.log("\n🎉 Complete workflow finished successfully!");
    
  } catch (error) {
    console.error("❌ Workflow failed:", error.message);
    throw error;
  }
}

// =============================================================================
// 12. BATCH OPERATIONS
// =============================================================================

async function example12_BatchOperations(agentLaunchpad) {
  console.log("🔄 Example 12: Batch Operations");
  
  try {
    // Get all bonded tokens
    const bondedTokens = await agentLaunchpad.getAllBondedTokens();
    console.log(`\n📊 Processing ${bondedTokens.count} bonded tokens...`);
    
    // Batch get pricing data
    const pricingPromises = bondedTokens.agentIds.map(async (agentId) => {
      try {
        const [agent, price, reserves] = await Promise.all([
          agentLaunchpad.getAgent(parseInt(agentId)),
          agentLaunchpad.getTokenPrice(parseInt(agentId)),
          agentLaunchpad.getPoolReserves(parseInt(agentId))
        ]);
        
        return {
          agentId,
          name: agent.name,
          price: price.priceInETHFormatted,
          marketCap: price.marketCapFormatted,
          liquidity: reserves.reserveETHFormatted,
          hasLiquidity: price.hasLiquidity
        };
      } catch (error) {
        return {
          agentId,
          error: error.message
        };
      }
    });
    
    const pricingData = await Promise.allSettled(pricingPromises);
    
    console.log("\n💹 Batch Pricing Results:");
    pricingData.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.error) {
          console.log(`  ❌ Agent ${data.agentId}: ${data.error}`);
        } else {
          console.log(`  ✅ ${data.name}: ${data.price} ETH (MC: ${data.marketCap} ETH)`);
        }
      } else {
        console.log(`  ⚠️  Promise ${index} rejected:`, result.reason);
      }
    });
    
    return pricingData;
    
  } catch (error) {
    console.error("❌ Batch operations failed:", error.message);
    throw error;
  }
}

// =============================================================================
// EXPORT ALL EXAMPLES
// =============================================================================

const examples = {
  // Initialization
  initializeSystem: example1_InitializeSystem,
  manualInitialization: example1b_ManualInitialization,
  
  // Agent Creation
  createAgent: example2_CreateAgent,
  
  // Contributing
  contributeToAgent: example3_ContributeToAgent,
  completeFunding: example3b_CompleteFunding,
  
  // Data Retrieval
  getAgentData: example4_GetAgentData,
  getAllBondedTokens: example4b_GetAllBondedTokens,
  
  // Trading
  swapETHForTokens: example5_SwapETHForTokens,
  swapTokensForETH: example5b_SwapTokensForETH,
  
  // Liquidity
  addLiquidity: example6_AddLiquidity,
  
  // Portfolio
  getUserPortfolio: example7_GetUserPortfolio,
  
  // Analytics
  getDashboardData: example8_GetDashboardData,
  getPlatformTotals: example8b_GetPlatformTotals,
  
  // Monitoring
  monitorPrices: example9_MonitorPrices,
  
  // Error Handling
  errorHandling: example10_ErrorHandling,
  
  // Complete Workflows
  completeWorkflow: example11_CompleteWorkflow,
  batchOperations: example12_BatchOperations
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = examples;
}

if (typeof window !== 'undefined') {
  window.AgentLaunchpadExamples = examples;
}

// =============================================================================
// QUICK START GUIDE
// =============================================================================

console.log(`
🚀 AgentLaunchpad V2 Ultra - Usage Examples Loaded!

📋 QUICK START:
1. await example1_InitializeSystem()
2. await example2_CreateAgent(agentLaunchpad)
3. await example3b_CompleteFunding(agentLaunchpad, agentId)
4. await example5_SwapETHForTokens(agentLaunchpad, agentId)

🔗 CONTRACT ADDRESSES:
- Core: 0xD8857d39F9F7956cAc9fDE2F202da3Fe6D01afa4
- AMM:  0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083

⚡ KEY FEATURES:
✅ Auto-bonding when funding target reached
✅ Real-time pricing and analytics
✅ Multi-wallet support
✅ Complete trading infrastructure

🎯 Run examples.completeWorkflow() for full demo!
`); 