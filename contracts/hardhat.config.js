require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

// Pyth Oracle Contract Addresses for different networks
// Flow Testnet: 0x2880aB155794e7179c9eE2e38200202908C17B43
// Hedera Testnet: 0xa2aa501b19aff244d90cc15a4cf739d2725b5729  
// Rootstock Testnet: 0x4305FB66699C3B2702D4d05CF36551390A4c69C6 (with fixed price fallback)
//
// Entropy Contract Addresses for different networks
// These addresses will be used in the deployment script
// Refer to: https://docs.pyth.network/entropy/contract-addresses
const ENTROPY_ADDRESSES = {
  // Ethereum
  1: "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c", // Mainnet
  11155111: "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c", // Sepolia
  
  // Polygon
  137: "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c", // Mainnet
  
  // Arbitrum
  42161: "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c", // Mainnet
  
  // Base
  8453: "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c", // Mainnet
  
  // New networks (addresses to be confirmed when Entropy is deployed)
  295: "0x0000000000000000000000000000000000000000", // Hedera Mainnet - placeholder
  296: "0x0000000000000000000000000000000000000000", // Hedera Testnet - placeholder
  747: "0x0000000000000000000000000000000000000000", // Flow Mainnet - placeholder
  545: "0x0000000000000000000000000000000000000000", // Flow Testnet - placeholder
  30: "0x0000000000000000000000000000000000000000", // Rootstock Mainnet - placeholder
  31: "0x0000000000000000000000000000000000000000", // Rootstock Testnet - placeholder
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
      viaIR: true,
      metadata: {
        bytecodeHash: "none",
      },
      outputSelection: {
        "*": {
          "*": ["evm.bytecode", "evm.deployedBytecode", "abi"]
        }
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      forking: process.env.MAINNET_RPC_URL ? {
        url: process.env.MAINNET_RPC_URL,
        blockNumber: 18500000, // Optional: pin to specific block
      } : undefined,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.alchemyapi.io/v2/your-api-key",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      gasPrice: "auto",
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42161,
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
    },
    // New networks for Pyth integration
    hedera: {
      url: process.env.HEDERA_RPC_URL || "https://mainnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 295,
    },
    hederaTestnet: {
      url: process.env.HEDERA_TESTNET_RPC_URL || "https://testnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 296,
    },
    flow: {
      url: process.env.FLOW_RPC_URL || "https://mainnet.evm.nodes.onflow.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 747,
    },
    flowTestnet: {
      url: process.env.FLOW_TESTNET_RPC_URL || "https://testnet.evm.nodes.onflow.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 545,
    },
    rootstock: {
      url: process.env.ROOTSTOCK_RPC_URL || "https://public-node.rsk.co",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 30,
    },
    rootstockTestnet: {
      url: process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 31,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      base: process.env.BASESCAN_API_KEY,
      // Note: Add API keys for new networks when available
      hedera: process.env.HEDERA_API_KEY,
      flow: process.env.FLOW_API_KEY,
      rootstock: process.env.ROOTSTOCK_API_KEY,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

module.exports.ENTROPY_ADDRESSES = ENTROPY_ADDRESSES; 