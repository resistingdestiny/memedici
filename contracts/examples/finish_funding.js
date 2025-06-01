const { ethers } = require("ethers");
require('dotenv').config({ path: '../.env' });

const LAUNCHPAD_CORE_ADDRESS = "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE";
const FLOW_TESTNET_RPC = "https://testnet.evm.nodes.onflow.org";

const LaunchpadCoreABI = [
  "function contribute(uint256 agentId) external payable",
  "function getAgentInfo(uint256 agentId) external view returns (string, string, uint256, uint256, bool, address, address, address, string)",
  "function isAgentBonded(uint256 agentId) external view returns (bool)",
  "function getLiquidityPool(uint256 agentId) external view returns (address)"
];

async function finishFunding() {
  console.log("💰 Finishing funding for Agent 0...");
  
  const provider = new ethers.JsonRpcProvider(FLOW_TESTNET_RPC);
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);
  const launchpadCore = new ethers.Contract(LAUNCHPAD_CORE_ADDRESS, LaunchpadCoreABI, wallet);
  
  const agentId = 0;
  
  try {
    // Check current status
    const agentInfo = await launchpadCore.getAgentInfo(agentId);
    const [name, agentName, fundingTarget, totalRaised, isBonded] = agentInfo;
    
    console.log("📊 Current status:");
    console.log("  Agent:", agentName);
    console.log("  Funding Target:", ethers.formatEther(fundingTarget), "FLOW");
    console.log("  Total Raised:", ethers.formatEther(totalRaised), "FLOW");
    console.log("  Is Bonded:", isBonded);
    
    if (isBonded) {
      console.log("✅ Agent is already bonded!");
      const lpAddress = await launchpadCore.getLiquidityPool(agentId);
      console.log("🏊 LP Pool Address:", lpAddress);
      return;
    }
    
    const needed = fundingTarget - totalRaised;
    console.log("  Still needed:", ethers.formatEther(needed), "FLOW");
    
    if (needed <= 0n) {
      console.log("✅ Funding target already reached!");
      return;
    }
    
    // Contribute the remaining amount (should be 0.9 FLOW)
    console.log(`\n💰 Contributing final ${ethers.formatEther(needed)} FLOW...`);
    
    // Estimate gas first
    const gasEstimate = await launchpadCore.contribute.estimateGas(agentId, {
      value: needed
    });
    console.log("✅ Gas estimate:", gasEstimate.toString());
    
    const tx = await launchpadCore.contribute(agentId, {
      value: needed,
      gasLimit: gasEstimate * 110n / 100n
    });
    
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    
    if (receipt.status === 1) {
      console.log("✅ Final contribution successful!");
      
      // Check if auto-bonded
      const nowBonded = await launchpadCore.isAgentBonded(agentId);
      console.log("🔗 Agent auto-bonded:", nowBonded);
      
      if (nowBonded) {
        console.log("🎉 AGENT WAS AUTO-BONDED!");
        
        const lpAddress = await launchpadCore.getLiquidityPool(agentId);
        console.log("🏊 LP Pool created at:", lpAddress);
        
        // Check final status
        const finalInfo = await launchpadCore.getAgentInfo(agentId);
        const [, , , finalRaised, finalBonded, , , lpPair] = finalInfo;
        console.log("\n📊 Final Agent Status:");
        console.log("  Total Raised:", ethers.formatEther(finalRaised), "FLOW");
        console.log("  Is Bonded:", finalBonded);
        console.log("  LP Pair Address:", lpPair);
        
        console.log("\n🎉 FULL WORKFLOW COMPLETED SUCCESSFULLY!");
        console.log("✅ Agent created");
        console.log("✅ Contributions received");
        console.log("✅ Funding target reached");
        console.log("✅ Agent auto-bonded");
        console.log("✅ LP pool created");
      } else {
        console.log("⚠️  Agent not auto-bonded. Checking status...");
        const updatedInfo = await launchpadCore.getAgentInfo(agentId);
        const [, , , newRaised] = updatedInfo;
        console.log("  Total Raised:", ethers.formatEther(newRaised), "FLOW");
      }
    } else {
      console.log("❌ Transaction failed");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  }
}

finishFunding(); 