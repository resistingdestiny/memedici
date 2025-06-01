const { ethers } = require("ethers");
require('dotenv').config({ path: '../.env' });

// Contract addresses (deployed on Flow Testnet)
const LAUNCHPAD_CORE_ADDRESS = "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE";
const LIQUIDITY_MANAGER_ADDRESS = "0xB4DA9838fAbA1A6195662DFED22f840b52aa4169";

// Flow Testnet configuration
const FLOW_TESTNET_RPC = "https://testnet.evm.nodes.onflow.org";
const CHAIN_ID = 545;

// ABIs for testing
const LaunchpadCoreABI = [
  "function createAgent(string name, string symbol, string agentName, string archetype, string metadataURI, uint256 fundingTarget, uint256 tokenSupply, string agentConfigJSON) external returns (uint256)",
  "function contribute(uint256 agentId) external payable",
  "function bondAgent(uint256 agentId) external",
  "function getAgentInfo(uint256 agentId) external view returns (string, string, uint256, uint256, bool, address, address, address, string)",
  "function getAgentConfigJSON(uint256 agentId) external view returns (string)",
  "function getContribution(uint256 agentId, address contributor) external view returns (uint256)",
  "function getCurrentAgentId() external view returns (uint256)",
  "function isAgentBonded(uint256 agentId) external view returns (bool)",
  "function getLiquidityPool(uint256 agentId) external view returns (address)",
  "function treasuryAddress() external view returns (address)",
  "function protocolFeePercentage() external view returns (uint256)"
];

// Test agent data (GasMask from the JSON)
const testAgent = {
  "id": "d43b230c-c53f-453c-9701-fc4b1949d616",
  "display_name": "GasMask",
  "avatar_url": "static/examples/GasMask.png",
  "archetype": "on-chain cryptopoet",
  "core_traits": ["cryptic", "intense", "abstract"],
  "origin_story": "Born from a failed contract render, GasMask distills gas flows into glitch verses.",
  "primary_mediums": ["ascii art", "glitch", "chain-mapping"],
  "signature_motifs": ["gas clouds", "fee traces"],
  "influences": ["XCOPY", "code poetry", "0xmons"],
  "colour_palette": ["#e5caf6", "#8b6747", "#68d673", "#738209", "#3f2a81"],
  "blockchain_seed": 1847329156,
  "studio_id": "milady_matrix",
  "agent_type": "creative_artist",
  "model_name": "gpt-4",
  "temperature": 1.3,
  "tools_enabled": ["generate_image"],
  "custom_tools": [],
  "memory_enabled": true,
  "structured_output": false
};

async function setupWallet() {
  console.log("🔧 Setting up wallet and provider...");
  
  // Check for private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in environment variables");
  }
  
  console.log("✅ Private key found");
  console.log("🌐 Connecting to Flow Testnet:", FLOW_TESTNET_RPC);
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(FLOW_TESTNET_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Get network info
  const network = await provider.getNetwork();
  console.log("🌐 Connected to network:", network.name, "Chain ID:", network.chainId.toString());
  
  // Check wallet balance
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Wallet address:", wallet.address);
  console.log("💰 Wallet balance:", ethers.formatEther(balance), "FLOW");
  
  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  Low balance - you may need more FLOW for transactions");
  }
  
  // Create contract instance
  const launchpadCore = new ethers.Contract(LAUNCHPAD_CORE_ADDRESS, LaunchpadCoreABI, wallet);
  
  return { provider, wallet, launchpadCore };
}

