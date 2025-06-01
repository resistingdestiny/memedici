// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentToken.sol";

// Interface for AgentLiquidityManager
interface IAgentLiquidityManager {
    function createLiquidityPool(
        address tokenAddress,
        uint256 tokenSupply,
        address creator
    ) external payable returns (address lpPair);
    
    function getLPPair(address tokenAddress) external view returns (address);
    function hasLiquidityPool(address tokenAddress) external view returns (bool);
}

/**
 * @title AgentLaunchpadCore
 * @dev Core functionality for creating and funding AI creative agents
 */
contract AgentLaunchpadCore is Ownable, ReentrancyGuard {
    
    // Agent Configuration Structure
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
        address lpPairAddress;
        string agentConfigJSON;
    }
    
    // State Variables
    uint256 private _agentIdCounter;
    mapping(uint256 => AgentConfig) public agents;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    // Protocol Configuration
    address public treasuryAddress;
    address public liquidityManager; // Address of AgentLiquidityManager contract
    uint256 public protocolFeePercentage = 300; // 3%
    uint256 public constant MAX_FEE = 1000; // 10%
    uint256 public constant BASIS_POINTS = 10000;
    
    // LP Configuration
    uint256 public defaultLiquidityPercentage = 8000; // 80% of ETH for LP
    
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
    
    event LiquidityManagerUpdated(address indexed oldManager, address indexed newManager);
    
    // Errors
    error AgentNotFound();
    error AgentAlreadyBonded();
    error FundingTargetNotMet();
    error FundingTargetExceeded();
    error InvalidAddress();
    error LiquidityManagerNotSet();
    
    constructor(address _treasuryAddress) Ownable(msg.sender) {
        if (_treasuryAddress == address(0)) revert InvalidAddress();
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
    ) external returns (uint256 agentId) {
        require(fundingTarget > 0);
        require(tokenSupply > 0);
        require(bytes(name).length > 0);
        require(bytes(symbol).length > 0);
        require(bytes(agentConfigJSON).length > 0);
        
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
            fundingTarget: fundingTarget,
            tokenSupply: tokenSupply,
            creator: msg.sender,
            isBonded: false,
            totalRaised: 0,
            tokenAddress: address(agentToken),
            lpPairAddress: address(0),
            agentConfigJSON: agentConfigJSON
        });
        
        emit AgentCreated(agentId, msg.sender, address(agentToken), agentName, agentConfigJSON);
    }
    
    /**
     * @dev Contribute ETH to an agent's funding campaign
     */
    function contribute(uint256 agentId) external payable nonReentrant {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        if (agent.isBonded) revert AgentAlreadyBonded();
        
        require(msg.value > 0);
        
        if (agent.totalRaised + msg.value > agent.fundingTarget) {
            revert FundingTargetExceeded();
        }
        
        contributions[agentId][msg.sender] += msg.value;
        agent.totalRaised += msg.value;
        
        emit Contributed(agentId, msg.sender, msg.value, agent.totalRaised);
        
        // Auto-bond if funding target is reached
        if (agent.totalRaised >= agent.fundingTarget) {
            _bondAgent(agentId);
        }
    }
    
    /**
     * @dev Manually bond an agent
     */
    function bondAgent(uint256 agentId) external nonReentrant {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        if (agent.totalRaised < agent.fundingTarget) revert FundingTargetNotMet();
        if (agent.isBonded) revert AgentAlreadyBonded();
        
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
        
        // Mark as bonded
        agent.isBonded = true;
        
        // Send protocol fee to treasury
        if (protocolFee > 0) {
            (bool treasurySuccess, ) = payable(treasuryAddress).call{value: protocolFee}("");
            require(treasurySuccess);
        }
        
        // Send remaining ETH to creator
        if (remainingETH > 0) {
            (bool creatorSuccess, ) = payable(agent.creator).call{value: remainingETH}("");
            require(creatorSuccess);
        }
        
        // Create liquidity pool if manager is set
        address lpPair = address(0);
        if (liquidityManager != address(0) && liquidityETH > 0) {
            // Approve liquidity manager to spend tokens
            AgentToken agentToken = AgentToken(agent.tokenAddress);
            agentToken.approve(liquidityManager, agent.tokenSupply);
            
            // Create LP via manager
            lpPair = IAgentLiquidityManager(liquidityManager).createLiquidityPool{value: liquidityETH}(
                agent.tokenAddress,
                agent.tokenSupply,
                agent.creator
            );
            
            agent.lpPairAddress = lpPair;
        } else {
            // Fallback: Transfer all tokens to treasury if no LP manager
            AgentToken agentToken = AgentToken(agent.tokenAddress);
            agentToken.transfer(treasuryAddress, agent.tokenSupply);
        }
        
        emit AgentBonded(agentId, agent.tokenAddress, lpPair, agent.agentConfigJSON);
    }
    
    // Admin Functions
    
    /**
     * @dev Set liquidity manager contract
     */
    function setLiquidityManager(address _liquidityManager) external onlyOwner {
        address oldManager = liquidityManager;
        liquidityManager = _liquidityManager;
        emit LiquidityManagerUpdated(oldManager, _liquidityManager);
    }
    
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        if (_treasuryAddress == address(0)) revert InvalidAddress();
        treasuryAddress = _treasuryAddress;
    }
    
    function setProtocolFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= MAX_FEE);
        protocolFeePercentage = _feePercentage;
    }
    
    function setLiquidityPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= BASIS_POINTS);
        defaultLiquidityPercentage = _percentage;
    }
    
    // View Functions
    
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
        if (agent.creator == address(0)) revert AgentNotFound();
        
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
        if (agent.creator == address(0)) revert AgentNotFound();
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
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    receive() external payable {}
} 