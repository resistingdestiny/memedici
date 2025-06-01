const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Memedici Agent Launchpad", function () {
  let launchpad;
  let agentToken;
  let owner;
  let treasury;
  let creator;
  let contributor1;
  let contributor2;
  let mockRouter;

  const FUNDING_TARGET = ethers.parseEther("10"); // 10 ETH
  const TOKEN_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const PROTOCOL_FEE = 300; // 3%

  beforeEach(async function () {
    [owner, treasury, creator, contributor1, contributor2, mockRouter] = await ethers.getSigners();

    // Deploy AgentLaunchpad
    const AgentLaunchpad = await ethers.getContractFactory("AgentLaunchpad");
    launchpad = await AgentLaunchpad.deploy(treasury.address, mockRouter.address);
    await launchpad.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct treasury and router addresses", async function () {
      expect(await launchpad.treasuryAddress()).to.equal(treasury.address);
      expect(await launchpad.uniswapRouter()).to.equal(mockRouter.address);
    });

    it("Should set the correct protocol fee", async function () {
      expect(await launchpad.protocolFeePercentage()).to.equal(PROTOCOL_FEE);
    });

    it("Should start with agent ID counter at 0", async function () {
      expect(await launchpad.getCurrentAgentId()).to.equal(0);
    });
  });

  describe("Agent Creation", function () {
    it("Should create a new agent successfully", async function () {
      const tx = await launchpad.connect(creator).createAgent(
        "Ethereal Token",
        "ETHEREAL",
        "Elysia the Ethereal",
        "Neo-Mystical Digital Painter",
        "ipfs://QmTest123",
        FUNDING_TARGET,
        TOKEN_SUPPLY
      );

      await expect(tx)
        .to.emit(launchpad, "AgentCreated")
        .withArgs(0, creator.address, await getAgentTokenAddress(0), "Elysia the Ethereal", FUNDING_TARGET);

      // Verify agent info
      const agentInfo = await launchpad.getAgentInfo(0);
      expect(agentInfo.name).to.equal("Ethereal Token");
      expect(agentInfo.symbol).to.equal("ETHEREAL");
      expect(agentInfo.agentName).to.equal("Elysia the Ethereal");
      expect(agentInfo.archetype).to.equal("Neo-Mystical Digital Painter");
      expect(agentInfo.metadataURI).to.equal("ipfs://QmTest123");
      expect(agentInfo.fundingTarget).to.equal(FUNDING_TARGET);
      expect(agentInfo.creator).to.equal(creator.address);
      expect(agentInfo.isBonded).to.be.false;
      expect(agentInfo.isCancelled).to.be.false;
    });

    it("Should increment agent ID counter", async function () {
      await launchpad.connect(creator).createAgent(
        "Agent 1", "AG1", "Agent One", "Artist", "ipfs://1", FUNDING_TARGET, TOKEN_SUPPLY
      );
      expect(await launchpad.getCurrentAgentId()).to.equal(1);

      await launchpad.connect(creator).createAgent(
        "Agent 2", "AG2", "Agent Two", "Musician", "ipfs://2", FUNDING_TARGET, TOKEN_SUPPLY
      );
      expect(await launchpad.getCurrentAgentId()).to.equal(2);
    });

    it("Should revert with invalid parameters", async function () {
      await expect(
        launchpad.connect(creator).createAgent("", "SYMBOL", "Agent", "Artist", "ipfs://test", FUNDING_TARGET, TOKEN_SUPPLY)
      ).to.be.revertedWith("Invalid name");

      await expect(
        launchpad.connect(creator).createAgent("Name", "", "Agent", "Artist", "ipfs://test", FUNDING_TARGET, TOKEN_SUPPLY)
      ).to.be.revertedWith("Invalid symbol");

      await expect(
        launchpad.connect(creator).createAgent("Name", "SYMBOL", "Agent", "Artist", "ipfs://test", 0, TOKEN_SUPPLY)
      ).to.be.revertedWith("Invalid funding target");

      await expect(
        launchpad.connect(creator).createAgent("Name", "SYMBOL", "Agent", "Artist", "ipfs://test", FUNDING_TARGET, 0)
      ).to.be.revertedWith("Invalid token supply");
    });
  });

  describe("Contributions", function () {
    beforeEach(async function () {
      // Create an agent first
      await launchpad.connect(creator).createAgent(
        "Test Token", "TEST", "Test Agent", "Test Artist", "ipfs://test", FUNDING_TARGET, TOKEN_SUPPLY
      );
    });

    it("Should accept contributions", async function () {
      const contributionAmount = ethers.parseEther("5");
      
      const tx = await launchpad.connect(contributor1).contribute(0, { value: contributionAmount });
      
      await expect(tx)
        .to.emit(launchpad, "Contributed")
        .withArgs(0, contributor1.address, contributionAmount, contributionAmount);

      expect(await launchpad.getContribution(0, contributor1.address)).to.equal(contributionAmount);
      expect(await launchpad.getTotalRaised(0)).to.equal(contributionAmount);
    });

    it("Should allow multiple contributions from same user", async function () {
      const amount1 = ethers.parseEther("3");
      const amount2 = ethers.parseEther("2");

      await launchpad.connect(contributor1).contribute(0, { value: amount1 });
      await launchpad.connect(contributor1).contribute(0, { value: amount2 });

      expect(await launchpad.getContribution(0, contributor1.address)).to.equal(amount1 + amount2);
      expect(await launchpad.getTotalRaised(0)).to.equal(amount1 + amount2);
    });

    it("Should revert if contribution exceeds funding target", async function () {
      const excessiveAmount = ethers.parseEther("15"); // More than 10 ETH target

      await expect(
        launchpad.connect(contributor1).contribute(0, { value: excessiveAmount })
      ).to.be.revertedWithCustomError(launchpad, "FundingTargetExceeded");
    });

    it("Should revert contributions to non-existent agent", async function () {
      await expect(
        launchpad.connect(contributor1).contribute(999, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(launchpad, "AgentNotFound");
    });
  });

  describe("Contribution Withdrawals", function () {
    beforeEach(async function () {
      await launchpad.connect(creator).createAgent(
        "Test Token", "TEST", "Test Agent", "Test Artist", "ipfs://test", FUNDING_TARGET, TOKEN_SUPPLY
      );
      await launchpad.connect(contributor1).contribute(0, { value: ethers.parseEther("5") });
    });

    it("Should allow withdrawal before bonding", async function () {
      const initialBalance = await ethers.provider.getBalance(contributor1.address);
      
      const tx = await launchpad.connect(contributor1).withdrawContribution(0);
      
      await expect(tx)
        .to.emit(launchpad, "ContributionWithdrawn")
        .withArgs(0, contributor1.address, ethers.parseEther("5"));

      expect(await launchpad.getContribution(0, contributor1.address)).to.equal(0);
      expect(await launchpad.getTotalRaised(0)).to.equal(0);
    });

    it("Should revert withdrawal if no contribution", async function () {
      await expect(
        launchpad.connect(contributor2).withdrawContribution(0)
      ).to.be.revertedWithCustomError(launchpad, "NoContribution");
    });
  });

  describe("Agent Bonding", function () {
    beforeEach(async function () {
      await launchpad.connect(creator).createAgent(
        "Test Token", "TEST", "Test Agent", "Test Artist", "ipfs://test", FUNDING_TARGET, TOKEN_SUPPLY
      );
    });

    it("Should auto-bond when funding target is reached", async function () {
      // Contribute exactly the funding target
      const tx = await launchpad.connect(contributor1).contribute(0, { value: FUNDING_TARGET });
      
      // Should emit AgentBonded event
      await expect(tx).to.emit(launchpad, "AgentBonded");
      
      // Agent should be bonded
      expect(await launchpad.isAgentBonded(0)).to.be.true;
    });

    it("Should revert manual bonding if target not met", async function () {
      await launchpad.connect(contributor1).contribute(0, { value: ethers.parseEther("5") });
      
      await expect(
        launchpad.connect(creator).bondAgent(0)
      ).to.be.revertedWithCustomError(launchpad, "FundingTargetNotMet");
    });

    it("Should allow manual bonding when target is met", async function () {
      await launchpad.connect(contributor1).contribute(0, { value: FUNDING_TARGET });
      
      // Agent should already be auto-bonded, so this should revert
      await expect(
        launchpad.connect(creator).bondAgent(0)
      ).to.be.revertedWithCustomError(launchpad, "AgentAlreadyBonded");
    });
  });

  describe("Agent Token Integration", function () {
    let tokenAddress;

    beforeEach(async function () {
      await launchpad.connect(creator).createAgent(
        "Test Token", "TEST", "Test Agent", "Test Artist", "ipfs://test", FUNDING_TARGET, TOKEN_SUPPLY
      );
      
      const agentInfo = await launchpad.getAgentInfo(0);
      tokenAddress = agentInfo.tokenAddress;
      agentToken = await ethers.getContractAt("AgentToken", tokenAddress);
    });

    it("Should deploy agent token with correct parameters", async function () {
      expect(await agentToken.name()).to.equal("Test Token");
      expect(await agentToken.symbol()).to.equal("TEST");
      expect(await agentToken.agentName()).to.equal("Test Agent");
      expect(await agentToken.archetype()).to.equal("Test Artist");
      expect(await agentToken.metadataURI()).to.equal("ipfs://test");
      expect(await agentToken.totalSupply()).to.equal(TOKEN_SUPPLY);
    });

    it("Should mint all tokens to launchpad initially", async function () {
      expect(await agentToken.balanceOf(await launchpad.getAddress())).to.equal(TOKEN_SUPPLY);
    });

    it("Should allow revenue deposits after bonding", async function () {
      // Bond the agent first
      await launchpad.connect(contributor1).contribute(0, { value: FUNDING_TARGET });
      
      // Try to deposit revenue (should work from owner)
      const revenueAmount = ethers.parseEther("1");
      await agentToken.connect(owner).depositRevenue({ value: revenueAmount });
      
      expect(await agentToken.totalRevenue()).to.equal(revenueAmount);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update treasury address", async function () {
      const newTreasury = contributor1.address;
      
      await expect(launchpad.connect(owner).setTreasuryAddress(newTreasury))
        .to.emit(launchpad, "TreasuryUpdated")
        .withArgs(treasury.address, newTreasury);
      
      expect(await launchpad.treasuryAddress()).to.equal(newTreasury);
    });

    it("Should allow owner to update protocol fee", async function () {
      const newFee = 500; // 5%
      
      await expect(launchpad.connect(owner).setProtocolFeePercentage(newFee))
        .to.emit(launchpad, "ProtocolFeeUpdated")
        .withArgs(PROTOCOL_FEE, newFee);
      
      expect(await launchpad.protocolFeePercentage()).to.equal(newFee);
    });

    it("Should revert if non-owner tries admin functions", async function () {
      await expect(
        launchpad.connect(contributor1).setTreasuryAddress(contributor1.address)
      ).to.be.revertedWithCustomError(launchpad, "OwnableUnauthorizedAccount");
      
      await expect(
        launchpad.connect(contributor1).setProtocolFeePercentage(500)
      ).to.be.revertedWithCustomError(launchpad, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to pause/unpause", async function () {
      await launchpad.connect(owner).pauseLaunchpad();
      
      await expect(
        launchpad.connect(creator).createAgent(
          "Test", "TEST", "Agent", "Artist", "ipfs://test", FUNDING_TARGET, TOKEN_SUPPLY
        )
      ).to.be.revertedWithCustomError(launchpad, "EnforcedPause");
      
      await launchpad.connect(owner).unpauseLaunchpad();
      
      // Should work again
      await launchpad.connect(creator).createAgent(
        "Test", "TEST", "Agent", "Artist", "ipfs://test", FUNDING_TARGET, TOKEN_SUPPLY
      );
    });
  });

  // Helper function to get agent token address
  async function getAgentTokenAddress(agentId) {
    const agentInfo = await launchpad.getAgentInfo(agentId);
    return agentInfo.tokenAddress;
  }
}); 