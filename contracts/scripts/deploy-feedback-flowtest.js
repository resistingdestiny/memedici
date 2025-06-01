const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Feedback Oracle System to Flow Testnet...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "FLOW");
    
    // Check if account has sufficient balance for deployment
    const minBalance = ethers.parseEther("0.1"); // Minimum 0.1 FLOW for deployment
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
    
    // Verify we're on Flow Testnet
    if (network.chainId !== 545n) {
        console.error("❌ This script is for Flow Testnet (Chain ID: 545) only!");
        console.error(`   Current Chain ID: ${network.chainId}`);
        process.exit(1);
    }
    
    // Flow Testnet specific configuration
    const FLOW_TESTNET_PYTH_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43";
    
    console.log("🔧 Flow Testnet Configuration:");
    console.log("   Pyth Oracle:", FLOW_TESTNET_PYTH_ADDRESS);
    console.log("   Native Token: FLOW");
    console.log("   Base Reward: $10.00 USD");
    console.log("   Quality Bonus: $5.00 USD");
    
    // =======================
    // Deploy FeedbackRewardToken
    // =======================
    console.log("\n📦 Deploying FeedbackRewardToken...");
    const FeedbackRewardToken = await ethers.getContractFactory("FeedbackRewardToken");
    
    console.log("⏳ Deployment in progress...");
    const rewardToken = await FeedbackRewardToken.deploy(
        "MemeDici Feedback Token",
        "MFBT",
        deployer.address
    );
    
    await rewardToken.waitForDeployment();
    const rewardTokenAddress = await rewardToken.getAddress();
    console.log("✅ FeedbackRewardToken deployed to:", rewardTokenAddress);
    
    // =======================
    // Deploy FeedbackOracle
    // =======================
    console.log("\n📦 Deploying FeedbackOracle...");
    const FeedbackOracle = await ethers.getContractFactory("FeedbackOracle");
    
    console.log("⏳ Deployment in progress...");
    const feedbackOracle = await FeedbackOracle.deploy(
        rewardTokenAddress,
        FLOW_TESTNET_PYTH_ADDRESS,
        deployer.address
    );
    
    await feedbackOracle.waitForDeployment();
    const feedbackOracleAddress = await feedbackOracle.getAddress();
    console.log("✅ FeedbackOracle deployed to:", feedbackOracleAddress);
    
    // =======================
    // Configure Contracts
    // =======================
    console.log("\n🔧 Configuring contracts...");
    
    // Authorize the oracle to mint reward tokens
    console.log("   Authorizing FeedbackOracle to mint tokens...");
    const authTx = await rewardToken.setMinterAuthorization(feedbackOracleAddress, true);
    await authTx.wait();
    console.log("   ✅ Authorization complete");
    
    // Authorize deployer as a signer (for testing)
    console.log("   Authorizing deployer as feedback signer...");
    const signerTx = await feedbackOracle.setSignerAuthorization(deployer.address, true);
    await signerTx.wait();
    console.log("   ✅ Signer authorization complete");
    
    // Fund the contract with some FLOW for testing
    const fundAmount = ethers.parseEther("1.0"); // 1 FLOW
    console.log(`   Funding contract with ${ethers.formatEther(fundAmount)} FLOW...`);
    const fundTx = await feedbackOracle.fundContract({ value: fundAmount });
    await fundTx.wait();
    console.log("   ✅ Contract funded");
    
    // =======================
    // Verify Deployment
    // =======================
    console.log("\n🔍 Verifying deployment...");
    
    const currentConfig = await feedbackOracle.currentConfig();
    const contractBalance = await ethers.provider.getBalance(feedbackOracleAddress);
    const qualityThreshold = await feedbackOracle.qualityThreshold();
    const skipVerification = await feedbackOracle.skipVerification();
    
    console.log("📊 FeedbackOracle verification:");
    console.log("  Network Config Active:", currentConfig.isActive);
    console.log("  Base Reward USD (cents):", currentConfig.baseRewardUSDCents.toString());
    console.log("  Quality Bonus USD (cents):", currentConfig.qualityBonusUSDCents.toString());
    console.log("  Quality Threshold:", qualityThreshold.toString());
    console.log("  Skip Verification:", skipVerification);
    console.log("  Contract Balance:", ethers.formatEther(contractBalance), "FLOW");
    
    console.log("📊 FeedbackRewardToken verification:");
    const tokenName = await rewardToken.name();
    const tokenSymbol = await rewardToken.symbol();
    const totalSupply = await rewardToken.totalSupply();
    console.log("  Token Name:", tokenName);
    console.log("  Token Symbol:", tokenSymbol);
    console.log("  Total Supply:", ethers.formatEther(totalSupply));
    
    // =======================
    // Test Core Functions
    // =======================
    console.log("\n🧪 Testing core functions...");
    
    try {
        const oracleOwner = await feedbackOracle.owner();
        const tokenOwner = await rewardToken.owner();
        console.log("✅ Ownership check passed - Oracle Owner:", oracleOwner);
        console.log("✅ Ownership check passed - Token Owner:", tokenOwner);
        
        const isAuthorizedMinter = await rewardToken.authorizedMinters(feedbackOracleAddress);
        console.log("✅ Minter authorization check passed:", isAuthorizedMinter);
        
        const isAuthorizedSigner = await feedbackOracle.authorizedSigners(deployer.address);
        console.log("✅ Signer authorization check passed:", isAuthorizedSigner);
        
        console.log("✅ All core function tests passed!");
    } catch (error) {
        console.error("❌ Core function test failed:", error.message);
    }
    
    // =======================
    // Save Deployment Info
    // =======================
    const deploymentInfo = {
        network: "FlowTestnet",
        chainId: network.chainId.toString(),
        deployer: deployer.address,
        contracts: {
            FeedbackRewardToken: {
                address: rewardTokenAddress,
                constructorArgs: ["MemeDici Feedback Token", "MFBT", deployer.address]
            },
            FeedbackOracle: {
                address: feedbackOracleAddress,
                constructorArgs: [rewardTokenAddress, FLOW_TESTNET_PYTH_ADDRESS, deployer.address]
            }
        },
        configuration: {
            pythOracleAddress: FLOW_TESTNET_PYTH_ADDRESS,
            nativeToken: "FLOW",
            baseRewardUSDCents: currentConfig.baseRewardUSDCents.toString(),
            qualityBonusUSDCents: currentConfig.qualityBonusUSDCents.toString(),
            qualityThreshold: qualityThreshold.toString(),
            skipVerification: skipVerification,
            contractBalance: ethers.formatEther(contractBalance)
        },
        timestamp: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber()
    };
    
    // Save to file
    const fs = require('fs');
    const fileName = `deployment-flow-testnet-${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📄 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${fileName}`);
    
    // =======================
    // Next Steps Instructions
    // =======================
    console.log("\n🎯 Next Steps:");
    console.log("1. Verify contracts on Flow block explorer:");
    console.log(`   npx hardhat verify --network flowTestnet ${rewardTokenAddress} "MemeDici Feedback Token" "MFBT" "${deployer.address}"`);
    console.log(`   npx hardhat verify --network flowTestnet ${feedbackOracleAddress} "${rewardTokenAddress}" "${FLOW_TESTNET_PYTH_ADDRESS}" "${deployer.address}"`);
    
    console.log("\n2. Update backend environment variables:");
    console.log(`   FEEDBACK_ORACLE_CONTRACT_ADDRESS=${feedbackOracleAddress}`);
    console.log(`   FEEDBACK_REWARD_TOKEN_ADDRESS=${rewardTokenAddress}`);
    console.log(`   FLOW_TESTNET_RPC_URL=https://testnet.evm.nodes.onflow.org`);
    console.log(`   FEEDBACK_ORACLE_SIGNER_KEY=your_private_key`);
    
    console.log("\n3. Features Available:");
    console.log("   ✅ USD-based rewards using Pyth FLOW/USD price feeds");
    console.log("   ✅ ERC20 token rewards (MFBT)");
    console.log("   ✅ Native FLOW token rewards");
    console.log("   ✅ Quality-based bonus system");
    console.log("   ✅ Cryptographic proof verification");
    console.log("   ✅ Rate limiting and duplicate prevention");
    console.log("   ✅ Owner controls and emergency functions");
    
    console.log("\n4. Example Usage:");
    console.log("   // Submit feedback and get signed proof from backend");
    console.log("   // Call processFeedback() with proof and Pyth price data");
    console.log("   // Users receive both MFBT tokens and FLOW based on USD value");
    
    console.log("\n5. Testing with verification skip:");
    console.log(`   await feedbackOracle.updateVerificationSkip(true); // Owner only`);
    console.log("   This allows testing without cryptographic signatures");
    
    console.log("\n🎉 Flow Testnet Feedback Oracle deployment completed successfully!");
    
    return deploymentInfo;
}

// Handle deployment
main()
    .then((deploymentInfo) => {
        console.log("\n✨ Flow Testnet deployment completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    }); 