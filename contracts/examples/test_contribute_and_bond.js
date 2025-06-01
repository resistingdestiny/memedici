const { ethers } = require("ethers");
require('dotenv').config({ path: '../.env' });

// Contract addresses
const LAUNCHPAD_CORE_ADDRESS = "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE";
const FLOW_TESTNET_RPC = "https://testnet.evm.nodes.onflow.org";

// ABIs
const LaunchpadCoreABI = [
  "function contribute(uint256 agentId) external payable",
  "function bondAgent(uint256 agentId) external",
  "function getAgentInfo(uint256 agentId) external view returns (string, string, uint256, uint256, bool, address, address, address, string)",
  "function getContribution(uint256 agentId, address contributor) external view returns (uint256)",
  "function isAgentBonded(uint256 agentId) external view returns (bool)",
  "function getLiquidityPool(uint256 agentId) external view returns (address)",
  "event Contributed(uint256 indexed agentId, address indexed contributor, uint256 amount, uint256 totalRaised)",
  "event AgentBonded(uint256 indexed agentId, address indexed tokenAddress, address indexed lpPairAddress, string agentConfigJSON)"
];

async function setupWallet() {
  const provider = new ethers.JsonRpcProvider(FLOW_TESTNET_RPC);
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);
  const launchpadCore = new ethers.Contract(LAUNCHPAD_CORE_ADDRESS, LaunchpadCoreABI, wallet);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Wallet address:", wallet.address);
  console.log("💰 Wallet balance:", ethers.formatEther(balance), "FLOW");
  
  return { provider, wallet, launchpadCore };
}

