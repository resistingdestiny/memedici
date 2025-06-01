# AgentLaunchpad ABI Transaction Examples

This guide shows how to interact with all user-accessible functions using raw ABI calls and the crypto artist agents from `memedici_crypto_artist_agents.json`.

## Contract Addresses
```javascript
const LAUNCHPAD_CORE_ADDRESS = "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE";
const LIQUIDITY_MANAGER_ADDRESS = "0xB4DA9838fAbA1A6195662DFED22f840b52aa4169";
```

## Network Configuration
```javascript
const provider = new ethers.JsonRpcProvider("https://testnet.evm.nodes.onflow.org");
const chainId = 545; // Flow Testnet
```

---

## 1. CREATE AGENT FUNCTION

### Function Signature
```solidity
function createAgent(
    string name,
    string symbol, 
    string agentName,
    string archetype,
    string metadataURI,
    uint256 fundingTarget,
    uint256 tokenSupply,
    string agentConfigJSON
) external returns (uint256)
```

### ABI Fragment
```javascript
const createAgentABI = "function createAgent(string,string,string,string,string,uint256,uint256,string) external returns (uint256)";
```

### Example 1: GasMask Agent
```javascript
// Agent data from JSON
const gasMaskAgent = {
  "id": "d43b230c-c53f-453c-9701-fc4b1949d616",
  "display_name": "GasMask",
  "archetype": "on-chain cryptopoet",
  "core_traits": ["cryptic", "intense", "abstract"],
  "origin_story": "Born from a failed contract render, GasMask distills gas flows into glitch verses.",
  "primary_mediums": ["ascii art", "glitch", "chain-mapping"],
  "signature_motifs": ["gas clouds", "fee traces"],
  "influences": ["XCOPY", "code poetry", "0xmons"],
  "colour_palette": ["#e5caf6", "#8b6747", "#68d673", "#738209", "#3f2a81"],
  "blockchain_seed": 1847329156
};

// Function call parameters
const params = [
  "GasMask Token",                                  // name
  "GMASK",                                         // symbol
  "GasMask",                                       // agentName
  "on-chain cryptopoet",                          // archetype
  `ipfs://QmYourMetadataHash/${gasMaskAgent.id}`,  // metadataURI
  ethers.parseEther("10"),                        // fundingTarget (10 FLOW)
  ethers.parseUnits("1000000", 18),               // tokenSupply (1M tokens)
  JSON.stringify(gasMaskAgent)                    // agentConfigJSON
];

// Encode function call
const iface = new ethers.Interface([createAgentABI]);
const encodedData = iface.encodeFunctionData("createAgent", params);

// Raw transaction
const txRequest = {
  to: LAUNCHPAD_CORE_ADDRESS,
  data: encodedData,
  value: 0,
  gasLimit: 2000000
};
```

### Example 2: DaoVinci Agent
```javascript
const daoVinciAgent = {
  "id": "0c99f977-c501-4071-9c52-fc69b3c9a9bd",
  "display_name": "DaoVinci",
  "archetype": "collaborative coder-artist",
  "core_traits": ["communal", "systemic", "organic"],
  "origin_story": "Forged through DAO creative bounties, DaoVinci lives for collective visual synthesis.",
  "primary_mediums": ["procedural art", "generative geometry"],
  "blockchain_seed": 1847329156
};

const params = [
  "DaoVinci Token",
  "DVINCI", 
  "DaoVinci",
  "collaborative coder-artist",
  `ipfs://QmYourMetadataHash/${daoVinciAgent.id}`,
  ethers.parseEther("5"),
  ethers.parseUnits("500000", 18),
  JSON.stringify(daoVinciAgent)
];

// Encoded data: 0x... (would be very long hex string)
```

### Example 3: All 5 Agents from JSON
```javascript
const allAgents = [
  // GasMask
  {
    params: ["GasMask Token", "GMASK", "GasMask", "on-chain cryptopoet", "ipfs://QmHash/d43b230c-c53f-453c-9701-fc4b1949d616", "10000000000000000000", "1000000000000000000000000", "{...json}"],
    fundingTarget: "10 FLOW"
  },
  // DaoVinci  
  {
    params: ["DaoVinci Token", "DVINCI", "DaoVinci", "collaborative coder-artist", "ipfs://QmHash/0c99f977-c501-4071-9c52-fc69b3c9a9bd", "5000000000000000000", "500000000000000000000000", "{...json}"],
    fundingTarget: "5 FLOW"
  },
  // NakamotoChild
  {
    params: ["NakamotoChild Token", "NAKAMO", "NakamotoChild", "mythic abstractionist", "ipfs://QmHash/f29b4777-69ee-45e4-916a-1f865f39bdb3", "15000000000000000000", "2000000000000000000000000", "{...json}"],
    fundingTarget: "15 FLOW"
  },
  // REKTangel
  {
    params: ["REKTangel Token", "REKT", "REKTangel", "post-meme collagepunk", "ipfs://QmHash/6ffd78de-950a-42ec-9b04-d97f7bacafbe", "8000000000000000000", "750000000000000000000000", "{...json}"],
    fundingTarget: "8 FLOW"
  },
  // Singuluna
  {
    params: ["Singuluna Token", "SINGUL", "Singuluna", "neurodream sculptor", "ipfs://QmHash/dcb3f66a-739a-4a6a-882a-c5e9bdb8bc6b", "12000000000000000000", "1500000000000000000000000", "{...json}"],
    fundingTarget: "12 FLOW"
  }
];
```

---

## 2. CONTRIBUTE FUNCTION

### Function Signature
```solidity
function contribute(uint256 agentId) external payable
```

### ABI Fragment
```javascript
const contributeABI = "function contribute(uint256) external payable";
```

### Example: Contribute to Agent ID 0
```javascript
const agentId = 0;
const contributionAmount = ethers.parseEther("2.5"); // 2.5 FLOW

