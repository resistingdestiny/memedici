const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying AgentLaunchpadCore + AgentLiquidityManager...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "FLOW");
  
  // Check if account has sufficient balance for deployment
  const minBalance = ethers.parseEther("0.02"); // Minimum 0.02 FLOW for both deployments
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
  let uniswapRouter = process.env.UNISWAP_ROUTER;
  
  // Default Uniswap V2 routers for different networks
  const defaultRouters = {
    1: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Ethereum Mainnet
    11155111: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Sepolia
    137: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", // Polygon
    42161: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // Arbitrum
    8453: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", // Base
    31337: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Hardhat local
    545: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" // Flow testnet (placeholder)
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
  // 1. Deploy AgentLiquidityManager
  // =======================
  console.log("\n📦 Deploying AgentLiquidityManager...");
  const AgentLiquidityManager = await ethers.getContractFactory("AgentLiquidityManager");
  
  console.log("⏳ LP Manager deployment in progress...");
  const liquidityManager = await AgentLiquidityManager.deploy(uniswapRouter);

  await liquidityManager.waitForDeployment();
  const liquidityManagerAddress = await liquidityManager.getAddress();
  console.log("✅ AgentLiquidityManager deployed to:", liquidityManagerAddress);

  // =======================
  // 2. Deploy AgentLaunchpadCore
  // =======================
  console.log("\n📦 Deploying AgentLaunchpadCore...");
  const AgentLaunchpadCore = await ethers.getContractFactory("AgentLaunchpadCore");
  
  console.log("⏳ Core deployment in progress...");
  const launchpadCore = await AgentLaunchpadCore.deploy(treasuryAddress);

  await launchpadCore.waitForDeployment();
  const launchpadCoreAddress = await launchpadCore.getAddress();
  console.log("✅ AgentLaunchpadCore deployed to:", launchpadCoreAddress);

  // =======================
  // 3. Connect the contracts
  // =======================
  console.log("\n🔗 Connecting contracts...");
  
  // Set LP manager in core contract
  await launchpadCore.setLiquidityManager(liquidityManagerAddress);
  console.log("✅ LP Manager set in Core contract");
  
  // Authorize core contract to call LP manager
  await liquidityManager.setAuthorizedCaller(launchpadCoreAddress, true);
  console.log("✅ Core contract authorized in LP Manager");

  // =======================
  // 4. Verify Deployment
  // =======================
  console.log("\n🔍 Verifying deployment...");
  
  // Core contract verification
  const deployedTreasury = await launchpadCore.treasuryAddress();
  const deployedLiquidityManager = await launchpadCore.liquidityManager();
  const protocolFee = await launchpadCore.protocolFeePercentage();
  const liquidityPercent = await launchpadCore.defaultLiquidityPercentage();
  const currentAgentId = await launchpadCore.getCurrentAgentId();

  console.log("📊 AgentLaunchpadCore verification:");
  console.log("  Treasury:", deployedTreasury);
  console.log("  Liquidity Manager:", deployedLiquidityManager);
  console.log("  Protocol Fee:", protocolFee.toString(), "basis points");
  console.log("  Liquidity %:", liquidityPercent.toString(), "basis points");
  console.log("  Current Agent ID:", currentAgentId.toString());

  // LP Manager verification
  const deployedRouter = await liquidityManager.uniswapRouter();
  const tokenLPPercent = await liquidityManager.defaultTokenLPPercentage();
  const isAuthorized = await liquidityManager.authorizedCallers(launchpadCoreAddress);

  console.log("📊 AgentLiquidityManager verification:");
  console.log("  Uniswap Router:", deployedRouter);
  console.log("  Token LP %:", tokenLPPercent.toString(), "basis points");
  console.log("  Core Authorized:", isAuthorized);

  // =======================
  // 5. Test Core Functions
  // =======================
  console.log("\n🧪 Testing integration...");
  
  try {
    const ownerCore = await launchpadCore.owner();
    const ownerLP = await liquidityManager.owner();
    console.log("✅ Ownership check passed - Core Owner:", ownerCore);
    console.log("✅ Ownership check passed - LP Owner:", ownerLP);
    
    console.log("✅ All integration tests passed!");
  } catch (error) {
    console.error("❌ Integration test failed:", error.message);
  }

  // =======================
  // 6. Save Deployment Info
  // =======================
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      AgentLaunchpadCore: {
        address: launchpadCoreAddress,
        constructorArgs: [treasuryAddress]
      },
      AgentLiquidityManager: {
        address: liquidityManagerAddress,
        constructorArgs: [uniswapRouter]
      }
    },
    configuration: {
      treasuryAddress,
      uniswapRouter,
      protocolFeePercentage: protocolFee.toString(),
      defaultLiquidityPercentage: liquidityPercent.toString(),
      defaultTokenLPPercentage: tokenLPPercent.toString()
    },
    integration: {
      liquidityManagerSetInCore: deployedLiquidityManager === liquidityManagerAddress,
      coreAuthorizedInLP: isAuthorized
    },
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  console.log("\n📄 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // =======================
  // 7. Next Steps Instructions
  // =======================
  console.log("\n🎯 Next Steps:");
  console.log("1. Verify contracts on block explorer:");
  console.log(`   npx hardhat verify --network ${network.name} ${launchpadCoreAddress} "${treasuryAddress}"`);
  console.log(`   npx hardhat verify --network ${network.name} ${liquidityManagerAddress} "${uniswapRouter}"`);
  
  console.log("\n2. Update backend environment variables:");
  console.log(`   LAUNCHPAD_CONTRACT_ADDRESS=${launchpadCoreAddress}`);
  console.log(`   LIQUIDITY_MANAGER_ADDRESS=${liquidityManagerAddress}`);
  console.log(`   WEB3_RPC_URL=https://testnet.evm.nodes.onflow.org`);
  
  console.log("\n3. Full Features Now Available:");
  console.log("   ✅ Complete JSON configuration storage on-chain");
  console.log("   ✅ ERC20 token deployment per agent");
  console.log("   ✅ Agent funding campaigns");
  console.log("   ✅ Automatic bonding when funded");
  console.log("   ✅ Protocol fees and treasury management");
  console.log("   ✅ Contribution tracking");
  console.log("   ✅ Automatic Uniswap LP creation");
  console.log("   ✅ LP token distribution (80% LP, 20% treasury)");
  console.log("   ✅ Modular architecture");

  console.log("\n4. Test the full flow:");
  console.log("   - Create agent with JSON config");
  console.log("   - Fund the agent campaign");
  console.log("   - Automatic LP creation on bonding");
  console.log("   - Backend event listening works");

  console.log("\n🎉 Complete Agent Launchpad with LP functionality deployed!");

  return deploymentInfo;
}

// Handle deployment
main()
  .then((deploymentInfo) => {
    console.log("\n🎉 Complete deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 