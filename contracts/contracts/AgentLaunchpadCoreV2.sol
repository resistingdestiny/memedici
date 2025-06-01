// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./AgentToken.sol";

// Interface for Simple AMM
interface ISimpleAMM {
    function createLiquidityPool(
        uint256 agentId,
        address tokenAddress,
        uint256 tokenAmount,
        string calldata agentConfigJSON
    ) external payable returns (address lpPair);
    
    function getLiquidityPool(uint256 agentId) external view returns (address);
    function isAuthorized(address account) external view returns (bool);
}

/**
 * @title AgentLaunchpadCoreV2
 * @dev Enhanced core functionality for creating and funding AI creative agents
 */
contract AgentLaunchpadCoreV2 is Ownable, ReentrancyGuard, Pausable {
    
    // Agent Configuration Structure
    struct AgentConfig {
        string name;
        string symbol;
        string agentName;
        string archetype;
        string metadataURI;
        uint256 fundingTarget;
        uint256 tokenSupply;
        address creator;
        bool isBonded;
        uint256 totalRaised;
        address tokenAddress;
        address lpPairAddress;
        string agentConfigJSON;
        uint256 createdAt;
        uint256 bondedAt;
    }
    
    // State Variables
    uint256 private _agentIdCounter;
    mapping(uint256 => AgentConfig) public agents;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    // Tracking arrays for efficient querying
    uint256[] public allAgentIds;
    uint256[] public bondedAgentIds;
    uint256[] public inProgressAgentIds;
    
    // Address mappings for quick lookups
    mapping(address => uint256[]) public agentsByCreator;
    mapping(address => uint256) public tokenToAgentId; // token address => agent ID
    
    // Protocol Configuration
    address public treasuryAddress;
    address public liquidityManager; // Address of Simple AMM contract
    uint256 public protocolFeePercentage = 300; // 3%
    uint256 public constant MAX_FEE = 1000; // 10%
    uint256 public constant BASIS_POINTS = 10000;
    
    // LP Configuration
    uint256 public defaultLiquidityPercentage = 8000; // 80% of ETH for LP
    uint256 public defaultTokenLPPercentage = 9000; // 90% of tokens for LP
    
    // Events
    event AgentCreated(
        uint256 indexed agentId,
        address indexed creator,
        address tokenAddress,
        string agentName,
        string agentConfigJSON
    );
    
    event Contributed(
        uint256 indexed agentId,
        address indexed contributor,
        uint256 amount,
        uint256 totalRaised
    );
    
    event AgentBonded(
        uint256 indexed agentId,
        address indexed tokenAddress,
        address indexed lpPairAddress,
        string agentConfigJSON
    );
    
    event LiquidityPoolCreated(
        uint256 indexed agentId,
        address indexed tokenAddress,
        address indexed lpPairAddress,
        uint256 ethAmount,
        uint256 tokenAmount
    );
    
    event TreasuryAddressUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);
    event LiquidityManagerUpdated(address indexed oldManager, address indexed newManager);
    
    // Errors
    error AgentNotFound();
    error AgentAlreadyBonded();
    error FundingTargetNotMet();
    error FundingTargetExceeded();
    error InvalidAddress();
    error LiquidityManagerNotSet();
    error InvalidParameters();
    
    constructor(address _treasuryAddress) Ownable(msg.sender) {
        require(_treasuryAddress != address(0), "Invalid treasury");
        treasuryAddress = _treasuryAddress;
    }
    
    /**
     * @dev Creates a new agent campaign
     */
    function createAgent(
        string calldata name,
        string calldata symbol,
        string calldata agentName,
        string calldata archetype,
        string calldata metadataURI,
        uint256 fundingTarget,
        uint256 tokenSupply,
        string calldata agentConfigJSON
    ) external whenNotPaused returns (uint256 agentId) {
        require(fundingTarget > 0 && tokenSupply > 0, "Invalid params");
        require(bytes(name).length > 0 && bytes(symbol).length > 0, "Invalid name/symbol");
        
        agentId = _agentIdCounter++;
        
        // Deploy agent token contract
        AgentToken agentToken = new AgentToken(
            name,
            symbol,
            agentName,
            archetype,
            metadataURI,
            tokenSupply,
            address(this),
            agentConfigJSON
        );
        
        // Store agent configuration
        agents[agentId] = AgentConfig({
            name: name,
            symbol: symbol,
            agentName: agentName,
            archetype: archetype,
            metadataURI: metadataURI,
            fundingTarget: fundingTarget,
            tokenSupply: tokenSupply,
            creator: msg.sender,
            isBonded: false,
            totalRaised: 0,
            tokenAddress: address(agentToken),
            lpPairAddress: address(0),
            agentConfigJSON: agentConfigJSON,
            createdAt: block.timestamp,
            bondedAt: 0
        });
        
        // Update tracking arrays and mappings
        allAgentIds.push(agentId);
        inProgressAgentIds.push(agentId);
        agentsByCreator[msg.sender].push(agentId);
        tokenToAgentId[address(agentToken)] = agentId;
        
        emit AgentCreated(agentId, msg.sender, address(agentToken), agentName, agentConfigJSON);
    }
    
    /**
     * @dev Contribute ETH to an agent's funding campaign
     */
    function contribute(uint256 agentId) external payable nonReentrant whenNotPaused {
        AgentConfig storage agent = agents[agentId];
        require(agent.creator != address(0), "Agent not found");
        require(!agent.isBonded, "Already bonded");
        require(msg.value > 0, "No value");
        require(agent.totalRaised + msg.value <= agent.fundingTarget, "Exceeds target");
        
        contributions[agentId][msg.sender] += msg.value;
        agent.totalRaised += msg.value;
        
        emit Contributed(agentId, msg.sender, msg.value, agent.totalRaised);
        
        if (agent.totalRaised >= agent.fundingTarget) {
            _bondAgent(agentId);
        }
    }
    
    /**
     * @dev Manually bond an agent
     */
    function bondAgent(uint256 agentId) external nonReentrant whenNotPaused {
        AgentConfig storage agent = agents[agentId];
        require(agent.creator != address(0), "Agent not found");
        require(agent.totalRaised >= agent.fundingTarget, "Target not met");
        require(!agent.isBonded, "Already bonded");
        
        _bondAgent(agentId);
    }
    
    /**
     * @dev Internal function to bond an agent with LP creation
     */
    function _bondAgent(uint256 agentId) internal {
        AgentConfig storage agent = agents[agentId];
        
        // Calculate fees and liquidity amounts
        uint256 protocolFee = (agent.totalRaised * protocolFeePercentage) / BASIS_POINTS;
        uint256 liquidityETH = ((agent.totalRaised - protocolFee) * defaultLiquidityPercentage) / BASIS_POINTS;
        uint256 remainingETH = agent.totalRaised - protocolFee - liquidityETH;
        
        // Mark as bonded and update timestamp
        agent.isBonded = true;
        agent.bondedAt = block.timestamp;
        
        // Update tracking arrays
        _removeFromInProgress(agentId);
        bondedAgentIds.push(agentId);
        
        // Send protocol fee to treasury
        if (protocolFee > 0) {
            payable(treasuryAddress).transfer(protocolFee);
        }
        
        // Send remaining ETH to creator
        if (remainingETH > 0) {
            payable(agent.creator).transfer(remainingETH);
        }
        
        // Create liquidity pool if manager is set
        address lpPair = address(0);
        if (liquidityManager != address(0) && liquidityETH > 0) {
            // Calculate token amount for LP
            uint256 liquidityTokens = (agent.tokenSupply * defaultTokenLPPercentage) / BASIS_POINTS;
            
            // Approve liquidity manager to spend tokens
            AgentToken agentToken = AgentToken(agent.tokenAddress);
            agentToken.approve(liquidityManager, agent.tokenSupply);
            
            // Create LP via manager
            try ISimpleAMM(liquidityManager).createLiquidityPool{value: liquidityETH}(
                agentId,
                agent.tokenAddress,
                liquidityTokens,
                agent.agentConfigJSON
            ) returns (address _lpPair) {
                lpPair = _lpPair;
                agent.lpPairAddress = lpPair;
                
                emit LiquidityPoolCreated(agentId, agent.tokenAddress, lpPair, liquidityETH, liquidityTokens);
            } catch {
                // Fallback: Transfer tokens to treasury if LP creation fails
                agentToken.transfer(treasuryAddress, agent.tokenSupply);
            }
        } else {
            // Fallback: Transfer all tokens to treasury if no LP manager
            AgentToken agentToken = AgentToken(agent.tokenAddress);
            agentToken.transfer(treasuryAddress, agent.tokenSupply);
        }
        
        emit AgentBonded(agentId, agent.tokenAddress, lpPair, agent.agentConfigJSON);
    }
    
    /**
     * @dev Remove agent ID from in-progress array
     */
    function _removeFromInProgress(uint256 agentId) internal {
        for (uint256 i = 0; i < inProgressAgentIds.length; i++) {
            if (inProgressAgentIds[i] == agentId) {
                inProgressAgentIds[i] = inProgressAgentIds[inProgressAgentIds.length - 1];
                inProgressAgentIds.pop();
                break;
            }
        }
    }
    
    // =============================================================================
    // ENHANCED VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Get all bonded tokens with their details
     */
    function getAllBondedTokens() external view returns (
        address[] memory tokenAddresses,
        string[] memory names,
        string[] memory symbols,
        address[] memory lpPairs,
        uint256[] memory agentIds
    ) {
        uint256 bondedCount = bondedAgentIds.length;
        
        tokenAddresses = new address[](bondedCount);
        names = new string[](bondedCount);
        symbols = new string[](bondedCount);
        lpPairs = new address[](bondedCount);
        agentIds = new uint256[](bondedCount);
        
        for (uint256 i = 0; i < bondedCount; i++) {
            uint256 agentId = bondedAgentIds[i];
            AgentConfig storage agent = agents[agentId];
            
            tokenAddresses[i] = agent.tokenAddress;
            names[i] = agent.name;
            symbols[i] = agent.symbol;
            lpPairs[i] = agent.lpPairAddress;
            agentIds[i] = agentId;
        }
    }
    
    /**
     * @dev Get all bonded tokens (paginated)
     */
    function getBondedTokensPaginated(uint256 offset, uint256 limit) external view returns (
        address[] memory tokenAddresses,
        string[] memory names,
        string[] memory symbols,
        address[] memory lpPairs,
        uint256[] memory agentIds,
        uint256 totalCount
    ) {
        totalCount = bondedAgentIds.length;
        
        if (offset >= totalCount) {
            return (new address[](0), new string[](0), new string[](0), new address[](0), new uint256[](0), totalCount);
        }
        
        uint256 end = offset + limit;
        if (end > totalCount) {
            end = totalCount;
        }
        
        uint256 length = end - offset;
        tokenAddresses = new address[](length);
        names = new string[](length);
        symbols = new string[](length);
        lpPairs = new address[](length);
        agentIds = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 agentId = bondedAgentIds[offset + i];
            AgentConfig storage agent = agents[agentId];
            
            tokenAddresses[i] = agent.tokenAddress;
            names[i] = agent.name;
            symbols[i] = agent.symbol;
            lpPairs[i] = agent.lpPairAddress;
            agentIds[i] = agentId;
        }
    }
    
    /**
     * @dev Get all in-progress agents (not yet bonded)
     */
    function getInProgressAgents() external view returns (
        uint256[] memory agentIds,
        string[] memory agentNames,
        uint256[] memory fundingTargets,
        uint256[] memory totalRaised,
        uint256[] memory fundingProgress, // percentage * 100
        address[] memory tokenAddresses
    ) {
        uint256 inProgressCount = inProgressAgentIds.length;
        
        agentIds = new uint256[](inProgressCount);
        agentNames = new string[](inProgressCount);
        fundingTargets = new uint256[](inProgressCount);
        totalRaised = new uint256[](inProgressCount);
        fundingProgress = new uint256[](inProgressCount);
        tokenAddresses = new address[](inProgressCount);
        
        for (uint256 i = 0; i < inProgressCount; i++) {
            uint256 agentId = inProgressAgentIds[i];
            AgentConfig storage agent = agents[agentId];
            
            agentIds[i] = agentId;
            agentNames[i] = agent.agentName;
            fundingTargets[i] = agent.fundingTarget;
            totalRaised[i] = agent.totalRaised;
            fundingProgress[i] = agent.fundingTarget > 0 ? 
                (agent.totalRaised * 10000) / agent.fundingTarget : 0; // percentage * 100
            tokenAddresses[i] = agent.tokenAddress;
        }
    }
    
    /**
     * @dev Get in-progress agents (paginated)
     */
    function getInProgressAgentsPaginated(uint256 offset, uint256 limit) external view returns (
        uint256[] memory agentIds,
        string[] memory agentNames,
        uint256[] memory fundingTargets,
        uint256[] memory totalRaised,
        uint256[] memory fundingProgress,
        address[] memory tokenAddresses,
        uint256 totalCount
    ) {
        totalCount = inProgressAgentIds.length;
        
        if (offset >= totalCount) {
            return (
                new uint256[](0), new string[](0), new uint256[](0), 
                new uint256[](0), new uint256[](0), new address[](0), totalCount
            );
        }
        
        uint256 end = offset + limit;
        if (end > totalCount) {
            end = totalCount;
        }
        
        uint256 length = end - offset;
        agentIds = new uint256[](length);
        agentNames = new string[](length);
        fundingTargets = new uint256[](length);
        totalRaised = new uint256[](length);
        fundingProgress = new uint256[](length);
        tokenAddresses = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 agentId = inProgressAgentIds[offset + i];
            AgentConfig storage agent = agents[agentId];
            
            agentIds[i] = agentId;
            agentNames[i] = agent.agentName;
            fundingTargets[i] = agent.fundingTarget;
            totalRaised[i] = agent.totalRaised;
            fundingProgress[i] = agent.fundingTarget > 0 ? 
                (agent.totalRaised * 10000) / agent.fundingTarget : 0;
            tokenAddresses[i] = agent.tokenAddress;
        }
    }
    
    /**
     * @dev Get agents by creator
     */
    function getAgentsByCreator(address creator) external view returns (uint256[] memory) {
        return agentsByCreator[creator];
    }
    
    /**
     * @dev Get agent ID by token address
     */
    function getAgentByTokenAddress(address tokenAddress) external view returns (uint256) {
        return tokenToAgentId[tokenAddress];
    }
    
    /**
     * @dev Get total counts
     */
    function getTotalCounts() external view returns (
        uint256 totalAgents,
        uint256 bondedAgents,
        uint256 inProgressAgents
    ) {
        totalAgents = allAgentIds.length;
        bondedAgents = bondedAgentIds.length;
        inProgressAgents = inProgressAgentIds.length;
    }
    
    /**
     * @dev Get agents by status in a time range
     */
    function getAgentsByTimeRange(
        uint256 startTime,
        uint256 endTime,
        bool onlyBonded
    ) external view returns (uint256[] memory matchingAgentIds) {
        uint256[] memory sourceArray = onlyBonded ? bondedAgentIds : allAgentIds;
        uint256 count = 0;
        
        // First pass: count matching agents
        for (uint256 i = 0; i < sourceArray.length; i++) {
            uint256 agentId = sourceArray[i];
            AgentConfig storage agent = agents[agentId];
            uint256 checkTime = onlyBonded ? agent.bondedAt : agent.createdAt;
            
            if (checkTime >= startTime && checkTime <= endTime) {
                count++;
            }
        }
        
        // Second pass: populate array
        matchingAgentIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < sourceArray.length; i++) {
            uint256 agentId = sourceArray[i];
            AgentConfig storage agent = agents[agentId];
            uint256 checkTime = onlyBonded ? agent.bondedAt : agent.createdAt;
            
            if (checkTime >= startTime && checkTime <= endTime) {
                matchingAgentIds[index] = agentId;
                index++;
            }
        }
    }
    
    // =============================================================================
    // EXISTING VIEW FUNCTIONS (Enhanced)
    // =============================================================================
    
    function getAgentInfo(uint256 agentId) external view returns (
        string memory name,
        string memory agentName,
        uint256 fundingTarget,
        uint256 totalRaised,
        bool isBonded,
        address creator,
        address tokenAddress,
        address lpPairAddress,
        string memory agentConfigJSON
    ) {
        AgentConfig storage agent = agents[agentId];
        require(agent.creator != address(0), "Agent not found");
        
        return (
            agent.name,
            agent.agentName,
            agent.fundingTarget,
            agent.totalRaised,
            agent.isBonded,
            agent.creator,
            agent.tokenAddress,
            agent.lpPairAddress,
            agent.agentConfigJSON
        );
    }
    
    function getAgentConfigJSON(uint256 agentId) external view returns (string memory) {
        AgentConfig storage agent = agents[agentId];
        require(agent.creator != address(0), "Agent not found");
        return agent.agentConfigJSON;
    }
    
    function getContribution(uint256 agentId, address contributor) external view returns (uint256) {
        return contributions[agentId][contributor];
    }
    
    function getCurrentAgentId() external view returns (uint256) {
        return _agentIdCounter;
    }
    
    function isAgentBonded(uint256 agentId) external view returns (bool) {
        return agents[agentId].isBonded;
    }
    
    function getLiquidityPool(uint256 agentId) external view returns (address) {
        return agents[agentId].lpPairAddress;
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    function setLiquidityManager(address _liquidityManager) external onlyOwner {
        address oldManager = liquidityManager;
        liquidityManager = _liquidityManager;
        emit LiquidityManagerUpdated(oldManager, _liquidityManager);
    }
    
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        require(_treasuryAddress != address(0), "Invalid address");
        address oldTreasury = treasuryAddress;
        treasuryAddress = _treasuryAddress;
        emit TreasuryAddressUpdated(oldTreasury, _treasuryAddress);
    }
    
    function setProtocolFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= MAX_FEE, "Fee too high");
        uint256 oldFee = protocolFeePercentage;
        protocolFeePercentage = _feePercentage;
        emit ProtocolFeeUpdated(oldFee, _feePercentage);
    }
    
    function setLiquidityPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= BASIS_POINTS, "Invalid percentage");
        defaultLiquidityPercentage = _percentage;
    }
    
    function setTokenLPPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= BASIS_POINTS, "Invalid percentage");
        defaultTokenLPPercentage = _percentage;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    receive() external payable {}
} 