async function testReadFunctions() {
  console.log("\n📖 Testing READ functions...");
  
  const { launchpadCore, wallet } = await setupWallet();
  
  try {
    // Test basic contract connectivity
    console.log("🔍 Getting current agent ID...");
    const currentAgentId = await launchpadCore.getCurrentAgentId();
    console.log("✅ Current Agent ID:", currentAgentId.toString());
    
    // Test treasury address
    console.log("🔍 Getting treasury address...");
    const treasury = await launchpadCore.treasuryAddress();
    console.log("✅ Treasury Address:", treasury);
    
    // Test protocol fee
    console.log("🔍 Getting protocol fee...");
    const fee = await launchpadCore.protocolFeePercentage();
    console.log("✅ Protocol Fee:", fee.toString(), "basis points");
    
    // If agents exist, read their info
    if (currentAgentId > 0n) {
      console.log("\n📋 Reading existing agents...");
      
      for (let i = 0; i < currentAgentId && i < 3; i++) {
        console.log(`\n--- Agent ${i} ---`);
        
        try {
          const agentInfo = await launchpadCore.getAgentInfo(i);
          const [name, agentName, fundingTarget, totalRaised, isBonded, creator, tokenAddress, lpPairAddress] = agentInfo;
          
          console.log("  Token Name:", name);
          console.log("  Agent Name:", agentName);
          console.log("  Funding Target:", ethers.formatEther(fundingTarget), "FLOW");
          console.log("  Total Raised:", ethers.formatEther(totalRaised), "FLOW");
          console.log("  Is Bonded:", isBonded);
          console.log("  Creator:", creator);
          console.log("  Token Address:", tokenAddress);
          console.log("  LP Pair Address:", lpPairAddress);
          
          // Check user's contribution
          const userContribution = await launchpadCore.getContribution(i, wallet.address);
          console.log("  Your Contribution:", ethers.formatEther(userContribution), "FLOW");
          
          // Get agent config JSON (first 200 chars)
          const configJSON = await launchpadCore.getAgentConfigJSON(i);
          console.log("  Config Preview:", configJSON.substring(0, 200) + "...");
          
        } catch (error) {
          console.log("  ❌ Error reading agent", i, ":", error.message);
        }
      }
    } else {
      console.log("📝 No agents created yet");
    }
    
    console.log("\n✅ Read functions test completed successfully!");
    return true;
    
  } catch (error) {
    console.error("❌ Read functions test failed:", error.message);
    return false;
  }
}

async function testCreateAgent() {
  console.log("\n🎨 Testing CREATE AGENT function...");
  
  const { launchpadCore } = await setupWallet();
  
  try {
    // Prepare agent parameters
    const name = `${testAgent.display_name} Token Test`;
    const symbol = "GMTEST";
    const agentName = testAgent.display_name;
    const archetype = testAgent.archetype;
    const metadataURI = `ipfs://QmTestHash/${testAgent.id}`;
    const fundingTarget = ethers.parseEther("2"); // 2 FLOW (small for testing)
    const tokenSupply = ethers.parseUnits("100000", 18); // 100K tokens
    const agentConfigJSON = JSON.stringify(testAgent, null, 2);
    
    console.log("📋 Agent Parameters:");
    console.log("  Name:", name);
    console.log("  Symbol:", symbol);
    console.log("  Agent Name:", agentName);
    console.log("  Archetype:", archetype);
    console.log("  Funding Target:", ethers.formatEther(fundingTarget), "FLOW");
    console.log("  Token Supply:", ethers.formatUnits(tokenSupply, 18));
    
    // Estimate gas
    console.log("\n⛽ Estimating gas...");
    const gasEstimate = await launchpadCore.createAgent.estimateGas(
      name,
      symbol,
      agentName,
      archetype,
      metadataURI,
      fundingTarget,
      tokenSupply,
      agentConfigJSON
    );
    console.log("✅ Gas estimate:", gasEstimate.toString());
    
    // Send transaction
    console.log("\n📤 Sending create agent transaction...");
    const tx = await launchpadCore.createAgent(
      name,
      symbol,
      agentName,
      archetype,
      metadataURI,
      fundingTarget,
      tokenSupply,
      agentConfigJSON,
      {
        gasLimit: gasEstimate * 110n / 100n // 10% buffer
      }
    );
    
    console.log("✅ Transaction sent! Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    
    // Parse events to get agent ID
    const agentCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = launchpadCore.interface.parseLog(log);
        return parsed.name === "AgentCreated";
      } catch {
        return false;
      }
    });
    
    if (agentCreatedEvent) {
      const parsed = launchpadCore.interface.parseLog(agentCreatedEvent);
      const agentId = parsed.args[0];
      console.log("🎉 Agent created successfully with ID:", agentId.toString());
      return agentId;
    } else {
      console.log("⚠️  Agent created but couldn't find AgentCreated event");
      return null;
    }
    
  } catch (error) {
    console.error("❌ Create agent test failed:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    return null;
  }
}

