// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentToken.sol";

interface ISimpleAMM {
    function createLiquidityPool(uint256, address, uint256, string calldata) external payable returns (address);
}

contract AgentLaunchpadCoreV2Ultra is Ownable, ReentrancyGuard {
    
    struct Agent {
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
    
    uint256 private _counter;
    mapping(uint256 => Agent) public agents;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    uint256[] public bondedIds;
    uint256[] public inProgressIds;
    mapping(address => uint256) public tokenToAgent;
    
    address public treasury;
    address public amm;
    uint256 public fee = 300;
    uint256 public lpPercent = 8000;
    uint256 public tokenLpPercent = 9000;
    
    event AgentCreated(uint256 indexed id, address indexed creator, address token);
    event Contributed(uint256 indexed id, address indexed contributor, uint256 amount);
    event AgentBonded(uint256 indexed id, address indexed token, address lp);
    
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0));
        treasury = _treasury;
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
    ) external returns (uint256 id) {
        require(fundingTarget > 0 && tokenSupply > 0);
        
        id = _counter++;
        
        AgentToken token = new AgentToken(name, symbol, agentName, archetype, metadataURI, tokenSupply, address(this), agentConfigJSON);
        
        agents[id] = Agent({
            name: name,
            symbol: symbol,
            agentName: agentName,
            fundingTarget: fundingTarget,
            tokenSupply: tokenSupply,
            creator: msg.sender,
            isBonded: false,
            totalRaised: 0,
            tokenAddress: address(token),
            lpPairAddress: address(0),
            agentConfigJSON: agentConfigJSON,
            createdAt: block.timestamp,
            bondedAt: 0
        });
        
        inProgressIds.push(id);
        tokenToAgent[address(token)] = id;
        
        emit AgentCreated(id, msg.sender, address(token));
    }
    
    function contribute(uint256 id) external payable nonReentrant {
        Agent storage agent = agents[id];
        require(agent.creator != address(0));
        require(!agent.isBonded);
        require(msg.value > 0);
        require(agent.totalRaised + msg.value <= agent.fundingTarget);
        
        contributions[id][msg.sender] += msg.value;
        agent.totalRaised += msg.value;
        
        emit Contributed(id, msg.sender, msg.value);
        
        if (agent.totalRaised >= agent.fundingTarget) {
            _bond(id);
        }
    }
    
    function _bond(uint256 id) internal {
        Agent storage agent = agents[id];
        
        uint256 protocolFee = (agent.totalRaised * fee) / 10000;
        uint256 liquidityETH = ((agent.totalRaised - protocolFee) * lpPercent) / 10000;
        uint256 remaining = agent.totalRaised - protocolFee - liquidityETH;
        
        agent.isBonded = true;
        agent.bondedAt = block.timestamp;
        
        _removeInProgress(id);
        bondedIds.push(id);
        
        if (protocolFee > 0) payable(treasury).transfer(protocolFee);
        if (remaining > 0) payable(agent.creator).transfer(remaining);
        
        address lp = address(0);
        if (amm != address(0) && liquidityETH > 0) {
            uint256 tokens = (agent.tokenSupply * tokenLpPercent) / 10000;
            AgentToken(agent.tokenAddress).approve(amm, agent.tokenSupply);
            
            try ISimpleAMM(amm).createLiquidityPool{value: liquidityETH}(id, agent.tokenAddress, tokens, agent.agentConfigJSON) returns (address _lp) {
                lp = _lp;
                agent.lpPairAddress = lp;
            } catch {
                AgentToken(agent.tokenAddress).transfer(treasury, agent.tokenSupply);
            }
        } else {
            AgentToken(agent.tokenAddress).transfer(treasury, agent.tokenSupply);
        }
        
        emit AgentBonded(id, agent.tokenAddress, lp);
    }
    
    function _removeInProgress(uint256 id) internal {
        for (uint256 i = 0; i < inProgressIds.length; i++) {
            if (inProgressIds[i] == id) {
                inProgressIds[i] = inProgressIds[inProgressIds.length - 1];
                inProgressIds.pop();
                break;
            }
        }
    }
    
    // V2 Essential Functions
    function getAllBondedTokens() external view returns (address[] memory tokens, string[] memory names, string[] memory symbols, address[] memory lps, uint256[] memory ids) {
        uint256 len = bondedIds.length;
        tokens = new address[](len);
        names = new string[](len);
        symbols = new string[](len);
        lps = new address[](len);
        ids = new uint256[](len);
        
        for (uint256 i = 0; i < len; i++) {
            uint256 id = bondedIds[i];
            Agent storage agent = agents[id];
            tokens[i] = agent.tokenAddress;
            names[i] = agent.name;
            symbols[i] = agent.symbol;
            lps[i] = agent.lpPairAddress;
            ids[i] = id;
        }
    }
    
    function getAgent(uint256 id) external view returns (string memory name, string memory agentName, uint256 target, uint256 raised, bool bonded, address creator, address token, address lp, string memory config) {
        Agent storage agent = agents[id];
        require(agent.creator != address(0));
        return (agent.name, agent.agentName, agent.fundingTarget, agent.totalRaised, agent.isBonded, agent.creator, agent.tokenAddress, agent.lpPairAddress, agent.agentConfigJSON);
    }
    
    function getAgentByToken(address token) external view returns (uint256) {
        return tokenToAgent[token];
    }
    
    function isBonded(uint256 id) external view returns (bool) {
        return agents[id].isBonded;
    }
    
    function getLp(uint256 id) external view returns (address) {
        return agents[id].lpPairAddress;
    }
    
    // Admin
    function setAmm(address _amm) external onlyOwner {
        amm = _amm;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    function setFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000);
        fee = _fee;
    }
    
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    receive() external payable {}
} 