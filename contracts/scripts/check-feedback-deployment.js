const { ethers } = require("hardhat");

/**
 * Comprehensive diagnostic script for Feedback Oracle deployment
 * Checks for common issues and validates configuration
 */

async function checkNetworkSupport() {
    console.log("🌐 Checking network support...");
    
    const network = await ethers.provider.getNetwork();
    const supportedNetworks = {
        545: "Flow Testnet",
        296: "Hedera Testnet", 
        31: "Rootstock Testnet"
    };
    
    console.log(`   Current Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    if (supportedNetworks[network.chainId]) {
        console.log(`   ✅ Network supported: ${supportedNetworks[network.chainId]}`);
        return true;
    } else {
        console.log("   ⚠️  Network not explicitly supported by Feedback Oracle");
        console.log("   Supported networks:");
        Object.entries(supportedNetworks).forEach(([chainId, name]) => {
            console.log(`     - ${name} (${chainId})`);
        });
        return false;
    }
}

async function checkDeployerBalance() {
    console.log("\n💰 Checking deployer balance...");
    
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    const network = await ethers.provider.getNetwork();
    
    // Minimum balance requirements per network
    const minBalances = {
        545: ethers.parseEther("0.1"),  // Flow Testnet
        296: ethers.parseEther("10"),   // Hedera Testnet 
        31: ethers.parseEther("0.001")  // Rootstock Testnet
    };
    
    const minRequired = minBalances[network.chainId] || ethers.parseEther("0.01");
    
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} native tokens`);
    console.log(`   Required: ${ethers.formatEther(minRequired)} native tokens`);
    
    if (balance >= minRequired) {
        console.log("   ✅ Sufficient balance for deployment");
        return true;
    } else {
        console.log("   ❌ Insufficient balance for deployment");
        console.log(`   Need additional: ${ethers.formatEther(minRequired - balance)} tokens`);
        return false;
    }
}

async function checkPythOracle() {
    console.log("\n🔮 Checking Pyth Oracle configuration...");
    
    const network = await ethers.provider.getNetwork();
    const pythAddresses = {
        545: "0x2880aB155794e7179c9eE2e38200202908C17B43", // Flow Testnet
        296: "0xa2aa501b19aff244d90cc15a4cf739d2725b5729", // Hedera Testnet
        31: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6"   // Rootstock Testnet
    };
    
    const pythAddress = pythAddresses[network.chainId];
    if (!pythAddress) {
        console.log("   ⚠️  No Pyth address configured for this network");
        return false;
    }
    
    console.log(`   Pyth Address: ${pythAddress}`);
    
    try {
        // Check if address has code (is a contract)
        const code = await ethers.provider.getCode(pythAddress);
        if (code === "0x") {
            console.log("   ❌ Pyth address has no contract code");
            return false;
        }
        
        console.log("   ✅ Pyth contract found");
        
        // Try to call a basic Pyth function
        const pythAbi = ["function getUpdateFee(bytes[] calldata) external view returns (uint256)"];
        const pythContract = new ethers.Contract(pythAddress, pythAbi, ethers.provider);
        
        await pythContract.getUpdateFee([]);
        console.log("   ✅ Pyth contract is responsive");
        return true;
        
    } catch (error) {
        console.log(`   ⚠️  Cannot verify Pyth contract: ${error.message}`);
        return false;
    }
}

async function checkContractCompilation() {
    console.log("\n🔨 Checking contract compilation...");
    
    try {
        const FeedbackOracle = await ethers.getContractFactory("FeedbackOracle");
        console.log("   ✅ FeedbackOracle contract compiled successfully");
        
        const FeedbackRewardToken = await ethers.getContractFactory("FeedbackRewardToken");
        console.log("   ✅ FeedbackRewardToken contract compiled successfully");
        
        return true;
    } catch (error) {
        console.log(`   ❌ Contract compilation failed: ${error.message}`);
        return false;
    }
}

async function checkEnvironmentVariables() {
    console.log("\n🔧 Checking environment variables...");
    
    const requiredVars = [
        'PRIVATE_KEY',
        'FLOW_TESTNET_RPC_URL',
        'HEDERA_TESTNET_RPC_URL', 
        'ROOTSTOCK_TESTNET_RPC_URL'
    ];
    
    const optionalVars = [
        'FEEDBACK_SKIP_VERIFICATION',
        'FEEDBACK_OWNER_OVERRIDE',
        'FEEDBACK_ORACLE_SIGNER_KEY'
    ];
    
    let allPresent = true;
    
    console.log("   Required variables:");
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`     ✅ ${varName}: ${value.substring(0, 10)}...`);
        } else {
            console.log(`     ❌ ${varName}: Not set`);
            allPresent = false;
        }
    });
    
    console.log("   Optional variables:");
    optionalVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`     ✅ ${varName}: ${value}`);
        } else {
            console.log(`     ➖ ${varName}: Not set (optional)`);
        }
    });
    
    return allPresent;
}

