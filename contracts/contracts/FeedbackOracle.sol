// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "./FeedbackRewardToken.sol";

/**
 * @title FeedbackOracle
 * @dev Multi-chain oracle contract that validates feedback proofs and distributes USD-based rewards
 * Supports FlowTestnet, HederaTestnet, and RootStockTestnet with Pyth price feeds
 */
contract FeedbackOracle is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    // Network identifiers
    uint256 public constant FLOW_TESTNET_CHAIN_ID = 545;
    uint256 public constant HEDERA_TESTNET_CHAIN_ID = 296;
    uint256 public constant ROOTSTOCK_TESTNET_CHAIN_ID = 31;
    
    // Reward token contract
    FeedbackRewardToken public immutable rewardToken;
    
    // Pyth price oracle
    IPyth public immutable pyth;
    
    // Authorized backend signers
    mapping(address => bool) public authorizedSigners;
    
    // Feedback tracking
    mapping(bytes32 => bool) public processedFeedback;
    mapping(address => uint256) public userFeedbackCount;
    mapping(address => uint256) public lastFeedbackTime;
    
    // Network-specific configurations
    struct NetworkConfig {
        uint256 minFeedbackInterval;
        uint256 maxPriceAge;
        uint256 baseRewardUSDCents;
        uint256 qualityBonusUSDCents;
        bytes32 nativeTokenPriceFeedId;
        bool isActive;
    }
    
    mapping(uint256 => NetworkConfig) public networkConfigs;
    
    // Configuration
    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 public qualityThreshold = 7; // Out of 10 rating scale
    bool public skipVerification = false; // Global flag to skip verification (owner only)
    
    // Current network config (set at deployment)
    NetworkConfig public currentConfig;
    
    // Stats
    uint256 public totalFeedbackProcessed;
    uint256 public totalRewardsDistributedUSD; // In cents
    uint256 public totalNativeRewardsDistributed; // In native token wei
    
    // Structs
    struct FeedbackProof {
        address user;
        string feedbackId;
        uint8 qualityRating; // 1-10 scale
        uint256 timestamp;
        bytes signature;
    }
    
    struct BatchFeedbackProof {
        address[] users;
        string[] feedbackIds;
        uint8[] qualityRatings;
        uint256[] timestamps;
        bytes signature; // Single signature for the entire batch
    }
    
    // Events
    event SignerAuthorized(address indexed signer, bool authorized);
    event FeedbackProcessed(
        address indexed user,
        string feedbackId,
        uint8 qualityRating,
        uint256 rewardAmountUSD, // In cents
        uint256 rewardAmountNative, // In wei
        bool qualityBonus
    );
    event BatchFeedbackProcessed(uint256 count, uint256 totalRewardsUSD, uint256 totalRewardsNative);
    event QualityThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event NetworkConfigUpdated(uint256 chainId, NetworkConfig config);
    event NativeRewardSent(address indexed user, uint256 amount);
    event VerificationSkipUpdated(bool skipVerification, address updatedBy);
    
    // Errors
    error UnauthorizedSigner();
    error InvalidSignature();
    error FeedbackAlreadyProcessed();
    error RateLimitExceeded();
    error InvalidProof();
    error BatchSizeExceeded();
    error InvalidQualityRating();
    error ArrayLengthMismatch();
    error PriceUpdateFailed();
    error InvalidPriceFeed();
    error InsufficientContractBalance();
    error NativeTransferFailed();
    error NetworkNotSupported();
    error NetworkNotActive();
    
    constructor(
        address rewardToken_,
        address pythContract_,
        address owner_
    ) Ownable(owner_) {
        rewardToken = FeedbackRewardToken(rewardToken_);
        pyth = IPyth(pythContract_);
        
        // Initialize network-specific configurations
        _initializeNetworkConfigs();
        
        // Set current network config based on chain ID
        _setCurrentNetworkConfig();
    }
    
    /**
     * @dev Initialize default configurations for supported testnets
     */
    function _initializeNetworkConfigs() internal {
        // Flow Testnet configuration
        networkConfigs[FLOW_TESTNET_CHAIN_ID] = NetworkConfig({
            minFeedbackInterval: 1 hours,
            maxPriceAge: 300, // 5 minutes
            baseRewardUSDCents: 1000, // $10.00
            qualityBonusUSDCents: 500, // $5.00
            nativeTokenPriceFeedId: 0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a80929a2bbb0bc98b40010b, // FLOW/USD from Pyth
            isActive: true
        });
        
        // Hedera Testnet configuration
        networkConfigs[HEDERA_TESTNET_CHAIN_ID] = NetworkConfig({
            minFeedbackInterval: 1 hours,
            maxPriceAge: 300, // 5 minutes
            baseRewardUSDCents: 1000, // $10.00
            qualityBonusUSDCents: 500, // $5.00
            nativeTokenPriceFeedId: 0xf2fb7c5e3f75cefc890d52be7c03af6030284137e19d30d54442aca9de250c84, // HBAR/USD from Pyth
            isActive: true
        });
        
        // Rootstock Testnet configuration (uses BTC pricing)
        networkConfigs[ROOTSTOCK_TESTNET_CHAIN_ID] = NetworkConfig({
            minFeedbackInterval: 1 hours,
            maxPriceAge: 300, // 5 minutes
            baseRewardUSDCents: 1000, // $10.00
            qualityBonusUSDCents: 500, // $5.00
            nativeTokenPriceFeedId: 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43, // BTC/USD from Pyth
            isActive: true
        });
    }
    
    /**
     * @dev Set current network configuration based on chain ID
     */
    function _setCurrentNetworkConfig() internal {
        uint256 chainId = block.chainid;
        
        if (!networkConfigs[chainId].isActive) {
            revert NetworkNotSupported();
        }
        
        currentConfig = networkConfigs[chainId];
    }
    
    /**
     * @dev Process single feedback proof and distribute rewards (ERC20 + Native tokens)
     */
    function processFeedback(
        FeedbackProof calldata proof,
        bytes[] calldata priceUpdateData
    ) external payable nonReentrant {
        // Validate proof structure
        if (proof.user == address(0)) revert InvalidProof();
        if (proof.qualityRating == 0 || proof.qualityRating > 10) revert InvalidQualityRating();
        if (proof.timestamp > block.timestamp) revert InvalidProof();
        
        // Check rate limiting
        if (block.timestamp - lastFeedbackTime[proof.user] < currentConfig.minFeedbackInterval) {
            revert RateLimitExceeded();
        }
        
        // Create unique feedback hash
        bytes32 feedbackHash = _createFeedbackHash(proof.user, proof.feedbackId, proof.timestamp);
        
        // Check if already processed
        if (processedFeedback[feedbackHash]) revert FeedbackAlreadyProcessed();
        
        // Verify signature
        _verifyFeedbackSignature(proof, feedbackHash);
        
        // Update price feeds and get native token amount
        uint256 nativeTokenAmount = _updatePriceAndCalculateReward(
            priceUpdateData,
            proof.qualityRating >= qualityThreshold
        );
        
        // Mark as processed
        processedFeedback[feedbackHash] = true;
        userFeedbackCount[proof.user]++;
        lastFeedbackTime[proof.user] = block.timestamp;
        totalFeedbackProcessed++;
        
        // Determine if quality bonus applies
        bool qualityBonus = proof.qualityRating >= qualityThreshold;
        
        // Calculate USD reward amount using current network config
        uint256 usdRewardCents = currentConfig.baseRewardUSDCents + 
            (qualityBonus ? currentConfig.qualityBonusUSDCents : 0);
        
        // Mint ERC20 reward tokens (existing system)
        rewardToken.mintFeedbackReward(proof.user, qualityBonus);
        
        // Send native token reward
        _sendNativeReward(proof.user, nativeTokenAmount);
        
        // Update stats
        totalRewardsDistributedUSD += usdRewardCents;
        totalNativeRewardsDistributed += nativeTokenAmount;
        
        emit FeedbackProcessed(
            proof.user,
            proof.feedbackId,
            proof.qualityRating,
            usdRewardCents,
            nativeTokenAmount,
            qualityBonus
        );
    }
    
    /**
     * @dev Process batch feedback proofs (gas efficient)
     */
    function processBatchFeedback(
        BatchFeedbackProof calldata batchProof,
        bytes[] calldata priceUpdateData
    ) external payable nonReentrant {
        uint256 batchSize = batchProof.users.length;
        
        // Validate batch size
        if (batchSize == 0 || batchSize > MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        // Validate array lengths
        if (batchProof.users.length != batchProof.feedbackIds.length ||
            batchProof.users.length != batchProof.qualityRatings.length ||
            batchProof.users.length != batchProof.timestamps.length) {
            revert ArrayLengthMismatch();
        }
        
        // Verify batch signature
        bytes32 batchHash = _createBatchHash(batchProof);
        _verifyBatchSignature(batchHash, batchProof.signature);
        
        // Update price once for the entire batch
        PythStructs.Price memory nativeTokenPrice = _updatePriceFeeds(priceUpdateData);
        
        // Process each feedback in batch
        address[] memory users = new address[](batchSize);
        bool[] memory qualityBonuses = new bool[](batchSize);
        uint256 batchTotalRewardsUSD = 0;
        uint256 batchTotalRewardsNative = 0;
        
        for (uint256 i = 0; i < batchSize; i++) {
            address user = batchProof.users[i];
            string memory feedbackId = batchProof.feedbackIds[i];
            uint8 qualityRating = batchProof.qualityRatings[i];
            uint256 timestamp = batchProof.timestamps[i];
            
            // Validate individual feedback
            if (user == address(0)) revert InvalidProof();
            if (qualityRating == 0 || qualityRating > 10) revert InvalidQualityRating();
            if (timestamp > block.timestamp) revert InvalidProof();
            
            // Create feedback hash
            bytes32 feedbackHash = _createFeedbackHash(user, feedbackId, timestamp);
            
            // Skip if already processed (don't revert entire batch)
            if (processedFeedback[feedbackHash]) continue;
            
            // Mark as processed
            processedFeedback[feedbackHash] = true;
            userFeedbackCount[user]++;
            lastFeedbackTime[user] = block.timestamp;
            
            // Determine rewards
            bool qualityBonus = qualityRating >= qualityThreshold;
            users[i] = user;
            qualityBonuses[i] = qualityBonus;
            
            // Calculate rewards
            uint256 usdRewardCents = currentConfig.baseRewardUSDCents + 
                (qualityBonus ? currentConfig.qualityBonusUSDCents : 0);
            uint256 nativeAmount = _calculateNativeTokenAmount(nativeTokenPrice, usdRewardCents);
            
            // Send native token reward
            _sendNativeReward(user, nativeAmount);
            
            batchTotalRewardsUSD += usdRewardCents;
            batchTotalRewardsNative += nativeAmount;
        }
        
        // Batch mint ERC20 rewards
        rewardToken.batchMintRewards(users, qualityBonuses);
        
        totalFeedbackProcessed += batchSize;
        totalRewardsDistributedUSD += batchTotalRewardsUSD;
        totalNativeRewardsDistributed += batchTotalRewardsNative;
        
        emit BatchFeedbackProcessed(batchSize, batchTotalRewardsUSD, batchTotalRewardsNative);
    }
    
    /**
     * @dev Allow users to claim rewards for processed feedback (alternative method)
     */
    function claimFeedbackReward(
        FeedbackProof calldata proof,
        bytes[] calldata priceUpdateData
    ) external payable nonReentrant {
        if (msg.sender != proof.user) revert InvalidProof();
        
        // Same validation as processFeedback but user initiates
        bytes32 feedbackHash = _createFeedbackHash(proof.user, proof.feedbackId, proof.timestamp);
        
        if (processedFeedback[feedbackHash]) revert FeedbackAlreadyProcessed();
        
        _verifyFeedbackSignature(proof, feedbackHash);
        
        // Update price feeds and get native token amount
        uint256 nativeTokenAmount = _updatePriceAndCalculateReward(
            priceUpdateData,
            proof.qualityRating >= qualityThreshold
        );
        
        // Mark as processed and mint rewards
        processedFeedback[feedbackHash] = true;
        userFeedbackCount[proof.user]++;
        lastFeedbackTime[proof.user] = block.timestamp;
        
        bool qualityBonus = proof.qualityRating >= qualityThreshold;
        rewardToken.mintFeedbackReward(proof.user, qualityBonus);
        
        // Send native token reward
        _sendNativeReward(proof.user, nativeTokenAmount);
        
        uint256 usdRewardCents = currentConfig.baseRewardUSDCents + 
            (qualityBonus ? currentConfig.qualityBonusUSDCents : 0);
        
        totalFeedbackProcessed++;
        totalRewardsDistributedUSD += usdRewardCents;
        totalNativeRewardsDistributed += nativeTokenAmount;
        
        emit FeedbackProcessed(
            proof.user,
            proof.feedbackId,
            proof.qualityRating,
            usdRewardCents,
            nativeTokenAmount,
            qualityBonus
        );
    }
    
    /**
     * @dev Create feedback hash for uniqueness and signature verification
     */
    function _createFeedbackHash(
        address user,
        string memory feedbackId,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, feedbackId, timestamp));
    }
    
    /**
     * @dev Create batch hash for signature verification
     */
    function _createBatchHash(BatchFeedbackProof calldata batchProof) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            batchProof.users,
            batchProof.feedbackIds,
            batchProof.qualityRatings,
            batchProof.timestamps
        ));
    }
    
    /**
     * @dev Verify individual feedback signature
     */
    function _verifyFeedbackSignature(
        FeedbackProof calldata proof,
        bytes32 feedbackHash
    ) internal view {
        // Skip verification if flag is set
        if (skipVerification) {
            return;
        }
        
        bytes32 messageHash = feedbackHash.toEthSignedMessageHash();
        address signer = messageHash.recover(proof.signature);
        
        if (!authorizedSigners[signer]) revert UnauthorizedSigner();
    }
    
    /**
     * @dev Verify batch signature
     */
    function _verifyBatchSignature(bytes32 batchHash, bytes memory signature) internal view {
        // Skip verification if flag is set
        if (skipVerification) {
            return;
        }
        
        bytes32 messageHash = batchHash.toEthSignedMessageHash();
        address signer = messageHash.recover(signature);
        
        if (!authorizedSigners[signer]) revert UnauthorizedSigner();
    }
    
    /**
     * @dev Authorize or revoke backend signer
     */
    function setSignerAuthorization(address signer, bool authorized) external onlyOwner {
        authorizedSigners[signer] = authorized;
        emit SignerAuthorized(signer, authorized);
    }
    
    /**
     * @dev Update quality threshold for bonus rewards
     */
    function setQualityThreshold(uint256 newThreshold) external onlyOwner {
        if (newThreshold == 0 || newThreshold > 10) revert InvalidQualityRating();
        
        uint256 oldThreshold = qualityThreshold;
        qualityThreshold = newThreshold;
        
        emit QualityThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @dev Check if feedback has been processed
     */
    function isFeedbackProcessed(
        address user,
        string calldata feedbackId,
        uint256 timestamp
    ) external view returns (bool) {
        bytes32 feedbackHash = _createFeedbackHash(user, feedbackId, timestamp);
        return processedFeedback[feedbackHash];
    }
    
    /**
     * @dev Get user feedback statistics
     */
    function getUserFeedbackStats(address user) external view returns (
        uint256 feedbackCount,
        uint256 lastFeedback,
        uint256 nextAllowedFeedback
    ) {
        uint256 lastTime = lastFeedbackTime[user];
        uint256 nextAllowed = lastTime + currentConfig.minFeedbackInterval;
        
        return (
            userFeedbackCount[user],
            lastTime,
            nextAllowed > block.timestamp ? nextAllowed : block.timestamp
        );
    }
    
    /**
     * @dev Get global oracle statistics
     */
    function getOracleStats() external view returns (
        uint256 totalProcessed,
        uint256 totalRewardsUSD,
        uint256 totalRewardsNative,
        uint256 currentThreshold
    ) {
        return (
            totalFeedbackProcessed,
            totalRewardsDistributedUSD,
            totalNativeRewardsDistributed,
            qualityThreshold
        );
    }
    
    /**
     * @dev Update price feeds and calculate native token reward amount
     */
    function _updatePriceAndCalculateReward(
        bytes[] calldata priceUpdateData,
        bool qualityBonus
    ) internal returns (uint256 nativeTokenAmount) {
        // Update price feeds
        PythStructs.Price memory nativeTokenPrice = _updatePriceFeeds(priceUpdateData);
        
        // Calculate USD reward amount
        uint256 usdRewardCents = currentConfig.baseRewardUSDCents + 
            (qualityBonus ? currentConfig.qualityBonusUSDCents : 0);
        
        // Convert to native token amount
        nativeTokenAmount = _calculateNativeTokenAmount(nativeTokenPrice, usdRewardCents);
        
        return nativeTokenAmount;
    }
    
    /**
     * @dev Update Pyth price feeds
     */
    function _updatePriceFeeds(bytes[] calldata priceUpdateData) internal returns (PythStructs.Price memory) {
        // Special handling for Rootstock - use fixed price if Pyth data unavailable
        if (block.chainid == ROOTSTOCK_TESTNET_CHAIN_ID) {
            return _getRootStockPrice(priceUpdateData);
        }
        
        // For Flow and Hedera, use standard Pyth price feeds
        // Calculate the fee for updating the price feeds
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        
        // Check if enough ETH was provided to pay the fee
        if (msg.value < updateFee) revert PriceUpdateFailed();
        
        // Update the price feeds with the provided data
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
        
        // Get the current price of the native token
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(currentConfig.nativeTokenPriceFeedId, currentConfig.maxPriceAge);
        
        return price;
    }
    
    /**
     * @dev Handle Rootstock price with fixed fallback
     */
    function _getRootStockPrice(bytes[] calldata priceUpdateData) internal returns (PythStructs.Price memory) {
        try pyth.getPriceUnsafe(currentConfig.nativeTokenPriceFeedId) returns (PythStructs.Price memory price) {
            // Check if the price data is valid
            if (price.price > 0 && price.expo != 0 && price.publishTime > 0) {
                // Valid Pyth data available, try to update if data provided
                if (priceUpdateData.length > 0) {
                    try pyth.updatePriceFeeds{value: msg.value}(priceUpdateData) {
                        // Update successful, get fresh price
                        price = pyth.getPriceNoOlderThan(currentConfig.nativeTokenPriceFeedId, currentConfig.maxPriceAge);
                    } catch {
                        // Update failed, use unsafe price
                    }
                }
                return price;
            }
        } catch {
            // Pyth call failed, use fixed price
        }
        
        // Fallback to fixed BTC price: $100,000 USD with -8 exponent
        return PythStructs.Price({
            price: 10000000000000, // $100,000 with 8 decimal places
            conf: 100000000, // $1,000 confidence interval
            expo: -8,
            publishTime: block.timestamp
        });
    }
    
    /**
     * @dev Calculate native token amount equivalent to USD reward
     */
    function _calculateNativeTokenAmount(
        PythStructs.Price memory nativeTokenPrice,
        uint256 usdRewardCents
    ) internal pure returns (uint256) {
        // Pyth prices are in the format: price * 10^expo
        // We need to handle negative exponents properly
        
        // Convert USD cents to actual USD (divide by 100)
        // Then convert to wei equivalent
        
        int64 price = nativeTokenPrice.price;
        int32 expo = nativeTokenPrice.expo;
        
        if (price <= 0) revert InvalidPriceFeed();
        
        // Calculate: (usdRewardCents / 100) / (price * 10^expo) * 10^18
        // Rearranged: (usdRewardCents * 10^18) / (100 * price * 10^expo)
        // Simplified: (usdRewardCents * 10^(18-expo)) / (100 * price)
        
        uint256 adjustedPrice = uint256(uint64(price));
        
        if (expo >= 0) {
            // Price is price * 10^expo, so we divide by 10^expo more
            uint256 divisor = 100 * adjustedPrice * (10 ** uint32(expo));
            return (usdRewardCents * 1e18) / divisor;
        } else {
            // Price is price * 10^expo where expo is negative
            // So we multiply by 10^(-expo) = 10^abs(expo)
            uint256 multiplier = 10 ** uint32(-expo);
            uint256 divisor = 100 * adjustedPrice;
            return (usdRewardCents * 1e18 * multiplier) / divisor;
        }
    }
    
    /**
     * @dev Send native token reward to user
     */
    function _sendNativeReward(address user, uint256 amount) internal {
        if (address(this).balance < amount) revert InsufficientContractBalance();
        
        (bool success, ) = payable(user).call{value: amount}("");
        if (!success) revert NativeTransferFailed();
        
        emit NativeRewardSent(user, amount);
    }
    
    /**
     * @dev Get current native token price from Pyth (view function)
     */
    function getCurrentNativeTokenPrice() external view returns (
        int64 price,
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) {
        PythStructs.Price memory priceData = pyth.getPriceUnsafe(currentConfig.nativeTokenPriceFeedId);
        return (priceData.price, priceData.conf, priceData.expo, priceData.publishTime);
    }
    
    /**
     * @dev Calculate reward amount without updating price (view function)
     */
    function calculateRewardAmount(
        uint8 qualityRating,
        int64 nativeTokenPrice,
        int32 expo
    ) external view returns (uint256 usdRewardCents, uint256 nativeTokenAmount) {
        bool qualityBonus = qualityRating >= 7; // Use hardcoded threshold for view
        usdRewardCents = currentConfig.baseRewardUSDCents + (qualityBonus ? currentConfig.qualityBonusUSDCents : 0);
        
        if (nativeTokenPrice <= 0) return (usdRewardCents, 0);
        
        // Calculate native token amount
        PythStructs.Price memory mockPrice = PythStructs.Price({
            price: nativeTokenPrice,
            conf: 0,
            expo: expo,
            publishTime: block.timestamp
        });
        
        nativeTokenAmount = _calculateNativeTokenAmountPure(mockPrice, usdRewardCents);
        
        return (usdRewardCents, nativeTokenAmount);
    }
    
    /**
     * @dev Pure function version of native token calculation for view functions
     */
    function _calculateNativeTokenAmountPure(
        PythStructs.Price memory nativeTokenPrice,
        uint256 usdRewardCents
    ) internal pure returns (uint256) {
        int64 price = nativeTokenPrice.price;
        int32 expo = nativeTokenPrice.expo;
        
        if (price <= 0) return 0;
        
        uint256 adjustedPrice = uint256(uint64(price));
        
        if (expo >= 0) {
            uint256 divisor = 100 * adjustedPrice * (10 ** uint32(expo));
            return (usdRewardCents * 1e18) / divisor;
        } else {
            uint256 multiplier = 10 ** uint32(-expo);
            uint256 divisor = 100 * adjustedPrice;
            return (usdRewardCents * 1e18 * multiplier) / divisor;
        }
    }
    
    /**
     * @dev Get contract balance and funding stats
     */
    function getContractFunding() external view returns (
        uint256 nativeBalance,
        uint256 totalDistributedNative,
        uint256 remainingFunding
    ) {
        nativeBalance = address(this).balance;
        totalDistributedNative = totalNativeRewardsDistributed;
        remainingFunding = nativeBalance;
        
        return (nativeBalance, totalDistributedNative, remainingFunding);
    }
    
    /**
     * @dev Update network configuration for a specific chain
     */
    function updateNetworkConfig(
        uint256 chainId,
        NetworkConfig calldata config
    ) external onlyOwner {
        networkConfigs[chainId] = config;
        
        // Update current config if it's for the current chain
        if (chainId == block.chainid) {
            currentConfig = config;
        }
        
        emit NetworkConfigUpdated(chainId, config);
    }
    
    /**
     * @dev Get network configuration for a specific chain
     */
    function getNetworkConfig(uint256 chainId) external view returns (NetworkConfig memory) {
        return networkConfigs[chainId];
    }
    
    /**
     * @dev Fund the contract with native tokens for rewards
     */
    function fundContract() external payable {
        require(msg.value > 0, "Must send native tokens");
    }
    
    /**
     * @dev Withdraw native tokens from contract (admin only)
     */
    function withdrawNativeTokens(uint256 amount) external onlyOwner {
        if (address(this).balance < amount) revert InsufficientContractBalance();
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert NativeTransferFailed();
    }
    
    /**
     * @dev Emergency withdraw all native tokens (admin only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) revert NativeTransferFailed();
    }
    
    /**
     * @dev Update verification skip flag
     */
    function updateVerificationSkip(bool skipVerification_) external onlyOwner {
        bool oldSkipVerification = skipVerification;
        skipVerification = skipVerification_;
        emit VerificationSkipUpdated(oldSkipVerification, msg.sender);
    }
} 