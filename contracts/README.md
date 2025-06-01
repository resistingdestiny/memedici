# Memedici Agent Launchpad Smart Contracts

A comprehensive smart contract system for launching and funding AI creative agents with automatic liquidity pool deployment and revenue distribution.

## 🏗️ Architecture

### Core Contracts

#### 1. **AgentLaunchpad.sol**
The main launchpad contract that manages the entire agent lifecycle:

- **Agent Creation**: Deploy new AI agents with custom parameters
- **Funding Campaigns**: Crowdfund agent launches with ETH contributions
- **Automatic Bonding**: Deploy liquidity pools when funding targets are met
- **Revenue Distribution**: Distribute protocol fees and creator payments
- **Admin Controls**: Pause/unpause, fee management, treasury updates

#### 2. **AgentToken.sol**
ERC20 token representing ownership in an AI creative agent:

- **Standard ERC20**: Transfer, approve, allowance functionality
- **ERC20Votes**: Governance capabilities for agent decisions
- **ERC20Permit**: Gasless approvals via signatures
- **Revenue Sharing**: Pro-rata revenue distribution to token holders
- **Agent Metadata**: On-chain agent identity and configuration

## 🚀 Features

### Agent Lifecycle Management

```solidity
// Create a new agent campaign
function createAgent(
    string calldata name,           // Token name (e.g., "Ethereal Token")
    string calldata symbol,         // Token symbol (e.g., "ETHEREAL")
    string calldata agentName,      // Agent's creative name
    string calldata archetype,      // Agent type (e.g., "Digital Painter")
    string calldata metadataURI,    // IPFS metadata hash
    uint256 fundingTarget,          // ETH funding goal
    uint256 tokenSupply            // Total token supply
) external returns (uint256 agentId);

// Contribute ETH to fund an agent
function contribute(uint256 agentId) external payable;

// Withdraw contribution before bonding
function withdrawContribution(uint256 agentId) external;

// Manually bond agent when target is met
function bondAgent(uint256 agentId) external;
```

### Revenue Distribution

```solidity
// Deposit revenue for token holders
function depositRevenue() external payable;

// Claim accumulated revenue
function claimRevenue() external;

// Check claimable amount
function getClaimableRevenue(address account) external view returns (uint256);
```

### Liquidity Pool Integration

- **Automatic LP Creation**: Creates Uniswap V2 pairs when agents are bonded
- **Token Allocation**: 80% of tokens go to LP, 20% to treasury
- **ETH Distribution**: 80% to LP, 17% to creator, 3% protocol fee

## 📊 Token Economics

### Default Allocations
- **Liquidity Pool**: 80% of tokens + 80% of raised ETH
- **Treasury**: 20% of tokens
- **Creator**: 17% of raised ETH
- **Protocol Fee**: 3% of raised ETH

### Revenue Sharing
- Token holders receive pro-rata share of all revenue
- Revenue sources: royalties, licensing, secondary sales
- Automatic distribution via `claimRevenue()`

## 🛠️ Development Setup

### Prerequisites
- Node.js 16+
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd contracts

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```bash
# RPC URLs
MAINNET_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/your-api-key
SEPOLIA_RPC_URL=https://eth-sepolia.alchemyapi.io/v2/your-api-key
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BASE_RPC_URL=https://mainnet.base.org

# Private key for deployment
PRIVATE_KEY=your-private-key-here

# API keys for verification
ETHERSCAN_API_KEY=your-etherscan-api-key
POLYGONSCAN_API_KEY=your-polygonscan-api-key
ARBISCAN_API_KEY=your-arbiscan-api-key
BASESCAN_API_KEY=your-basescan-api-key

# Treasury address (optional, defaults to deployer)
TREASURY_ADDRESS=0x...

# Gas reporting
COINMARKETCAP_API_KEY=your-cmc-api-key
REPORT_GAS=true
```

## 🧪 Testing

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Run tests with gas reporting
REPORT_GAS=true npm test

# Generate coverage report
npm run coverage
```

## 🚀 Deployment

### Local Development

```bash
# Start local Hardhat node
npm run node