async function checkExistingDeployment() {
    console.log("\n🔍 Checking for existing deployment...");
    
    const network = await ethers.provider.getNetwork();
    const fs = require('fs');
    
    // Look for deployment files
    const deploymentFiles = fs.readdirSync('.')
        .filter(file => file.startsWith('deployment-') && file.endsWith('.json'));
    
    if (deploymentFiles.length === 0) {
        console.log("   ➖ No previous deployment files found");
        return null;
    }
    
    console.log(`   📄 Found ${deploymentFiles.length} deployment file(s):`);
    deploymentFiles.forEach(file => {
        console.log(`     - ${file}`);
    });
    
    // Check the most recent deployment for current network
    const networkFiles = deploymentFiles.filter(file => 
        file.includes(network.chainId.toString()) || 
        file.includes('flow-testnet') && network.chainId === 545n ||
        file.includes('hedera-testnet') && network.chainId === 296n ||
        file.includes('rootstock-testnet') && network.chainId === 31n
    );
    
    if (networkFiles.length > 0) {
        const latestFile = networkFiles.sort().reverse()[0];
        console.log(`   📋 Latest deployment for current network: ${latestFile}`);
        
        try {
            const deploymentData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
            console.log(`     Contract addresses:`);
            if (deploymentData.contracts) {
                Object.entries(deploymentData.contracts).forEach(([name, contract]) => {
                    console.log(`       ${name}: ${contract.address}`);
                });
            }
            return deploymentData;
        } catch (error) {
            console.log(`     ❌ Error reading deployment file: ${error.message}`);
        }
    }
    
    return null;
}

async function checkGasPrice() {
    console.log("\n⛽ Checking gas prices...");
    
    try {
        const feeData = await ethers.provider.getFeeData();
        console.log(`   Gas Price: ${ethers.formatUnits(feeData.gasPrice || 0, 'gwei')} gwei`);
        console.log(`   Max Fee: ${ethers.formatUnits(feeData.maxFeePerGas || 0, 'gwei')} gwei`);
        console.log(`   Priority Fee: ${ethers.formatUnits(feeData.maxPriorityFeePerGas || 0, 'gwei')} gwei`);
        
        return true;
    } catch (error) {
        console.log(`   ⚠️  Cannot get gas information: ${error.message}`);
        return false;
    }
}

async function estimateDeploymentCost() {
    console.log("\n💸 Estimating deployment cost...");
    
    try {
        const FeedbackOracle = await ethers.getContractFactory("FeedbackOracle");
        const FeedbackRewardToken = await ethers.getContractFactory("FeedbackRewardToken");
        
        // Estimate gas for contract deployments
        const tokenDeployTx = await FeedbackRewardToken.getDeployTransaction(
            "MemeDici Feedback Token",
            "MFBT", 
            "0x0000000000000000000000000000000000000000"
        );
        
        const oracleDeployTx = await FeedbackOracle.getDeployTransaction(
            "0x0000000000000000000000000000000000000000",
            "0x2880aB155794e7179c9eE2e38200202908C17B43",
            "0x0000000000000000000000000000000000000000"
        );
        
        const tokenGas = await ethers.provider.estimateGas(tokenDeployTx);
        const oracleGas = await ethers.provider.estimateGas(oracleDeployTx);
        
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");
        
        const tokenCost = tokenGas * gasPrice;
        const oracleCost = oracleGas * gasPrice;
        const totalCost = tokenCost + oracleCost;
        
        console.log(`   Token deployment: ${tokenGas} gas (~${ethers.formatEther(tokenCost)} native tokens)`);
        console.log(`   Oracle deployment: ${oracleGas} gas (~${ethers.formatEther(oracleCost)} native tokens)`);
        console.log(`   Total estimated cost: ${ethers.formatEther(totalCost)} native tokens`);
        
        return totalCost;
        
    } catch (error) {
        console.log(`   ⚠️  Cannot estimate deployment cost: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log("🔍 Feedback Oracle Deployment Diagnostic Tool");
    console.log("=".repeat(50));
    
    const checks = [];
    
    // Run all diagnostic checks
    checks.push(await checkNetworkSupport());
    checks.push(await checkDeployerBalance());
    checks.push(await checkPythOracle());
    checks.push(await checkContractCompilation());
    checks.push(await checkEnvironmentVariables());
    await checkExistingDeployment();
    checks.push(await checkGasPrice());
    await estimateDeploymentCost();
    
    // Summary
    console.log("\n📋 Diagnostic Summary");
    console.log("=".repeat(30));
    
    const passedChecks = checks.filter(Boolean).length;
    const totalChecks = checks.length;
    
    console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);
    
    if (passedChecks === totalChecks) {
        console.log("🎉 All checks passed! Ready for deployment.");
        console.log("\nRun deployment with:");
        console.log("npx hardhat run scripts/deploy-feedback-flowtest.js --network flowTestnet");
    } else {
        console.log("⚠️  Some checks failed. Please address the issues above before deployment.");
        
        console.log("\n🔧 Recommended actions:");
        if (!checks[0]) console.log("- Ensure you're on a supported network (Flow, Hedera, or Rootstock Testnet)");
        if (!checks[1]) console.log("- Fund your deployer account with native tokens");
        if (!checks[2]) console.log("- Verify Pyth Oracle is available on your network");
        if (!checks[3]) console.log("- Fix contract compilation errors");
        if (!checks[4]) console.log("- Set required environment variables in .env file");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Diagnostic failed:", error);
        process.exit(1);
    }); 