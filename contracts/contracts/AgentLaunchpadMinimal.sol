// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentToken.sol";

/**
 * @title AgentLaunchpadMinimal
 * @dev Minimal version for testing - basic agent creation and funding
 */
contract AgentLaunchpadMinimal is Ownable, ReentrancyGuard {
    
    // Agent Configuration Structure (minimal)
    struct AgentConfig {
        string name;
        string symbol;
        string agentName;
        uint256 fundingTarget;
        uint256 tokenSupply;
        address creator;
        bool isBonded;
        uint256 totalRaised;
        address tokenAddress;
        string agentConfigJSON;
    }
    
    // State Variables
    uint256 private _agentIdCounter;
    mapping(uint256 => AgentConfig) public agents;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    // Protocol Configuration
    address public treasuryAddress;
    uint256 public protocolFeePercentage = 300; // 3%
    uint256 public constant BASIS_POINTS = 10000;
    
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
        string agentConfigJSON
    );
    
    // Errors
    error AgentNotFound();
    error AgentAlreadyBonded();
    error FundingTargetNotMet();
    error FundingTargetExceeded();
    
    constructor(address _treasuryAddress) Ownable(msg.sender) {
        treasuryAddress = _treasuryAddress;
    }
    
    /**
     * @dev Creates a new agent campaign (minimal version)
     */
    function createAgent(
        string calldata name,
        string calldata symbol,
        string calldata agentName,
        uint256 fundingTarget,
        uint256 tokenSupply,
        string calldata agentConfigJSON
    ) external returns (uint256 agentId) {
        require(fundingTarget > 0, "Invalid target");
        require(tokenSupply > 0, "Invalid supply");
        require(bytes(agentConfigJSON).length > 0, "Invalid config");
        
        agentId = _agentIdCounter++;
        
        // Deploy agent token contract
        AgentToken agentToken = new AgentToken(
            name,
            symbol,
            agentName,
            "Creative Agent", // Default archetype
            "", // No metadata URI for minimal version
            tokenSupply,
            address(this),
            agentConfigJSON
        );
        
        // Store agent configuration (minimal)
        agents[agentId] = AgentConfig({
            name: name,
            symbol: symbol,
            agentName: agentName,
            fundingTarget: fundingTarget,
            tokenSupply: tokenSupply,
            creator: msg.sender,
            isBonded: false,
            totalRaised: 0,
            tokenAddress: address(agentToken),
            agentConfigJSON: agentConfigJSON
        });
        
        emit AgentCreated(agentId, msg.sender, address(agentToken), agentName, agentConfigJSON);
    }
    
    /**
     * @dev Contribute ETH to an agent's funding campaign
     */
    function contribute(uint256 agentId) external payable nonReentrant {
        AgentConfig storage agent = agents[agentId];
        require(agent.creator != address(0), "Agent not found");
        require(!agent.isBonded, "Already bonded");
        require(msg.value > 0, "Must contribute");
        
        if (agent.totalRaised + msg.value > agent.fundingTarget) {
            revert FundingTargetExceeded();
        }
        
        contributions[agentId][msg.sender] += msg.value;
        agent.totalRaised += msg.value;
        
        emit Contributed(agentId, msg.sender, msg.value, agent.totalRaised);
        
        // Auto-bond if funded
        if (agent.totalRaised >= agent.fundingTarget) {
            _bondAgent(agentId);
        }
    }
    
    /**
     * @dev Bond an agent (minimal - just mark as bonded)
     */
    function _bondAgent(uint256 agentId) internal {
        AgentConfig storage agent = agents[agentId];
        agent.isBonded = true;
        
        // Calculate fees
        uint256 protocolFee = (agent.totalRaised * protocolFeePercentage) / BASIS_POINTS;
        uint256 creatorAmount = agent.totalRaised - protocolFee;
        
        // Send protocol fee to treasury
        if (protocolFee > 0) {
            payable(treasuryAddress).transfer(protocolFee);
        }
        
        // Send remaining to creator
        if (creatorAmount > 0) {
            payable(agent.creator).transfer(creatorAmount);
        }
        
        emit AgentBonded(agentId, agent.tokenAddress, agent.agentConfigJSON);
    }
    
    /**
     * @dev Get agent info
     */
    function getAgentInfo(uint256 agentId) external view returns (
        string memory name,
        string memory agentName,
        uint256 fundingTarget,
        uint256 totalRaised,
        bool isBonded,
        address creator,
        address tokenAddress,
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
            agent.agentConfigJSON
        );
    }
    
    /**
     * @dev Get agent config JSON
     */
    function getAgentConfigJSON(uint256 agentId) external view returns (string memory) {
        AgentConfig storage agent = agents[agentId];
        require(agent.creator != address(0), "Agent not found");
        return agent.agentConfigJSON;
    }
    
    /**
     * @dev Get current agent ID counter
     */
    function getCurrentAgentId() external view returns (uint256) {
        return _agentIdCounter;
    }
    
    /**
     * @dev Check if agent is bonded
     */
    function isAgentBonded(uint256 agentId) external view returns (bool) {
        return agents[agentId].isBonded;
    }
    
    /**
     * @dev Set treasury address
     */
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        require(_treasuryAddress != address(0), "Invalid address");
        treasuryAddress = _treasuryAddress;
    }
    
    /**
     * @dev Get user's contribution
     */
    function getContribution(uint256 agentId, address user) external view returns (uint256) {
        return contributions[agentId][user];
    }
} 