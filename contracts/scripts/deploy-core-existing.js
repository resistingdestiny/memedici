const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentLaunchpadCore to Flow Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "FLOW");

  // Treasury address (same as deployer for now)
  const treasuryAddress = deployer.address;
  const ammAddress = "0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083"; // Previously deployed AMM
  
  console.log("\n🔨 Deploying AgentLaunchpadCore...");
  const AgentLaunchpadCore = await hre.ethers.getContractFactory("AgentLaunchpadCore");
  const core = await AgentLaunchpadCore.deploy(treasuryAddress);
  
  await core.waitForDeployment();
  const coreAddress = await core.getAddress();
  
  console.log("✅ AgentLaunchpadCore deployed to:", coreAddress);
  
  console.log("\n🔗 Setting up contract connections...");
  
  // Set AMM as liquidity manager in Core contract
  console.log("📝 Setting SimpleAMM as liquidity manager...");
  const setLiquidityManagerTx = await core.setLiquidityManager(ammAddress);
  await setLiquidityManagerTx.wait();
  console.log("✅ Liquidity manager set");
  
  // Authorize Core contract in AMM
  console.log("📝 Authorizing AgentLaunchpadCore in SimpleAMM...");
  const SimpleAMM = await hre.ethers.getContractFactory("SimpleAMM");
  const amm = SimpleAMM.attach(ammAddress);
  const setAuthorizationTx = await amm.setAuthorization(coreAddress, true);
  await setAuthorizationTx.wait();
  console.log("✅ Authorization set");
  
  console.log("\n📋 DEPLOYMENT SUMMARY");
  console.log("=" .repeat(50));
  console.log("🏭 AgentLaunchpadCore:", coreAddress);
  console.log("🔄 SimpleAMM:", ammAddress);
  console.log("🏛️  Treasury Address:", treasuryAddress);
  console.log("🌐 Network: Flow Testnet");
  console.log("🔗 Block Explorer: https://evm-testnet.flowscan.io");
  
  console.log("\n📝 Contract Verification Commands:");
  console.log(`npx hardhat verify --network flowTestnet ${coreAddress} ${treasuryAddress}`);
  
  console.log("\n🎯 Frontend Integration Addresses:");
  console.log("Update CONFIG.CONTRACTS in frontend integration:");
  console.log(`LAUNCHPAD_CORE: "${coreAddress}",`);
  console.log(`SIMPLE_AMM: "${ammAddress}"`);
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  try {
    const currentAgentId = await core.getCurrentAgentId();
    console.log("✅ Current agent ID:", currentAgentId.toString());
    
    const protocolFee = await core.protocolFeePercentage();
    console.log("✅ Protocol fee:", protocolFee.toString(), "basis points");
    
    const liquidityManagerAddress = await core.liquidityManager();
    console.log("✅ Liquidity manager:", liquidityManagerAddress);
    
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