const { ethers } = require("ethers");
require('dotenv').config({ path: '../.env' });

const LAUNCHPAD_CORE_ADDRESS = "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE";
const FLOW_TESTNET_RPC = "https://testnet.evm.nodes.onflow.org";

const LaunchpadCoreABI = [
  "function contribute(uint256 agentId) external payable",
  "function getAgentInfo(uint256 agentId) external view returns (string, string, uint256, uint256, bool, address, address, address, string)",
];

async function testSmallContribution() {
  console.log("💰 Testing small contribution...");
  
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
    
    // Try a smaller contribution - 0.1 FLOW
    const contributionAmount = ethers.parseEther("0.1");
    console.log(`\n💰 Contributing ${ethers.formatEther(contributionAmount)} FLOW...`);
    
    // Estimate gas first
    try {
      const gasEstimate = await launchpadCore.contribute.estimateGas(agentId, {
        value: contributionAmount
      });
      console.log("✅ Gas estimate:", gasEstimate.toString());
    } catch (gasError) {
      console.log("❌ Gas estimation failed:", gasError.message);
      return;
    }
    
    const tx = await launchpadCore.contribute(agentId, {
      value: contributionAmount,
      gasLimit: 300000
    });
    
    console.log("📤 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ Small contribution successful!");
      
      // Check updated status
      const updatedInfo = await launchpadCore.getAgentInfo(agentId);
      const [, , , newTotalRaised, newIsBonded] = updatedInfo;
      console.log("📊 Updated status:");
      console.log("  Total Raised:", ethers.formatEther(newTotalRaised), "FLOW");
      console.log("  Is Bonded:", newIsBonded);
    } else {
      console.log("❌ Transaction failed");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testSmallContribution(); 