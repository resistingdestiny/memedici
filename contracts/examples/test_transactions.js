const { ethers } = require("ethers");

// Contract addresses
const LAUNCHPAD_CORE_ADDRESS = "0xac4C3BAa3065Ac69394976F3a19d3d31A94f9bDE";

// Crypto artist agents from JSON
const agents = [
  {
    "id": "d43b230c-c53f-453c-9701-fc4b1949d616",
    "display_name": "GasMask",
    "avatar_url": "static/examples/GasMask.png",
    "archetype": "on-chain cryptopoet",
    "core_traits": ["cryptic", "intense", "abstract"],
    "origin_story": "Born from a failed contract render, GasMask distills gas flows into glitch verses.",
    "primary_mediums": ["ascii art", "glitch", "chain-mapping"],
    "signature_motifs": ["gas clouds", "fee traces"],
    "influences": ["XCOPY", "code poetry", "0xmons"],
    "colour_palette": ["#e5caf6", "#8b6747", "#68d673", "#738209", "#3f2a81"],
    "blockchain_seed": 1847329156
  },
  {
    "id": "0c99f977-c501-4071-9c52-fc69b3c9a9bd",
    "display_name": "DaoVinci",
    "avatar_url": "static/examples/DaoVinci.png",
    "archetype": "collaborative coder-artist",
    "core_traits": ["communal", "systemic", "organic"],
    "origin_story": "Forged through DAO creative bounties, DaoVinci lives for collective visual synthesis.",
    "primary_mediums": ["procedural art", "generative geometry"],
    "signature_motifs": ["proposal ballots", "fractal voting spirals"],
    "influences": ["Sol LeWitt", "Generative Constraints"],
    "colour_palette": ["#04f65c", "#1b1402", "#98aa8f", "#6d8327", "#1b4b30"],
    "blockchain_seed": 1847329156
  },
  {
    "id": "f29b4777-69ee-45e4-916a-1f865f39bdb3",
    "display_name": "NakamotoChild",
    "avatar_url": "static/examples/NakamotoChild.png",
    "archetype": "mythic abstractionist",
    "core_traits": ["mythic", "spiritual", "aesthetic"],
    "origin_story": "Raised on ancient forum dumps, she paints the gods of decentralization.",
    "primary_mediums": ["ink", "monochrome sketching", "ritual animation"],
    "signature_motifs": ["halving moons", "primal hashes"],
    "influences": ["Basquiat", "Tantra scrolls", "Satoshi Lore"],
    "colour_palette": ["#02f109", "#79e9bf", "#8a33bb", "#f07e08", "#4e1c93"],
    "blockchain_seed": 1847329156
  }
];

// ABI fragments
const LaunchpadABI = [
  "function createAgent(string name, string symbol, string agentName, string archetype, string metadataURI, uint256 fundingTarget, uint256 tokenSupply, string agentConfigJSON) external returns (uint256)",
  "function contribute(uint256 agentId) external payable",
  "function bondAgent(uint256 agentId) external",
  "function getAgentInfo(uint256 agentId) external view returns (string, string, uint256, uint256, bool, address, address, address, string)"
];

function generateCreateAgentTransactions() {
  console.log("🎨 Generating CREATE AGENT transactions for crypto artists...\n");
  
  const iface = new ethers.Interface(LaunchpadABI);
  
  agents.forEach((agent, index) => {
    console.log(`--- ${agent.display_name} (Agent ${index}) ---`);
    
    // Agent parameters
    const tokenName = `${agent.display_name} Token`;
    const symbol = agent.display_name.toUpperCase().slice(0, 6);
    const fundingTarget = ethers.parseEther((5 + index * 5).toString()); // 5, 10, 15 FLOW
    const tokenSupply = ethers.parseUnits("1000000", 18); // 1M tokens
    const metadataURI = `ipfs://QmExampleHash/${agent.id}`;
    
    const params = [
      tokenName,
      symbol,
      agent.display_name,
      agent.archetype,
      metadataURI,
      fundingTarget,
      tokenSupply,
      JSON.stringify(agent, null, 2)
    ];
    
    // Encode transaction data
    const encodedData = iface.encodeFunctionData("createAgent", params);
    
    console.log("📋 Parameters:");
    console.log(`  Token Name: ${tokenName}`);
    console.log(`  Symbol: ${symbol}`);
    console.log(`  Agent Name: ${agent.display_name}`);
    console.log(`  Archetype: ${agent.archetype}`);
    console.log(`  Funding Target: ${ethers.formatEther(fundingTarget)} FLOW`);
    console.log(`  Token Supply: ${ethers.formatUnits(tokenSupply, 18)} tokens`);
    
    console.log("\n📄 Transaction Data:");
    console.log(`  To: ${LAUNCHPAD_CORE_ADDRESS}`);
    console.log(`  Data: ${encodedData.slice(0, 50)}...`);
    console.log(`  Data Length: ${encodedData.length} characters`);
    console.log(`  Value: 0 (no ETH sent)`);
    console.log(`  Gas Limit: 2000000 (estimated)`);
    
    const txRequest = {
      to: LAUNCHPAD_CORE_ADDRESS,
      data: encodedData,
      value: 0,
      gasLimit: 2000000
    };
    
    console.log(`\n🔧 Raw Transaction Object:`);
    console.log(JSON.stringify(txRequest, null, 2));
    console.log("\n" + "=".repeat(80) + "\n");
  });
}

