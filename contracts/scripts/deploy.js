const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentLaunchpad...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Check if account has sufficient balance for deployment
  const minBalance = ethers.parseEther("0.02"); // Minimum 0.02 ETH for deployment
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

  // Configuration
  let treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  let uniswapRouter = process.env.UNISWAP_ROUTER;
  
  // Default Uniswap V2 routers for different networks
  const defaultRouters = {
    1: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Ethereum Mainnet
    11155111: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Sepolia
    137: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", // Polygon
    42161: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // Arbitrum
    8453: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", // Base
    31337: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" // Hardhat local
  };
  
  if (!uniswapRouter) {
    uniswapRouter = defaultRouters[network.chainId] || defaultRouters[1];
    console.log(`🔄 Using default Uniswap router for network ${network.chainId}: ${uniswapRouter}`);
  }
  
  // Ensure addresses are properly formatted
  treasuryAddress = ethers.getAddress(treasuryAddress);
  uniswapRouter = ethers.getAddress(uniswapRouter);
  
  console.log("🏦 Treasury Address:", treasuryAddress);
  console.log("🦄 Uniswap Router:", uniswapRouter);

  // =======================
  // Deploy AgentLaunchpad
  // =======================
  console.log("\n📦 Deploying AgentLaunchpad...");
  const AgentLaunchpad = await ethers.getContractFactory("AgentLaunchpad");
  
  console.log("⏳ Deployment in progress...");
  const launchpad = await AgentLaunchpad.deploy(
    treasuryAddress,
    uniswapRouter
  );

  await launchpad.waitForDeployment();
  const launchpadAddress = await launchpad.getAddress();
  console.log("✅ AgentLaunchpad deployed to:", launchpadAddress);

  // =======================
  // Verify Deployment
  // =======================
  console.log("\n🔍 Verifying deployment...");
  
  const deployedTreasury = await launchpad.treasuryAddress();
  const deployedRouter = await launchpad.uniswapRouter();
  const protocolFee = await launchpad.protocolFeePercentage();
  const maxFee = await launchpad.MAX_FEE();
  const currentAgentId = await launchpad.getCurrentAgentId();
  const liquidityPercent = await launchpad.defaultLiquidityPercentage();
  const tokenLPPercent = await launchpad.defaultTokenLPPercentage();

  console.log("📊 Launchpad verification:");
  console.log("  Treasury:", deployedTreasury);
  console.log("  Uniswap Router:", deployedRouter);
  console.log("  Protocol Fee:", protocolFee.toString(), "basis points");
  console.log("  Max Fee:", maxFee.toString(), "basis points");
  console.log("  Current Agent ID:", currentAgentId.toString());
  console.log("  Default Liquidity %:", liquidityPercent.toString(), "basis points");
  console.log("  Default Token LP %:", tokenLPPercent.toString(), "basis points");

  // =======================
  // Test Core Functions
  // =======================
  console.log("\n🧪 Testing core functions...");
  
  try {
    const pausedStatus = await launchpad.paused();
    console.log("✅ Pausable check passed - Status:", pausedStatus);
    
    const ownerAddress = await launchpad.owner();
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
      AgentLaunchpad: {
        address: launchpadAddress,
        constructorArgs: [treasuryAddress, uniswapRouter]
      }
    },
    configuration: {
      treasuryAddress,
      uniswapRouter,
      protocolFeePercentage: protocolFee.toString(),
      defaultLiquidityPercentage: liquidityPercent.toString(),
      defaultTokenLPPercentage: tokenLPPercent.toString()
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
  console.log(`   npx hardhat verify --network ${network.name} ${launchpadAddress} "${treasuryAddress}" "${uniswapRouter}"`);
  
  console.log("\n2. Update backend environment variables:");
  console.log(`   LAUNCHPAD_CONTRACT_ADDRESS=${launchpadAddress}`);
  console.log(`   WEB3_RPC_URL=${process.env[`${network.name.toUpperCase()}_RPC_URL`] || 'your_rpc_url'}`);
  
  console.log("\n3. Test full agent lifecycle:");
  console.log("   - Create agent with complete JSON config");
  console.log("   - Fund agent campaigns");
  console.log("   - Auto-bonding and LP creation");
  console.log("   - Backend event listening and database sync");

  console.log("\n4. Agent Features Available:");
  console.log("   ✅ Complete JSON configuration storage on-chain");
  console.log("   ✅ ERC20 token deployment per agent");
  console.log("   ✅ Uniswap V2 liquidity pool creation");
  console.log("   ✅ Automatic bonding when funded");
  console.log("   ✅ Protocol fees and treasury management");
  console.log("   ✅ Contribution tracking and withdrawals");
  console.log("   ✅ Pausable and admin controls");

  console.log("\n🎉 Full AgentLaunchpad deployment completed successfully!");

  return deploymentInfo;
}

// Handle deployment
main()
  .then((deploymentInfo) => {
    console.log("\n🎉 AgentLaunchpad deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 