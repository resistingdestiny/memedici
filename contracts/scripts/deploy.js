const { ethers } = require("hardhat");

async function main() {
  console.log("�� Deploying Memedici Full Contract Suite...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Network-specific configurations
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);

  let uniswapRouter;
  let treasuryAddress;

  // Configure addresses based on network
  switch (network.chainId) {
    case 1n: // Mainnet
      uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      break;
    case 11155111n: // Sepolia
      uniswapRouter = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Sepolia Uniswap V2 Router
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      break;
    case 137n: // Polygon
      uniswapRouter = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // QuickSwap Router
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      break;
    case 42161n: // Arbitrum
      uniswapRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; // SushiSwap Router on Arbitrum
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      break;
    case 8453n: // Base
      uniswapRouter = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"; // BaseSwap Router
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      break;
    default: // Local/Hardhat
      // For local testing, we'll use a mock router address
      uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
      treasuryAddress = deployer.address;
      console.log("⚠️  Using mock addresses for local development");
  }

  console.log("🏦 Treasury Address:", treasuryAddress);
  console.log("🦄 Uniswap Router:", uniswapRouter);

  // =======================
  // 1. Deploy Feedback Reward Token
  // =======================
  console.log("\n📦 Deploying FeedbackRewardToken...");
  const FeedbackRewardToken = await ethers.getContractFactory("FeedbackRewardToken");
  
  const feedbackToken = await FeedbackRewardToken.deploy(
    "Memedici Feedback Token",  // name
    "FEEDBACK",                 // symbol
    deployer.address           // owner
  );

  await feedbackToken.waitForDeployment();
  const feedbackTokenAddress = await feedbackToken.getAddress();
  console.log("✅ FeedbackRewardToken deployed to:", feedbackTokenAddress);

  // =======================
  // 2. Deploy Feedback Oracle
  // =======================
  console.log("\n📦 Deploying FeedbackOracle...");
  const FeedbackOracle = await ethers.getContractFactory("FeedbackOracle");
  
  const feedbackOracle = await FeedbackOracle.deploy(
    feedbackTokenAddress,    // reward token address
    deployer.address        // owner
  );

  await feedbackOracle.waitForDeployment();
  const feedbackOracleAddress = await feedbackOracle.getAddress();
  console.log("✅ FeedbackOracle deployed to:", feedbackOracleAddress);

  // =======================
  // 3. Configure Feedback System
  // =======================
  console.log("\n⚙️  Configuring feedback system...");
  
  // Authorize oracle to mint tokens
  await feedbackToken.setMinterAuthorization(feedbackOracleAddress, true);
  console.log("✅ Oracle authorized to mint feedback tokens");

  // Authorize deployer as oracle signer (in production, use a separate oracle key)
  await feedbackOracle.setSignerAuthorization(deployer.address, true);
  console.log("✅ Deployer authorized as oracle signer");

  // =======================
  // 4. Deploy AgentLaunchpad
  // =======================
  console.log("\n📦 Deploying AgentLaunchpad...");
  const AgentLaunchpad = await ethers.getContractFactory("AgentLaunchpad");
  
  const launchpad = await AgentLaunchpad.deploy(
    treasuryAddress,
    uniswapRouter
  );

  await launchpad.waitForDeployment();
  const launchpadAddress = await launchpad.getAddress();
  console.log("✅ AgentLaunchpad deployed to:", launchpadAddress);

  // =======================
  // 5. Verify Deployments
  // =======================
  console.log("\n🔍 Verifying deployments...");
  
  // Verify Feedback Token
  const tokenName = await feedbackToken.name();
  const tokenSymbol = await feedbackToken.symbol();
  const tokenOwner = await feedbackToken.owner();
  const isOracleAuthorized = await feedbackToken.authorizedMinters(feedbackOracleAddress);

  console.log("📊 Feedback Token verification:");
  console.log("  Name:", tokenName);
  console.log("  Symbol:", tokenSymbol);
  console.log("  Owner:", tokenOwner);
  console.log("  Oracle Authorized:", isOracleAuthorized);

  // Verify Feedback Oracle
  const oracleRewardToken = await feedbackOracle.rewardToken();
  const oracleOwner = await feedbackOracle.owner();
  const qualityThreshold = await feedbackOracle.qualityThreshold();
  const isSignerAuthorized = await feedbackOracle.authorizedSigners(deployer.address);

  console.log("📊 Feedback Oracle verification:");
  console.log("  Reward Token:", oracleRewardToken);
  console.log("  Owner:", oracleOwner);
  console.log("  Quality Threshold:", qualityThreshold.toString());
  console.log("  Deployer Authorized:", isSignerAuthorized);

  // Verify Launchpad
  const deployedTreasury = await launchpad.treasuryAddress();
  const deployedRouter = await launchpad.uniswapRouter();
  const protocolFee = await launchpad.protocolFeePercentage();
  const currentAgentId = await launchpad.getCurrentAgentId();

  console.log("📊 Agent Launchpad verification:");
  console.log("  Treasury:", deployedTreasury);
  console.log("  Router:", deployedRouter);
  console.log("  Protocol Fee:", protocolFee.toString(), "basis points");
  console.log("  Current Agent ID:", currentAgentId.toString());

  // =======================
  // 6. Save Deployment Info
  // =======================
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      FeedbackRewardToken: {
        address: feedbackTokenAddress,
        constructorArgs: ["Memedici Feedback Token", "FEEDBACK", deployer.address]
      },
      FeedbackOracle: {
        address: feedbackOracleAddress,
        constructorArgs: [feedbackTokenAddress, deployer.address]
      },
      AgentLaunchpad: {
        address: launchpadAddress,
        constructorArgs: [treasuryAddress, uniswapRouter]
      }
    },
    configuration: {
      treasuryAddress,
      uniswapRouter,
      protocolFeePercentage: protocolFee.toString(),
      feedbackRewards: {
        baseReward: "10 tokens",
        qualityBonus: "5 tokens",
        qualityThreshold: qualityThreshold.toString()
      }
    },
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  console.log("\n📄 Full Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // =======================
  // 7. Next Steps Instructions
  // =======================
  console.log("\n🎯 Next Steps:");
  console.log("1. Verify contracts on Etherscan:");
  console.log(`   npx hardhat verify --network ${network.name} ${feedbackTokenAddress} "Memedici Feedback Token" "FEEDBACK" "${deployer.address}"`);
  console.log(`   npx hardhat verify --network ${network.name} ${feedbackOracleAddress} "${feedbackTokenAddress}" "${deployer.address}"`);
  console.log(`   npx hardhat verify --network ${network.name} ${launchpadAddress} "${treasuryAddress}" "${uniswapRouter}"`);
  
  console.log("\n2. Update backend environment variables:");
  console.log(`   REWARD_TOKEN_ADDRESS=${feedbackTokenAddress}`);
  console.log(`   ORACLE_CONTRACT_ADDRESS=${feedbackOracleAddress}`);
  console.log(`   LAUNCHPAD_CONTRACT_ADDRESS=${launchpadAddress}`);
  
  console.log("\n3. Test feedback system:");
  console.log(`   const oracle = await ethers.getContractAt("FeedbackOracle", "${feedbackOracleAddress}");`);
  console.log(`   const token = await ethers.getContractAt("FeedbackRewardToken", "${feedbackTokenAddress}");`);
  
  console.log("\n4. Test agent creation:");
  console.log(`   const launchpad = await ethers.getContractAt("AgentLaunchpad", "${launchpadAddress}");`);
  console.log(`   await launchpad.createAgent(...);`);
  
  console.log("\n5. Update frontend configuration with all contract addresses");

  return deploymentInfo;
}

// Handle deployment
main()
  .then((deploymentInfo) => {
    console.log("\n🎉 Full deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 