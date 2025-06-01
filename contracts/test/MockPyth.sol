// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title MockPyth
 * @dev Mock Pyth contract for testing purposes
 */
contract MockPyth {
    mapping(bytes32 => PriceData) private prices;
    
    struct PriceData {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }
    
    function setPrice(bytes32 id, int64 price, int32 expo, uint256 publishTime) external {
        prices[id] = PriceData(price, 0, expo, publishTime);
    }
    
    function getPriceNoOlderThan(bytes32 id, uint256) external view returns (PythStructs.Price memory) {
        PriceData memory data = prices[id];
        return PythStructs.Price(data.price, data.conf, data.expo, data.publishTime);
    }
    
    function getPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory) {
        PriceData memory data = prices[id];
        return PythStructs.Price(data.price, data.conf, data.expo, data.publishTime);
    }
    
    function getUpdateFee(bytes[] calldata) external pure returns (uint256) {
        return 0; // No fee for mock
    }
    
    function updatePriceFeeds(bytes[] calldata) external payable {
        // Mock implementation - do nothing
    }
} 