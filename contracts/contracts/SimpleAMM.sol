// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AgentToken.sol";

/**
 * @title SimplePair
 * @dev Simple pair contract for token-ETH trading
 */
contract SimplePair {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public token;
    address public factory;
    
    uint256 public reserve0; // ETH reserve
    uint256 public reserve1; // Token reserve
    
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Sync(uint256 reserve0, uint256 reserve1);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value, uint256 amount0, uint256 amount1);
    event Swap(
        address indexed to,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out
    );
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }
    
    constructor() {
        factory = msg.sender;
    }
    
    function initialize(address _token, string memory _name, string memory _symbol) external onlyFactory {
        token = _token;
        name = _name;
        symbol = _symbol;
    }
    
    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
    
    function _burn(address from, uint256 value) internal {
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }
    
    function _update(uint256 balance0, uint256 balance1) private {
        reserve0 = balance0;
        reserve1 = balance1;
        emit Sync(reserve0, reserve1);
    }
    
    function mint(address to) external returns (uint256 liquidity) {
        uint256 balance0 = address(this).balance;
        uint256 balance1 = IERC20(token).balanceOf(address(this));
        uint256 amount0 = balance0 - reserve0;
        uint256 amount1 = balance1 - reserve1;
        
        if (totalSupply == 0) {
            liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            liquidity = min((amount0 * totalSupply) / reserve0, (amount1 * totalSupply) / reserve1);
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        _mint(to, liquidity);
        
        _update(balance0, balance1);
        emit Mint(to, liquidity);
    }
    
    function burn(address to) external returns (uint256 amount0, uint256 amount1) {
        uint256 balance0 = address(this).balance;
        uint256 balance1 = IERC20(token).balanceOf(address(this));
        uint256 liquidity = balanceOf[address(this)];
        
        amount0 = (liquidity * balance0) / totalSupply;
        amount1 = (liquidity * balance1) / totalSupply;
        
        require(amount0 > 0 && amount1 > 0, "Insufficient liquidity burned");
        
        _burn(address(this), liquidity);
        payable(to).transfer(amount0);
        IERC20(token).transfer(to, amount1);
        
        balance0 = address(this).balance;
        balance1 = IERC20(token).balanceOf(address(this));
        
        _update(balance0, balance1);
        emit Burn(msg.sender, liquidity, amount0, amount1);
    }
    
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external {
        require(amount0Out > 0 || amount1Out > 0, "Insufficient output amount");
        require(amount0Out < reserve0 && amount1Out < reserve1, "Insufficient liquidity");
        
        if (amount0Out > 0) payable(to).transfer(amount0Out);
        if (amount1Out > 0) IERC20(token).transfer(to, amount1Out);
        
        uint256 balance0 = address(this).balance;
        uint256 balance1 = IERC20(token).balanceOf(address(this));
        
        uint256 amount0In = balance0 > reserve0 - amount0Out ? balance0 - (reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > reserve1 - amount1Out ? balance1 - (reserve1 - amount1Out) : 0;
        
        require(amount0In > 0 || amount1In > 0, "Insufficient input amount");
        
        // 0.3% fee
        uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
        uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
        
        require(
            balance0Adjusted * balance1Adjusted >= reserve0 * reserve1 * (10**6),
            "K invariant not maintained"
        );
        
        _update(balance0, balance1);
        emit Swap(to, amount0In, amount1In, amount0Out, amount1Out);
    }
    
    function getReserves() external view returns (uint256 _reserve0, uint256 _reserve1) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
    }
    
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
    
    receive() external payable {}
}

/**
 * @title SimpleAMM
 * @dev Simple AMM factory and router for agent tokens
 */