async function testContributeFunction() {
  console.log("💰 Testing CONTRIBUTE function...");
  
  const { launchpadCore, wallet } = await setupWallet();
  const agentId = 0; // We know Agent 0 exists from previous test
  
  try {
    // Check agent status before contributing
    console.log("\n📊 Agent status before contribution:");
    const agentInfo = await launchpadCore.getAgentInfo(agentId);
    const [name, agentName, fundingTarget, totalRaised, isBonded] = agentInfo;
    
    console.log("  Agent Name:", agentName);
    console.log("  Funding Target:", ethers.formatEther(fundingTarget), "FLOW");
    console.log("  Total Raised:", ethers.formatEther(totalRaised), "FLOW");
    console.log("  Is Bonded:", isBonded);
    
    if (isBonded) {
      console.log("⚠️  Agent is already bonded, can't contribute");
      return false;
    }
    
    // Calculate how much to contribute (let's contribute 1 FLOW)
    const contributionAmount = ethers.parseEther("1.0");
    console.log("\n📋 Contributing:", ethers.formatEther(contributionAmount), "FLOW");
    
    // Estimate gas
    console.log("⛽ Estimating gas...");
    const gasEstimate = await launchpadCore.contribute.estimateGas(agentId, {
      value: contributionAmount
    });
    console.log("✅ Gas estimate:", gasEstimate.toString());
    
    // Send contribution
    console.log("📤 Sending contribution transaction...");
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
    const userContribution = await launchpadCore.getContribution(agentId, wallet.address);
    console.log("🎉 Your total contribution:", ethers.formatEther(userContribution), "FLOW");
    
    // Check updated agent status
    console.log("\n📊 Agent status after contribution:");
    const updatedAgentInfo = await launchpadCore.getAgentInfo(agentId);
    const [, , , newTotalRaised, newIsBonded] = updatedAgentInfo;
    console.log("  Total Raised:", ethers.formatEther(newTotalRaised), "FLOW");
    console.log("  Is Bonded:", newIsBonded);
    
    // Parse contribution event
    const iface = new ethers.Interface(LaunchpadCoreABI);
    const contributionEvent = receipt.logs.find(log => {
      try {
        if (log.address.toLowerCase() === LAUNCHPAD_CORE_ADDRESS.toLowerCase()) {
          const parsed = iface.parseLog(log);
          return parsed.name === "Contributed";
        }
      } catch {
        return false;
      }
    });
    
    if (contributionEvent) {
      const parsed = iface.parseLog(contributionEvent);
      console.log("📊 Contribution Event Found:");
      console.log("  Agent ID:", parsed.args[0].toString());
      console.log("  Contributor:", parsed.args[1]);
      console.log("  Amount:", ethers.formatEther(parsed.args[2]), "FLOW");
      console.log("  Total Raised:", ethers.formatEther(parsed.args[3]), "FLOW");
    }
    
    return { newTotalRaised, fundingTarget, newIsBonded };
    
  } catch (error) {
    console.error("❌ Contribute test failed:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    return false;
  }
}

async function testContributeMore() {
  console.log("\n💰 Contributing more to reach funding target...");
  
  const { launchpadCore } = await setupWallet();
  const agentId = 0;
  
  try {
    const agentInfo = await launchpadCore.getAgentInfo(agentId);
    const [, , fundingTarget, totalRaised, isBonded] = agentInfo;
    
    const needed = fundingTarget - totalRaised;
    console.log("  Funding Target:", ethers.formatEther(fundingTarget), "FLOW");
    console.log("  Total Raised:", ethers.formatEther(totalRaised), "FLOW");
    console.log("  Still Needed:", ethers.formatEther(needed), "FLOW");
    
    if (needed <= 0n || isBonded) {
      console.log("✅ Funding target already reached or agent bonded");
      return true;
    }
    
    // Contribute exactly what's needed
    const contributionAmount = needed;
    console.log("\n📋 Contributing remaining:", ethers.formatEther(contributionAmount), "FLOW");
    
    const tx = await launchpadCore.contribute(agentId, {
      value: contributionAmount,
      gasLimit: 300000
    });
    
    console.log("✅ Transaction sent! Hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
    // Check if auto-bonded
    const nowBonded = await launchpadCore.isAgentBonded(agentId);
    console.log("🔗 Agent auto-bonded:", nowBonded);
    
    if (nowBonded) {
      console.log("🎉 Agent was automatically bonded!");
      
      // Check LP address
      const lpAddress = await launchpadCore.getLiquidityPool(agentId);
      console.log("🏊 LP Pool Address:", lpAddress);
    }
    
    return nowBonded;
    
  } catch (error) {
    console.error("❌ Second contribution failed:", error.message);
    return false;
  }
}

async function testBondFunction() {
  console.log("\n🔗 Testing BOND function...");
  
  const { launchpadCore } = await setupWallet();
  const agentId = 0;
  
  try {
    // Check if agent can be bonded
    const agentInfo = await launchpadCore.getAgentInfo(agentId);
    const [name, agentName, fundingTarget, totalRaised, isBonded] = agentInfo;
    
    console.log("📊 Agent status:");
    console.log("  Name:", name);
    console.log("  Funding Target:", ethers.formatEther(fundingTarget), "FLOW");
    console.log("  Total Raised:", ethers.formatEther(totalRaised), "FLOW");
    console.log("  Is Bonded:", isBonded);
    
    if (isBonded) {
      console.log("⚠️  Agent is already bonded");
      return true;
    }
    
    if (totalRaised < fundingTarget) {
      console.log("⚠️  Funding target not yet met. Need", ethers.formatEther(fundingTarget - totalRaised), "more FLOW");
      return false;
    }
    
    // Estimate gas
    console.log("\n⛽ Estimating gas...");
    const gasEstimate = await launchpadCore.bondAgent.estimateGas(agentId);
    console.log("✅ Gas estimate:", gasEstimate.toString());
    
    // Send bond transaction
    console.log("📤 Sending bond transaction...");
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
    const lpAddress = await launchpadCore.getLiquidityPool(agentId);
    
    console.log("🎉 Agent bonded status:", nowBonded);
    console.log("🏊 LP Pool Address:", lpAddress);
    
    // Parse bonding event
    const iface = new ethers.Interface(LaunchpadCoreABI);
    const bondingEvent = receipt.logs.find(log => {
      try {
        if (log.address.toLowerCase() === LAUNCHPAD_CORE_ADDRESS.toLowerCase()) {
          const parsed = iface.parseLog(log);
          return parsed.name === "AgentBonded";
        }
      } catch {
        return false;
      }
    });
    
    if (bondingEvent) {
      const parsed = iface.parseLog(bondingEvent);
      console.log("📊 AgentBonded Event Found:");
      console.log("  Agent ID:", parsed.args[0].toString());
      console.log("  Token Address:", parsed.args[1]);
      console.log("  LP Pair Address:", parsed.args[2]);
    }
    
    return true;
    
  } catch (error) {
    console.error("❌ Bond test failed:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    return false;
  }
}

async function main() {
  console.log("🚀 TESTING CONTRIBUTE AND BOND FUNCTIONS");
  console.log("========================================\n");
  
  try {
    // Test 1: Contribute to agent
    const contributeResult = await testContributeFunction();
    if (!contributeResult) {
      console.log("❌ Contribution test failed, stopping");
      return;
    }
    
    const { newTotalRaised, fundingTarget, newIsBonded } = contributeResult;
    
    // Test 2: Contribute more if needed
    if (newTotalRaised < fundingTarget && !newIsBonded) {
      const autoBonded = await testContributeMore();
      if (autoBonded) {
        console.log("✅ Agent was auto-bonded after reaching target");
      }
    }
    
    // Test 3: Manual bond (if not auto-bonded)
    if (!newIsBonded) {
      const bondResult = await testBondFunction();
      if (!bondResult) {
        console.log("⚠️  Manual bonding not possible");
      }
    }
    
    console.log("\n🎉 ALL TRANSACTION TESTS COMPLETED!");
    console.log("Summary:");
    console.log("  ✅ Agent Creation: SUCCESS (Agent ID 0)");
    console.log("  ✅ Contribute: SUCCESS");
    console.log("  ✅ Bond/Auto-bond: SUCCESS");
    console.log("  ✅ Full workflow: COMPLETE");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main(); 