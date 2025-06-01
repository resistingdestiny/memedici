// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentToken.sol";

interface ISimpleAMM {
    function createLiquidityPool(uint256 agentId, address tokenAddress, uint256 tokenAmount, string calldata agentConfigJSON) external payable returns (address lpPair);
}

contract AgentLaunchpadCoreV2Optimized is Ownable, ReentrancyGuard {
    
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
        uint256 createdAt;
        uint256 bondedAt;
    }
    
    uint256 private _agentIdCounter;
    mapping(uint256 => AgentConfig) public agents;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    // V2 tracking arrays
    uint256[] public bondedAgentIds;
    uint256[] public inProgressAgentIds;
    
    // V2 address mappings
    mapping(address => uint256) public tokenToAgentId;
    
    address public treasuryAddress;
    address public liquidityManager;
    uint256 public protocolFeePercentage = 300;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public defaultLiquidityPercentage = 8000;
    uint256 public defaultTokenLPPercentage = 9000;
    
    event AgentCreated(uint256 indexed agentId, address indexed creator, address tokenAddress);
    event Contributed(uint256 indexed agentId, address indexed contributor, uint256 amount);
    event AgentBonded(uint256 indexed agentId, address indexed tokenAddress, address lpPairAddress);
    
    constructor(address _treasuryAddress) Ownable(msg.sender) {
        require(_treasuryAddress != address(0), "Invalid treasury");
        treasuryAddress = _treasuryAddress;
    }
    
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
        require(fundingTarget > 0 && tokenSupply > 0, "Invalid params");
        
        agentId = _agentIdCounter++;
        
        AgentToken agentToken = new AgentToken(name, symbol, agentName, archetype, metadataURI, tokenSupply, address(this), agentConfigJSON);
        
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
            agentConfigJSON: agentConfigJSON,
            createdAt: block.timestamp,
            bondedAt: 0
        });
        
        inProgressAgentIds.push(agentId);
        tokenToAgentId[address(agentToken)] = agentId;
        
        emit AgentCreated(agentId, msg.sender, address(agentToken));
    }
    
    function contribute(uint256 agentId) external payable nonReentrant {
        AgentConfig storage agent = agents[agentId];
        require(agent.creator != address(0), "Not found");
        require(!agent.isBonded, "Bonded");
        require(msg.value > 0, "No value");
        require(agent.totalRaised + msg.value <= agent.fundingTarget, "Exceeds");
        
        contributions[agentId][msg.sender] += msg.value;
        agent.totalRaised += msg.value;
        
        emit Contributed(agentId, msg.sender, msg.value);
        
        if (agent.totalRaised >= agent.fundingTarget) {
            _bondAgent(agentId);
        }
    }
    
    function _bondAgent(uint256 agentId) internal {
        AgentConfig storage agent = agents[agentId];
        
        uint256 protocolFee = (agent.totalRaised * protocolFeePercentage) / BASIS_POINTS;
        uint256 liquidityETH = ((agent.totalRaised - protocolFee) * defaultLiquidityPercentage) / BASIS_POINTS;
        uint256 remainingETH = agent.totalRaised - protocolFee - liquidityETH;
        
        agent.isBonded = true;
        agent.bondedAt = block.timestamp;
        
        _removeFromInProgress(agentId);
        bondedAgentIds.push(agentId);
        
        if (protocolFee > 0) {
            payable(treasuryAddress).transfer(protocolFee);
        }
        
        if (remainingETH > 0) {
            payable(agent.creator).transfer(remainingETH);
        }
        
        address lpPair = address(0);
        if (liquidityManager != address(0) && liquidityETH > 0) {
            uint256 liquidityTokens = (agent.tokenSupply * defaultTokenLPPercentage) / BASIS_POINTS;
            
            AgentToken agentToken = AgentToken(agent.tokenAddress);
            agentToken.approve(liquidityManager, agent.tokenSupply);
            
            try ISimpleAMM(liquidityManager).createLiquidityPool{value: liquidityETH}(agentId, agent.tokenAddress, liquidityTokens, agent.agentConfigJSON) returns (address _lpPair) {
                lpPair = _lpPair;
                agent.lpPairAddress = lpPair;
            } catch {
                agentToken.transfer(treasuryAddress, agent.tokenSupply);
            }
        } else {
            AgentToken(agent.tokenAddress).transfer(treasuryAddress, agent.tokenSupply);
        }
        
        emit AgentBonded(agentId, agent.tokenAddress, lpPair);
    }
    
    function _removeFromInProgress(uint256 agentId) internal {
        for (uint256 i = 0; i < inProgressAgentIds.length; i++) {
            if (inProgressAgentIds[i] == agentId) {
                inProgressAgentIds[i] = inProgressAgentIds[inProgressAgentIds.length - 1];
                inProgressAgentIds.pop();
                break;
            }
        }
    }
    
    // Essential V2 view functions
    function getAllBondedTokens() external view returns (address[] memory tokenAddresses, string[] memory names, string[] memory symbols, address[] memory lpPairs, uint256[] memory agentIds) {
        uint256 bondedCount = bondedAgentIds.length;
        tokenAddresses = new address[](bondedCount);
        names = new string[](bondedCount);
        symbols = new string[](bondedCount);
        lpPairs = new address[](bondedCount);
        agentIds = new uint256[](bondedCount);
        
        for (uint256 i = 0; i < bondedCount; i++) {
            uint256 agentId = bondedAgentIds[i];
            AgentConfig storage agent = agents[agentId];
            tokenAddresses[i] = agent.tokenAddress;
            names[i] = agent.name;
            symbols[i] = agent.symbol;
            lpPairs[i] = agent.lpPairAddress;
            agentIds[i] = agentId;
        }
    }
    
    function getInProgressAgents() external view returns (uint256[] memory agentIds, string[] memory agentNames, uint256[] memory fundingTargets, uint256[] memory totalRaised, uint256[] memory fundingProgress, address[] memory tokenAddresses) {
        uint256 inProgressCount = inProgressAgentIds.length;
        agentIds = new uint256[](inProgressCount);
        agentNames = new string[](inProgressCount);
        fundingTargets = new uint256[](inProgressCount);
        totalRaised = new uint256[](inProgressCount);
        fundingProgress = new uint256[](inProgressCount);
        tokenAddresses = new address[](inProgressCount);
        
        for (uint256 i = 0; i < inProgressCount; i++) {
            uint256 agentId = inProgressAgentIds[i];
            AgentConfig storage agent = agents[agentId];
            agentIds[i] = agentId;
            agentNames[i] = agent.agentName;
            fundingTargets[i] = agent.fundingTarget;
            totalRaised[i] = agent.totalRaised;
            fundingProgress[i] = agent.fundingTarget > 0 ? (agent.totalRaised * 10000) / agent.fundingTarget : 0;
            tokenAddresses[i] = agent.tokenAddress;
        }
    }
    
    function getAgentByTokenAddress(address tokenAddress) external view returns (uint256) {
        return tokenToAgentId[tokenAddress];
    }
    
    function getTotalCounts() external view returns (uint256 totalAgents, uint256 bondedAgents, uint256 inProgressAgents) {
        totalAgents = _agentIdCounter;
        bondedAgents = bondedAgentIds.length;
        inProgressAgents = inProgressAgentIds.length;
    }
    
    function getAgentInfo(uint256 agentId) external view returns (string memory name, string memory agentName, uint256 fundingTarget, uint256 totalRaised, bool isBonded, address creator, address tokenAddress, address lpPairAddress, string memory agentConfigJSON) {
        AgentConfig storage agent = agents[agentId];
        require(agent.creator != address(0), "Not found");
        return (agent.name, agent.agentName, agent.fundingTarget, agent.totalRaised, agent.isBonded, agent.creator, agent.tokenAddress, agent.lpPairAddress, agent.agentConfigJSON);
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
    
    // Admin functions
    function setLiquidityManager(address _liquidityManager) external onlyOwner {
        liquidityManager = _liquidityManager;
    }
    
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        require(_treasuryAddress != address(0), "Invalid");
        treasuryAddress = _treasuryAddress;
    }
    
    function setProtocolFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 1000, "Too high");
        protocolFeePercentage = _feePercentage;
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    receive() external payable {}
} 