async function testContribute(agentId) {
  console.log(`\n💰 Testing CONTRIBUTE function for Agent ID ${agentId}...`);
  
  const { launchpadCore } = await setupWallet();
  
  try {
    const contributionAmount = ethers.parseEther("0.5"); // 0.5 FLOW
    
    console.log("📋 Contribution Parameters:");
    console.log("  Agent ID:", agentId.toString());
    console.log("  Amount:", ethers.formatEther(contributionAmount), "FLOW");
    
    // Estimate gas
    console.log("\n⛽ Estimating gas...");
    const gasEstimate = await launchpadCore.contribute.estimateGas(agentId, {
      value: contributionAmount
    });
    console.log("✅ Gas estimate:", gasEstimate.toString());
    
    // Send transaction
    console.log("\n📤 Sending contribute transaction...");
    const tx = await launchpadCore.contribute(agentId, {
      value: contributionAmount,
      gasLimit: gasEstimate * 110n / 100n
    });
    
    console.log("✅ Transaction sent! Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    
    // Check if contribution was recorded
    const { wallet } = await setupWallet();
    const userContribution = await launchpadCore.getContribution(agentId, wallet.address);
    console.log("🎉 Your total contribution:", ethers.formatEther(userContribution), "FLOW");
    
    return true;
    
  } catch (error) {
    console.error("❌ Contribute test failed:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    return false;
  }
}

async function testBondAgent(agentId) {
  console.log(`\n🔗 Testing BOND AGENT function for Agent ID ${agentId}...`);
  
  const { launchpadCore } = await setupWallet();
  
  try {
    // Check if agent can be bonded
    const agentInfo = await launchpadCore.getAgentInfo(agentId);
    const [name, agentName, fundingTarget, totalRaised, isBonded] = agentInfo;
    
    console.log("📊 Agent Status:");
    console.log("  Name:", name);
    console.log("  Funding Target:", ethers.formatEther(fundingTarget), "FLOW");
    console.log("  Total Raised:", ethers.formatEther(totalRaised), "FLOW");
    console.log("  Is Bonded:", isBonded);
    
    if (isBonded) {
      console.log("⚠️  Agent is already bonded");
      return false;
    }
    
    if (totalRaised < fundingTarget) {
      console.log("⚠️  Funding target not yet met. Need", ethers.formatEther(fundingTarget - totalRaised), "more FLOW");
      return false;
    }
    
    // Estimate gas
    console.log("\n⛽ Estimating gas...");
    const gasEstimate = await launchpadCore.bondAgent.estimateGas(agentId);
    console.log("✅ Gas estimate:", gasEstimate.toString());
    
    // Send transaction
    console.log("\n📤 Sending bond agent transaction...");
    const tx = await launchpadCore.bondAgent(agentId, {
      gasLimit: gasEstimate * 110n / 100n
    });
    
    console.log("✅ Transaction sent! Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    
    // Check if agent is now bonded
    const nowBonded = await launchpadCore.isAgentBonded(agentId);
    console.log("🎉 Agent bonded status:", nowBonded);
    
    return true;
    
  } catch (error) {
    console.error("❌ Bond agent test failed:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    return false;
  }
}

async function runFullTest() {
  console.log("🚀 Running FULL TRANSACTION TEST");
  console.log("================================");
  
  try {
    // Step 1: Test read functions
    const readSuccess = await testReadFunctions();
    if (!readSuccess) {
      console.log("❌ Read test failed, stopping");
      return;
    }
    
    // Step 2: Create an agent
    const agentId = await testCreateAgent();
    if (agentId === null) {
      console.log("❌ Agent creation failed, stopping");
      return;
    }
    
    // Step 3: Contribute to the agent
    const contributeSuccess = await testContribute(agentId);
    if (!contributeSuccess) {
      console.log("❌ Contribution failed, but continuing...");
    }
    
    // Step 4: Try to bond (might not work if funding target not met)
    const bondSuccess = await testBondAgent(agentId);
    if (!bondSuccess) {
      console.log("⚠️  Bonding not possible (likely due to insufficient funding)");
    }
    
    console.log("\n🎉 FULL TEST COMPLETED!");
    console.log("Summary:");
    console.log("  ✅ Read functions: SUCCESS");
    console.log("  ✅ Create agent: SUCCESS - Agent ID", agentId.toString());
    console.log("  " + (contributeSuccess ? "✅" : "❌") + " Contribute:", contributeSuccess ? "SUCCESS" : "FAILED");
    console.log("  " + (bondSuccess ? "✅" : "⚠️ ") + " Bond agent:", bondSuccess ? "SUCCESS" : "NOT READY");
    
  } catch (error) {
    console.error("❌ Full test failed:", error.message);
  }
}

// Export functions for individual testing
module.exports = {
  setupWallet,
  testReadFunctions,
  testCreateAgent,
  testContribute,
  testBondAgent,
  runFullTest
};

// Run full test if called directly
if (require.main === module) {
  runFullTest();
} 