const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FeedbackOracle", function () {
    let feedbackOracle;
    let rewardToken;
    let mockPyth;
    let owner;
    let user1;
    let user2;
    let signer;
    
    const FLOW_TESTNET_CHAIN_ID = 545;
    const HEDERA_TESTNET_CHAIN_ID = 296;
    const ROOTSTOCK_TESTNET_CHAIN_ID = 31;
    
    beforeEach(async function () {
        [owner, user1, user2, signer] = await ethers.getSigners();
        
        // Deploy MockPyth
        const MockPyth = await ethers.getContractFactory("MockPyth");
        mockPyth = await MockPyth.deploy();
        await mockPyth.deployed();
        
        // Deploy FeedbackRewardToken
        const FeedbackRewardToken = await ethers.getContractFactory("FeedbackRewardToken");
        rewardToken = await FeedbackRewardToken.deploy(
            "Test Feedback Token",
            "TFT",
            owner.address
        );
        await rewardToken.deployed();
        
        // Deploy FeedbackOracle
        const FeedbackOracle = await ethers.getContractFactory("FeedbackOracle");
        feedbackOracle = await FeedbackOracle.deploy(
            rewardToken.address,
            mockPyth.address,
            owner.address
        );
        await feedbackOracle.deployed();
        
        // Authorize oracle to mint tokens
        await rewardToken.setMinterAuthorization(feedbackOracle.address, true);
        
        // Authorize signer
        await feedbackOracle.setSignerAuthorization(signer.address, true);
        
        // Fund the contract
        await feedbackOracle.fundContract({ value: ethers.utils.parseEther("10") });
    });
    
    describe("Deployment", function () {
        it("Should deploy with correct network configurations", async function () {
            // Test Flow Testnet config
            const flowConfig = await feedbackOracle.getNetworkConfig(FLOW_TESTNET_CHAIN_ID);
            expect(flowConfig.isActive).to.be.true;
            expect(flowConfig.baseRewardUSDCents).to.equal(1000); // $10.00
            expect(flowConfig.qualityBonusUSDCents).to.equal(500); // $5.00
            
            // Test Hedera Testnet config
            const hederaConfig = await feedbackOracle.getNetworkConfig(HEDERA_TESTNET_CHAIN_ID);
            expect(hederaConfig.isActive).to.be.true;
            expect(hederaConfig.baseRewardUSDCents).to.equal(1000);
            
            // Test Rootstock Testnet config
            const rootstockConfig = await feedbackOracle.getNetworkConfig(ROOTSTOCK_TESTNET_CHAIN_ID);
            expect(rootstockConfig.isActive).to.be.true;
            expect(rootstockConfig.baseRewardUSDCents).to.equal(1000);
        });
        
        it("Should have correct initial state", async function () {
            expect(await feedbackOracle.totalFeedbackProcessed()).to.equal(0);
            expect(await feedbackOracle.totalRewardsDistributedUSD()).to.equal(0);
            expect(await feedbackOracle.qualityThreshold()).to.equal(7);
        });
    });
    
    describe("Feedback Processing", function () {
        it("Should process feedback and distribute USD-based rewards", async function () {
            // Set mock price: $100 per token with 8 decimal exponent
            await mockPyth.setPrice(10000000000, -8); // $100.00
            
            const feedbackId = "test-feedback-1";
            const qualityRating = 8; // Above threshold
            const timestamp = Math.floor(Date.now() / 1000);
            
            // Create proof
            const proof = {
                user: user1.address,
                feedbackId: feedbackId,
                qualityRating: qualityRating,
                timestamp: timestamp,
                signature: "0x00" // Will be signed properly in real implementation
            };
            
            // Sign the feedback hash
            const feedbackHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ["address", "string", "uint256"],
                    [proof.user, proof.feedbackId, proof.timestamp]
                )
            );
            
            const messageHash = ethers.utils.hashMessage(ethers.utils.arrayify(feedbackHash));
            proof.signature = await signer.signMessage(ethers.utils.arrayify(feedbackHash));
            
            const initialBalance = await user1.getBalance();
            const initialTokenBalance = await rewardToken.balanceOf(user1.address);
            
            // Process feedback
            const tx = await feedbackOracle.processFeedback(proof, [], { value: 0 });
            const receipt = await tx.wait();
            
            // Check ERC20 token reward (15 tokens for quality feedback)
            const finalTokenBalance = await rewardToken.balanceOf(user1.address);
            expect(finalTokenBalance.sub(initialTokenBalance)).to.equal(
                ethers.utils.parseEther("15") // 10 base + 5 quality bonus
            );
            
            // Check native token reward (should be $15 worth at $100/token = 0.15 tokens)
            const finalBalance = await user1.getBalance();
            const expectedNativeReward = ethers.utils.parseEther("0.15");
            expect(finalBalance.sub(initialBalance)).to.be.closeTo(
                expectedNativeReward,
                ethers.utils.parseEther("0.001") // Small tolerance for gas
            );
            
            // Check stats
            expect(await feedbackOracle.totalFeedbackProcessed()).to.equal(1);
            expect(await feedbackOracle.totalRewardsDistributedUSD()).to.equal(1500); // $15.00 in cents
            expect(await feedbackOracle.userFeedbackCount(user1.address)).to.equal(1);
        });
        
        it("Should process feedback without quality bonus", async function () {
            // Set mock price: $50 per token
            await mockPyth.setPrice(5000000000, -8); // $50.00
            
            const feedbackId = "test-feedback-2";
            const qualityRating = 5; // Below threshold
            const timestamp = Math.floor(Date.now() / 1000);
            
            const proof = {
                user: user1.address,
                feedbackId: feedbackId,
                qualityRating: qualityRating,
                timestamp: timestamp,
                signature: "0x00"
            };
            
            const feedbackHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ["address", "string", "uint256"],
                    [proof.user, proof.feedbackId, proof.timestamp]
                )
            );
            proof.signature = await signer.signMessage(ethers.utils.arrayify(feedbackHash));
            
            const initialTokenBalance = await rewardToken.balanceOf(user1.address);
            
            await feedbackOracle.processFeedback(proof, [], { value: 0 });
            
            // Check ERC20 token reward (10 tokens for base feedback, no bonus)
            const finalTokenBalance = await rewardToken.balanceOf(user1.address);
            expect(finalTokenBalance.sub(initialTokenBalance)).to.equal(
                ethers.utils.parseEther("10") // 10 base, no quality bonus
            );
            
            // Check USD reward stats
            expect(await feedbackOracle.totalRewardsDistributedUSD()).to.equal(1000); // $10.00 in cents
        });
        
        it("Should prevent duplicate feedback processing", async function () {
            const feedbackId = "test-feedback-duplicate";
            const qualityRating = 8;
            const timestamp = Math.floor(Date.now() / 1000);
            
            const proof = {
                user: user1.address,
                feedbackId: feedbackId,
                qualityRating: qualityRating,
                timestamp: timestamp,
                signature: "0x00"
            };
            
            const feedbackHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ["address", "string", "uint256"],
                    [proof.user, proof.feedbackId, proof.timestamp]
                )
            );
            proof.signature = await signer.signMessage(ethers.utils.arrayify(feedbackHash));
            
            // Process first time
            await feedbackOracle.processFeedback(proof, [], { value: 0 });
            
            // Try to process again - should revert
            await expect(
                feedbackOracle.processFeedback(proof, [], { value: 0 })
            ).to.be.revertedWith("FeedbackAlreadyProcessed");
        });
    });
    
    describe("Network Configuration", function () {
        it("Should allow owner to update network config", async function () {
            const newConfig = {
                minFeedbackInterval: 2 * 3600, // 2 hours
                maxPriceAge: 600, // 10 minutes
                baseRewardUSDCents: 2000, // $20.00
                qualityBonusUSDCents: 1000, // $10.00
                nativeTokenPriceFeedId: "0x1234567890123456789012345678901234567890123456789012345678901234",
                isActive: true
            };
            
            await feedbackOracle.updateNetworkConfig(FLOW_TESTNET_CHAIN_ID, newConfig);
            
            const updatedConfig = await feedbackOracle.getNetworkConfig(FLOW_TESTNET_CHAIN_ID);
            expect(updatedConfig.baseRewardUSDCents).to.equal(2000);
            expect(updatedConfig.qualityBonusUSDCents).to.equal(1000);
            expect(updatedConfig.minFeedbackInterval).to.equal(2 * 3600);
        });
        
        it("Should not allow non-owner to update network config", async function () {
            const newConfig = {
                minFeedbackInterval: 2 * 3600,
                maxPriceAge: 600,
                baseRewardUSDCents: 2000,
                qualityBonusUSDCents: 1000,
                nativeTokenPriceFeedId: "0x1234567890123456789012345678901234567890123456789012345678901234",
                isActive: true
            };
            
            await expect(
                feedbackOracle.connect(user1).updateNetworkConfig(FLOW_TESTNET_CHAIN_ID, newConfig)
            ).to.be.revertedWith("OwnableUnauthorizedAccount");
        });
    });
    
    describe("Administrative Functions", function () {
        it("Should allow funding and withdrawal", async function () {
            const fundAmount = ethers.utils.parseEther("5");
            
            // Fund the contract
            await feedbackOracle.fundContract({ value: fundAmount });
            
            // Check contract balance
            const contractBalance = await ethers.provider.getBalance(feedbackOracle.address);
            expect(contractBalance).to.be.gte(fundAmount);
            
            // Withdraw some funds
            const withdrawAmount = ethers.utils.parseEther("2");
            await feedbackOracle.withdrawNativeTokens(withdrawAmount);
            
            const newBalance = await ethers.provider.getBalance(feedbackOracle.address);
            expect(newBalance).to.equal(contractBalance.sub(withdrawAmount));
        });
        
        it("Should allow emergency withdrawal", async function () {
            const initialBalance = await ethers.provider.getBalance(feedbackOracle.address);
            expect(initialBalance).to.be.gt(0);
            
            await feedbackOracle.emergencyWithdraw();
            
            const finalBalance = await ethers.provider.getBalance(feedbackOracle.address);
            expect(finalBalance).to.equal(0);
        });
    });
    
    describe("Price Calculation", function () {
        it("Should calculate correct native token amounts for different prices", async function () {
            // Test with $100 per token
            const result1 = await feedbackOracle.calculateRewardAmount(8, 10000000000, -8);
            expect(result1.usdRewardCents).to.equal(1500); // $15.00 with quality bonus
            expect(result1.nativeTokenAmount).to.equal(ethers.utils.parseEther("0.15")); // $15 / $100
            
            // Test with $50 per token, no quality bonus
            const result2 = await feedbackOracle.calculateRewardAmount(5, 5000000000, -8);
            expect(result2.usdRewardCents).to.equal(1000); // $10.00 without quality bonus
            expect(result2.nativeTokenAmount).to.equal(ethers.utils.parseEther("0.2")); // $10 / $50
            
            // Test with $200 per token
            const result3 = await feedbackOracle.calculateRewardAmount(8, 20000000000, -8);
            expect(result3.usdRewardCents).to.equal(1500); // $15.00 with quality bonus
            expect(result3.nativeTokenAmount).to.equal(ethers.utils.parseEther("0.075")); // $15 / $200
        });
        
        it("Should handle Rootstock fixed price fallback", async function () {
            // Test fixed BTC price calculation: $100,000 USD
            const result = await feedbackOracle.calculateRewardAmount(8, 10000000000000, -8);
            expect(result.usdRewardCents).to.equal(1500); // $15.00 with quality bonus
            expect(result.nativeTokenAmount).to.equal(ethers.utils.parseEther("0.00015")); // $15 / $100,000
        });
    });
}); 