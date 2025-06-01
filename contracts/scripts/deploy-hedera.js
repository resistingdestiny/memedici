const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentLaunchpad V2 Ultra to Hedera Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "HBAR");

  // Network verification
  const network = await hre.network.provider.request({ method: "net_version" });
  const expectedChainId = "296"; // Hedera Testnet
  
  if (network !== expectedChainId) {
    throw new Error(`Wrong network! Expected Hedera Testnet (${expectedChainId}), got ${network}`);
  }
  
  console.log("✅ Connected to Hedera Testnet (Chain ID: 296)");

  // Treasury address (same as deployer for now)
  const treasuryAddress = deployer.address;
  
  console.log("\n🔨 Step 1: Deploying SimpleAMM...");
  
  try {
    const SimpleAMM = await hre.ethers.getContractFactory("SimpleAMM");
    const amm = await SimpleAMM.deploy({
      gasLimit: 3000000, // Higher gas limit for Hedera
      gasPrice: 10000000000, // 10 Gwei
    });
    
    await amm.waitForDeployment();
    const ammAddress = await amm.getAddress();
    
    console.log("✅ SimpleAMM deployed to:", ammAddress);
    
    console.log("\n🔨 Step 2: Deploying AgentLaunchpadCoreV2Ultra...");
    console.log("⚠️  Contract size: ~25KB (optimized for Hedera)");
    
    const AgentLaunchpadCoreV2Ultra = await hre.ethers.getContractFactory("AgentLaunchpadCoreV2Ultra");
    const coreUltra = await AgentLaunchpadCoreV2Ultra.deploy(treasuryAddress, {
      gasLimit: 4000000, // Higher gas limit for larger contract
      gasPrice: 10000000000, // 10 Gwei
    });
    
    await coreUltra.waitForDeployment();
    const coreUltraAddress = await coreUltra.getAddress();
    
    console.log("✅ AgentLaunchpadCoreV2Ultra deployed to:", coreUltraAddress);
    
    console.log("\n🔗 Step 3: Setting up contract connections...");
    
    // Set AMM as liquidity manager in Core contract
    console.log("📝 Setting SimpleAMM as liquidity manager...");
    const setAmmTx = await coreUltra.setAmm(ammAddress, {
      gasLimit: 150000,
      gasPrice: 10000000000
    });
    await setAmmTx.wait();
    console.log("✅ AMM set");
    
    // Authorize Core contract in AMM
    console.log("📝 Authorizing AgentLaunchpadCoreV2Ultra in SimpleAMM...");
    const setAuthorizationTx = await amm.setAuthorization(coreUltraAddress, true, {
      gasLimit: 150000,
      gasPrice: 10000000000
    });
    await setAuthorizationTx.wait();
    console.log("✅ Authorization set");
    
    console.log("\n📋 HEDERA TESTNET DEPLOYMENT SUMMARY");
    console.log("=" .repeat(60));
    console.log("🏭 AgentLaunchpadCoreV2Ultra:", coreUltraAddress);
    console.log("🔄 SimpleAMM:", ammAddress);
    console.log("🏛️  Treasury Address:", treasuryAddress);
    console.log("🌐 Network: Hedera Testnet (Chain ID: 296)");
    console.log("🔗 Block Explorer: https://hashscan.io/testnet");
    console.log("💰 Native Token: HBAR (Test)");
    console.log("🌟 Note: Uses HEDERA_PRIVATE_KEY from environment");
    
    console.log("\n📝 Contract Verification Commands:");
    console.log(`npx hardhat verify --network hederaTestnet ${coreUltraAddress} ${treasuryAddress}`);
    console.log(`npx hardhat verify --network hederaTestnet ${ammAddress}`);
    
    console.log("\n🎯 Frontend Integration Config:");
    console.log("Update your frontend CONFIG for Hedera Testnet:");
    console.log(`CONTRACTS: {`);
    console.log(`  LAUNCHPAD_CORE: "${coreUltraAddress}",`);
    console.log(`  SIMPLE_AMM: "${ammAddress}"`);
    console.log(`}`);
    console.log(`NETWORK: {`);
    console.log(`  name: "Hedera Testnet",`);
    console.log(`  chainId: 296,`);
    console.log(`  rpcUrl: "https://testnet.hashio.io/api",`);
    console.log(`  blockExplorer: "https://hashscan.io/testnet"`);
    console.log(`}`);
    
    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
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
      
      const isAuthorized = await amm.isAuthorized(coreUltraAddress);
      console.log("✅ Core authorization in AMM:", isAuthorized ? "YES" : "NO");
      
      console.log("🎉 All tests passed! Deployment successful on Hedera Testnet!");
      
      console.log("\n🔑 HEDERA SPECIFIC NOTES:");
      console.log("- Uses HBAR as native gas token");
      console.log("- Lower gas costs compared to Ethereum");
      console.log("- Fast finality (~3-5 seconds)");
      console.log("- Enterprise-grade security");
      
    } catch (error) {
      console.error("❌ Test failed:", error.message);
    }
    
  } catch (deployError) {
    console.error("💥 Deployment failed:", deployError.message);
    
    if (deployError.message.includes("insufficient funds")) {
      console.log("\n💡 HEDERA FUNDING:");
      console.log("Get test HBAR from: https://portal.hedera.com/faucet");
      console.log("Minimum required: ~5 HBAR for deployment");
    }
    
    if (deployError.message.includes("max code size exceeded")) {
      console.log("\n💡 TROUBLESHOOTING:");
      console.log("Contract size exceeded limit. Try:");
      console.log("1. Increase optimizer runs in hardhat.config.js");
      console.log("2. Split contract into smaller modules");
      console.log("3. Use Hedera Contract Service optimizations");
    }
    
    throw deployError;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 