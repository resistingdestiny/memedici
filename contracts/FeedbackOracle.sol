// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./FeedbackRewardToken.sol";

/**
 * @title FeedbackOracle
 * @dev Oracle contract that validates feedback proofs and distributes rewards
 * Uses cryptographic signatures to verify feedback authenticity
 */
contract FeedbackOracle is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    // Reward token contract
    FeedbackRewardToken public immutable rewardToken;
    
    // Authorized backend signers
    mapping(address => bool) public authorizedSigners;
    
    // Feedback tracking
    mapping(bytes32 => bool) public processedFeedback;
    mapping(address => uint256) public userFeedbackCount;
    mapping(address => uint256) public lastFeedbackTime;
    
    // Configuration
    uint256 public constant MIN_FEEDBACK_INTERVAL = 1 hours; // Prevent spam
    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 public qualityThreshold = 7; // Out of 10 rating scale
    
    // Stats
    uint256 public totalFeedbackProcessed;
    uint256 public totalRewardsDistributed;
    
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
        uint256 rewardAmount,
        bool qualityBonus
    );
    event BatchFeedbackProcessed(uint256 count, uint256 totalRewards);
    event QualityThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    
    // Errors
    error UnauthorizedSigner();
    error InvalidSignature();
    error FeedbackAlreadyProcessed();
    error RateLimitExceeded();
    error InvalidProof();
    error BatchSizeExceeded();
    error InvalidQualityRating();
    error ArrayLengthMismatch();
    
    constructor(
        address rewardToken_,
        address owner_
    ) Ownable(owner_) {
        rewardToken = FeedbackRewardToken(rewardToken_);
    }
    
    /**
     * @dev Process single feedback proof and distribute rewards
     */
    function processFeedback(FeedbackProof calldata proof) external nonReentrant {
        // Validate proof structure
        if (proof.user == address(0)) revert InvalidProof();
        if (proof.qualityRating == 0 || proof.qualityRating > 10) revert InvalidQualityRating();
        if (proof.timestamp > block.timestamp) revert InvalidProof();
        
        // Check rate limiting
        if (block.timestamp - lastFeedbackTime[proof.user] < MIN_FEEDBACK_INTERVAL) {
            revert RateLimitExceeded();
        }
        
        // Create unique feedback hash
        bytes32 feedbackHash = _createFeedbackHash(proof.user, proof.feedbackId, proof.timestamp);
        
        // Check if already processed
        if (processedFeedback[feedbackHash]) revert FeedbackAlreadyProcessed();
        
        // Verify signature
        _verifyFeedbackSignature(proof, feedbackHash);
        
        // Mark as processed
        processedFeedback[feedbackHash] = true;
        userFeedbackCount[proof.user]++;
        lastFeedbackTime[proof.user] = block.timestamp;
        totalFeedbackProcessed++;
        
        // Determine if quality bonus applies
        bool qualityBonus = proof.qualityRating >= qualityThreshold;
        
        // Calculate reward amount
        uint256 baseReward = rewardToken.FEEDBACK_REWARD();
        uint256 bonus = qualityBonus ? rewardToken.QUALITY_BONUS() : 0;
        uint256 totalReward = baseReward + bonus;
        
        // Mint reward tokens
        rewardToken.mintFeedbackReward(proof.user, qualityBonus);
        
        totalRewardsDistributed += totalReward;
        
        emit FeedbackProcessed(
            proof.user,
            proof.feedbackId,
            proof.qualityRating,
            totalReward,
            qualityBonus
        );
    }
    
    /**
     * @dev Process batch feedback proofs (gas efficient)
     */
    function processBatchFeedback(BatchFeedbackProof calldata batchProof) external nonReentrant {
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
        
        // Process each feedback in batch
        address[] memory users = new address[](batchSize);
        bool[] memory qualityBonuses = new bool[](batchSize);
        uint256 batchTotalRewards = 0;
        
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
            
            uint256 baseReward = rewardToken.FEEDBACK_REWARD();
            uint256 bonus = qualityBonus ? rewardToken.QUALITY_BONUS() : 0;
            batchTotalRewards += baseReward + bonus;
        }
        
        // Batch mint rewards
        rewardToken.batchMintRewards(users, qualityBonuses);
        
        totalFeedbackProcessed += batchSize;
        totalRewardsDistributed += batchTotalRewards;
        
        emit BatchFeedbackProcessed(batchSize, batchTotalRewards);
    }
    
    /**
     * @dev Allow users to claim rewards for processed feedback (alternative method)
     */
    function claimFeedbackReward(FeedbackProof calldata proof) external nonReentrant {
        if (msg.sender != proof.user) revert InvalidProof();
        
        // Same validation as processFeedback but user initiates
        bytes32 feedbackHash = _createFeedbackHash(proof.user, proof.feedbackId, proof.timestamp);
        
        if (processedFeedback[feedbackHash]) revert FeedbackAlreadyProcessed();
        
        _verifyFeedbackSignature(proof, feedbackHash);
        
        // Mark as processed and mint rewards
        processedFeedback[feedbackHash] = true;
        userFeedbackCount[proof.user]++;
        lastFeedbackTime[proof.user] = block.timestamp;
        
        bool qualityBonus = proof.qualityRating >= qualityThreshold;
        rewardToken.mintFeedbackReward(proof.user, qualityBonus);
        
        uint256 totalReward = rewardToken.FEEDBACK_REWARD() + 
                             (qualityBonus ? rewardToken.QUALITY_BONUS() : 0);
        
        totalFeedbackProcessed++;
        totalRewardsDistributed += totalReward;
        
        emit FeedbackProcessed(
            proof.user,
            proof.feedbackId,
            proof.qualityRating,
            totalReward,
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
        bytes32 messageHash = feedbackHash.toEthSignedMessageHash();
        address signer = messageHash.recover(proof.signature);
        
        if (!authorizedSigners[signer]) revert UnauthorizedSigner();
    }
    
    /**
     * @dev Verify batch signature
     */
    function _verifyBatchSignature(bytes32 batchHash, bytes memory signature) internal view {
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
        uint256 nextAllowed = lastTime + MIN_FEEDBACK_INTERVAL;
        
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
        uint256 totalRewards,
        uint256 currentThreshold
    ) {
        return (
            totalFeedbackProcessed,
            totalRewardsDistributed,
            qualityThreshold
        );
    }
} 