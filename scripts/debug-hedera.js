const hre = require("hardhat");

async function debug() {
  console.log("🔍 Debugging Hedera connection...");
  
  try {
    console.log("Network name:", hre.network.name);
    // console.log("Network config:", hre.network.config); // Can be too verbose
    console.log("RPC URL:", hre.network.config.url);
    console.log("Chain ID:", hre.network.config.chainId);

    console.log("Attempting to load HEDERA_PRIVATE_KEY from .env...");
    console.log("process.env.HEDERA_PRIVATE_KEY is:", process.env.HEDERA_PRIVATE_KEY ? "SET" : "NOT SET");
    if (process.env.HEDERA_PRIVATE_KEY) {
      console.log("HEDERA_PRIVATE_KEY length:", process.env.HEDERA_PRIVATE_KEY.length);
    }
    console.log("process.env.PRIVATE_KEY is:", process.env.PRIVATE_KEY ? "SET" : "NOT SET");


    const signers = await hre.ethers.getSigners();
    console.log("Signers array length:", signers.length);
    
    if (signers.length > 0) {
      const deployer = signers[0];
      console.log("Deployer address:", deployer.address);
      const balance = await deployer.provider.getBalance(deployer.address);
      console.log("Balance:", hre.ethers.formatEther(balance), "HBAR");
    } else {
      console.log("❌ No signers found. This means Hardhat could not initialize a signer from the private key.");
      console.log("Ensure HEDERA_PRIVATE_KEY is correctly set in your .env file and loaded by dotenv.");
      console.log("And that your hardhat.config.js getAccounts function is correctly using it for Hedera networks.");
    }
  } catch (error) {
    console.error("❌ Debug script error:", error.message);
    console.error(error.stack);
  }
}

debug()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 