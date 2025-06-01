const { ethers } = require("ethers");
require('dotenv').config({ path: '../.env' });

// Contract addresses
const LAUNCHPAD_CORE_ADDRESS = "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE";
const FLOW_TESTNET_RPC = "https://testnet.evm.nodes.onflow.org";

// ABIs
const LaunchpadCoreABI = [
  "function createAgent(string name, string symbol, string agentName, string archetype, string metadataURI, uint256 fundingTarget, uint256 tokenSupply, string agentConfigJSON) external returns (uint256)",
  "function getAgentInfo(uint256 agentId) external view returns (string, string, uint256, uint256, bool, address, address, address, string)",
  "function getAgentConfigJSON(uint256 agentId) external view returns (string)",
  "function getCurrentAgentId() external view returns (uint256)",
  "event AgentCreated(uint256 indexed agentId, address indexed creator, address tokenAddress, string agentName, string agentConfigJSON)"
];

async function checkAgentCreation() {
  console.log("🔍 Checking agent creation status...");
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(FLOW_TESTNET_RPC);
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);
  const launchpadCore = new ethers.Contract(LAUNCHPAD_CORE_ADDRESS, LaunchpadCoreABI, wallet);
  
  console.log("💰 Wallet address:", wallet.address);
  
  try {
    // Check current agent ID
    const currentAgentId = await launchpadCore.getCurrentAgentId();
    console.log("📊 Current Agent ID:", currentAgentId.toString());
    
    if (currentAgentId > 0n) {
      console.log(`\n📋 Found ${currentAgentId} agent(s). Reading details...\n`);
      
      for (let i = 0; i < currentAgentId; i++) {
        console.log(`--- Agent ${i} ---`);
        
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
          
          // Check if this is our agent
          if (creator.toLowerCase() === wallet.address.toLowerCase()) {
            console.log("  🎉 THIS IS YOUR AGENT!");
            
            // Get full config JSON
            const configJSON = await launchpadCore.getAgentConfigJSON(i);
            console.log("  📝 Agent Config JSON:");
            try {
              const parsed = JSON.parse(configJSON);
              console.log("    Display Name:", parsed.display_name);
              console.log("    Archetype:", parsed.archetype);
              console.log("    Core Traits:", parsed.core_traits);
              console.log("    Origin Story:", parsed.origin_story);
              console.log("    Full JSON Length:", configJSON.length, "characters");
            } catch (jsonError) {
              console.log("    Raw JSON:", configJSON.substring(0, 200) + "...");
            }
          }
          
        } catch (error) {
          console.log("  ❌ Error reading agent", i, ":", error.message);
        }
        
        console.log("");
      }
    } else {
      console.log("📝 No agents found");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

async function checkTransactionLogs() {
  console.log("\n🔍 Checking recent transaction logs...");
  
  const provider = new ethers.JsonRpcProvider(FLOW_TESTNET_RPC);
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Check the specific transaction that was supposed to create the agent
  const txHash = "0x51083310294917b7c56fc9995b79d0680576b269095ac78641e1391755877113";
  
  try {
    console.log("📝 Getting transaction receipt for:", txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (receipt) {
      console.log("✅ Transaction found!");
      console.log("  Block Number:", receipt.blockNumber);
      console.log("  Gas Used:", receipt.gasUsed.toString());
      console.log("  Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
      console.log("  Number of logs:", receipt.logs.length);
      
      // Try to parse logs
      const iface = new ethers.Interface(LaunchpadCoreABI);
      
      console.log("\n📜 Parsing logs...");
      receipt.logs.forEach((log, index) => {
        console.log(`\nLog ${index}:`);
        console.log("  Address:", log.address);
        console.log("  Topics:", log.topics);
        
        try {
          if (log.address.toLowerCase() === LAUNCHPAD_CORE_ADDRESS.toLowerCase()) {
            const parsed = iface.parseLog(log);
            console.log("  ✅ Parsed Event:", parsed.name);
            console.log("  Args:", parsed.args);
            
            if (parsed.name === "AgentCreated") {
              console.log("  🎉 AGENT CREATED EVENT FOUND!");
              console.log("    Agent ID:", parsed.args[0].toString());
              console.log("    Creator:", parsed.args[1]);
              console.log("    Token Address:", parsed.args[2]);
              console.log("    Agent Name:", parsed.args[3]);
            }
          }
        } catch (parseError) {
          console.log("  ⚠️  Could not parse log:", parseError.message);
        }
      });
    } else {
      console.log("❌ Transaction not found");
    }
    
  } catch (error) {
    console.error("❌ Error checking transaction:", error.message);
  }
}

async function main() {
  console.log("🔍 AGENT CREATION CHECKER");
  console.log("========================\n");
  
  await checkAgentCreation();
  await checkTransactionLogs();
}

main(); 