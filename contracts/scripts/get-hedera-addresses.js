const hre = require("hardhat");

async function main() {
  console.log("🔍 Finding deployed contracts on Hedera Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = deployer.address;
  console.log("📝 Deployer address:", deployerAddress);
  
  try {
    // Get current block number
    const currentBlock = await deployer.provider.getBlockNumber();
    console.log("📋 Current block:", currentBlock);
    
    // Look for recent contract creation transactions
    console.log("🔍 Scanning recent transactions for contract deployments...");
    
    // Get transaction count to estimate recent activity
    const txCount = await deployer.provider.getTransactionCount(deployerAddress);
    console.log("📊 Total transactions from deployer:", txCount);
    
    // Check the last few transactions
    const recentTxs = [];
    for (let i = Math.max(0, txCount - 10); i < txCount; i++) {
      try {
        // Get transaction by nonce
        const tx = await deployer.provider.getTransaction(i);
        if (tx && tx.from?.toLowerCase() === deployerAddress.toLowerCase()) {
          recentTxs.push(tx);
        }
      } catch (e) {
        // Skip if can't find transaction
      }
    }
    
    console.log(`📝 Found ${recentTxs.length} recent transactions`);
    
    const deployedContracts = [];
    
    for (const tx of recentTxs) {
      if (tx.to === null) { // Contract creation
        const receipt = await deployer.provider.getTransactionReceipt(tx.hash);
        if (receipt && receipt.contractAddress) {
          console.log(`📦 Contract deployed at: ${receipt.contractAddress}`);
          console.log(`   Transaction: ${tx.hash}`);
          console.log(`   Gas used: ${receipt.gasUsed}`);
          deployedContracts.push({
            address: receipt.contractAddress,
            txHash: tx.hash,
            gasUsed: receipt.gasUsed.toString()
          });
        }
      }
    }
    
    if (deployedContracts.length >= 2) {
      console.log("\n🎉 HEDERA TESTNET DEPLOYMENT ADDRESSES:");
      console.log("=" .repeat(60));
      
      // Usually SimpleAMM is deployed first, then Core
      console.log(`🔄 SimpleAMM: ${deployedContracts[0].address}`);
      console.log(`🏭 AgentLaunchpadCoreV2Ultra: ${deployedContracts[1].address}`);
      console.log(`🏛️  Treasury: ${deployerAddress}`);
      
      console.log("\n📋 Frontend Config for Hedera Testnet:");
      console.log(`CONTRACTS: {`);
      console.log(`  LAUNCHPAD_CORE: "${deployedContracts[1].address}",`);
      console.log(`  SIMPLE_AMM: "${deployedContracts[0].address}"`);
      console.log(`}`);
      
      console.log("\n🔗 Block Explorer Links:");
      console.log(`SimpleAMM: https://hashscan.io/testnet/contract/${deployedContracts[0].address}`);
      console.log(`AgentLaunchpadCoreV2Ultra: https://hashscan.io/testnet/contract/${deployedContracts[1].address}`);
      
    } else {
      console.log("❌ Could not find expected contract deployments");
      console.log("📝 Manual check: Visit https://hashscan.io/testnet/account/" + deployerAddress);
    }
    
  } catch (error) {
    console.error("❌ Error retrieving addresses:", error.message);
    console.log("\n💡 Manual Check:");
    console.log(`Visit: https://hashscan.io/testnet/account/${deployerAddress}`);
    console.log("Look for the most recent contract creation transactions");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 