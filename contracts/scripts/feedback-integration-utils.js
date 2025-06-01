const { ethers } = require("ethers");

/**
 * Feedback Oracle Integration Utilities
 * Helper functions for backend integration with the multi-chain feedback oracle system
 */

// Network configurations
const NETWORK_CONFIGS = {
    545: { // Flow Testnet
        name: "FlowTestnet",
        pythAddress: "0x2880aB155794e7179c9eE2e38200202908C17B43",
        nativeToken: "FLOW",
        priceFeedId: "0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a80929a2bbb0bc98b40010b"
    },
    296: { // Hedera Testnet
        name: "HederaTestnet", 
        pythAddress: "0xa2aa501b19aff244d90cc15a4cf739d2725b5729",
        nativeToken: "HBAR",
        priceFeedId: "0xf2fb7c5e3f75cefc890d52be7c03af6030284137e19d30d54442aca9de250c84"
    },
    31: { // Rootstock Testnet
        name: "RootStockTestnet",
        pythAddress: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
        nativeToken: "RBTC",
        priceFeedId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        useFixedPrice: true,
        fixedPriceUSD: 100000 // $100,000 USD fallback for BTC
    }
};

/**
 * Generate cryptographic signature for feedback proof
 * @param {string} privateKey - Signer's private key
 * @param {string} userAddress - User's wallet address
 * @param {string} feedbackId - Unique feedback identifier
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Signature hex string
 */
function signFeedback(privateKey, userAddress, feedbackId, timestamp) {
    const wallet = new ethers.Wallet(privateKey);
    
    // Create the same hash that the contract will verify
    const feedbackHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ["address", "string", "uint256"],
            [userAddress, feedbackId, timestamp]
        )
    );
    
    // Sign the hash
    return wallet.signMessage(ethers.utils.arrayify(feedbackHash));
}

/**
 * Create a feedback proof object for contract interaction
 * @param {string} userAddress - User's wallet address
 * @param {string} feedbackId - Unique feedback identifier
 * @param {number} qualityRating - Rating from 1-10
 * @param {string} signature - Cryptographic signature
 * @param {number} timestamp - Unix timestamp (optional, defaults to now)
 * @returns {object} Feedback proof object
 */
function createFeedbackProof(userAddress, feedbackId, qualityRating, signature, timestamp = null) {
    if (!timestamp) {
        timestamp = Math.floor(Date.now() / 1000);
    }
    
    return {
        user: userAddress,
        feedbackId: feedbackId,
        qualityRating: qualityRating,
        timestamp: timestamp,
        signature: signature
    };
}

/**
 * Get Pyth price update data for a specific network
 * @param {number} chainId - Network chain ID
 * @returns {Promise<string[]>} Price update data array
 */
async function getPythPriceUpdateData(chainId) {
    const config = NETWORK_CONFIGS[chainId];
    if (!config) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    // For Rootstock, return empty array since we use fixed pricing
    if (config.useFixedPrice) {
        return [];
    }
    
    try {
        const response = await fetch(
            `https://hermes.pyth.network/api/latest_price_feeds?ids[]=${config.priceFeedId}`
        );
        
        if (!response.ok) {
            throw new Error(`Failed to fetch price data: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.binary?.data ? [data.binary.data] : [];
    } catch (error) {
        console.warn(`Failed to get Pyth price data for ${config.name}:`, error.message);
        return [];
    }
}

/**
 * Calculate expected rewards for a given rating and network
 * @param {number} chainId - Network chain ID  
 * @param {number} qualityRating - Rating from 1-10
 * @param {number} tokenPriceUSD - Current token price in USD (optional for Rootstock)
 * @returns {object} Reward calculation
 */
function calculateExpectedRewards(chainId, qualityRating, tokenPriceUSD = null) {
    const config = NETWORK_CONFIGS[chainId];
    if (!config) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    // USD amounts (in cents)
    const baseRewardCents = 1000; // $10.00
    const qualityBonusCents = 500; // $5.00
    const qualityThreshold = 7;
    
    const hasQualityBonus = qualityRating >= qualityThreshold;
    const totalUSDCents = baseRewardCents + (hasQualityBonus ? qualityBonusCents : 0);
    const totalUSD = totalUSDCents / 100;
    
    // ERC20 token rewards (fixed amounts)
    const baseTokens = 10;
    const bonusTokens = hasQualityBonus ? 5 : 0;
    const totalTokens = baseTokens + bonusTokens;
    
    // Native token calculation
    let nativeTokenAmount = 0;
    let priceUsed = tokenPriceUSD;
    
    if (config.useFixedPrice) {
        priceUsed = config.fixedPriceUSD;
    }
    
    if (priceUsed && priceUsed > 0) {
        nativeTokenAmount = totalUSD / priceUsed;
    }
    
    return {
        network: config.name,
        nativeToken: config.nativeToken,
        qualityRating,
        hasQualityBonus,
        rewards: {
            usdValue: totalUSD,
            erc20Tokens: totalTokens,
            nativeTokens: nativeTokenAmount,
            priceUsed: priceUsed
        }
    };
}

/**
 * Validate feedback proof structure
 * @param {object} proof - Feedback proof object
 * @returns {boolean} True if valid
 */
function validateFeedbackProof(proof) {
    if (!proof.user || !ethers.utils.isAddress(proof.user)) {
        return false;
    }
    
    if (!proof.feedbackId || typeof proof.feedbackId !== 'string') {
        return false;
    }
    
    if (!proof.qualityRating || proof.qualityRating < 1 || proof.qualityRating > 10) {
        return false;
    }
    
    if (!proof.timestamp || proof.timestamp > Math.floor(Date.now() / 1000)) {
        return false;
    }
    
    if (!proof.signature || !proof.signature.startsWith('0x')) {
        return false;
    }
    
    return true;
}

/**
 * Get network configuration
 * @param {number} chainId - Network chain ID
 * @returns {object} Network configuration
 */
function getNetworkConfig(chainId) {
    return NETWORK_CONFIGS[chainId] || null;
}

/**
 * Get all supported networks
 * @returns {object} All network configurations
 */
function getSupportedNetworks() {
    return NETWORK_CONFIGS;
}

/**
 * Format feedback for backend API
 * @param {object} feedbackData - Raw feedback data
 * @param {number} chainId - Target network chain ID
 * @returns {object} Formatted feedback data
 */
function formatFeedbackForAPI(feedbackData, chainId) {
    const network = getNetworkConfig(chainId);
    
    return {
        id: feedbackData.feedbackId,
        chainId: chainId,
        network: network?.name || 'Unknown',
        user: feedbackData.user,
        qualityRating: feedbackData.qualityRating,
        timestamp: feedbackData.timestamp,
        signature: feedbackData.signature,
        expectedRewards: calculateExpectedRewards(
            chainId, 
            feedbackData.qualityRating,
            feedbackData.tokenPrice
        )
    };
}

module.exports = {
    NETWORK_CONFIGS,
    signFeedback,
    createFeedbackProof,
    getPythPriceUpdateData,
    calculateExpectedRewards,
    validateFeedbackProof,
    getNetworkConfig,
    getSupportedNetworks,
    formatFeedbackForAPI
}; 