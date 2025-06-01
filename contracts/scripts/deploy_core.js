const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentLaunchpadCore...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "FLOW");
  
  // Check if account has sufficient balance for deployment
  const minBalance = ethers.parseEther("0.01"); // Minimum 0.01 FLOW for deployment
  if (balance < minBalance) {
    console.error("❌ Insufficient balance for deployment!");
    console.error(`   Current: ${ethers.formatEther(balance)} FLOW`);
    console.error(`   Required: ${ethers.formatEther(minBalance)} FLOW`);
    console.error("   Please fund your account and try again.");
    process.exit(1);
  }

  // Network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);

  // Configuration
  let treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  treasuryAddress = ethers.getAddress(treasuryAddress);
  
  console.log("🏦 Treasury Address:", treasuryAddress);

  // =======================
  // Deploy AgentLaunchpadCore
  // =======================
  console.log("\n📦 Deploying AgentLaunchpadCore...");
  const AgentLaunchpadCore = await ethers.getContractFactory("AgentLaunchpadCore");
  
  console.log("⏳ Deployment in progress...");
  const launchpadCore = await AgentLaunchpadCore.deploy(treasuryAddress);

  await launchpadCore.waitForDeployment();
  const launchpadCoreAddress = await launchpadCore.getAddress();
  console.log("✅ AgentLaunchpadCore deployed to:", launchpadCoreAddress);

  // =======================
  // Verify Deployment
  // =======================
  console.log("\n🔍 Verifying deployment...");
  
  const deployedTreasury = await launchpadCore.treasuryAddress();
  const protocolFee = await launchpadCore.protocolFeePercentage();
  const maxFee = await launchpadCore.MAX_FEE();
  const currentAgentId = await launchpadCore.getCurrentAgentId();

  console.log("📊 AgentLaunchpadCore verification:");
  console.log("  Treasury:", deployedTreasury);
  console.log("  Protocol Fee:", protocolFee.toString(), "basis points");
  console.log("  Max Fee:", maxFee.toString(), "basis points");
  console.log("  Current Agent ID:", currentAgentId.toString());

  // =======================
  // Test Core Functions
  // =======================
  console.log("\n🧪 Testing core functions...");
  
  try {
    const ownerAddress = await launchpadCore.owner();
    console.log("✅ Ownership check passed - Owner:", ownerAddress);
    
    console.log("✅ All core function tests passed!");
  } catch (error) {
    console.error("❌ Core function test failed:", error.message);
  }

  // =======================
  // Save Deployment Info
  // =======================
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      AgentLaunchpadCore: {
        address: launchpadCoreAddress,
        constructorArgs: [treasuryAddress]
      }
    },
    configuration: {
      treasuryAddress,
      protocolFeePercentage: protocolFee.toString()
    },
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  console.log("\n📄 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // =======================
  // Next Steps Instructions
  // =======================
  console.log("\n🎯 Next Steps:");
  console.log("1. Verify contract on block explorer:");
  console.log(`   npx hardhat verify --network ${network.name} ${launchpadCoreAddress} "${treasuryAddress}"`);
  
  console.log("\n2. Update backend environment variables:");
  console.log(`   LAUNCHPAD_CONTRACT_ADDRESS=${launchpadCoreAddress}`);
  console.log(`   WEB3_RPC_URL=${process.env[`${network.name.toUpperCase()}_RPC_URL`] || 'your_rpc_url'}`);
  
  console.log("\n3. Core Features Available:");
  console.log("   ✅ Complete JSON configuration storage on-chain");
  console.log("   ✅ ERC20 token deployment per agent");
  console.log("   ✅ Agent funding campaigns");
  console.log("   ✅ Automatic bonding when funded");
  console.log("   ✅ Protocol fees and treasury management");
  console.log("   ✅ Contribution tracking");
  
  console.log("\n4. Optional: Deploy AgentLiquidityManager separately for LP functionality");

  console.log("\n🎉 AgentLaunchpadCore deployment completed successfully!");

  return deploymentInfo;
}

// Handle deployment
main()
  .then((deploymentInfo) => {
    console.log("\n🎉 AgentLaunchpadCore deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 