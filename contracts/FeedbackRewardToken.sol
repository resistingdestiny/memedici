// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title FeedbackRewardToken
 * @dev ERC20 token for rewarding users who provide feedback
 * Minted by authorized oracles when feedback is verified
 */
contract FeedbackRewardToken is ERC20, Ownable, ReentrancyGuard {
    
    // Authorized minters (oracles and contracts)
    mapping(address => bool) public authorizedMinters;
    
    // Reward configuration
    uint256 public constant FEEDBACK_REWARD = 10 * 10**18; // 10 tokens per feedback
    uint256 public constant QUALITY_BONUS = 5 * 10**18;    // 5 extra tokens for quality feedback
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100M max supply
    
    // Stats tracking
    uint256 public totalFeedbackRewards;
    uint256 public totalQualityBonuses;
    mapping(address => uint256) public userFeedbackCount;
    mapping(address => uint256) public userTotalRewards;
    
    // Events
    event MinterAuthorized(address indexed minter, bool authorized);
    event FeedbackRewarded(address indexed user, uint256 amount, bool qualityBonus);
    event RewardConfigUpdated(uint256 newFeedbackReward, uint256 newQualityBonus);
    
    // Errors
    error UnauthorizedMinter();
    error MaxSupplyExceeded();
    error InvalidAmount();
    error InvalidAddress();
    
    constructor(
        string memory name_,
        string memory symbol_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        // Initial supply can be minted to owner for initial distribution
        _mint(owner_, 1_000_000 * 10**18); // 1M initial supply
    }
    
    /**
     * @dev Mint feedback rewards to user
     * Can only be called by authorized minters (oracles)
     */
    function mintFeedbackReward(
        address user,
        bool qualityBonus
    ) external nonReentrant {
        if (!authorizedMinters[msg.sender]) revert UnauthorizedMinter();
        if (user == address(0)) revert InvalidAddress();
        
        uint256 baseReward = FEEDBACK_REWARD;
        uint256 bonus = qualityBonus ? QUALITY_BONUS : 0;
        uint256 totalReward = baseReward + bonus;
        
        // Check max supply
        if (totalSupply() + totalReward > MAX_SUPPLY) revert MaxSupplyExceeded();
        
        // Update stats
        userFeedbackCount[user]++;
        userTotalRewards[user] += totalReward;
        totalFeedbackRewards += baseReward;
        
        if (qualityBonus) {
            totalQualityBonuses += bonus;
        }
        
        // Mint tokens
        _mint(user, totalReward);
        
        emit FeedbackRewarded(user, totalReward, qualityBonus);
    }
    
    /**
     * @dev Batch mint rewards for multiple users
     * Gas efficient for oracle operations
     */
    function batchMintRewards(
        address[] calldata users,
        bool[] calldata qualityBonuses
    ) external nonReentrant {
        if (!authorizedMinters[msg.sender]) revert UnauthorizedMinter();
        if (users.length != qualityBonuses.length) revert InvalidAmount();
        
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) revert InvalidAddress();
            
            uint256 baseReward = FEEDBACK_REWARD;
            uint256 bonus = qualityBonuses[i] ? QUALITY_BONUS : 0;
            uint256 totalReward = baseReward + bonus;
            
            // Check max supply
            if (totalSupply() + totalReward > MAX_SUPPLY) revert MaxSupplyExceeded();
            
            // Update stats
            userFeedbackCount[users[i]]++;
            userTotalRewards[users[i]] += totalReward;
            totalFeedbackRewards += baseReward;
            
            if (qualityBonuses[i]) {
                totalQualityBonuses += bonus;
            }
            
            // Mint tokens
            _mint(users[i], totalReward);
            
            emit FeedbackRewarded(users[i], totalReward, qualityBonuses[i]);
        }
    }
    
    /**
     * @dev Authorize or revoke minter status
     */
    function setMinterAuthorization(address minter, bool authorized) external onlyOwner {
        if (minter == address(0)) revert InvalidAddress();
        
        authorizedMinters[minter] = authorized;
        emit MinterAuthorized(minter, authorized);
    }
    
    /**
     * @dev Emergency mint function for owner (limited)
     */
    function emergencyMint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        
        _mint(to, amount);
    }
    
    /**
     * @dev Get user feedback statistics
     */
    function getUserStats(address user) external view returns (
        uint256 feedbackCount,
        uint256 totalRewards,
        uint256 balance
    ) {
        return (
            userFeedbackCount[user],
            userTotalRewards[user],
            balanceOf(user)
        );
    }
    
    /**
     * @dev Get global feedback statistics
     */
    function getGlobalStats() external view returns (
        uint256 totalSupply_,
        uint256 totalFeedbackRewards_,
        uint256 totalQualityBonuses_,
        uint256 maxSupply_
    ) {
        return (
            totalSupply(),
            totalFeedbackRewards,
            totalQualityBonuses,
            MAX_SUPPLY
        );
    }
} 