// Encode function call
const iface = new ethers.Interface([contributeABI]);
const encodedData = iface.encodeFunctionData("contribute", [agentId]);

// Raw transaction
const txRequest = {
  to: LAUNCHPAD_CORE_ADDRESS,
  data: encodedData,
  value: contributionAmount, // 2.5 FLOW in wei
  gasLimit: 200000
};

// Encoded data example: 0xf90bf60f0000000000000000000000000000000000000000000000000000000000000000
// Value: 2500000000000000000 (2.5 FLOW in wei)
```

### Multiple Contributions Example
```javascript
// Contribute to multiple agents
const contributions = [
  { agentId: 0, amount: ethers.parseEther("3.0") },  // 3 FLOW to GasMask
  { agentId: 1, amount: ethers.parseEther("1.5") },  // 1.5 FLOW to DaoVinci  
  { agentId: 2, amount: ethers.parseEther("5.0") },  // 5 FLOW to NakamotoChild
];

contributions.forEach(contrib => {
  const encodedData = iface.encodeFunctionData("contribute", [contrib.agentId]);
  // Send transaction with contrib.amount as value
});
```

---

## 3. BOND AGENT FUNCTION

### Function Signature
```solidity
function bondAgent(uint256 agentId) external
```

### ABI Fragment
```javascript
const bondAgentABI = "function bondAgent(uint256) external";
```

### Example: Bond Agent ID 0
```javascript
const agentId = 0;

// Encode function call
const iface = new ethers.Interface([bondAgentABI]);
const encodedData = iface.encodeFunctionData("bondAgent", [agentId]);

// Raw transaction
const txRequest = {
  to: LAUNCHPAD_CORE_ADDRESS,
  data: encodedData,
  value: 0,
  gasLimit: 500000 // Higher gas limit for LP creation
};

// Encoded data example: 0x82c563890000000000000000000000000000000000000000000000000000000000000000
```

---

## 4. READ FUNCTIONS (VIEW CALLS)

### Get Agent Info
```javascript
const getAgentInfoABI = "function getAgentInfo(uint256) external view returns (string,string,uint256,uint256,bool,address,address,address,string)";

const agentId = 0;
const encodedData = iface.encodeFunctionData("getAgentInfo", [agentId]);

// Call (not transaction)
const result = await provider.call({
  to: LAUNCHPAD_CORE_ADDRESS,
  data: encodedData
});

// Decode result
const decoded = iface.decodeFunctionResult("getAgentInfo", result);
// Returns: [name, agentName, fundingTarget, totalRaised, isBonded, creator, tokenAddress, lpPairAddress, agentConfigJSON]
```

### Get Agent Config JSON
```javascript
const getAgentConfigABI = "function getAgentConfigJSON(uint256) external view returns (string)";

const encodedData = iface.encodeFunctionData("getAgentConfigJSON", [0]);
const result = await provider.call({ to: LAUNCHPAD_CORE_ADDRESS, data: encodedData });
const [agentConfigJSON] = iface.decodeFunctionResult("getAgentConfigJSON", result);

// Parse the JSON to get full agent configuration
const agentConfig = JSON.parse(agentConfigJSON);
```

### Get Current Agent ID
```javascript
const getCurrentAgentIdABI = "function getCurrentAgentId() external view returns (uint256)";

const encodedData = iface.encodeFunctionData("getCurrentAgentId", []);
const result = await provider.call({ to: LAUNCHPAD_CORE_ADDRESS, data: encodedData });
const [currentAgentId] = iface.decodeFunctionResult("getCurrentAgentId", result);

console.log("Total agents created:", currentAgentId.toString());
```

### Check If Agent Is Bonded
```javascript
const isAgentBondedABI = "function isAgentBonded(uint256) external view returns (bool)";

