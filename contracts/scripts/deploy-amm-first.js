const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying SimpleAMM to Flow Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "FLOW");

  console.log("\n🔨 Deploying SimpleAMM...");
  const SimpleAMM = await hre.ethers.getContractFactory("SimpleAMM");
  const amm = await SimpleAMM.deploy();
  
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  
  console.log("✅ SimpleAMM deployed to:", ammAddress);
  
  console.log("\n📋 DEPLOYMENT SUMMARY");
  console.log("=" .repeat(50));
  console.log("🔄 SimpleAMM:", ammAddress);
  console.log("🌐 Network: Flow Testnet");
  console.log("🔗 Block Explorer: https://evm-testnet.flowscan.io");
  
  console.log("\n📝 Contract Verification Commands:");
  console.log(`npx hardhat verify --network flowTestnet ${ammAddress}`);
  
  console.log("\n🎯 Frontend Integration Address:");
  console.log("Update CONFIG.CONTRACTS in frontend integration:");
  console.log(`SIMPLE_AMM: "${ammAddress}"`);
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  try {
    const ammPairCount = await amm.allPairsLength();
    console.log("✅ AMM pairs count:", ammPairCount.toString());
    
    const owner = await amm.owner();
    console.log("✅ AMM owner:", owner);
    
    console.log("🎉 AMM deployment successful!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  }); 