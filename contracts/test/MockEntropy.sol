// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockEntropy
 * @dev Mock Entropy contract for testing purposes
 */
contract MockEntropy {
    uint64 private _sequenceNumber;
    address public defaultProvider = address(0x1234567890123456789012345678901234567890);
    
    mapping(uint64 => address) public sequenceToCallback;
    mapping(uint64 => bytes32) public sequenceToUserRandom;
    
    event RandomnessRequested(uint64 sequenceNumber, address callback);
    
    function getFee(address) external pure returns (uint256) {
        return 0.001 ether; // Mock fee
    }
    
    function getDefaultProvider() external view returns (address) {
        return defaultProvider;
    }
    
    function requestWithCallback(
        address provider,
        bytes32 userRandomNumber
    ) external payable returns (uint64) {
        require(provider == defaultProvider, "Invalid provider");
        require(msg.value >= 0.001 ether, "Insufficient fee");
        
        uint64 sequenceNumber = ++_sequenceNumber;
        sequenceToCallback[sequenceNumber] = msg.sender;
        sequenceToUserRandom[sequenceNumber] = userRandomNumber;
        
        emit RandomnessRequested(sequenceNumber, msg.sender);
        
        // In a real implementation, this would be called by a keeper bot
        // For testing, we'll call it immediately with a mock random number
        _fulfillRandomness(sequenceNumber);
        
        return sequenceNumber;
    }
    
    function _fulfillRandomness(uint64 sequenceNumber) internal {
        address callback = sequenceToCallback[sequenceNumber];
        bytes32 userRandom = sequenceToUserRandom[sequenceNumber];
        
        // Generate a mock random number
        bytes32 providerRandom = keccak256(abi.encode(sequenceNumber, block.timestamp, userRandom));
        
        // Call the callback function
        (bool success, ) = callback.call(
            abi.encodeWithSignature(
                "_entropyCallback(uint64,address,bytes32)",
                sequenceNumber,
                defaultProvider,
                providerRandom
            )
        );
        
        require(success, "Callback failed");
        
        // Clean up
        delete sequenceToCallback[sequenceNumber];
        delete sequenceToUserRandom[sequenceNumber];
    }
    
    // Manual fulfillment function for testing
    function fulfillRandomness(uint64 sequenceNumber, bytes32 randomNumber) external {
        address callback = sequenceToCallback[sequenceNumber];
        require(callback != address(0), "Invalid sequence number");
        
        (bool success, ) = callback.call(
            abi.encodeWithSignature(
                "_entropyCallback(uint64,address,bytes32)",
                sequenceNumber,
                defaultProvider,
                randomNumber
            )
        );
        
        require(success, "Callback failed");
        
        // Clean up
        delete sequenceToCallback[sequenceNumber];
        delete sequenceToUserRandom[sequenceNumber];
    }
} 