const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentLaunchpad V2 contracts to Flow Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "FLOW");

  // Treasury address (same as deployer for now)
  const treasuryAddress = deployer.address;
  
  console.log("\n🔨 Deploying AgentLaunchpadCoreV2...");
  const AgentLaunchpadCoreV2 = await hre.ethers.getContractFactory("AgentLaunchpadCoreV2");
  const coreV2 = await AgentLaunchpadCoreV2.deploy(treasuryAddress);
  
  await coreV2.waitForDeployment();
  const coreV2Address = await coreV2.getAddress();
  
  console.log("✅ AgentLaunchpadCoreV2 deployed to:", coreV2Address);
  
  console.log("\n🔨 Deploying SimpleAMM...");
  const SimpleAMM = await hre.ethers.getContractFactory("SimpleAMM");
  const amm = await SimpleAMM.deploy();
  
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  
  console.log("✅ SimpleAMM deployed to:", ammAddress);
  
  console.log("\n🔗 Setting up contract connections...");
  
  // Set AMM as liquidity manager in Core contract
  console.log("📝 Setting SimpleAMM as liquidity manager...");
  const setLiquidityManagerTx = await coreV2.setLiquidityManager(ammAddress);
  await setLiquidityManagerTx.wait();
  console.log("✅ Liquidity manager set");
  
  // Authorize Core contract in AMM
  console.log("📝 Authorizing AgentLaunchpadCoreV2 in SimpleAMM...");
  const setAuthorizationTx = await amm.setAuthorization(coreV2Address, true);
  await setAuthorizationTx.wait();
  console.log("✅ Authorization set");
  
  console.log("\n📋 DEPLOYMENT SUMMARY");
  console.log("=" .repeat(50));
  console.log("🏭 AgentLaunchpadCoreV2:", coreV2Address);
  console.log("🔄 SimpleAMM:", ammAddress);
  console.log("🏛️  Treasury Address:", treasuryAddress);
  console.log("🌐 Network: Flow Testnet");
  console.log("🔗 Block Explorer: https://evm-testnet.flowscan.io");
  
  console.log("\n📝 Contract Verification Commands:");
  console.log(`npx hardhat verify --network flow ${coreV2Address} ${treasuryAddress}`);
  console.log(`npx hardhat verify --network flow ${ammAddress}`);
  
  console.log("\n🎯 Frontend Integration Addresses:");
  console.log("Update CONFIG.CONTRACTS in frontend integration:");
  console.log(`LAUNCHPAD_CORE: "${coreV2Address}",`);
  console.log(`SIMPLE_AMM: "${ammAddress}"`);
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  try {
    const currentAgentId = await coreV2.getCurrentAgentId();
    console.log("✅ Current agent ID:", currentAgentId.toString());
    
    const totalCounts = await coreV2.getTotalCounts();
    console.log("✅ Total counts - Total:", totalCounts[0].toString(), "Bonded:", totalCounts[1].toString(), "In-Progress:", totalCounts[2].toString());
    
    const protocolFee = await coreV2.protocolFeePercentage();
    console.log("✅ Protocol fee:", protocolFee.toString(), "basis points");
    
    const ammPairCount = await amm.allPairsLength();
    console.log("✅ AMM pairs count:", ammPairCount.toString());
    
    console.log("🎉 All tests passed!");
    
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