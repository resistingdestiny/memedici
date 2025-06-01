// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
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
    
    // Agent Configuration Structure
    struct AgentConfig {
        string name;
        string symbol;
        string agentName;
        string archetype;
        string metadataURI;
        uint256 fundingTarget;
        uint256 tokenSupply;
        uint256 liquidityTokens;
        uint256 treasuryTokens;
        address creator;
        bool isBonded;
        bool isCancelled;
        uint256 totalRaised;
        uint256 createdAt;
        address tokenAddress;
        address lpPairAddress;
        uint256 seed;
        string agentConfigJSON;
    }
    
    // State Variables
    uint256 private _agentIdCounter;
    mapping(uint256 => AgentConfig) public agents;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(address => uint256[]) public userAgents;
    
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
        uint256 fundingTarget,
        string agentConfigJSON
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
        uint256 liquidityAdded,
        uint256 seed,
        string agentConfigJSON
    );
    
    event AgentCancelled(uint256 indexed agentId, string reason);
    
    event LiquidityProvided(
        uint256 indexed agentId,
        address indexed lpTokenAddress,
        uint256 tokenAmount,
        uint256 ethAmount
    );
    
    // Errors
    error AgentNotFound();
    error AgentAlreadyBonded();
    error AgentCancelledError();
    error FundingTargetNotMet();
    error FundingTargetExceeded();
    error NoContribution();
    error WithdrawalNotAllowed();
    error InvalidFeePercentage();
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
    ) external whenNotPaused returns (uint256 agentId) {
        require(fundingTarget > 0, "Invalid funding target");
        require(tokenSupply > 0, "Invalid token supply");
        require(bytes(name).length > 0, "Invalid name");
        require(bytes(symbol).length > 0, "Invalid symbol");
        require(bytes(agentConfigJSON).length > 0, "Invalid agent config JSON");
        
        agentId = _agentIdCounter;
        _agentIdCounter++;
        
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
            liquidityTokens: liquidityTokens,
            treasuryTokens: treasuryTokens,
            creator: msg.sender,
            isBonded: false,
            isCancelled: false,
            totalRaised: 0,
            createdAt: block.timestamp,
            tokenAddress: address(agentToken),
            lpPairAddress: address(0),
            seed: 0,
            agentConfigJSON: agentConfigJSON
        });
        
        userAgents[msg.sender].push(agentId);
        
        emit AgentCreated(agentId, msg.sender, address(agentToken), agentName, fundingTarget, agentConfigJSON);
    }
    
    /**
     * @dev Contribute ETH to an agent's funding campaign
     */
    function contribute(uint256 agentId) external payable nonReentrant whenNotPaused {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        if (agent.isBonded) revert AgentAlreadyBonded();
        if (agent.isCancelled) revert AgentCancelledError();
        
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
        if (agent.isCancelled) revert AgentCancelledError();
        
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
        
        // Generate simple seed (block-based for now)
        agent.seed = uint256(keccak256(abi.encode(agentId, block.timestamp, block.prevrandao)));
        
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
        AgentToken agentToken = AgentToken(agent.tokenAddress);
        agentToken.transfer(treasuryAddress, agent.treasuryTokens);
        
        emit AgentBonded(agentId, agent.tokenAddress, lpPair, liquidityETH, agent.seed, agent.agentConfigJSON);
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
        
        // Approve router to spend tokens
        agentToken.approve(uniswapRouter, agent.liquidityTokens);
        
        // Add liquidity
        IUniswapV2Router02(uniswapRouter).addLiquidityETH{value: ethAmount}(
            agent.tokenAddress,
            agent.liquidityTokens,
            agent.liquidityTokens,
            ethAmount,
            address(this),
            block.timestamp + 300
        );
        
        emit LiquidityProvided(agentId, lpPair, agent.liquidityTokens, ethAmount);
        
        return lpPair;
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
    
    // View Functions
    
    /**
     * @dev Get comprehensive agent information including JSON config
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
        address lpPairAddress,
        uint256 seed,
        string memory agentConfigJSON
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
            agent.lpPairAddress,
            agent.seed,
            agent.agentConfigJSON
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
        return _agentIdCounter;
    }
    
    /**
     * @dev Get agents created by a user
     */
    function getUserAgents(address user) external view returns (uint256[] memory) {
        return userAgents[user];
    }
    
    /**
     * @dev Get agent seed (returns 0 if not yet generated)
     */
    function getAgentSeed(uint256 agentId) external view returns (uint256) {
        return agents[agentId].seed;
    }
    
    /**
     * @dev Check if agent has a generated seed
     */
    function hasSeed(uint256 agentId) external view returns (bool) {
        return agents[agentId].seed != 0;
    }
    
    /**
     * @dev Get agent configuration JSON only
     */
    function getAgentConfigJSON(uint256 agentId) external view returns (string memory) {
        AgentConfig storage agent = agents[agentId];
        if (agent.creator == address(0)) revert AgentNotFound();
        return agent.agentConfigJSON;
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