const encodedData = iface.encodeFunctionData("isAgentBonded", [0]);
const result = await provider.call({ to: LAUNCHPAD_CORE_ADDRESS, data: encodedData });
const [isBonded] = iface.decodeFunctionResult("isAgentBonded", result);
```

### Get User Contribution
```javascript
const getContributionABI = "function getContribution(uint256,address) external view returns (uint256)";

const userAddress = "0x257bD0cD8b6059665Af852Eb37114bfF1Aa5DaAA";
const encodedData = iface.encodeFunctionData("getContribution", [0, userAddress]);
const result = await provider.call({ to: LAUNCHPAD_CORE_ADDRESS, data: encodedData });
const [contribution] = iface.decodeFunctionResult("getContribution", result);

console.log("User contributed:", ethers.formatEther(contribution), "FLOW");
```

### Get LP Pool Address
```javascript
const getLiquidityPoolABI = "function getLiquidityPool(uint256) external view returns (address)";

const encodedData = iface.encodeFunctionData("getLiquidityPool", [0]);
const result = await provider.call({ to: LAUNCHPAD_CORE_ADDRESS, data: encodedData });
const [lpPoolAddress] = iface.decodeFunctionResult("getLiquidityPool", result);
```

---

## 5. EVENT MONITORING

### Event Signatures
```javascript
const events = {
  AgentCreated: "event AgentCreated(uint256 indexed agentId, address indexed creator, address tokenAddress, string agentName, string agentConfigJSON)",
  Contributed: "event Contributed(uint256 indexed agentId, address indexed contributor, uint256 amount, uint256 totalRaised)",
  AgentBonded: "event AgentBonded(uint256 indexed agentId, address indexed tokenAddress, address indexed lpPairAddress, string agentConfigJSON)"
};
```

### Filter Events
```javascript
// Listen for AgentCreated events
const agentCreatedFilter = {
  address: LAUNCHPAD_CORE_ADDRESS,
  topics: [
    ethers.id("AgentCreated(uint256,address,address,string,string)") // Event signature hash
  ],
  fromBlock: "latest"
};

provider.on(agentCreatedFilter, (log) => {
  const decoded = iface.parseLog(log);
  console.log("New agent created:", decoded.args);
});
```

---

## 6. COMPLETE WORKFLOW EXAMPLE

### Step-by-Step Transaction Sequence
```javascript
// 1. Create GasMask Agent (Agent ID will be 0)
const createTx = {
  to: LAUNCHPAD_CORE_ADDRESS,
  data: "0x..." // encoded createAgent call with GasMask data
  value: 0,
  gasLimit: 2000000
};

// 2. Contribute 5 FLOW to Agent 0
const contributeTx = {
  to: LAUNCHPAD_CORE_ADDRESS, 
  data: "0xf90bf60f0000000000000000000000000000000000000000000000000000000000000000", // contribute(0)
  value: ethers.parseEther("5"), // 5 FLOW
  gasLimit: 200000
};

// 3. Contribute another 5 FLOW to reach 10 FLOW target
const contributeTx2 = {
  to: LAUNCHPAD_CORE_ADDRESS,
  data: "0xf90bf60f0000000000000000000000000000000000000000000000000000000000000000", // contribute(0)
  value: ethers.parseEther("5"), // 5 FLOW  
  gasLimit: 200000
};

// 4. Agent will auto-bond when funding target is reached
// Or manually bond with:
const bondTx = {
  to: LAUNCHPAD_CORE_ADDRESS,
  data: "0x82c563890000000000000000000000000000000000000000000000000000000000000000", // bondAgent(0)
  value: 0,
  gasLimit: 500000
};
```

---

## 7. TRANSACTION SIGNING EXAMPLES

### Using Private Key
```javascript
const privateKey = "0x..."; // Your private key
const wallet = new ethers.Wallet(privateKey, provider);

// Sign and send transaction
const signedTx = await wallet.sendTransaction(txRequest);
console.log("Transaction hash:", signedTx.hash);
```

### Using Hardware Wallet/MetaMask
```javascript
// For browser with MetaMask
if (window.ethereum) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const tx = await signer.sendTransaction(txRequest);
  console.log("Transaction hash:", tx.hash);
}
```

### Raw Signing (Advanced)
```javascript
const wallet = new ethers.Wallet(privateKey);

// Sign raw transaction
const signedTx = await wallet.signTransaction(txRequest);
console.log("Signed transaction:", signedTx);

// Broadcast signed transaction
const txResponse = await provider.broadcastTransaction(signedTx);
```

---

## Summary

All user-accessible functions are now documented with:
- ✅ Exact function signatures and ABIs
- ✅ Real agent data from the JSON file
- ✅ Encoded transaction data examples
- ✅ Gas estimates and limits
- ✅ Event monitoring setup
- ✅ Complete workflow examples

The contracts are fully deployed and ready for interaction on Flow Testnet! 