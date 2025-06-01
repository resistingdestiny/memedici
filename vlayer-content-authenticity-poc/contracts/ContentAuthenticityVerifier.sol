// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ContentAuthenticityProver} from "./ContentAuthenticityProver.sol";
import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ContentAuthenticityVerifier
 * @dev Verifies content authenticity proofs and manages verified content NFTs
 * Only content with valid AI generation proofs can be minted as NFTs
 */
contract ContentAuthenticityVerifier is Verifier, ERC721, Ownable {
    
    // Prover contract address
    address public immutable proverContract;
    
    // Verified content tracking
    mapping(string => bool) public verifiedContent;
    mapping(string => ContentAuthenticityProver.ContentAuthenticityProof) public contentProofs;
    mapping(address => uint256) public userVerifiedCount;
    
    // Stats
    uint256 public totalVerifiedContent;
    uint256 public totalNovitaProofs;
    uint256 public totalOpenAIProofs;
    uint256 public totalGenericProofs;
    
    // Events
    event ContentVerified(
        string indexed contentId,
        address indexed creator,
        string apiEndpoint,
        string prompt,
        uint256 timestamp
    );
    
    event VerifiedContentNFTMinted(
        string indexed contentId,
        address indexed creator,
        uint256 tokenId
    );
    
    event FakeContentDetected(
        address indexed user,
        string contentId,
        string reason
    );
    
    // Errors
    error ContentAlreadyVerified();
    error ContentNotVerified();
    error InvalidProof();
    error UnauthorizedAPI();
    error NFTAlreadyMinted();
    
    constructor(
        address _proverContract,
        address _owner
    ) ERC721("VerifiedAIContent", "VAC") Ownable(_owner) {
        proverContract = _proverContract;
    }
    
    /**
     * @dev Verify Novita AI-generated content authenticity
     * @param proof The vlayer proof from ContentAuthenticityProver
     * @param authProof The content authenticity proof structure
     */
    function verifyNovitaContent(
        Proof calldata proof,
        ContentAuthenticityProver.ContentAuthenticityProof calldata authProof
    ) external onlyVerified(proverContract, ContentAuthenticityProver.proveNovitaGeneration.selector) {
        
        _verifyContentInternal(authProof);
        totalNovitaProofs++;
        
        emit ContentVerified(
            authProof.contentId,
            msg.sender,
            authProof.apiEndpoint,
            authProof.prompt,
            authProof.timestamp
        );
    }
    
    /**
     * @dev Verify OpenAI-generated content authenticity
     * @param proof The vlayer proof from ContentAuthenticityProver
     * @param authProof The content authenticity proof structure
     */
    function verifyOpenAIContent(
        Proof calldata proof,
        ContentAuthenticityProver.ContentAuthenticityProof calldata authProof
    ) external onlyVerified(proverContract, ContentAuthenticityProver.proveOpenAIGeneration.selector) {
        
        _verifyContentInternal(authProof);
        totalOpenAIProofs++;
        
        emit ContentVerified(
            authProof.contentId,
            msg.sender,
            authProof.apiEndpoint,
            authProof.prompt,
            authProof.timestamp
        );
    }
    
    /**
     * @dev Verify generic API-generated content authenticity
     * @param proof The vlayer proof from ContentAuthenticityProver
     * @param authProof The content authenticity proof structure
     */
    function verifyGenericContent(
        Proof calldata proof,
        ContentAuthenticityProver.ContentAuthenticityProof calldata authProof
    ) external onlyVerified(proverContract, ContentAuthenticityProver.proveGenericAPIGeneration.selector) {
        
        _verifyContentInternal(authProof);
        totalGenericProofs++;
        
        emit ContentVerified(
            authProof.contentId,
            msg.sender,
            authProof.apiEndpoint,
            authProof.prompt,
            authProof.timestamp
        );
    }
    
    /**
     * @dev Mint NFT for verified AI-generated content
     * @param contentId The verified content identifier
     */
    function mintVerifiedContentNFT(string calldata contentId) external {
        if (!verifiedContent[contentId]) revert ContentNotVerified();
        
        uint256 tokenId = uint256(keccak256(abi.encodePacked(contentId)));
        
        // Check if NFT already exists
        if (_ownerOf(tokenId) != address(0)) revert NFTAlreadyMinted();
        
        // Mint NFT to the caller (should be content creator)
        _safeMint(msg.sender, tokenId);
        
        emit VerifiedContentNFTMinted(contentId, msg.sender, tokenId);
    }
    
    /**
     * @dev Check if content is verified as AI-generated
     * @param contentId The content identifier to check
     */
    function isContentVerified(string calldata contentId) external view returns (bool) {
        return verifiedContent[contentId];
    }
    
    /**
     * @dev Get content authenticity proof details
     * @param contentId The content identifier
     */
    function getContentProof(string calldata contentId) 
        external 
        view 
        returns (ContentAuthenticityProver.ContentAuthenticityProof memory) 
    {
        return contentProofs[contentId];
    }
    
    /**
     * @dev Get user's verified content statistics
     * @param user The user address
     */
    function getUserStats(address user) external view returns (
        uint256 verifiedCount,
        uint256 nftBalance
    ) {
        return (
            userVerifiedCount[user],
            balanceOf(user)
        );
    }
    
    /**
     * @dev Get global verification statistics
     */
    function getGlobalStats() external view returns (
        uint256 totalVerified,
        uint256 novitaProofs,
        uint256 openaiProofs,
        uint256 genericProofs,
        uint256 totalNFTs
    ) {
        return (
            totalVerifiedContent,
            totalNovitaProofs,
            totalOpenAIProofs,
            totalGenericProofs,
            totalSupply()
        );
    }
    
    /**
     * @dev Report suspected fake content (community moderation)
     * @param contentId The content to report
     * @param reason Reason for reporting
     */
    function reportFakeContent(string calldata contentId, string calldata reason) external {
        // This is a community reporting mechanism
        // In production, this could trigger review processes
        
        emit FakeContentDetected(msg.sender, contentId, reason);
    }
    
    // Internal functions
    function _verifyContentInternal(
        ContentAuthenticityProver.ContentAuthenticityProof calldata authProof
    ) internal {
        
        // Check if already verified
        if (verifiedContent[authProof.contentId]) revert ContentAlreadyVerified();
        
        // Validate proof structure
        if (!authProof.verified) revert InvalidProof();
        if (bytes(authProof.contentId).length == 0) revert InvalidProof();
        if (bytes(authProof.prompt).length == 0) revert InvalidProof();
        
        // Validate timestamp (not too old, not in future)
        if (authProof.timestamp > block.timestamp) revert InvalidProof();
        if (authProof.timestamp < block.timestamp - 7 days) revert InvalidProof();
        
        // Store verification
        verifiedContent[authProof.contentId] = true;
        contentProofs[authProof.contentId] = authProof;
        userVerifiedCount[msg.sender]++;
        totalVerifiedContent++;
    }
    
    /**
     * @dev Get total NFT supply
     */
    function totalSupply() public view returns (uint256) {
        return totalVerifiedContent; // Simplified: assumes all verified content becomes NFTs
    }
    
    /**
     * @dev Override tokenURI to return content-specific metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // In production, this would return IPFS metadata for the verified content
        return string(abi.encodePacked(
            "https://api.memedici.com/verified-content/",
            Strings.toString(tokenId)
        ));
    }
} 