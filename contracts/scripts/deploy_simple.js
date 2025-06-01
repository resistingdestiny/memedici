const { ethers } = require("hardhat");
const { ENTROPY_ADDRESSES } = require("../hardhat.config.js");

async function main() {
  console.log("🚀 Deploying AgentLaunchpad Contract...");
  
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

  // Network-specific configurations
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);

  let uniswapRouter;
  let treasuryAddress;
  let entropyContractAddress;

  // Configure addresses based on network
  switch (network.chainId) {
    case 1n: // Mainnet
      uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[1];
      break;
    case 11155111n: // Sepolia
      uniswapRouter = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Sepolia Uniswap V2 Router
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[11155111];
      break;
    case 137n: // Polygon
      uniswapRouter = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // QuickSwap Router
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[137];
      break;
    case 42161n: // Arbitrum
      uniswapRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; // SushiSwap Router on Arbitrum
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[42161];
      break;
    case 8453n: // Base
      uniswapRouter = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"; // BaseSwap Router
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[8453];
      break;
    case 295n: // Hedera Mainnet
      uniswapRouter = ethers.ZeroAddress; // Placeholder DEX
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[295] || ethers.ZeroAddress;
      break;
    case 296n: // Hedera Testnet
      uniswapRouter = ethers.ZeroAddress; // Placeholder DEX
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[296] || ethers.ZeroAddress;
      break;
    case 747n: // Flow Mainnet
      uniswapRouter = ethers.ZeroAddress; // Placeholder DEX
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[747] || ethers.ZeroAddress;
      break;
    case 545n: // Flow Testnet
      uniswapRouter = ethers.ZeroAddress; // Placeholder DEX
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[545] || ethers.ZeroAddress;
      break;
    case 30n: // Rootstock Mainnet
      uniswapRouter = ethers.ZeroAddress; // Placeholder DEX
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[30] || ethers.ZeroAddress;
      break;
    case 31n: // Rootstock Testnet
      uniswapRouter = ethers.ZeroAddress; // Placeholder DEX
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
      entropyContractAddress = ENTROPY_ADDRESSES[31] || ethers.ZeroAddress;
      break;
    default: // Local/Hardhat
      // For local testing, we'll use mock addresses
      uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
      treasuryAddress = deployer.address;
      entropyContractAddress = "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c"; // Default for local
      console.log("⚠️  Using mock addresses for local development");
  }

  // Ensure all addresses are properly checksummed
  treasuryAddress = ethers.getAddress(treasuryAddress);
  uniswapRouter = ethers.getAddress(uniswapRouter);
  entropyContractAddress = ethers.getAddress(entropyContractAddress);

  console.log("🏦 Treasury Address:", treasuryAddress);
  console.log("🦄 Uniswap Router:", uniswapRouter);
  console.log("🎲 Entropy Contract:", entropyContractAddress);

  // =======================
  // Deploy AgentLaunchpad
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
  // Verify Deployment
  // =======================
  console.log("\n🔍 Verifying deployment...");
  
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
  // Save Deployment Info
  // =======================
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      AgentLaunchpad: {
        address: launchpadAddress,
        constructorArgs: [treasuryAddress, uniswapRouter, entropyContractAddress]
      }
    },
    configuration: {
      treasuryAddress,
      uniswapRouter,
      entropyContract: entropyContractAddress,
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
  console.log(`   npx hardhat verify --network ${network.name} ${launchpadAddress} "${treasuryAddress}" "${uniswapRouter}" "${entropyContractAddress}"`);
  
  console.log("\n2. Update backend environment variables:");
  console.log(`   LAUNCHPAD_CONTRACT_ADDRESS=${launchpadAddress}`);
  console.log(`   WEB3_RPC_URL=${process.env[`${network.name.toUpperCase()}_RPC_URL`] || 'your_rpc_url'}`);
  
  console.log("\n3. Test agent creation:");
  console.log("   - Each agent will auto-deploy its own AgentToken with complete JSON config");
  console.log("   - AgentToken includes: ERC20, governance, revenue sharing, and full agent data");
  console.log("   - JSON configuration is stored on-chain in both contracts");

  console.log("\n🎉 Deployment completed successfully!");

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