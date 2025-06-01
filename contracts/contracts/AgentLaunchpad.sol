// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentToken.sol";

// Uniswap V2 Interfaces
interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/**
 * @title AgentLaunchpad
 * @dev Launchpad for creating and funding AI creative agents
 */
contract AgentLaunchpad is Ownable, ReentrancyGuard {
    
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
    address public uniswapRouter;
    uint256 public protocolFeePercentage = 300; // 3%
    uint256 public constant MAX_FEE = 1000; // 10%
    uint256 public constant BASIS_POINTS = 10000;
    
    // Default LP Configuration
    uint256 public defaultLiquidityPercentage = 8000; // 80%
    uint256 public defaultTokenLPPercentage = 8000;   // 80%
    
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
    
    // Errors
    error AgentNotFound();
    error AgentAlreadyBonded();
    error FundingTargetNotMet();
    error FundingTargetExceeded();
    error InvalidAddress();
    error TransferFailed();
    
    constructor(
        address _treasuryAddress,
        address _uniswapRouter
    ) Ownable(msg.sender) {
        if (_treasuryAddress == address(0) || _uniswapRouter == address(0)) {
            revert InvalidAddress();
        }
        
        treasuryAddress = _treasuryAddress;
        uniswapRouter = _uniswapRouter;
    }
    
    /**
     * @dev Creates a new agent campaign with complete configuration
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
        require(fundingTarget > 0, "Invalid funding target");
        require(tokenSupply > 0, "Invalid token supply");
        require(bytes(name).length > 0, "Invalid name");
        require(bytes(symbol).length > 0, "Invalid symbol");
        require(bytes(agentConfigJSON).length > 0, "Invalid agent config JSON");
        
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
        
        require(msg.value > 0, "Must contribute more than 0");
        
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
     * @dev Manually bond an agent (only if funding target is met)
     */
    function bondAgent(uint256 agentId) external nonReentrant {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        if (agent.totalRaised < agent.fundingTarget) revert FundingTargetNotMet();
        if (agent.isBonded) revert AgentAlreadyBonded();
        
        _bondAgent(agentId);
    }
    
    /**
     * @dev Internal function to bond an agent and create liquidity pool
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
            require(treasurySuccess, "Treasury transfer failed");
        }
        
        // Send remaining ETH to creator
        if (remainingETH > 0) {
            (bool creatorSuccess, ) = payable(agent.creator).call{value: remainingETH}("");
            require(creatorSuccess, "Creator transfer failed");
        }
        
        // Create liquidity pool if router is set
        address lpPair = address(0);
        if (uniswapRouter != address(0)) {
            lpPair = _initializeLiquidityPool(agentId, liquidityETH);
            agent.lpPairAddress = lpPair;
        }
        
        // Transfer treasury tokens to treasury
        uint256 liquidityTokens = (agent.tokenSupply * defaultTokenLPPercentage) / BASIS_POINTS;
        uint256 treasuryTokens = agent.tokenSupply - liquidityTokens;
        
        AgentToken agentToken = AgentToken(agent.tokenAddress);
        agentToken.transfer(treasuryAddress, treasuryTokens);
        
        emit AgentBonded(agentId, agent.tokenAddress, lpPair, agent.agentConfigJSON);
    }
    
    /**
     * @dev Initialize Uniswap V2 liquidity pool
     */
    function _initializeLiquidityPool(uint256 agentId, uint256 ethAmount) internal returns (address lpPair) {
        AgentConfig storage agent = agents[agentId];
        AgentToken agentToken = AgentToken(agent.tokenAddress);
        
        // Create pair if it doesn't exist
        IUniswapV2Factory factory = IUniswapV2Factory(IUniswapV2Router02(uniswapRouter).factory());
        address weth = IUniswapV2Router02(uniswapRouter).WETH();
        
        lpPair = factory.getPair(agent.tokenAddress, weth);
        if (lpPair == address(0)) {
            lpPair = factory.createPair(agent.tokenAddress, weth);
        }
        
        // Calculate liquidity tokens
        uint256 liquidityTokens = (agent.tokenSupply * defaultTokenLPPercentage) / BASIS_POINTS;
        
        // Approve router to spend tokens
        agentToken.approve(uniswapRouter, liquidityTokens);
        
        // Add liquidity
        IUniswapV2Router02(uniswapRouter).addLiquidityETH{value: ethAmount}(
            agent.tokenAddress,
            liquidityTokens,
            liquidityTokens,
            ethAmount,
            address(this),
            block.timestamp + 300
        );
        
        return lpPair;
    }
    
    // Admin Functions
    
    /**
     * @dev Set treasury address
     */
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        if (_treasuryAddress == address(0)) revert InvalidAddress();
        treasuryAddress = _treasuryAddress;
    }
    
    /**
     * @dev Set protocol fee percentage
     */
    function setProtocolFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= MAX_FEE, "Fee too high");
        protocolFeePercentage = _feePercentage;
    }
    
    // View Functions
    
    /**
     * @dev Get agent basic information
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
        if (agent.creator == address(0)) revert AgentNotFound();
        
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
        if (agent.creator == address(0)) revert AgentNotFound();
        return agent.agentConfigJSON;
    }
    
    /**
     * @dev Get user's contribution for an agent
     */
    function getContribution(uint256 agentId, address contributor) external view returns (uint256) {
        return contributions[agentId][contributor];
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
     * @dev Get liquidity pool address for an agent
     */
    function getLiquidityPool(uint256 agentId) external view returns (address) {
        return agents[agentId].lpPairAddress;
    }
    
    /**
     * @dev Emergency function to recover ETH (admin only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Receive function to allow ETH deposits
     */
    receive() external payable {}
} 