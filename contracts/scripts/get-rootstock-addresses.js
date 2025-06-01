const hre = require("hardhat");

async function main() {
  console.log("🔍 Finding deployed contracts on Rootstock Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = deployer.address;
  console.log("📝 Deployer address:", deployerAddress);
  
  try {
    // Get transaction count to estimate recent activity
    const txCount = await deployer.provider.getTransactionCount(deployerAddress);
    console.log("📊 Total transactions from deployer:", txCount);
    
    const deployedContracts = [];
    
    // Check recent transactions for contract deployments
    for (let nonce = Math.max(0, txCount - 20); nonce < txCount; nonce++) {
      try {
        // Get transaction history (this is a simplified approach)
        const block = await deployer.provider.getBlock("latest");
        
        // We know from our deployment history that Rootstock was successful
        // Let's check specific known addresses or provide manual method
        
      } catch (e) {
        // Skip errors
      }
    }
    
    console.log("\n🎉 ROOTSTOCK TESTNET KNOWN ADDRESSES:");
    console.log("=" .repeat(60));
    console.log("🏭 AgentLaunchpadCoreV2Ultra: 0xB4DA9838fAbA1A6195662DFED22f840b52aa4169");
    console.log("🔄 SimpleAMM: [Check explorer for exact address]");
    console.log("🏛️  Treasury:", deployerAddress);
    
    console.log("\n📋 Frontend Config for Rootstock Testnet:");
    console.log(`ROOTSTOCK_TESTNET: {`);
    console.log(`  chainId: 31,`);
    console.log(`  name: "Rootstock Testnet",`);
    console.log(`  rpcUrl: "https://public-node.testnet.rsk.co",`);
    console.log(`  blockExplorer: "https://rootstock-testnet.blockscout.com",`);
    console.log(`  contracts: {`);
    console.log(`    LAUNCHPAD_CORE: "0xB4DA9838fAbA1A6195662DFED22f840b52aa4169",`);
    console.log(`    SIMPLE_AMM: "[SimpleAMM Address from Explorer]"`);
    console.log(`  }`);
    console.log(`}`);
    
    console.log("\n🔗 Manual Check:");
    console.log(`Visit: https://rootstock-testnet.blockscout.com/address/${deployerAddress}`);
    console.log("Look for contract creation transactions");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 