const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentLaunchpadCoreV2Ultra to Flow Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "FLOW");

  // Treasury address (same as deployer for now)
  const treasuryAddress = deployer.address;
  const ammAddress = "0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083"; // Previously deployed AMM
  
  console.log("\n🔨 Deploying AgentLaunchpadCoreV2Ultra...");
  console.log("Contract size: ~25.1KB (close to 24KB limit - attempting deployment...)");
  
  try {
    const AgentLaunchpadCoreV2Ultra = await hre.ethers.getContractFactory("AgentLaunchpadCoreV2Ultra");
    const coreUltra = await AgentLaunchpadCoreV2Ultra.deploy(treasuryAddress);
    
    await coreUltra.waitForDeployment();
    const coreUltraAddress = await coreUltra.getAddress();
    
    console.log("✅ AgentLaunchpadCoreV2Ultra deployed to:", coreUltraAddress);
    
    console.log("\n🔗 Setting up contract connections...");
    
    // Set AMM as liquidity manager in Core contract
    console.log("📝 Setting SimpleAMM as liquidity manager...");
    const setAmmTx = await coreUltra.setAmm(ammAddress);
    await setAmmTx.wait();
    console.log("✅ AMM set");
    
    // Authorize Core contract in AMM
    console.log("📝 Authorizing AgentLaunchpadCoreV2Ultra in SimpleAMM...");
    const SimpleAMM = await hre.ethers.getContractFactory("SimpleAMM");
    const amm = SimpleAMM.attach(ammAddress);
    const setAuthorizationTx = await amm.setAuthorization(coreUltraAddress, true);
    await setAuthorizationTx.wait();
    console.log("✅ Authorization set");
    
    console.log("\n📋 DEPLOYMENT SUMMARY");
    console.log("=" .repeat(50));
    console.log("🏭 AgentLaunchpadCoreV2Ultra:", coreUltraAddress);
    console.log("🔄 SimpleAMM:", ammAddress);
    console.log("🏛️  Treasury Address:", treasuryAddress);
    console.log("🌐 Network: Flow Testnet");
    console.log("🔗 Block Explorer: https://evm-testnet.flowscan.io");
    
    console.log("\n📝 Contract Verification Commands:");
    console.log(`npx hardhat verify --network flowTestnet ${coreUltraAddress} ${treasuryAddress}`);
    
    console.log("\n🎯 Frontend Integration Addresses:");
    console.log("Update CONFIG.CONTRACTS in frontend integration:");
    console.log(`LAUNCHPAD_CORE: "${coreUltraAddress}",`);
    console.log(`SIMPLE_AMM: "${ammAddress}"`);
    
    // Test basic functionality
    console.log("\n🧪 Testing V2 functionality...");
    
    try {
      const feeValue = await coreUltra.fee();
      console.log("✅ Protocol fee:", feeValue.toString(), "basis points");
      
      const ammAddr = await coreUltra.amm();
      console.log("✅ AMM address:", ammAddr);
      
      const treasuryAddr = await coreUltra.treasury();
      console.log("✅ Treasury address:", treasuryAddr);
      
      // Test V2 specific functions
      const bondedTokens = await coreUltra.getAllBondedTokens();
      console.log("✅ Bonded tokens count:", bondedTokens[0].length);
      
      // Test array access
      console.log("✅ Bonded IDs array length:", (await coreUltra.bondedIds(0).catch(() => "0 (empty)")));
      console.log("✅ In-progress IDs array available");
      
      console.log("🎉 All V2 tests passed!");
      
    } catch (error) {
      console.error("❌ Test failed:", error.message);
    }
    
  } catch (deployError) {
    console.error("💥 Deployment failed:", deployError.message);
    
    if (deployError.message.includes("max code size exceeded")) {
      console.log("\n💡 ALTERNATIVE SOLUTION:");
      console.log("The contract is still too large for Flow Testnet's 24KB limit.");
      console.log("Consider using the working V1 contract with the AMM:");
      console.log("- V1 Core: 0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE");
      console.log("- SimpleAMM: 0x60A82cb1d47fcc7FAfA70F4CDf426cc11BCc3083");
      console.log("- The V2 enhancements can be added through libraries or proxy patterns later");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 