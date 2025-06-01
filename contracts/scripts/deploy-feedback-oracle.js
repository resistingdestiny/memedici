const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const chainId = await deployer.getChainId();
    
    console.log("Deploying FeedbackOracle on chain:", chainId);
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));
    
    // Network-specific Pyth contract addresses
    const PYTH_ADDRESSES = {
        545: "0x2880aB155794e7179c9eE2e38200202908C17B43", // Flow Testnet
        296: "0xa2aa501b19aff244d90cc15a4cf739d2725b5729", // Hedera Testnet  
        31: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",  // Rootstock Testnet (Ethereum Pyth address)
    };
    
    const pythAddress = PYTH_ADDRESSES[chainId];
    if (!pythAddress) {
        throw new Error(`Pyth address not configured for chain ID: ${chainId}`);
    }
    
    console.log("Using Pyth address:", pythAddress);
    
    // Deploy FeedbackRewardToken first
    console.log("\nDeploying FeedbackRewardToken...");
    const FeedbackRewardToken = await ethers.getContractFactory("FeedbackRewardToken");
    const rewardToken = await FeedbackRewardToken.deploy(
        "MemeDici Feedback Token",
        "MFBT",
        deployer.address
    );
    await rewardToken.deployed();
    console.log("FeedbackRewardToken deployed to:", rewardToken.address);
    
    // Deploy FeedbackOracle
    console.log("\nDeploying FeedbackOracle...");
    const FeedbackOracle = await ethers.getContractFactory("FeedbackOracle");
    const feedbackOracle = await FeedbackOracle.deploy(
        rewardToken.address,
        pythAddress,
        deployer.address
    );
    await feedbackOracle.deployed();
    console.log("FeedbackOracle deployed to:", feedbackOracle.address);
    
    // Authorize the oracle to mint reward tokens
    console.log("\nAuthorizing FeedbackOracle to mint tokens...");
    const authTx = await rewardToken.setMinterAuthorization(feedbackOracle.address, true);
    await authTx.wait();
    console.log("Authorization complete");
    
    // Authorize deployer as a signer (for testing)
    console.log("\nAuthorizing deployer as feedback signer...");
    const signerTx = await feedbackOracle.setSignerAuthorization(deployer.address, true);
    await signerTx.wait();
    console.log("Signer authorization complete");
    
    // Fund the contract with some native tokens for testing
    const fundAmount = ethers.utils.parseEther("0.1");
    console.log("\nFunding contract with", ethers.utils.formatEther(fundAmount), "native tokens...");
    const fundTx = await feedbackOracle.fundContract({ value: fundAmount });
    await fundTx.wait();
    console.log("Contract funded");
    
    // Display deployment summary
    console.log("\n=== DEPLOYMENT SUMMARY ===");
    console.log("Chain ID:", chainId);
    console.log("Network:", getNetworkName(chainId));
    console.log("FeedbackRewardToken:", rewardToken.address);
    console.log("FeedbackOracle:", feedbackOracle.address);
    console.log("Pyth Oracle:", pythAddress);
    console.log("Contract Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(feedbackOracle.address)));
    
    // Display network configuration
    const config = await feedbackOracle.currentConfig();
    console.log("\n=== NETWORK CONFIGURATION ===");
    console.log("Min Feedback Interval:", config.minFeedbackInterval.toString(), "seconds");
    console.log("Max Price Age:", config.maxPriceAge.toString(), "seconds");
    console.log("Base Reward USD (cents):", config.baseRewardUSDCents.toString());
    console.log("Quality Bonus USD (cents):", config.qualityBonusUSDCents.toString());
    console.log("Native Token Price Feed ID:", config.nativeTokenPriceFeedId);
    console.log("Is Active:", config.isActive);
    
    // Save deployment addresses to file
    const fs = require('fs');
    const deploymentData = {
        chainId: chainId,
        network: getNetworkName(chainId),
        timestamp: new Date().toISOString(),
        contracts: {
            FeedbackRewardToken: rewardToken.address,
            FeedbackOracle: feedbackOracle.address,
            PythOracle: pythAddress
        },
        configuration: {
            minFeedbackInterval: config.minFeedbackInterval.toString(),
            maxPriceAge: config.maxPriceAge.toString(),
            baseRewardUSDCents: config.baseRewardUSDCents.toString(),
            qualityBonusUSDCents: config.qualityBonusUSDCents.toString(),
            nativeTokenPriceFeedId: config.nativeTokenPriceFeedId,
            isActive: config.isActive
        }
    };
    
    const fileName = `deployment-${getNetworkName(chainId)}-${chainId}.json`;
    fs.writeFileSync(fileName, JSON.stringify(deploymentData, null, 2));
    console.log(`\nDeployment data saved to: ${fileName}`);
    
    console.log("\n=== USAGE INSTRUCTIONS ===");
    console.log("1. Users submit feedback and receive signatures from your backend");
    console.log("2. Call processFeedback() with the proof and Pyth price update data");
    console.log("3. Users receive both ERC20 tokens and native tokens based on USD value");
    console.log("4. Quality ratings >= 7 receive bonus rewards");
    console.log("\nExample frontend integration:");
    console.log(`const oracle = new ethers.Contract("${feedbackOracle.address}", abi, signer);`);
    console.log("await oracle.processFeedback(proof, priceUpdateData, { value: priceUpdateFee });");
}

function getNetworkName(chainId) {
    const networks = {
        545: "FlowTestnet",
        296: "HederaTestnet", 
        31: "RootStockTestnet",
        31337: "Hardhat",
        1: "Ethereum",
        11155111: "Sepolia"
    };
    return networks[chainId] || `Unknown-${chainId}`;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 