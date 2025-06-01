const { ethers } = require("ethers");

// Contract addresses (replace with your deployed addresses)
const LAUNCHPAD_CORE_ADDRESS = "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE";
const LIQUIDITY_MANAGER_ADDRESS = "0xB4DA9838fAbA1A6195662DFED22f840b52aa4169";

// ABIs (simplified for examples)
const LaunchpadCoreABI = [
  "function createAgent(string name, string symbol, string agentName, string archetype, string metadataURI, uint256 fundingTarget, uint256 tokenSupply, string agentConfigJSON) external returns (uint256)",
  "function contribute(uint256 agentId) external payable",
  "function bondAgent(uint256 agentId) external",
  "function getAgentInfo(uint256 agentId) external view returns (string, string, uint256, uint256, bool, address, address, address, string)",
  "function getAgentConfigJSON(uint256 agentId) external view returns (string)",
  "function getContribution(uint256 agentId, address contributor) external view returns (uint256)",
  "function getCurrentAgentId() external view returns (uint256)",
  "function isAgentBonded(uint256 agentId) external view returns (bool)",
  "function getLiquidityPool(uint256 agentId) external view returns (address)"
];

// Sample agent data from memedici_crypto_artist_agents.json
const sampleAgents = [
  {
    "id": "d43b230c-c53f-453c-9701-fc4b1949d616",
    "display_name": "GasMask",
    "archetype": "on-chain cryptopoet",
    "core_traits": ["cryptic", "intense", "abstract"],
    "origin_story": "Born from a failed contract render, GasMask distills gas flows into glitch verses.",
    "primary_mediums": ["ascii art", "glitch", "chain-mapping"],
    "signature_motifs": ["gas clouds", "fee traces"],
    "influences": ["XCOPY", "code poetry", "0xmons"],
    "colour_palette": ["#e5caf6", "#8b6747", "#68d673", "#738209", "#3f2a81"],
    "blockchain_seed": 1847329156
  },
  {
    "id": "0c99f977-c501-4071-9c52-fc69b3c9a9bd",
    "display_name": "DaoVinci",
    "archetype": "collaborative coder-artist",
    "core_traits": ["communal", "systemic", "organic"],
    "origin_story": "Forged through DAO creative bounties, DaoVinci lives for collective visual synthesis.",
    "primary_mediums": ["procedural art", "generative geometry"],
    "blockchain_seed": 1847329156
  }
];

async function setupProvider() {
  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider("https://testnet.evm.nodes.onflow.org");
  const privateKey = process.env.PRIVATE_KEY; // Your wallet private key
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Contract instance
  const launchpadCore = new ethers.Contract(LAUNCHPAD_CORE_ADDRESS, LaunchpadCoreABI, wallet);
  
  return { provider, wallet, launchpadCore };
}

// =============================================================================
// 1. CREATE AGENT FUNCTION
// =============================================================================

async function createAgentExample() {
  const { launchpadCore } = await setupProvider();
  
  // Using GasMask agent as example
  const agent = sampleAgents[0];
  
  // Function parameters
  const name = "GasMask Token";
  const symbol = "GMASK";
  const agentName = agent.display_name;
  const archetype = agent.archetype;
  const metadataURI = `ipfs://QmYourMetadataHash/${agent.id}`;
  const fundingTarget = ethers.parseEther("10"); // 10 FLOW funding target
  const tokenSupply = ethers.parseUnits("1000000", 18); // 1M tokens
  const agentConfigJSON = JSON.stringify(agent);
  
  try {
    console.log("🚀 Creating Agent: GasMask");
    
    // Estimate gas
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
    
    console.log("📊 Gas Estimate:", gasEstimate.toString());
    
    // Send transaction
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
        gasLimit: gasEstimate * 110n / 100n // Add 10% buffer
      }
    );
    
    console.log("📝 Transaction Hash:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("✅ Transaction Confirmed. Block:", receipt.blockNumber);
    
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
      console.log("🎉 Agent Created with ID:", agentId.toString());
      return agentId;
    }
    
  } catch (error) {
    console.error("❌ Error creating agent:", error);
  }
}

// Alternative: Create agent with raw transaction data
async function createAgentRawTransaction() {
  const { provider, wallet } = await setupProvider();
  
  const agent = sampleAgents[1]; // DaoVinci
  
  // Encode function call
  const iface = new ethers.Interface(LaunchpadCoreABI);
  const data = iface.encodeFunctionData("createAgent", [
    "DaoVinci Token",
    "DVINCI",
    agent.display_name,
    agent.archetype,
    `ipfs://QmYourMetadataHash/${agent.id}`,
    ethers.parseEther("5"), // 5 FLOW funding target
    ethers.parseUnits("500000", 18), // 500K tokens
    JSON.stringify(agent)
  ]);
  
  const txRequest = {
    to: LAUNCHPAD_CORE_ADDRESS,
    data: data,
    value: 0,
    gasLimit: 2000000 // Adjust based on gas estimation
  };
  
  console.log("📄 Raw Transaction Data:");
  console.log("To:", txRequest.to);
  console.log("Data:", txRequest.data);
  console.log("Value:", txRequest.value);
  
  const tx = await wallet.sendTransaction(txRequest);
  console.log("📝 Transaction Hash:", tx.hash);
  
  return tx;
}

