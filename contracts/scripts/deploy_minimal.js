const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentLaunchpadMinimal for Testing...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Check if account has sufficient balance for deployment
  const minBalance = ethers.parseEther("0.01"); // Minimum 0.01 ETH for deployment
  if (balance < minBalance) {
    console.error("❌ Insufficient balance for deployment!");
    console.error(`   Current: ${ethers.formatEther(balance)} ETH`);
    console.error(`   Required: ${ethers.formatEther(minBalance)} ETH`);
    console.error("   Please fund your account and try again.");
    process.exit(1);
  }

  // Network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);

  // Treasury address
  let treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  treasuryAddress = ethers.getAddress(treasuryAddress);
  
  console.log("🏦 Treasury Address:", treasuryAddress);

  // =======================
  // Deploy AgentLaunchpadMinimal
  // =======================
  console.log("\n📦 Deploying AgentLaunchpadMinimal...");
  const AgentLaunchpadMinimal = await ethers.getContractFactory("AgentLaunchpadMinimal");
  
  const launchpad = await AgentLaunchpadMinimal.deploy(treasuryAddress);

  await launchpad.waitForDeployment();
  const launchpadAddress = await launchpad.getAddress();
  console.log("✅ AgentLaunchpadMinimal deployed to:", launchpadAddress);

  // =======================
  // Verify Deployment
  // =======================
  console.log("\n🔍 Verifying deployment...");
  
  const deployedTreasury = await launchpad.treasuryAddress();
  const protocolFee = await launchpad.protocolFeePercentage();
  const currentAgentId = await launchpad.getCurrentAgentId();

  console.log("📊 Minimal Launchpad verification:");
  console.log("  Treasury:", deployedTreasury);
  console.log("  Protocol Fee:", protocolFee.toString(), "basis points");
  console.log("  Current Agent ID:", currentAgentId.toString());

  // =======================
  // Save Deployment Info
  // =======================
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      AgentLaunchpadMinimal: {
        address: launchpadAddress,
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
  console.log(`   npx hardhat verify --network ${network.name} ${launchpadAddress} "${treasuryAddress}"`);
  
  console.log("\n2. Update backend environment variables:");
  console.log(`   LAUNCHPAD_CONTRACT_ADDRESS=${launchpadAddress}`);
  console.log(`   WEB3_RPC_URL=${process.env[`${network.name.toUpperCase()}_RPC_URL`] || 'your_rpc_url'}`);
  
  console.log("\n3. Test agent creation:");
  console.log("   - Call createAgent() with complete JSON config");
  console.log("   - Contribute ETH to fund agents");
  console.log("   - Auto-bonding when funding target is reached");
  console.log("   - Each agent gets its own ERC20 token with full JSON data");

  console.log("\n🎉 Minimal deployment completed successfully!");

  return deploymentInfo;
}

// Handle deployment
main()
  .then((deploymentInfo) => {
    console.log("\n🎉 AgentLaunchpadMinimal deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 