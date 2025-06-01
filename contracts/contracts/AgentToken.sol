// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title AgentToken
 * @dev ERC20 token representing ownership in an AI creative agent
 * Features revenue distribution and governance capabilities
 */
contract AgentToken is ERC20, ERC20Votes, ERC20Permit, Ownable, ReentrancyGuard {
    
    // Agent Identity & Metadata
    string private _agentName;
    string private _archetype;
    string private _metadataURI;
    string private _agentConfigJSON;  // Complete agent configuration JSON
    
    // Revenue Distribution
    uint256 public totalRevenue;
    uint256 public totalDistributedRevenue;
    mapping(address => uint256) public claimedRevenue;
    mapping(address => uint256) private lastClaimSnapshot;
    
    // Revenue tracking for pro-rata distribution
    uint256 private constant PRECISION = 1e18;
    uint256 public revenuePerToken;
    
    // Revenue source authorization
    mapping(address => bool) public authorizedRevenueSources;
    
    // Events
    event RevenueDeposited(uint256 amount, address indexed source);
    event RevenueClaimed(address indexed user, uint256 amount);
    event MetadataUpdated(string newMetadataURI);
    event AgentConfigUpdated(string newAgentConfigJSON);
    event RevenueSourceAuthorized(address indexed source, bool authorized);
    
    // Errors
    error NoClaimableRevenue();
    error UnauthorizedRevenueSource();
    error InvalidMetadataURI();
    error InvalidAgentConfig();
    error TransferFailed();
    
    constructor(
        string memory name_,
        string memory symbol_,
        string memory agentName_,
        string memory archetype_,
        string memory metadataURI_,
        uint256 totalSupply_,
        address owner_,
        string memory agentConfigJSON_
    ) 
        ERC20(name_, symbol_) 
        ERC20Permit(name_)
        Ownable(owner_)
    {
        _agentName = agentName_;
        _archetype = archetype_;
        _metadataURI = metadataURI_;
        _agentConfigJSON = agentConfigJSON_;
        
        // Mint total supply to owner (launchpad contract)
        _mint(owner_, totalSupply_);
        
        // Initialize ERC20Votes
        _delegate(owner_, owner_);
    }
    
    // Agent Identity Functions
    
    /**
     * @dev Returns the agent's creative name
     */
    function agentName() external view returns (string memory) {
        return _agentName;
    }
    
    /**
     * @dev Returns the agent's archetype (e.g., "Digital Painter", "Music Producer")
     */
    function archetype() external view returns (string memory) {
        return _archetype;
    }
    
    /**
     * @dev Returns the metadata URI (IPFS hash containing agent config)
     */
    function metadataURI() external view returns (string memory) {
        return _metadataURI;
    }
    
    /**
     * @dev Returns the complete agent configuration JSON
     */
    function agentConfigJSON() external view returns (string memory) {
        return _agentConfigJSON;
    }
    
    /**
     * @dev Updates the metadata URI (onlyOwner)
     */
    function setMetadataURI(string calldata newMetadataURI) external onlyOwner {
        if (bytes(newMetadataURI).length == 0) revert InvalidMetadataURI();
        _metadataURI = newMetadataURI;
        emit MetadataUpdated(newMetadataURI);
    }
    
    /**
     * @dev Updates the agent configuration JSON (onlyOwner)
     */
    function setAgentConfigJSON(string calldata newAgentConfigJSON) external onlyOwner {
        if (bytes(newAgentConfigJSON).length == 0) revert InvalidAgentConfig();
        _agentConfigJSON = newAgentConfigJSON;
        emit AgentConfigUpdated(newAgentConfigJSON);
    }
    
    // Revenue Distribution Functions
    
    /**
     * @dev Deposits revenue to be distributed among token holders
     * Can be called by authorized sources (e.g., royalty contracts, licensing)
     */
    function depositRevenue() external payable {
        if (!authorizedRevenueSources[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedRevenueSource();
        }
        
        if (msg.value > 0) {
            totalRevenue += msg.value;
            
            // Update revenue per token for pro-rata distribution
            uint256 supply = totalSupply();
            if (supply > 0) {
                revenuePerToken += (msg.value * PRECISION) / supply;
            }
            
            emit RevenueDeposited(msg.value, msg.sender);
        }
    }
    
    /**
     * @dev Claims accumulated revenue for the caller
     */
    function claimRevenue() external nonReentrant {
        uint256 claimable = getClaimableRevenue(msg.sender);
        if (claimable == 0) revert NoClaimableRevenue();
        
        claimedRevenue[msg.sender] += claimable;
        lastClaimSnapshot[msg.sender] = revenuePerToken;
        totalDistributedRevenue += claimable;
        
        (bool success, ) = payable(msg.sender).call{value: claimable}("");
        if (!success) revert TransferFailed();
        
        emit RevenueClaimed(msg.sender, claimable);
    }
    
    /**
     * @dev Returns claimable revenue for a specific address
     */
    function getClaimableRevenue(address account) public view returns (uint256) {
        uint256 balance = balanceOf(account);
        if (balance == 0) return 0;
        
        uint256 revenuePerTokenDiff = revenuePerToken - lastClaimSnapshot[account];
        return (balance * revenuePerTokenDiff) / PRECISION;
    }
    
    /**
     * @dev Returns total unclaimed revenue for an address
     */
    function unclaimedRevenue(address account) external view returns (uint256) {
        return getClaimableRevenue(account);
    }
    
    /**
     * @dev Authorizes or deauthorizes a revenue source
     */
    function setRevenueSource(address source, bool authorized) external onlyOwner {
        authorizedRevenueSources[source] = authorized;
        emit RevenueSourceAuthorized(source, authorized);
    }
    
    // Override required functions for ERC20Votes compatibility
    
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._update(from, to, amount);
        
        // Update revenue snapshots for transfers
        if (from != address(0) && to != address(0)) {
            // Update snapshots to current revenuePerToken
            lastClaimSnapshot[from] = revenuePerToken;
            lastClaimSnapshot[to] = revenuePerToken;
        } else if (to != address(0)) {
            // Minting - set snapshot for new holder
            lastClaimSnapshot[to] = revenuePerToken;
        }
    }
    
    function nonces(address owner) public view virtual override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
    
    // Emergency Functions
    
    /**
     * @dev Emergency withdrawal function (onlyOwner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) revert TransferFailed();
    }
    
    /**
     * @dev Returns contract's ETH balance
     */
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // View Functions
    
    /**
     * @dev Returns comprehensive agent info
     */
    function getAgentInfo() external view returns (
        string memory name_,
        string memory symbol_,
        string memory agentName_,
        string memory archetype_,
        string memory metadataURI_,
        uint256 totalSupply_,
        uint256 totalRevenue_,
        uint256 totalDistributedRevenue_,
        string memory agentConfigJSON_
    ) {
        return (
            name(),
            symbol(),
            _agentName,
            _archetype,
            _metadataURI,
            totalSupply(),
            totalRevenue,
            totalDistributedRevenue,
            _agentConfigJSON
        );
    }
} 