contract SimpleAMM is Ownable, ReentrancyGuard {
    
    // State Variables
    mapping(uint256 => address) public agentPairs; // agentId => pair address
    mapping(address => uint256) public pairToAgent; // pair address => agentId
    mapping(address => bool) public authorizedCallers; // contracts that can create pairs
    
    address[] public allPairs;
    
    // Configuration
    uint256 public constant FEE_RATE = 30; // 0.3%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Events
    event LiquidityPoolCreated(
        uint256 indexed agentId,
        address indexed tokenAddress,
        address indexed lpPairAddress,
        uint256 ethAmount,
        uint256 tokenAmount
    );
    
    event AuthorizationUpdated(address indexed account, bool authorized);
    event RouterUpdated(address indexed oldRouter, address indexed newRouter);
    event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed to);
    
    // Errors
    error UnauthorizedCaller();
    error InvalidToken();
    error PairAlreadyExists();
    error PairNotFound();
    error InsufficientLiquidity();
    error InvalidAmounts();
    error TransferFailed();
    
    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create liquidity pool for agent token
     */
    function createLiquidityPool(
        uint256 agentId,
        address tokenAddress,
        uint256 tokenAmount,
        string calldata agentConfigJSON
    ) external payable onlyAuthorized nonReentrant returns (address lpPair) {
        if (tokenAddress == address(0)) revert InvalidToken();
        if (agentPairs[agentId] != address(0)) revert PairAlreadyExists();
        if (msg.value == 0 || tokenAmount == 0) revert InvalidAmounts();
        
        // Create new pair
        SimplePair pair = new SimplePair();
        
        // Get token info for pair naming
        AgentToken agentToken = AgentToken(tokenAddress);
        string memory pairName = string(abi.encodePacked(agentToken.name(), "-ETH LP"));
        string memory pairSymbol = string(abi.encodePacked(agentToken.symbol(), "-ETH"));
        
        // Initialize pair
        pair.initialize(tokenAddress, pairName, pairSymbol);
        lpPair = address(pair);
        
        // Store mapping
        agentPairs[agentId] = lpPair;
        pairToAgent[lpPair] = agentId;
        allPairs.push(lpPair);
        
        // Transfer tokens to pair
        IERC20(tokenAddress).transferFrom(msg.sender, lpPair, tokenAmount);
        
        // Send ETH to pair
        payable(lpPair).transfer(msg.value);
        
        // Mint initial liquidity to this contract (acts as treasury)
        pair.mint(address(this));
        
        emit LiquidityPoolCreated(agentId, tokenAddress, lpPair, msg.value, tokenAmount);
        
        return lpPair;
    }
    
    /**
     * @dev Add liquidity to existing pool
     */
    function addLiquidity(
        uint256 agentId,
        uint256 tokenAmountDesired,
        uint256 tokenAmountMin,
        uint256 ethAmountMin,
        address to,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        require(block.timestamp <= deadline, "Expired");
        
        address pairAddress = agentPairs[agentId];
        if (pairAddress == address(0)) revert PairNotFound();
        
        SimplePair pair = SimplePair(payable(pairAddress));
        (uint256 reserveETH, uint256 reserveToken) = pair.getReserves();
        
        if (reserveETH == 0 && reserveToken == 0) {
            (amountToken, amountETH) = (tokenAmountDesired, msg.value);
        } else {
            uint256 tokenAmountOptimal = quote(msg.value, reserveETH, reserveToken);
            if (tokenAmountOptimal <= tokenAmountDesired) {
                require(tokenAmountOptimal >= tokenAmountMin, "Insufficient token amount");
                (amountToken, amountETH) = (tokenAmountOptimal, msg.value);
            } else {
                uint256 ethAmountOptimal = quote(tokenAmountDesired, reserveToken, reserveETH);
                require(ethAmountOptimal <= msg.value && ethAmountOptimal >= ethAmountMin, "Insufficient ETH amount");
                (amountToken, amountETH) = (tokenAmountDesired, ethAmountOptimal);
            }
        }
        
        // Transfer tokens to pair
        address tokenAddress = pair.token();
        IERC20(tokenAddress).transferFrom(msg.sender, pairAddress, amountToken);
        
        // Send ETH to pair
        payable(pairAddress).transfer(amountETH);
        
        // Mint liquidity tokens
        liquidity = pair.mint(to);
        
        // Refund excess ETH
        if (msg.value > amountETH) {
            payable(msg.sender).transfer(msg.value - amountETH);
        }
    }
    
    /**
     * @dev Swap ETH for tokens
     */
    function swapETHForTokens(
        uint256 agentId,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable nonReentrant returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "Expired");
        require(msg.value > 0, "Insufficient input amount");
        
        address pairAddress = agentPairs[agentId];
        if (pairAddress == address(0)) revert PairNotFound();
        
        SimplePair pair = SimplePair(payable(pairAddress));
        (uint256 reserveETH, uint256 reserveToken) = pair.getReserves();
        
        uint256 amountOut = getAmountOut(msg.value, reserveETH, reserveToken);
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        // Send ETH to pair
        payable(pairAddress).transfer(msg.value);
        
        // Execute swap
        pair.swap(0, amountOut, to);
        
        amounts = new uint256[](2);
        amounts[0] = msg.value;
        amounts[1] = amountOut;
    }
    
    /**
     * @dev Swap tokens for ETH
     */
    function swapTokensForETH(
        uint256 agentId,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Insufficient input amount");
        
        address pairAddress = agentPairs[agentId];
        if (pairAddress == address(0)) revert PairNotFound();
        
        SimplePair pair = SimplePair(payable(pairAddress));
        (uint256 reserveETH, uint256 reserveToken) = pair.getReserves();
        
        uint256 amountOut = getAmountOut(amountIn, reserveToken, reserveETH);
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        // Transfer tokens to pair
        address tokenAddress = pair.token();
        IERC20(tokenAddress).transferFrom(msg.sender, pairAddress, amountIn);
        
        // Execute swap
        pair.swap(amountOut, 0, to);
        
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
    }
    
    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Get pair address for agent
     */
    function getLiquidityPool(uint256 agentId) external view returns (address) {
        return agentPairs[agentId];
    }
    
    /**
     * @dev Check if caller is authorized
     */
    function isAuthorized(address account) external view returns (bool) {
        return authorizedCallers[account] || account == owner();
    }
    
    /**
     * @dev Get all pairs
     */
    function getAllPairs() external view returns (address[] memory) {
        return allPairs;
    }
    
    /**
     * @dev Get pair count
     */
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
    
    /**
     * @dev Quote function for adding liquidity
     */
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(amountA > 0, "Insufficient amount");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");
        amountB = (amountA * reserveB) / reserveA;
    }
    
    /**
     * @dev Get amount out for swap
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * 997; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    /**
     * @dev Get amount in for desired amount out
     */
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountIn) {
        require(amountOut > 0, "Insufficient output amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }
    
    /**
     * @dev Get reserves for agent pair
     */
    function getReserves(uint256 agentId) external view returns (uint256 reserveETH, uint256 reserveToken) {
        address pairAddress = agentPairs[agentId];
        if (pairAddress == address(0)) return (0, 0);
        
        SimplePair pair = SimplePair(payable(pairAddress));
        (reserveETH, reserveToken) = pair.getReserves();
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Set authorization for caller
     */
    function setAuthorization(address account, bool authorized) external onlyOwner {
        authorizedCallers[account] = authorized;
        emit AuthorizationUpdated(account, authorized);
    }
    
    /**
     * @dev Emergency withdraw ETH
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        payable(to).transfer(amount);
        emit EmergencyWithdrawal(address(0), amount, to);
    }
    
    /**
     * @dev Emergency withdraw tokens
     */
    function emergencyTokenWithdraw(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        IERC20(token).transfer(to, amount);
        emit EmergencyWithdrawal(token, amount, to);
    }
    
    receive() external payable {}
} 