// =============================================================================
// 2. CONTRIBUTE TO AGENT FUNCTION
// =============================================================================

async function contributeToAgentExample(agentId) {
  const { launchpadCore } = await setupProvider();
  
  const contributionAmount = ethers.parseEther("2.5"); // 2.5 FLOW
  
  try {
    console.log(`💰 Contributing ${ethers.formatEther(contributionAmount)} FLOW to Agent ID: ${agentId}`);
    
    // Estimate gas
    const gasEstimate = await launchpadCore.contribute.estimateGas(agentId, {
      value: contributionAmount
    });
    
    console.log("📊 Gas Estimate:", gasEstimate.toString());
    
    // Send transaction
    const tx = await launchpadCore.contribute(agentId, {
      value: contributionAmount,
      gasLimit: gasEstimate * 110n / 100n
    });
    
    console.log("📝 Transaction Hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Contribution Confirmed. Block:", receipt.blockNumber);
    
  } catch (error) {
    console.error("❌ Error contributing:", error);
  }
}

// =============================================================================
// 3. BOND AGENT FUNCTION (Manual)
// =============================================================================

async function bondAgentExample(agentId) {
  const { launchpadCore } = await setupProvider();
  
  try {
    console.log(`🔗 Manually bonding Agent ID: ${agentId}`);
    
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
      return;
    }
    
    if (totalRaised < fundingTarget) {
      console.log("⚠️  Funding target not yet met");
      return;
    }
    
    // Estimate gas
    const gasEstimate = await launchpadCore.bondAgent.estimateGas(agentId);
    console.log("📊 Gas Estimate:", gasEstimate.toString());
    
    // Send transaction
    const tx = await launchpadCore.bondAgent(agentId, {
      gasLimit: gasEstimate * 110n / 100n
    });
    
    console.log("📝 Transaction Hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Agent Bonded. Block:", receipt.blockNumber);
    
  } catch (error) {
    console.error("❌ Error bonding agent:", error);
  }
}

// =============================================================================
// 4. READ FUNCTIONS (VIEW CALLS)
// =============================================================================

async function readFunctionsExample() {
  const { launchpadCore } = await setupProvider();
  
  try {
    console.log("📖 Reading contract state...");
    
    // Get current agent ID counter
    const currentAgentId = await launchpadCore.getCurrentAgentId();
    console.log("🔢 Current Agent ID Counter:", currentAgentId.toString());
    
    // If agents exist, read info about the first one
    if (currentAgentId > 0n) {
      const agentId = 0n; // First agent
      
      // Get full agent info
      const agentInfo = await launchpadCore.getAgentInfo(agentId);
      const [name, agentName, fundingTarget, totalRaised, isBonded, creator, tokenAddress, lpPairAddress] = agentInfo;
      
      console.log(`📋 Agent ${agentId} Info:`);
      console.log("  Token Name:", name);
      console.log("  Agent Name:", agentName);
      console.log("  Funding Target:", ethers.formatEther(fundingTarget), "FLOW");
      console.log("  Total Raised:", ethers.formatEther(totalRaised), "FLOW");
      console.log("  Is Bonded:", isBonded);
      console.log("  Creator:", creator);
      console.log("  Token Address:", tokenAddress);
      console.log("  LP Pair Address:", lpPairAddress);
      
      // Get agent configuration JSON
      const agentConfigJSON = await launchpadCore.getAgentConfigJSON(agentId);
      console.log("🎨 Agent Config JSON:");
      console.log(JSON.stringify(JSON.parse(agentConfigJSON), null, 2));
      
      // Check if agent is bonded
      const bonded = await launchpadCore.isAgentBonded(agentId);
      console.log("🔗 Is Bonded:", bonded);
      
      // Get LP pool address
      const lpPool = await launchpadCore.getLiquidityPool(agentId);
      console.log("🏊 LP Pool Address:", lpPool);
      
      // Get contribution for a specific address
      const userAddress = "0x257bD0cD8b6059665Af852Eb37114bfF1Aa5DaAA";
      const contribution = await launchpadCore.getContribution(agentId, userAddress);
      console.log(`💰 Contribution from ${userAddress}:`, ethers.formatEther(contribution), "FLOW");
    }
    
  } catch (error) {
    console.error("❌ Error reading contract state:", error);
  }
}

// =============================================================================
// 5. BATCH OPERATIONS
// =============================================================================