# Deploy to local network
npm run deploy:localhost
```

### Testnet Deployment

```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Verify contracts
npx hardhat verify --network sepolia <contract-address> <constructor-args>
```

### Mainnet Deployment

```bash
# Deploy to mainnet
npm run deploy:mainnet

# Verify contracts
npx hardhat verify --network mainnet <contract-address> <constructor-args>
```

## 📋 Contract Addresses

### Mainnet
- **AgentLaunchpad**: `TBD`

### Sepolia Testnet
- **AgentLaunchpad**: `TBD`

### Polygon
- **AgentLaunchpad**: `TBD`

## 🔧 Usage Examples

### Creating an Agent

```javascript
const launchpad = await ethers.getContractAt("AgentLaunchpad", launchpadAddress);

const tx = await launchpad.createAgent(
    "Ethereal Token",                    // name
    "ETHEREAL",                         // symbol
    "Elysia the Ethereal",              // agentName
    "Neo-Mystical Digital Painter",     // archetype
    "ipfs://QmYourMetadataHash",        // metadataURI
    ethers.parseEther("10"),            // fundingTarget (10 ETH)
    ethers.parseEther("1000000")        // tokenSupply (1M tokens)
);

const receipt = await tx.wait();
const agentId = receipt.logs[0].args.agentId;
console.log("Agent created with ID:", agentId);
```

### Contributing to an Agent

```javascript
const contributionAmount = ethers.parseEther("1"); // 1 ETH

const tx = await launchpad.contribute(agentId, {
    value: contributionAmount
});

await tx.wait();
console.log("Contributed 1 ETH to agent", agentId);
```

### Claiming Revenue

```javascript
const agentToken = await ethers.getContractAt("AgentToken", tokenAddress);

// Check claimable amount
const claimable = await agentToken.getClaimableRevenue(userAddress);
console.log("Claimable revenue:", ethers.formatEther(claimable), "ETH");

// Claim revenue
if (claimable > 0) {
    const tx = await agentToken.claimRevenue();
    await tx.wait();
    console.log("Revenue claimed!");
}
```

## 🔒 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency circuit breaker
- **Ownable**: Admin function access control
- **Custom Errors**: Gas-efficient error handling
- **Input Validation**: Comprehensive parameter checking

## 🧾 Events

### AgentLaunchpad Events

```solidity
event AgentCreated(uint256 indexed agentId, address indexed creator, address tokenAddress, string agentName, uint256 fundingTarget);
event Contributed(uint256 indexed agentId, address indexed contributor, uint256 amount, uint256 totalRaised);
event ContributionWithdrawn(uint256 indexed agentId, address indexed contributor, uint256 amount);
event AgentBonded(uint256 indexed agentId, address indexed tokenAddress, address indexed lpPairAddress, uint256 liquidityAdded);
event AgentCancelled(uint256 indexed agentId, string reason);
event LiquidityProvided(uint256 indexed agentId, address indexed lpTokenAddress, uint256 tokenAmount, uint256 ethAmount);
```

### AgentToken Events

```solidity
event RevenueDeposited(uint256 amount, address indexed source);
event RevenueClaimed(address indexed user, uint256 amount);
event MetadataUpdated(string newMetadataURI);
event RevenueSourceAuthorized(address indexed source, bool authorized);
```

## 📚 Integration Guide

### Frontend Integration

1. **Connect to Contract**:
   ```javascript
   const launchpad = new ethers.Contract(address, abi, signer);
   ```

2. **Listen for Events**:
   ```javascript
   launchpad.on("AgentCreated", (agentId, creator, tokenAddress, agentName, fundingTarget) => {
       console.log("New agent created:", agentName);
   });
   ```

3. **Query Agent Info**:
   ```javascript
   const agentInfo = await launchpad.getAgentInfo(agentId);
   ```

### Backend Integration

- Monitor events for real-time updates
- Index agent data for search and discovery
- Track funding progress and bonding status
- Integrate with IPFS for metadata storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.memedici.ai](https://docs.memedici.ai)
- **Discord**: [discord.gg/memedici](https://discord.gg/memedici)
- **Twitter**: [@MemediciAI](https://twitter.com/MemediciAI)

---

Built with ❤️ by the Memedici team 