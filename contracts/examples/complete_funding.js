const { ethers } = require("ethers");
require('dotenv').config({ path: '../.env' });

const LAUNCHPAD_CORE_ADDRESS = "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE";
const FLOW_TESTNET_RPC = "https://testnet.evm.nodes.onflow.org";

const LaunchpadCoreABI = [
  "function contribute(uint256 agentId) external payable",
  "function bondAgent(uint256 agentId) external",
  "function getAgentInfo(uint256 agentId) external view returns (string, string, uint256, uint256, bool, address, address, address, string)",
  "function isAgentBonded(uint256 agentId) external view returns (bool)",
  "function getLiquidityPool(uint256 agentId) external view returns (address)"
];

async function completeFunding() {
  console.log("💰 Completing funding for Agent 0...");
  
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
      return;
    }
    
    const needed = fundingTarget - totalRaised;
    console.log("  Still needed:", ethers.formatEther(needed), "FLOW");
    
    if (needed <= 0n) {
      console.log("✅ Funding target reached! Trying to bond...");
      
      const tx = await launchpadCore.bondAgent(agentId, { gasLimit: 500000 });
      console.log("📤 Bond transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Bonded in block:", receipt.blockNumber);
      
      const lpAddress = await launchpadCore.getLiquidityPool(agentId);
      console.log("🏊 LP Pool created at:", lpAddress);
      
      return;
    }
    
    // Contribute the exact remaining amount
    console.log(`\n💰 Contributing exactly ${ethers.formatEther(needed)} FLOW...`);
    
    const tx = await launchpadCore.contribute(agentId, {
      value: needed,
      gasLimit: 300000
    });
    
    console.log("📤 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ Contribution successful!");
      
      // Check if auto-bonded
      const nowBonded = await launchpadCore.isAgentBonded(agentId);
      console.log("🔗 Auto-bonded:", nowBonded);
      
      if (nowBonded) {
        const lpAddress = await launchpadCore.getLiquidityPool(agentId);
        console.log("🏊 LP Pool created at:", lpAddress);
      }
    } else {
      console.log("❌ Transaction failed");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

completeFunding(); 