async function createMultipleAgentsExample() {
  console.log("🚀 Creating multiple agents from JSON data...");
  
  const agentIds = [];
  
  for (let i = 0; i < sampleAgents.length; i++) {
    const agent = sampleAgents[i];
    
    console.log(`\n📦 Creating Agent ${i + 1}/${sampleAgents.length}: ${agent.display_name}`);
    
    try {
      const { launchpadCore } = await setupProvider();
      
      const name = `${agent.display_name} Token`;
      const symbol = agent.display_name.toUpperCase().slice(0, 6);
      const agentName = agent.display_name;
      const archetype = agent.archetype;
      const metadataURI = `ipfs://QmYourMetadataHash/${agent.id}`;
      const fundingTarget = ethers.parseEther((Math.random() * 20 + 5).toFixed(2)); // Random 5-25 FLOW
      const tokenSupply = ethers.parseUnits("1000000", 18);
      const agentConfigJSON = JSON.stringify(agent);
      
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
          gasLimit: 2000000
        }
      );
      
      console.log(`📝 Transaction Hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Agent created in block: ${receipt.blockNumber}`);
      
      // Extract agent ID from events
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
        agentIds.push(agentId);
        console.log(`🎉 Agent ID: ${agentId}`);
      }
      
      // Wait a bit between transactions to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error creating ${agent.display_name}:`, error);
    }
  }
  
  console.log("\n🎯 Summary:");
  console.log("Created Agent IDs:", agentIds.map(id => id.toString()));
  
  return agentIds;
}

// =============================================================================
// 6. EVENT LISTENING
// =============================================================================

async function listenToEventsExample() {
  const { provider, launchpadCore } = await setupProvider();
  
  console.log("👂 Setting up event listeners...");
  
  // Listen for AgentCreated events
  launchpadCore.on("AgentCreated", (agentId, creator, tokenAddress, agentName, agentConfigJSON, event) => {
    console.log("\n🎉 New Agent Created:");
    console.log("  Agent ID:", agentId.toString());
    console.log("  Creator:", creator);
    console.log("  Token Address:", tokenAddress);
    console.log("  Agent Name:", agentName);
    console.log("  Block:", event.log.blockNumber);
  });
  
  // Listen for Contributed events
  launchpadCore.on("Contributed", (agentId, contributor, amount, totalRaised, event) => {
    console.log("\n💰 New Contribution:");
    console.log("  Agent ID:", agentId.toString());
    console.log("  Contributor:", contributor);
    console.log("  Amount:", ethers.formatEther(amount), "FLOW");
    console.log("  Total Raised:", ethers.formatEther(totalRaised), "FLOW");
    console.log("  Block:", event.log.blockNumber);
  });
  
  // Listen for AgentBonded events
  launchpadCore.on("AgentBonded", (agentId, tokenAddress, lpPairAddress, agentConfigJSON, event) => {
    console.log("\n🔗 Agent Bonded:");
    console.log("  Agent ID:", agentId.toString());
    console.log("  Token Address:", tokenAddress);
    console.log("  LP Pair Address:", lpPairAddress);
    console.log("  Block:", event.log.blockNumber);
  });
  
  console.log("✅ Event listeners active. Monitoring for new events...");
}

// =============================================================================
// 7. USAGE EXAMPLES
// =============================================================================

async function fullWorkflowExample() {
  console.log("🎬 Running full workflow example...");
  
  try {
    // 1. Create an agent
    console.log("\n--- Step 1: Create Agent ---");
    const agentId = await createAgentExample();
    
    if (!agentId) {
      console.log("❌ Agent creation failed, stopping workflow");
      return;
    }
    
    // 2. Read agent info
    console.log("\n--- Step 2: Read Agent Info ---");
    await readFunctionsExample();
    
    // 3. Contribute to the agent
    console.log("\n--- Step 3: Contribute to Agent ---");
    await contributeToAgentExample(agentId);
    
    // 4. Check if we can bond (might need more contributions)
    console.log("\n--- Step 4: Check Bonding Status ---");
    await bondAgentExample(agentId);
    
    console.log("\n🎉 Workflow completed!");
    
  } catch (error) {
    console.error("❌ Workflow error:", error);
  }
}

// Export functions for use
module.exports = {
  createAgentExample,
  createAgentRawTransaction,
  contributeToAgentExample,
  bondAgentExample,
  readFunctionsExample,
  createMultipleAgentsExample,
  listenToEventsExample,
  fullWorkflowExample,
  setupProvider
};

// Run example if called directly
if (require.main === module) {
  // Example usage:
  console.log("🚀 AgentLaunchpad Transaction Examples");
  console.log("Available functions:");
  console.log("- createAgentExample()");
  console.log("- contributeToAgentExample(agentId)");
  console.log("- bondAgentExample(agentId)");
  console.log("- readFunctionsExample()");
  console.log("- createMultipleAgentsExample()");
  console.log("- fullWorkflowExample()");
  
  // Uncomment to run specific examples:
  // fullWorkflowExample();
  // createMultipleAgentsExample();
  // readFunctionsExample();
} 