function generateContributeTransactions() {
  console.log("💰 Generating CONTRIBUTE transactions...\n");
  
  const iface = new ethers.Interface(LaunchpadABI);
  
  const contributions = [
    { agentId: 0, amount: "2.5", description: "2.5 FLOW to GasMask" },
    { agentId: 0, amount: "2.5", description: "Another 2.5 FLOW to GasMask (reaches 5 FLOW target)" },
    { agentId: 1, amount: "5.0", description: "5 FLOW to DaoVinci" },
    { agentId: 1, amount: "5.0", description: "Another 5 FLOW to DaoVinci (reaches 10 FLOW target)" },
    { agentId: 2, amount: "7.5", description: "7.5 FLOW to NakamotoChild" },
    { agentId: 2, amount: "7.5", description: "Another 7.5 FLOW to NakamotoChild (reaches 15 FLOW target)" }
  ];
  
  contributions.forEach((contrib, index) => {
    console.log(`--- Contribution ${index + 1}: ${contrib.description} ---`);
    
    const contributionAmount = ethers.parseEther(contrib.amount);
    const encodedData = iface.encodeFunctionData("contribute", [contrib.agentId]);
    
    console.log("📋 Parameters:");
    console.log(`  Agent ID: ${contrib.agentId}`);
    console.log(`  Amount: ${contrib.amount} FLOW`);
    console.log(`  Amount (wei): ${contributionAmount.toString()}`);
    
    console.log("\n📄 Transaction Data:");
    console.log(`  To: ${LAUNCHPAD_CORE_ADDRESS}`);
    console.log(`  Data: ${encodedData}`);
    console.log(`  Value: ${contributionAmount.toString()} wei`);
    console.log(`  Gas Limit: 200000 (estimated)`);
    
    const txRequest = {
      to: LAUNCHPAD_CORE_ADDRESS,
      data: encodedData,
      value: contributionAmount.toString(),
      gasLimit: 200000
    };
    
    console.log(`\n🔧 Raw Transaction Object:`);
    console.log(JSON.stringify(txRequest, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");
  });
}

function generateBondTransactions() {
  console.log("🔗 Generating BOND AGENT transactions...\n");
  
  const iface = new ethers.Interface(LaunchpadABI);
  
  const bonds = [
    { agentId: 0, name: "GasMask" },
    { agentId: 1, name: "DaoVinci" },
    { agentId: 2, name: "NakamotoChild" }
  ];
  
  bonds.forEach((bond, index) => {
    console.log(`--- Bond Agent ${bond.agentId}: ${bond.name} ---`);
    
    const encodedData = iface.encodeFunctionData("bondAgent", [bond.agentId]);
    
    console.log("📋 Parameters:");
    console.log(`  Agent ID: ${bond.agentId}`);
    console.log(`  Agent Name: ${bond.name}`);
    
    console.log("\n📄 Transaction Data:");
    console.log(`  To: ${LAUNCHPAD_CORE_ADDRESS}`);
    console.log(`  Data: ${encodedData}`);
    console.log(`  Value: 0 (no ETH sent)`);
    console.log(`  Gas Limit: 500000 (estimated for LP creation)`);
    
    const txRequest = {
      to: LAUNCHPAD_CORE_ADDRESS,
      data: encodedData,
      value: 0,
      gasLimit: 500000
    };
    
    console.log(`\n🔧 Raw Transaction Object:`);
    console.log(JSON.stringify(txRequest, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");
  });
}

function generateReadTransactions() {
  console.log("📖 Generating READ (VIEW) transactions...\n");
  
  const iface = new ethers.Interface(LaunchpadABI);
  
  const reads = [
    { agentId: 0, name: "GasMask" },
    { agentId: 1, name: "DaoVinci" },
    { agentId: 2, name: "NakamotoChild" }
  ];
  
  reads.forEach((read, index) => {
    console.log(`--- Get Agent Info: ${read.name} ---`);
    
    const encodedData = iface.encodeFunctionData("getAgentInfo", [read.agentId]);
    
    console.log("📋 Parameters:");
    console.log(`  Agent ID: ${read.agentId}`);
    console.log(`  Agent Name: ${read.name}`);
    
    console.log("\n📄 Call Data:");
    console.log(`  To: ${LAUNCHPAD_CORE_ADDRESS}`);
    console.log(`  Data: ${encodedData}`);
    console.log(`  Method: eth_call (read-only)`);
    
    const callRequest = {
      to: LAUNCHPAD_CORE_ADDRESS,
      data: encodedData
    };
    
    console.log(`\n🔧 Call Object:`);
    console.log(JSON.stringify(callRequest, null, 2));
    
    console.log(`\n📤 Expected Return (decoded):`);
    console.log(`  [0] name: "${read.name} Token"`);
    console.log(`  [1] agentName: "${read.name}"`);
    console.log(`  [2] fundingTarget: uint256 (funding target in wei)`);
    console.log(`  [3] totalRaised: uint256 (total raised in wei)`);
    console.log(`  [4] isBonded: bool`);
    console.log(`  [5] creator: address`);
    console.log(`  [6] tokenAddress: address`);
    console.log(`  [7] lpPairAddress: address`);
    console.log(`  [8] agentConfigJSON: string (full JSON config)`);
    
    console.log("\n" + "=".repeat(60) + "\n");
  });
}

function generateEventFilters() {
  console.log("🎧 Generating EVENT FILTER examples...\n");
  
  const events = [
    {
      name: "AgentCreated",
      signature: "AgentCreated(uint256,address,address,string,string)",
      topics: [ethers.id("AgentCreated(uint256,address,address,string,string)")]
    },
    {
      name: "Contributed", 
      signature: "Contributed(uint256,address,uint256,uint256)",
      topics: [ethers.id("Contributed(uint256,address,uint256,uint256)")]
    },
    {
      name: "AgentBonded",
      signature: "AgentBonded(uint256,address,address,string)", 
      topics: [ethers.id("AgentBonded(uint256,address,address,string)")]
    }
  ];
  
  events.forEach(event => {
    console.log(`--- ${event.name} Event Filter ---`);
    
    const filter = {
      address: LAUNCHPAD_CORE_ADDRESS,
      topics: event.topics,
      fromBlock: "latest"
    };
    
    console.log("📋 Event Details:");
    console.log(`  Event Name: ${event.name}`);
    console.log(`  Signature: ${event.signature}`);
    console.log(`  Topic Hash: ${event.topics[0]}`);
    
    console.log("\n📄 Filter Object:");
    console.log(JSON.stringify(filter, null, 2));
    
    console.log(`\n📤 Usage Example:`);
    console.log(`provider.on(filter, (log) => {`);
    console.log(`  const iface = new ethers.Interface([...]);`);
    console.log(`  const decoded = iface.parseLog(log);`);
    console.log(`  console.log("${event.name}:", decoded.args);`);
    console.log(`});`);
    
    console.log("\n" + "=".repeat(60) + "\n");
  });
}

// Main execution
console.log("🚀 AgentLaunchpad Transaction Generator");
console.log("=====================================\n");

console.log("Using contract address:", LAUNCHPAD_CORE_ADDRESS);
console.log("Network: Flow Testnet (Chain ID: 545)");
console.log("RPC URL: https://testnet.evm.nodes.onflow.org\n");

// Generate all transaction types
generateCreateAgentTransactions();
generateContributeTransactions();
generateBondTransactions();
generateReadTransactions();
generateEventFilters();

console.log("✅ All transaction examples generated!");
console.log("\n📋 Usage Instructions:");
console.log("1. Copy the transaction objects");
console.log("2. Sign with your private key using ethers.js");
console.log("3. Broadcast to Flow Testnet");
console.log("4. Monitor events for confirmations");
console.log("\nExample signing:");
console.log("const wallet = new ethers.Wallet(privateKey, provider);");
console.log("const tx = await wallet.sendTransaction(txRequest);");
console.log("console.log('TX Hash:', tx.hash);"); 