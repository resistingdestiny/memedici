const { ethers } = require("hardhat");
const { ENTROPY_ADDRESSES } = require("../hardhat.config.js");

async function main() {
  console.log("🚀 Deploying Memedici Full Contract Suite with Pyth Integration + Entropy...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Network-specific configurations
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);

  let uniswapRouter;
  let treasuryAddress;
  let pythContractAddress;
  let nativeTokenPriceFeedId;
  let entropyContractAddress;

  // Configure addresses based on network
  switch (network.chainId) {
    case 1n: // Mainnet
      uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router
      pythContractAddress = "0x4305FB66699C3B2702D4d05CF36551390A4c69C6"; // Pyth Mainnet
      nativeTokenPriceFeedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[1];
      break;
    case 11155111n: // Sepolia
      uniswapRouter = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Sepolia Uniswap V2 Router
      pythContractAddress = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"; // Pyth Sepolia
      nativeTokenPriceFeedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[11155111];
      break;
    case 137n: // Polygon
      uniswapRouter = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // QuickSwap Router
      pythContractAddress = "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C"; // Pyth Polygon
      nativeTokenPriceFeedId = "0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52"; // MATIC/USD
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[137];
      break;
    case 42161n: // Arbitrum
      uniswapRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; // SushiSwap Router on Arbitrum
      pythContractAddress = "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C"; // Pyth Arbitrum
      nativeTokenPriceFeedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[42161];
      break;
    case 8453n: // Base
      uniswapRouter = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"; // BaseSwap Router
      pythContractAddress = "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a"; // Pyth Base
      nativeTokenPriceFeedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[8453];
      break;
    case 295n: // Hedera Mainnet
      uniswapRouter = "0x000000000000000000000000000000000000000000"; // TODO: Add Hedera DEX
      pythContractAddress = "0x000000000000000000000000000000000000000000"; // TODO: Add Pyth Hedera when available
      nativeTokenPriceFeedId = "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"; // HBAR/USD - placeholder
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[295];
      break;
    case 296n: // Hedera Testnet
      uniswapRouter = "0x000000000000000000000000000000000000000000"; // TODO: Add Hedera DEX
      pythContractAddress = "0x000000000000000000000000000000000000000000"; // TODO: Add Pyth Hedera when available
      nativeTokenPriceFeedId = "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"; // HBAR/USD - placeholder
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[296];
      break;
    case 747n: // Flow Mainnet
      uniswapRouter = "0x000000000000000000000000000000000000000000"; // TODO: Add Flow DEX
      pythContractAddress = "0x000000000000000000000000000000000000000000"; // TODO: Add Pyth Flow when available
      nativeTokenPriceFeedId = "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"; // FLOW/USD - placeholder
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[747];
      break;
    case 545n: // Flow Testnet
      uniswapRouter = "0x000000000000000000000000000000000000000000"; // TODO: Add Flow DEX
      pythContractAddress = "0x000000000000000000000000000000000000000000"; // TODO: Add Pyth Flow when available
      nativeTokenPriceFeedId = "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"; // FLOW/USD - placeholder
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[545];
      break;
    case 30n: // Rootstock Mainnet
      uniswapRouter = "0x000000000000000000000000000000000000000000"; // TODO: Add Rootstock DEX
      pythContractAddress = "0x000000000000000000000000000000000000000000"; // TODO: Add Pyth Rootstock when available
      nativeTokenPriceFeedId = "0xf2f819ac4bfdf32afdaa64b1c571c0b5c0de7ff1a806d4d0f0a8c4ce96a1b6e5"; // BTC/USD (Rootstock uses BTC)
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[30];
      break;
    case 31n: // Rootstock Testnet
      uniswapRouter = "0x000000000000000000000000000000000000000000"; // TODO: Add Rootstock DEX
      pythContractAddress = "0x000000000000000000000000000000000000000000"; // TODO: Add Pyth Rootstock when available
      nativeTokenPriceFeedId = "0xf2f819ac4bfdf32afdaa64b1c571c0b5c0de7ff1a806d4d0f0a8c4ce96a1b6e5"; // BTC/USD (Rootstock uses BTC)
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[31];
      break;
    default: // Local/Hardhat
      // For local testing, we'll use mock addresses
      uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
      pythContractAddress = "0x4305FB66699C3B2702D4d05CF36551390A4c69C6"; // Mock Pyth
      nativeTokenPriceFeedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD
      treasuryAddress = deployer.address;
      entropyContractAddress = "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c"; // Default for local
      console.log("⚠️  Using mock addresses for local development");
  }

  console.log("🏦 Treasury Address:", treasuryAddress);
  console.log("🦄 Uniswap Router:", uniswapRouter);
  console.log("🔮 Pyth Contract:", pythContractAddress);
  console.log("💰 Native Token Price Feed:", nativeTokenPriceFeedId);
  console.log("🎲 Entropy Contract:", entropyContractAddress);

  // Check if Pyth contract address is set
  if (pythContractAddress === "0x000000000000000000000000000000000000000000") {
    console.log("⚠️  WARNING: Pyth contract not available for this network. Deployment will use placeholder address.");
    console.log("    Please update the contract address and price feed ID manually after deployment.");
  }

  // Check if Entropy contract address is set
  if (entropyContractAddress === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  WARNING: Entropy contract not available for this network. Deployment will use placeholder address.");
    console.log("    Please update the contract address manually after deployment.");
  }

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
    feedbackTokenAddress,      // reward token address
    pythContractAddress,       // pyth contract address
    nativeTokenPriceFeedId,    // native token price feed ID
    deployer.address          // owner
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

  // Fund the oracle contract with some native tokens for rewards (0.1 native tokens)
  const fundingAmount = ethers.parseEther("0.1");
  await feedbackOracle.fundContract({ value: fundingAmount });
  console.log("✅ Oracle contract funded with", ethers.formatEther(fundingAmount), "native tokens");

  // =======================
  // 4. Deploy AgentLaunchpad
  // =======================
  console.log("\n📦 Deploying AgentLaunchpad...");
  const AgentLaunchpad = await ethers.getContractFactory("AgentLaunchpad");
  
  const launchpad = await AgentLaunchpad.deploy(
    treasuryAddress,
    uniswapRouter,
    entropyContractAddress
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
  const pythContract = await feedbackOracle.pyth();
  const priceFeedId = await feedbackOracle.nativeTokenPriceFeedId();
  const contractBalance = await ethers.provider.getBalance(feedbackOracleAddress);

  console.log("📊 Feedback Oracle verification:");
  console.log("  Reward Token:", oracleRewardToken);
  console.log("  Owner:", oracleOwner);
  console.log("  Quality Threshold:", qualityThreshold.toString());
  console.log("  Deployer Authorized:", isSignerAuthorized);
  console.log("  Pyth Contract:", pythContract);
  console.log("  Price Feed ID:", priceFeedId);
  console.log("  Contract Balance:", ethers.formatEther(contractBalance), "native tokens");

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
        constructorArgs: [feedbackTokenAddress, pythContractAddress, nativeTokenPriceFeedId, deployer.address]
      },
      AgentLaunchpad: {
        address: launchpadAddress,
        constructorArgs: [treasuryAddress, uniswapRouter, entropyContractAddress]
      }
    },
    configuration: {
      treasuryAddress,
      uniswapRouter,
      pythIntegration: {
        pythContract: pythContractAddress,
        nativeTokenPriceFeedId,
        priceUpdateRequired: true,
        maxPriceAge: "300 seconds"
      },
      protocolFeePercentage: protocolFee.toString(),
      feedbackRewards: {
        baseRewardUSD: "$10.00",
        qualityBonusUSD: "$5.00",
        qualityThreshold: qualityThreshold.toString(),
        rewardMethod: "USD equivalent in native tokens + ERC20 tokens",
        erc20BaseReward: "10 FEEDBACK tokens",
        erc20QualityBonus: "5 FEEDBACK tokens"
      },
      entropy: {
        contractAddress: entropyContractAddress
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
  console.log(`   npx hardhat verify --network ${network.name} ${feedbackOracleAddress} "${feedbackTokenAddress}" "${pythContractAddress}" "${nativeTokenPriceFeedId}" "${deployer.address}"`);
  console.log(`   npx hardhat verify --network ${network.name} ${launchpadAddress} "${treasuryAddress}" "${uniswapRouter}" "${entropyContractAddress}"`);
  
  console.log("\n2. Update backend environment variables:");
  console.log(`   REWARD_TOKEN_ADDRESS=${feedbackTokenAddress}`);
  console.log(`   ORACLE_CONTRACT_ADDRESS=${feedbackOracleAddress}`);
  console.log(`   LAUNCHPAD_CONTRACT_ADDRESS=${launchpadAddress}`);
  console.log(`   PYTH_CONTRACT_ADDRESS=${pythContractAddress}`);
  console.log(`   NATIVE_TOKEN_PRICE_FEED_ID=${nativeTokenPriceFeedId}`);
  console.log(`   ENTROPY_CONTRACT_ADDRESS=${entropyContractAddress}`);
  
  console.log("\n3. Important notes for USD reward system:");
  console.log("   - Feedback rewards are now paid in USD equivalent native tokens");
  console.log("   - Base reward: $10.00 USD in native tokens");
  console.log("   - Quality bonus: Additional $5.00 USD for ratings ≥7/10");
  console.log("   - Price updates from Pyth are required for each reward transaction");
  console.log("   - Contract must be funded with native tokens to pay rewards");
  console.log("   - Users also receive ERC20 FEEDBACK tokens as before");
  
  console.log("\n4. Agent random seed generation:");
  console.log("   - Each agent gets a unique random seed generated during bonding");
  console.log("   - Seeds are generated using Pyth Entropy for cryptographic randomness");
  console.log("   - Seeds can be used for procedural generation, AI personality traits, etc.");
  console.log("   - Seeds are permanently stored on-chain with each agent");
  
  console.log("\n5. Funding the oracle contract:");
  console.log(`   - Current balance: ${ethers.formatEther(contractBalance)} native tokens`);
  console.log("   - Add more funding with: feedbackOracle.fundContract({value: amount})");
  console.log("   - Monitor balance to ensure rewards can be paid");

  console.log("\n🎉 Deployment completed successfully!");

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