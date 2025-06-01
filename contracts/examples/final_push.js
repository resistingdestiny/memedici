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

async function finalPush() {
  console.log("🏁 Final push to complete funding...");
  
  const provider = new ethers.JsonRpcProvider(FLOW_TESTNET_RPC);
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);
  const launchpadCore = new ethers.Contract(LAUNCHPAD_CORE_ADDRESS, LaunchpadCoreABI, wallet);
  
  const agentId = 0;
  
  try {
    // Check current status
    let agentInfo = await launchpadCore.getAgentInfo(agentId);
    let [name, agentName, fundingTarget, totalRaised, isBonded] = agentInfo;
    
    console.log("📊 Current status:");
    console.log("  Target:", ethers.formatEther(fundingTarget), "FLOW");
    console.log("  Raised:", ethers.formatEther(totalRaised), "FLOW");
    console.log("  Needed:", ethers.formatEther(fundingTarget - totalRaised), "FLOW");
    console.log("  Bonded:", isBonded);
    
    if (isBonded) {
      console.log("✅ Already bonded!");
      return;
    }
    
    // Try very small increments - 0.05 FLOW each
    const increment = ethers.parseEther("0.05");
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Check current state
      agentInfo = await launchpadCore.getAgentInfo(agentId);
      [, , fundingTarget, totalRaised, isBonded] = agentInfo;
      
      if (isBonded) {
        console.log("🎉 AGENT IS NOW BONDED!");
        const lpAddress = await launchpadCore.getLiquidityPool(agentId);
        console.log("🏊 LP Pool:", lpAddress);
        break;
      }
      
      const needed = fundingTarget - totalRaised;
      if (needed <= 0n) {
        console.log("✅ Target reached! Checking bond status...");
        const bonded = await launchpadCore.isAgentBonded(agentId);
        if (bonded) {
          console.log("🎉 Agent is bonded!");
          break;
        }
        continue;
      }
      
      const amount = needed < increment ? needed : increment;
      console.log(`\n💰 Attempt ${attempts}: Contributing ${ethers.formatEther(amount)} FLOW`);
      console.log(`  Still needed: ${ethers.formatEther(needed)} FLOW`);
      
      try {
        const gasEstimate = await launchpadCore.contribute.estimateGas(agentId, {
          value: amount
        });
        
        const tx = await launchpadCore.contribute(agentId, {
          value: amount,
          gasLimit: gasEstimate * 120n / 100n
        });
        
        console.log(`  📤 TX: ${tx.hash}`);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log(`  ✅ Success! Gas used: ${receipt.gasUsed}`);
          
          // Check if auto-bonded
          const nowBonded = await launchpadCore.isAgentBonded(agentId);
          if (nowBonded) {
            console.log("  🎉 AUTO-BONDED!");
            const lpAddress = await launchpadCore.getLiquidityPool(agentId);
            console.log("  🏊 LP Pool:", lpAddress);
            break;
          }
        } else {
          console.log("  ❌ Failed");
        }
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        
        // If we can't contribute this amount, try even smaller
        if (amount > ethers.parseEther("0.01")) {
          console.log("  Trying smaller amount next...");
          continue;
        } else {
          console.log("  Amount too small, stopping");
          break;
        }
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Final status
    console.log("\n🏁 FINAL STATUS:");
    const finalInfo = await launchpadCore.getAgentInfo(agentId);
    const [, , finalTarget, finalRaised, finalBonded, , , lpPair] = finalInfo;
    
    console.log("  Target:", ethers.formatEther(finalTarget), "FLOW");
    console.log("  Raised:", ethers.formatEther(finalRaised), "FLOW");
    console.log("  Bonded:", finalBonded);
    console.log("  LP Pair:", lpPair);
    
    if (finalBonded && lpPair !== "0x0000000000000000000000000000000000000000") {
      console.log("\n🎉🎉🎉 COMPLETE SUCCESS! 🎉🎉🎉");
      console.log("✅ Agent created");
      console.log("✅ Funding completed");
      console.log("✅ Agent bonded");
      console.log("✅ LP pool created");
      console.log("✅ Full transaction workflow verified!");
    } else {
      console.log("\n⚠️  Not fully complete yet");
      console.log("  Remaining:", ethers.formatEther(finalTarget - finalRaised), "FLOW");
    }
    
  } catch (error) {
    console.error("❌ Final push error:", error.message);
  }
}

finalPush(); 