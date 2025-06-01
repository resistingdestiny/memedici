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
 * @title AgentLiquidityManager
 * @dev Manages Uniswap liquidity pools for agent tokens
 */
contract AgentLiquidityManager is Ownable, ReentrancyGuard {
    
    // Configuration
    address public uniswapRouter;
    uint256 public defaultTokenLPPercentage = 8000; // 80% of tokens to LP
    uint256 public constant BASIS_POINTS = 10000;
    
    // State tracking
    mapping(address => address) public tokenToPair; // token address => LP pair address
    mapping(address => bool) public authorizedCallers; // contracts that can call LP functions
    
    // Events
    event LiquidityPoolCreated(
        address indexed tokenAddress,
        address indexed lpPairAddress,
        uint256 tokenAmount,
        uint256 ethAmount,
        address indexed creator
    );
    
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);
    
    // Errors
    error UnauthorizedCaller();
    error InvalidRouter();
    error LPCreationFailed();
    error InvalidTokenAddress();
    
    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }
    
    constructor(address _uniswapRouter) Ownable(msg.sender) {
        if (_uniswapRouter == address(0)) revert InvalidRouter();
        uniswapRouter = _uniswapRouter;
    }
    
    /**
     * @dev Create liquidity pool for agent token
     * Called by authorized contracts (like AgentLaunchpadCore)
     */
    function createLiquidityPool(
        address tokenAddress,
        uint256 tokenSupply,
        address creator
    ) external payable onlyAuthorized nonReentrant returns (address lpPair) {
        if (tokenAddress == address(0)) revert InvalidTokenAddress();
        
        AgentToken agentToken = AgentToken(tokenAddress);
        
        // Calculate LP token allocation
        uint256 liquidityTokens = (tokenSupply * defaultTokenLPPercentage) / BASIS_POINTS;
        uint256 treasuryTokens = tokenSupply - liquidityTokens;
        
        // Transfer tokens to this contract for LP creation
        agentToken.transferFrom(msg.sender, address(this), tokenSupply);
        
        // Create Uniswap pair if it doesn't exist
        IUniswapV2Factory factory = IUniswapV2Factory(IUniswapV2Router02(uniswapRouter).factory());
        address weth = IUniswapV2Router02(uniswapRouter).WETH();
        
        lpPair = factory.getPair(tokenAddress, weth);
        if (lpPair == address(0)) {
            lpPair = factory.createPair(tokenAddress, weth);
        }
        
        // Store LP pair mapping
        tokenToPair[tokenAddress] = lpPair;
        
        // Approve router to spend tokens
        agentToken.approve(uniswapRouter, liquidityTokens);
        
        // Add liquidity with all provided ETH
        uint256 ethAmount = msg.value;
        (uint256 amountToken, uint256 amountETH,) = IUniswapV2Router02(uniswapRouter).addLiquidityETH{value: ethAmount}(
            tokenAddress,
            liquidityTokens,
            liquidityTokens, // Accept any amount of tokens
            ethAmount,       // Accept any amount of ETH
            address(this),   // LP tokens stay in this contract for now
            block.timestamp + 300
        );
        
        // Transfer remaining treasury tokens back to caller (treasury)
        if (treasuryTokens > 0) {
            agentToken.transfer(msg.sender, treasuryTokens);
        }
        
        emit LiquidityPoolCreated(tokenAddress, lpPair, amountToken, amountETH, creator);
        
        return lpPair;
    }
    
    /**
     * @dev Get LP pair address for a token
     */
    function getLPPair(address tokenAddress) external view returns (address) {
        return tokenToPair[tokenAddress];
    }
    
    /**
     * @dev Check if LP exists for token
     */
    function hasLiquidityPool(address tokenAddress) external view returns (bool) {
        return tokenToPair[tokenAddress] != address(0);
    }
    
    // Admin Functions
    
    /**
     * @dev Set authorized caller (like AgentLaunchpadCore)
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
    }
    
    /**
     * @dev Update Uniswap router
     */
    function setUniswapRouter(address _uniswapRouter) external onlyOwner {
        if (_uniswapRouter == address(0)) revert InvalidRouter();
        uniswapRouter = _uniswapRouter;
    }
    
    /**
     * @dev Update LP token percentage
     */
    function setTokenLPPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= BASIS_POINTS, "Invalid percentage");
        defaultTokenLPPercentage = _percentage;
    }
    
    /**
     * @dev Emergency withdrawal
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Emergency token withdrawal
     */
    function emergencyTokenWithdraw(address tokenAddress, uint256 amount) external onlyOwner {
        AgentToken(tokenAddress).transfer(owner(), amount);
    }
    
    /**
     * @dev Receive ETH
     */
    receive() external payable {}
} 