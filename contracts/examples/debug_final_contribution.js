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

async function debugFinalContribution() {
  console.log("🔍 Debug: Final contribution to reach target...");
  
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
    console.log("  Funding Target:", fundingTarget.toString(), "wei");
    console.log("  Total Raised:", totalRaised.toString(), "wei");
    console.log("  Funding Target:", ethers.formatEther(fundingTarget), "FLOW");
    console.log("  Total Raised:", ethers.formatEther(totalRaised), "FLOW");
    console.log("  Is Bonded:", isBonded);
    
    if (isBonded) {
      console.log("✅ Agent is already bonded!");
      return;
    }
    
    const needed = fundingTarget - totalRaised;
    console.log("  Still needed (wei):", needed.toString());
    console.log("  Still needed (FLOW):", ethers.formatEther(needed));
    
    if (needed <= 0n) {
      console.log("✅ Funding target already reached!");
      return;
    }
    
    // Try with smaller amounts in sequence
    const amounts = [
      ethers.parseEther("0.1"), // 0.1 FLOW
      ethers.parseEther("0.2"), // 0.2 FLOW  
      ethers.parseEther("0.3"), // 0.3 FLOW
      ethers.parseEther("0.3")  // 0.3 FLOW (total 0.9)
    ];
    
    let totalContributed = 0n;
    
    for (let i = 0; i < amounts.length; i++) {
      const amount = amounts[i];
      console.log(`\n💰 Attempt ${i + 1}: Contributing ${ethers.formatEther(amount)} FLOW...`);
      
      try {
        // Check if we would exceed the target
        const currentInfo = await launchpadCore.getAgentInfo(agentId);
        const [, , target, raised] = currentInfo;
        const remaining = target - raised;
        
        const actualAmount = amount > remaining ? remaining : amount;
        console.log("  Remaining needed:", ethers.formatEther(remaining), "FLOW");
        console.log("  Will contribute:", ethers.formatEther(actualAmount), "FLOW");
        
        if (actualAmount <= 0n) {
          console.log("  ✅ Target already reached!");
          break;
        }
        
        // Estimate gas
        const gasEstimate = await launchpadCore.contribute.estimateGas(agentId, {
          value: actualAmount
        });
        console.log("  ✅ Gas estimate:", gasEstimate.toString());
        
        const tx = await launchpadCore.contribute(agentId, {
          value: actualAmount,
          gasLimit: gasEstimate * 110n / 100n
        });
        
        console.log("  📤 Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log("  ✅ Contribution successful!");
          totalContributed += actualAmount;
          
          // Check if auto-bonded
          const nowBonded = await launchpadCore.isAgentBonded(agentId);
          console.log("  🔗 Auto-bonded:", nowBonded);
          
          if (nowBonded) {
            console.log("  🎉 AGENT WAS AUTO-BONDED!");
            const lpAddress = await launchpadCore.getLiquidityPool(agentId);
            console.log("  🏊 LP Pool:", lpAddress);
            break;
          }
        } else {
          console.log("  ❌ Transaction failed");
        }
        
      } catch (error) {
        console.log("  ❌ Error:", error.message);
        
        // If this amount fails, try a smaller amount
        if (i < amounts.length - 1) {
          console.log("  Trying smaller amount...");
          continue;
        }
      }
      
      // Wait between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final status check
    console.log("\n📊 Final Status Check:");
    const finalInfo = await launchpadCore.getAgentInfo(agentId);
    const [, , finalTarget, finalRaised, finalBonded, , , lpPair] = finalInfo;
    
    console.log("  Total Contributed This Session:", ethers.formatEther(totalContributed), "FLOW");
    console.log("  Final Target:", ethers.formatEther(finalTarget), "FLOW");
    console.log("  Final Raised:", ethers.formatEther(finalRaised), "FLOW");
    console.log("  Is Bonded:", finalBonded);
    console.log("  LP Pair:", lpPair);
    
    if (finalBonded) {
      console.log("\n🎉 SUCCESS! Agent is fully bonded with LP pool!");
    } else {
      console.log("\n⚠️  Agent not yet bonded. Still need:", ethers.formatEther(finalTarget - finalRaised), "FLOW");
    }
    
  } catch (error) {
    console.error("❌ Debug error:", error.message);
  }
}

debugFinalContribution(); 