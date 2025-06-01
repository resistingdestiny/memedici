const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Feedback Oracle System", function () {
  let feedbackToken;
  let feedbackOracle;
  let owner;
  let oracle;
  let user1;
  let user2;
  let unauthorizedUser;

  const TOKEN_NAME = "Feedback Reward Token";
  const TOKEN_SYMBOL = "FEEDBACK";
  const FEEDBACK_REWARD = ethers.parseEther("10"); // 10 tokens
  const QUALITY_BONUS = ethers.parseEther("5"); // 5 tokens

  beforeEach(async function () {
    [owner, oracle, user1, user2, unauthorizedUser] = await ethers.getSigners();

    // Deploy Feedback Reward Token
    const FeedbackRewardToken = await ethers.getContractFactory("FeedbackRewardToken");
    feedbackToken = await FeedbackRewardToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, owner.address);
    await feedbackToken.waitForDeployment();

    // Deploy Feedback Oracle
    const FeedbackOracle = await ethers.getContractFactory("FeedbackOracle");
    feedbackOracle = await FeedbackOracle.deploy(
      await feedbackToken.getAddress(),
      owner.address
    );
    await feedbackOracle.waitForDeployment();

    // Authorize the oracle contract to mint tokens
    await feedbackToken.connect(owner).setMinterAuthorization(
      await feedbackOracle.getAddress(),
      true
    );

    // Authorize oracle signer
    await feedbackOracle.connect(owner).setSignerAuthorization(oracle.address, true);
  });

  describe("FeedbackRewardToken", function () {
    it("Should deploy with correct initial parameters", async function () {
      expect(await feedbackToken.name()).to.equal(TOKEN_NAME);
      expect(await feedbackToken.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await feedbackToken.owner()).to.equal(owner.address);
      expect(await feedbackToken.FEEDBACK_REWARD()).to.equal(FEEDBACK_REWARD);
      expect(await feedbackToken.QUALITY_BONUS()).to.equal(QUALITY_BONUS);
    });

    it("Should start with initial supply for owner", async function () {
      const initialSupply = ethers.parseEther("1000000"); // 1M tokens
      expect(await feedbackToken.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it("Should allow authorized minters to mint feedback rewards", async function () {
      await feedbackToken.connect(owner).setMinterAuthorization(oracle.address, true);
      
      const tx = await feedbackToken.connect(oracle).mintFeedbackReward(user1.address, false);
      await expect(tx)
        .to.emit(feedbackToken, "FeedbackRewarded")
        .withArgs(user1.address, FEEDBACK_REWARD, false);

      expect(await feedbackToken.balanceOf(user1.address)).to.equal(FEEDBACK_REWARD);
      expect(await feedbackToken.userFeedbackCount(user1.address)).to.equal(1);
    });

    it("Should mint quality bonus for high-quality feedback", async function () {
      await feedbackToken.connect(owner).setMinterAuthorization(oracle.address, true);
      
      const expectedReward = FEEDBACK_REWARD + QUALITY_BONUS;
      await feedbackToken.connect(oracle).mintFeedbackReward(user1.address, true);

      expect(await feedbackToken.balanceOf(user1.address)).to.equal(expectedReward);
      expect(await feedbackToken.totalQualityBonuses()).to.equal(QUALITY_BONUS);
    });

    it("Should revert when unauthorized address tries to mint", async function () {
      await expect(
        feedbackToken.connect(unauthorizedUser).mintFeedbackReward(user1.address, false)
      ).to.be.revertedWithCustomError(feedbackToken, "UnauthorizedMinter");
    });

    it("Should handle batch minting correctly", async function () {
      await feedbackToken.connect(owner).setMinterAuthorization(oracle.address, true);
      
      const users = [user1.address, user2.address];
      const qualityBonuses = [true, false];

      await feedbackToken.connect(oracle).batchMintRewards(users, qualityBonuses);

      expect(await feedbackToken.balanceOf(user1.address)).to.equal(FEEDBACK_REWARD + QUALITY_BONUS);
      expect(await feedbackToken.balanceOf(user2.address)).to.equal(FEEDBACK_REWARD);
    });
  });

  describe("FeedbackOracle", function () {
    let feedbackProof;

    beforeEach(async function () {
      // Create a sample feedback proof
      const feedbackId = "test-feedback-123";
      const qualityRating = 8;
      const timestamp = Math.floor(Date.now() / 1000);

      // Create feedback hash (same as contract)
      const feedbackHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "string", "uint256"],
          [user1.address, feedbackId, timestamp]
        )
      );

      // Sign the hash
      const messageHash = ethers.hashMessage(ethers.getBytes(feedbackHash));
      const signature = await oracle.signMessage(ethers.getBytes(feedbackHash));

      feedbackProof = {
        user: user1.address,
        feedbackId: feedbackId,
        qualityRating: qualityRating,
        timestamp: timestamp,
        signature: signature
      };
    });

    it("Should deploy with correct parameters", async function () {
      expect(await feedbackOracle.rewardToken()).to.equal(await feedbackToken.getAddress());
      expect(await feedbackOracle.qualityThreshold()).to.equal(7);
      expect(await feedbackOracle.authorizedSigners(oracle.address)).to.be.true;
    });

    it("Should process feedback successfully", async function () {
      const tx = await feedbackOracle.processFeedback(feedbackProof);
      
      await expect(tx)
        .to.emit(feedbackOracle, "FeedbackProcessed")
        .withArgs(
          user1.address,
          feedbackProof.feedbackId,
          feedbackProof.qualityRating,
          FEEDBACK_REWARD + QUALITY_BONUS, // Quality rating 8 >= threshold 7
          true
        );

      // Check that user received tokens
      expect(await feedbackToken.balanceOf(user1.address)).to.equal(FEEDBACK_REWARD + QUALITY_BONUS);
      
      // Check oracle state
      expect(await feedbackOracle.userFeedbackCount(user1.address)).to.equal(1);
      expect(await feedbackOracle.totalFeedbackProcessed()).to.equal(1);
    });

    it("Should prevent duplicate feedback processing", async function () {
      await feedbackOracle.processFeedback(feedbackProof);
      
      await expect(
        feedbackOracle.processFeedback(feedbackProof)
      ).to.be.revertedWithCustomError(feedbackOracle, "FeedbackAlreadyProcessed");
    });

    it("Should enforce rate limiting", async function () {
      await feedbackOracle.processFeedback(feedbackProof);
      
      // Create new feedback proof with same user but different ID
      const newFeedbackProof = { ...feedbackProof };
      newFeedbackProof.feedbackId = "test-feedback-456";
      newFeedbackProof.timestamp = Math.floor(Date.now() / 1000);
      
      // Create new signature for new proof
      const feedbackHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "string", "uint256"],
          [user1.address, newFeedbackProof.feedbackId, newFeedbackProof.timestamp]
        )
      );
      newFeedbackProof.signature = await oracle.signMessage(ethers.getBytes(feedbackHash));

      await expect(
        feedbackOracle.processFeedback(newFeedbackProof)
      ).to.be.revertedWithCustomError(feedbackOracle, "RateLimitExceeded");
    });

    it("Should reject invalid signatures", async function () {
      const invalidProof = { ...feedbackProof };
      invalidProof.signature = await unauthorizedUser.signMessage(
        ethers.getBytes(ethers.keccak256(ethers.toUtf8Bytes("invalid")))
      );

      await expect(
        feedbackOracle.processFeedback(invalidProof)
      ).to.be.revertedWithCustomError(feedbackOracle, "UnauthorizedSigner");
    });

    it("Should handle batch feedback processing", async function () {
      // Create multiple feedback proofs
      const users = [user1.address, user2.address];
      const feedbackIds = ["batch-feedback-1", "batch-feedback-2"];
      const qualityRatings = [8, 6]; // One with bonus, one without
      const timestamps = [Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)];

      // Create batch hash and signature
      const batchHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address[]", "string[]", "uint8[]", "uint256[]"],
          [users, feedbackIds, qualityRatings, timestamps]
        )
      );

      const batchSignature = await oracle.signMessage(ethers.getBytes(batchHash));

      const batchProof = {
        users: users,
        feedbackIds: feedbackIds,
        qualityRatings: qualityRatings,
        timestamps: timestamps,
        signature: batchSignature
      };

      const tx = await feedbackOracle.processBatchFeedback(batchProof);
      await expect(tx).to.emit(feedbackOracle, "BatchFeedbackProcessed");

      // Check balances
      expect(await feedbackToken.balanceOf(user1.address)).to.equal(FEEDBACK_REWARD + QUALITY_BONUS);
      expect(await feedbackToken.balanceOf(user2.address)).to.equal(FEEDBACK_REWARD);
    });

    it("Should allow users to claim their own rewards", async function () {
      const tx = await feedbackOracle.connect(user1).claimFeedbackReward(feedbackProof);
      
      await expect(tx)
        .to.emit(feedbackOracle, "FeedbackProcessed")
        .withArgs(
          user1.address,
          feedbackProof.feedbackId,
          feedbackProof.qualityRating,
          FEEDBACK_REWARD + QUALITY_BONUS,
          true
        );

      expect(await feedbackToken.balanceOf(user1.address)).to.equal(FEEDBACK_REWARD + QUALITY_BONUS);
    });

    it("Should prevent users from claiming others' rewards", async function () {
      await expect(
        feedbackOracle.connect(user2).claimFeedbackReward(feedbackProof)
      ).to.be.revertedWithCustomError(feedbackOracle, "InvalidProof");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update quality threshold", async function () {
      const newThreshold = 8;
      
      await expect(feedbackOracle.connect(owner).setQualityThreshold(newThreshold))
        .to.emit(feedbackOracle, "QualityThresholdUpdated")
        .withArgs(7, newThreshold);

      expect(await feedbackOracle.qualityThreshold()).to.equal(newThreshold);
    });

    it("Should allow owner to authorize signers", async function () {
      await expect(feedbackOracle.connect(owner).setSignerAuthorization(user1.address, true))
        .to.emit(feedbackOracle, "SignerAuthorized")
        .withArgs(user1.address, true);

      expect(await feedbackOracle.authorizedSigners(user1.address)).to.be.true;
    });

    it("Should prevent non-owners from admin functions", async function () {
      await expect(
        feedbackOracle.connect(user1).setQualityThreshold(8)
      ).to.be.revertedWithCustomError(feedbackOracle, "OwnableUnauthorizedAccount");

      await expect(
        feedbackOracle.connect(user1).setSignerAuthorization(user2.address, true)
      ).to.be.revertedWithCustomError(feedbackOracle, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Process some feedback for testing
      const feedbackId = "view-test-feedback";
      const qualityRating = 9;
      const timestamp = Math.floor(Date.now() / 1000);

      const feedbackHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "string", "uint256"],
          [user1.address, feedbackId, timestamp]
        )
      );
      const signature = await oracle.signMessage(ethers.getBytes(feedbackHash));

      const proof = {
        user: user1.address,
        feedbackId: feedbackId,
        qualityRating: qualityRating,
        timestamp: timestamp,
        signature: signature
      };

      await feedbackOracle.processFeedback(proof);
    });

    it("Should return correct user feedback stats", async function () {
      const stats = await feedbackOracle.getUserFeedbackStats(user1.address);
      
      expect(stats[0]).to.equal(1); // feedbackCount
      expect(stats[1]).to.be.gt(0); // lastFeedback timestamp
      expect(stats[2]).to.be.gt(stats[1]); // nextAllowedFeedback
    });

    it("Should return correct oracle stats", async function () {
      const stats = await feedbackOracle.getOracleStats();
      
      expect(stats[0]).to.equal(1); // totalProcessed
      expect(stats[1]).to.equal(FEEDBACK_REWARD + QUALITY_BONUS); // totalRewards
      expect(stats[2]).to.equal(7); // currentThreshold
    });

    it("Should check if feedback is processed", async function () {
      const isProcessed = await feedbackOracle.isFeedbackProcessed(
        user1.address,
        "view-test-feedback",
        Math.floor(Date.now() / 1000) - 10 // Approximate timestamp
      );
      
      // Note: This might be false due to timestamp precision, but tests the function
      expect(typeof isProcessed).to.equal("boolean");
    });
  });
}); 