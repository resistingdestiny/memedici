// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
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
 * @dev Launchpad for creating and funding AI creative agents with automatic LP deployment
 */
contract AgentLaunchpad is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    
    // Agent Configuration Structure
    struct AgentConfig {
        string name;
        string symbol;
        string agentName;
        string archetype;
        string metadataURI;
        uint256 fundingTarget;
        uint256 tokenSupply;
        uint256 liquidityTokens;  // Tokens reserved for LP
        uint256 treasuryTokens;   // Tokens for treasury
        address creator;
        bool isBonded;
        bool isCancelled;
        uint256 totalRaised;
        uint256 createdAt;
        address tokenAddress;
        address lpPairAddress;
    }
    
    // State Variables
    Counters.Counter private _agentIdCounter;
    mapping(uint256 => AgentConfig) public agents;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(address => uint256[]) public userAgents;
    
    // Protocol Configuration
    address public treasuryAddress;
    address public uniswapRouter;
    uint256 public protocolFeePercentage = 300; // 3% in basis points
    uint256 public constant MAX_FEE = 1000; // 10% max fee
    uint256 public constant BASIS_POINTS = 10000;
    
    // Default LP Configuration
    uint256 public defaultLiquidityPercentage = 8000; // 80% of raised funds to LP
    uint256 public defaultTokenLPPercentage = 8000;   // 80% of tokens to LP
    
    // Events
    event AgentCreated(
        uint256 indexed agentId,
        address indexed creator,
        address tokenAddress,
        string agentName,
        uint256 fundingTarget
    );
    
    event Contributed(
        uint256 indexed agentId,
        address indexed contributor,
        uint256 amount,
        uint256 totalRaised
    );
    
    event ContributionWithdrawn(
        uint256 indexed agentId,
        address indexed contributor,
        uint256 amount
    );
    
    event AgentBonded(
        uint256 indexed agentId,
        address indexed tokenAddress,
        address indexed lpPairAddress,
        uint256 liquidityAdded
    );
    
    event AgentCancelled(uint256 indexed agentId, string reason);
    
    event LiquidityProvided(
        uint256 indexed agentId,
        address indexed lpTokenAddress,
        uint256 tokenAmount,
        uint256 ethAmount
    );
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event RouterUpdated(address indexed oldRouter, address indexed newRouter);
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // Errors
    error AgentNotFound();
    error AgentAlreadyBonded();
    error AgentCancelled();
    error FundingTargetNotMet();
    error FundingTargetExceeded();
    error NoContribution();
    error WithdrawalNotAllowed();
    error InvalidFeePercentage();
    error InvalidAddress();
    error InsufficientLiquidity();
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
    
    // Agent Lifecycle Functions
    
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
        uint256 tokenSupply
    ) external whenNotPaused returns (uint256 agentId) {
        require(fundingTarget > 0, "Invalid funding target");
        require(tokenSupply > 0, "Invalid token supply");
        require(bytes(name).length > 0, "Invalid name");
        require(bytes(symbol).length > 0, "Invalid symbol");
        
        agentId = _agentIdCounter.current();
        _agentIdCounter.increment();
        
        // Calculate token allocations
        uint256 liquidityTokens = (tokenSupply * defaultTokenLPPercentage) / BASIS_POINTS;
        uint256 treasuryTokens = tokenSupply - liquidityTokens;
        
        // Deploy agent token contract
        AgentToken agentToken = new AgentToken(
            name,
            symbol,
            agentName,
            archetype,
            metadataURI,
            tokenSupply,
            address(this)
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
            liquidityTokens: liquidityTokens,
            treasuryTokens: treasuryTokens,
            creator: msg.sender,
            isBonded: false,
            isCancelled: false,
            totalRaised: 0,
            createdAt: block.timestamp,
            tokenAddress: address(agentToken),
            lpPairAddress: address(0)
        });
        
        userAgents[msg.sender].push(agentId);
        
        emit AgentCreated(agentId, msg.sender, address(agentToken), agentName, fundingTarget);
    }
    
    /**
     * @dev Contribute ETH to an agent's funding campaign
     */
    function contribute(uint256 agentId) external payable nonReentrant whenNotPaused {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        if (agent.isBonded) revert AgentAlreadyBonded();
        if (agent.isCancelled) revert AgentCancelled();
        
        require(msg.value > 0, "Must contribute more than 0");
        
        // Check if contribution would exceed funding target
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
     * @dev Withdraw contribution (only allowed before bonding)
     */
    function withdrawContribution(uint256 agentId) external nonReentrant {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        if (agent.isBonded) revert WithdrawalNotAllowed();
        
        uint256 contributionAmount = contributions[agentId][msg.sender];
        if (contributionAmount == 0) revert NoContribution();
        
        contributions[agentId][msg.sender] = 0;
        agent.totalRaised -= contributionAmount;
        
        (bool success, ) = payable(msg.sender).call{value: contributionAmount}("");
        if (!success) revert TransferFailed();
        
        emit ContributionWithdrawn(agentId, msg.sender, contributionAmount);
    }
    
    /**
     * @dev Manually bond an agent (only if funding target is met)
     */
    function bondAgent(uint256 agentId) external nonReentrant {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        if (agent.totalRaised < agent.fundingTarget) revert FundingTargetNotMet();
        if (agent.isBonded) revert AgentAlreadyBonded();
        if (agent.isCancelled) revert AgentCancelled();
        
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
        
        // Create liquidity pool
        address lpPair = _initializeLiquidityPool(agentId, liquidityETH);
        agent.lpPairAddress = lpPair;
        
        // Transfer treasury tokens to treasury
        AgentToken agentToken = AgentToken(agent.tokenAddress);
        agentToken.transfer(treasuryAddress, agent.treasuryTokens);
        
        emit AgentBonded(agentId, agent.tokenAddress, lpPair, liquidityETH);
    }
    
    /**
     * @dev Cancel an unbonded agent (admin only)
     */
    function cancelAgent(uint256 agentId, string calldata reason) external onlyOwner {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        if (agent.isBonded) revert AgentAlreadyBonded();
        
        agent.isCancelled = true;
        
        emit AgentCancelled(agentId, reason);
    }
    
    // Liquidity Pool Functions
    
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
        
        // Approve router to spend tokens
        agentToken.approve(uniswapRouter, agent.liquidityTokens);
        
        // Add liquidity
        IUniswapV2Router02(uniswapRouter).addLiquidityETH{value: ethAmount}(
            agent.tokenAddress,
            agent.liquidityTokens,
            agent.liquidityTokens, // Accept any amount of tokens
            ethAmount,              // Accept any amount of ETH
            address(this),          // LP tokens go to launchpad
            block.timestamp + 300   // 5 minute deadline
        );
        
        emit LiquidityProvided(agentId, lpPair, agent.liquidityTokens, ethAmount);
        
        return lpPair;
    }
    
    /**
     * @dev Get liquidity pool address for an agent
     */
    function getLiquidityPool(uint256 agentId) external view returns (address) {
        return agents[agentId].lpPairAddress;
    }
    
    // Admin Functions
    
    /**
     * @dev Set treasury address
     */
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        if (_treasuryAddress == address(0)) revert InvalidAddress();
        
        address oldTreasury = treasuryAddress;
        treasuryAddress = _treasuryAddress;
        
        emit TreasuryUpdated(oldTreasury, _treasuryAddress);
    }
    
    /**
     * @dev Set Uniswap router address
     */
    function setUniswapRouter(address _uniswapRouter) external onlyOwner {
        if (_uniswapRouter == address(0)) revert InvalidAddress();
        
        address oldRouter = uniswapRouter;
        uniswapRouter = _uniswapRouter;
        
        emit RouterUpdated(oldRouter, _uniswapRouter);
    }
    
    /**
     * @dev Set protocol fee percentage
     */
    function setProtocolFeePercentage(uint256 _feePercentage) external onlyOwner {
        if (_feePercentage > MAX_FEE) revert InvalidFeePercentage();
        
        uint256 oldFee = protocolFeePercentage;
        protocolFeePercentage = _feePercentage;
        
        emit ProtocolFeeUpdated(oldFee, _feePercentage);
    }
    
    /**
     * @dev Pause the launchpad
     */
    function pauseLaunchpad() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the launchpad
     */
    function unpauseLaunchpad() external onlyOwner {
        _unpause();
    }
    
    // View Functions
    
    /**
     * @dev Get comprehensive agent information
     */
    function getAgentInfo(uint256 agentId) external view returns (
        string memory name,
        string memory symbol,
        string memory agentName,
        string memory archetype,
        string memory metadataURI,
        uint256 fundingTarget,
        uint256 totalRaised,
        bool isBonded,
        bool isCancelled,
        address creator,
        address tokenAddress,
        address lpPairAddress
    ) {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        
        return (
            agent.name,
            agent.symbol,
            agent.agentName,
            agent.archetype,
            agent.metadataURI,
            agent.fundingTarget,
            agent.totalRaised,
            agent.isBonded,
            agent.isCancelled,
            agent.creator,
            agent.tokenAddress,
            agent.lpPairAddress
        );
    }
    
    /**
     * @dev Get user's contribution to an agent
     */
    function getContribution(uint256 agentId, address user) external view returns (uint256) {
        return contributions[agentId][user];
    }
    
    /**
     * @dev Get total raised for an agent
     */
    function getTotalRaised(uint256 agentId) external view returns (uint256) {
        return agents[agentId].totalRaised;
    }
    
    /**
     * @dev Check if agent is bonded
     */
    function isAgentBonded(uint256 agentId) external view returns (bool) {
        return agents[agentId].isBonded;
    }
    
    /**
     * @dev Get current agent ID counter
     */
    function getCurrentAgentId() external view returns (uint256) {
        return _agentIdCounter.current();
    }
    
    /**
     * @dev Get agents created by a user
     */
    function getUserAgents(address user) external view returns (uint256[] memory) {
        return userAgents[user];
    }
    
    // Emergency Functions
    
    /**
     * @dev Emergency withdrawal (only for unclaimed refunds)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) revert TransferFailed();
    }
    
    /**
     * @dev Get contract balance
     */
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
} 