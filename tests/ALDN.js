const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { advanceTimeAndBlock, getBlockNumber } = require("./helpers/helpers");

beforeEach(async function () {
  [owner, user1, feeRewardIncludedUser, feeExcludedUser, rewardExcludedUser, feeRewardExcludedUser] = await ethers.getSigners();

  aldnFactory = await ethers.getContractFactory("ALDN");
  ALDN = await aldnFactory.deploy();
  await ALDN.deployed();
});

describe("ALDN", function() {
  it("Parameters", async function() {
    expect(await ALDN.name()).to.equal("MagicLamp Governance Token");
    expect(await ALDN.symbol()).to.equal("ALDN");
    expect(await ALDN.decimals()).to.equal(9);
    expect(await ALDN.totalSupply()).to.equal("1000000000000000000000000");
    expect(await ALDN.balanceOf(owner.address)).to.equal("1000000000000000000000000");

    expect(await ALDN.taxFee()).to.equal(5);
    expect(await ALDN.liquidityFee()).to.equal(5);
    await ALDN.connect(owner).setTaxFeePercent(10);
    expect(await ALDN.taxFee()).to.equal(10);
    await ALDN.connect(owner).setLiquidityFeePercent(10);
    expect(await ALDN.liquidityFee()).to.equal(10);
    expect(await ALDN.swapAndLiquifyEnabled()).to.equal(true);
    expect(await ALDN.maxTxAmount()).to.equal("5000000000000000000000");
  });

  it("Transfer Ownership", async function(){
    await ALDN.connect(owner).authorizeOwnershipTransfer(user1.address);
    await ALDN.connect(user1).assumeOwnership();
    expect(await ALDN.owner()).to.equal(user1.address);
    await ALDN.connect(user1).setTaxFeePercent(10);
    expect(await ALDN.taxFee()).to.equal(10);
  });

  it("Excludes", async function() {
    expect(await ALDN.isExcludedFromFee(ALDN.address)).to.equal(true);
    expect(await ALDN.isExcludedFromMaxTxAmount(ALDN.address)).to.equal(true);
    expect(await ALDN.isExcludedFromReward(ALDN.address)).to.equal(true);

    expect(await ALDN.isExcludedFromFee(owner.address)).to.equal(true);
    expect(await ALDN.isExcludedFromMaxTxAmount(owner.address)).to.equal(true);
    expect(await ALDN.isExcludedFromReward(owner.address)).to.equal(false);

    expect(await ALDN.isExcludedFromFee(user1.address)).to.equal(false);
    expect(await ALDN.isExcludedFromMaxTxAmount(user1.address)).to.equal(false);
    expect(await ALDN.isExcludedFromReward(user1.address)).to.equal(false);

    expect(await ALDN.excludeFromFee(user1.address));
    expect(await ALDN.isExcludedFromFee(user1.address)).to.equal(true);
    expect(await ALDN.isExcludedFromMaxTxAmount(user1.address)).to.equal(false);
    expect(await ALDN.isExcludedFromReward(user1.address)).to.equal(false);

    expect(await ALDN.excludeFromMaxTxAmount(user1.address));
    expect(await ALDN.isExcludedFromFee(user1.address)).to.equal(true);
    expect(await ALDN.isExcludedFromMaxTxAmount(user1.address)).to.equal(true);
    expect(await ALDN.isExcludedFromReward(user1.address)).to.equal(false);

    expect(await ALDN.excludeFromReward(user1.address));
    expect(await ALDN.isExcludedFromFee(user1.address)).to.equal(true);
    expect(await ALDN.isExcludedFromMaxTxAmount(user1.address)).to.equal(true);
    expect(await ALDN.isExcludedFromReward(user1.address)).to.equal(true);

    expect(await ALDN.includeInFee(user1.address));
    expect(await ALDN.isExcludedFromFee(user1.address)).to.equal(false);
    expect(await ALDN.isExcludedFromMaxTxAmount(user1.address)).to.equal(true);
    expect(await ALDN.isExcludedFromReward(user1.address)).to.equal(true);

    expect(await ALDN.includeInMaxTxAmount(user1.address));
    expect(await ALDN.isExcludedFromFee(user1.address)).to.equal(false);
    expect(await ALDN.isExcludedFromMaxTxAmount(user1.address)).to.equal(false);
    expect(await ALDN.isExcludedFromReward(user1.address)).to.equal(true);

    expect(await ALDN.includeInReward(user1.address));
    expect(await ALDN.isExcludedFromFee(user1.address)).to.equal(false);
    expect(await ALDN.isExcludedFromMaxTxAmount(user1.address)).to.equal(false);
    expect(await ALDN.isExcludedFromReward(user1.address)).to.equal(false);
  });

  describe("Delegate", function() {
    beforeEach(async function () {
      await ALDN.connect(owner).excludeFromFee(feeExcludedUser.address);
      await ALDN.connect(owner).excludeFromFee(feeRewardExcludedUser.address);

      await ALDN.connect(owner).excludeFromReward(rewardExcludedUser.address);
      await ALDN.connect(owner).excludeFromReward(feeRewardExcludedUser.address);
    });

    describe("Self", function() {
      it("Owner", async function() {
        var votes = "0";
        expect(await ALDN.getCurrentVotes(owner.address)).to.equal(votes);

        ALDN = await ALDN.connect(owner);
        await ALDN.delegate(owner.address);
        expect(await ALDN.delegates(owner.address)).to.equal(owner.address);
        expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(owner.address);
        expect(votes).to.equal(await ALDN.balanceOf(owner.address));

        await advanceTimeAndBlock(1000);
        expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(owner.address);
        expect(votes).to.equal(await ALDN.balanceOf(owner.address));

        await ALDN.transfer(user1.address, "99999999999999999");
        expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(owner.address);
        expect(votes).to.equal(await ALDN.balanceOf(owner.address));
      });

      it("Fee-Reward-Included", async function() {
        var votes = "0";
        expect(await ALDN.getCurrentVotes(feeRewardIncludedUser.address)).to.equal(votes);

        ALDN = await ALDN.connect(feeRewardIncludedUser);
        await ALDN.delegate(feeRewardIncludedUser.address);
        expect(await ALDN.delegates(feeRewardIncludedUser.address)).to.equal(feeRewardIncludedUser.address);
        expect(await ALDN.getPriorVotes(feeRewardIncludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardIncludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardIncludedUser.address));

        ALDN = await ALDN.connect(owner);
        await ALDN.transfer(feeRewardIncludedUser.address, "99999999999999999");
        ALDN = await ALDN.connect(feeRewardIncludedUser);
        expect(await ALDN.getPriorVotes(feeRewardIncludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardIncludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardIncludedUser.address));

        await advanceTimeAndBlock(1000);
        expect(await ALDN.getPriorVotes(feeRewardIncludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardIncludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardIncludedUser.address));

        await ALDN.transfer(user1.address, "8888888888888888");
        expect(await ALDN.getPriorVotes(feeRewardIncludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardIncludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardIncludedUser.address));

        await ALDN.deliver("77777777777");
        expect(await ALDN.getPriorVotes(feeRewardIncludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardIncludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardIncludedUser.address));

        ALDN = await ALDN.connect(owner);
        await ALDN.excludeFromFee(feeRewardIncludedUser.address);
        ALDN = await ALDN.connect(feeRewardIncludedUser);
        expect(await ALDN.getPriorVotes(feeRewardIncludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardIncludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardIncludedUser.address));

        ALDN = await ALDN.connect(owner);
        await ALDN.excludeFromReward(feeRewardIncludedUser.address);
        ALDN = await ALDN.connect(feeRewardIncludedUser);
        expect(await ALDN.getPriorVotes(feeRewardIncludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardIncludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardIncludedUser.address));
      });

      it("Fee-Excluded", async function() {
        var votes = "0";
        expect(await ALDN.getCurrentVotes(feeExcludedUser.address)).to.equal(votes);

        ALDN = await ALDN.connect(feeExcludedUser);
        await ALDN.delegate(feeExcludedUser.address);
        expect(await ALDN.delegates(feeExcludedUser.address)).to.equal(feeExcludedUser.address);
        expect(await ALDN.getPriorVotes(feeExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeExcludedUser.address));

        ALDN = await ALDN.connect(owner);
        await ALDN.transfer(feeExcludedUser.address, "99999999999999999");
        ALDN = await ALDN.connect(feeExcludedUser);
        expect(await ALDN.getPriorVotes(feeExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeExcludedUser.address));

        await advanceTimeAndBlock(1000);
        expect(await ALDN.getPriorVotes(feeExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeExcludedUser.address));

        await ALDN.transfer(user1.address, "8888888888888888");
        expect(await ALDN.getPriorVotes(feeExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeExcludedUser.address));

        ALDN = await ALDN.connect(owner);
        await ALDN.includeInFee(feeExcludedUser.address);
        ALDN = await ALDN.connect(feeExcludedUser);
        expect(await ALDN.getPriorVotes(feeExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeExcludedUser.address));
        
        await ALDN.deliver("77777777777");
        expect(await ALDN.getPriorVotes(feeExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeExcludedUser.address));
      });

      it("Reward-Excluded", async function() {
        var votes = "0";
        expect(await ALDN.getCurrentVotes(rewardExcludedUser.address)).to.equal(votes);

        ALDN = await ALDN.connect(rewardExcludedUser);
        await ALDN.delegate(rewardExcludedUser.address);
        expect(await ALDN.delegates(rewardExcludedUser.address)).to.equal(rewardExcludedUser.address);
        expect(await ALDN.getPriorVotes(rewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(rewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(rewardExcludedUser.address));

        ALDN = await ALDN.connect(owner);
        await ALDN.transfer(rewardExcludedUser.address, "99999999999999999");
        ALDN = await ALDN.connect(rewardExcludedUser);
        expect(await ALDN.getPriorVotes(rewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(rewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(rewardExcludedUser.address));

        await advanceTimeAndBlock(1000);
        expect(await ALDN.getPriorVotes(rewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(rewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(rewardExcludedUser.address));

        await ALDN.transfer(user1.address, "8888888888888888");
        expect(await ALDN.getPriorVotes(rewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(rewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(rewardExcludedUser.address));

        ALDN = await ALDN.connect(owner);
        await ALDN.includeInReward(rewardExcludedUser.address);
        ALDN = await ALDN.connect(rewardExcludedUser);
        expect(await ALDN.getPriorVotes(rewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(rewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(rewardExcludedUser.address));
        
        await ALDN.deliver("77777777777");
        expect(await ALDN.getPriorVotes(rewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(rewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(rewardExcludedUser.address));
      });

      it("Fee-Reward-Excluded", async function() {
        var votes = "0";
        expect(await ALDN.getCurrentVotes(feeRewardExcludedUser.address)).to.equal(votes);

        ALDN = await ALDN.connect(feeRewardExcludedUser);
        await ALDN.delegate(feeRewardExcludedUser.address);
        expect(await ALDN.delegates(feeRewardExcludedUser.address)).to.equal(feeRewardExcludedUser.address);
        expect(await ALDN.getPriorVotes(feeRewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardExcludedUser.address));

        ALDN = await ALDN.connect(owner);
        await ALDN.transfer(feeRewardExcludedUser.address, "99999999999999999");
        ALDN = await ALDN.connect(feeRewardExcludedUser);
        expect(await ALDN.getPriorVotes(feeRewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardExcludedUser.address));

        await advanceTimeAndBlock(1000);
        expect(await ALDN.getPriorVotes(feeRewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardExcludedUser.address));

        await ALDN.transfer(user1.address, "8888888888888888");
        expect(await ALDN.getPriorVotes(feeRewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardExcludedUser.address));

        ALDN = await ALDN.connect(owner);
        await ALDN.includeInFee(feeRewardExcludedUser.address);
        ALDN = await ALDN.connect(feeRewardExcludedUser);
        expect(await ALDN.getPriorVotes(feeRewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardExcludedUser.address));
        
        ALDN = await ALDN.connect(owner);
        await ALDN.includeInReward(feeRewardExcludedUser.address);
        ALDN = await ALDN.connect(feeRewardExcludedUser);
        expect(await ALDN.getPriorVotes(feeRewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardExcludedUser.address));
        
        await ALDN.deliver("77777777777");
        expect(await ALDN.getPriorVotes(feeRewardExcludedUser.address, await getBlockNumber() - 1)).to.equal(votes);
        votes = await ALDN.getCurrentVotes(feeRewardExcludedUser.address);
        expect(votes).to.equal(await ALDN.balanceOf(feeRewardExcludedUser.address));
      });
    });

    describe("To", function() {
      describe("Owner", function() {
        let votes;

        beforeEach(async function () {
          await ALDN.connect(owner).delegate(owner.address);
          await ALDN.connect(owner).transfer(user1.address, "12345678901234567890");
          await ALDN.connect(feeRewardIncludedUser).delegate(owner.address);
          await ALDN.connect(feeExcludedUser).delegate(owner.address);
          await ALDN.connect(rewardExcludedUser).delegate(owner.address);
          await ALDN.connect(feeRewardExcludedUser).delegate(owner.address);

          votes = await ALDN.getCurrentVotes(owner.address);
        });

        async function getBalanceOfAllDelegates() {
          return (await ALDN.balanceOf(owner.address))
            .add(await ALDN.balanceOf(feeRewardIncludedUser.address))
            .add(await ALDN.balanceOf(feeExcludedUser.address))
            .add(await ALDN.balanceOf(rewardExcludedUser.address))
            .add(await ALDN.balanceOf(feeRewardExcludedUser.address));
        }

        function expectBalance(a, b) {
          expect(a).to.gte(b);
          expect(a).to.lte(b.add(2));
        }

        describe("From", function() {
          it("Fee-Reward-Included", async function() {            
            expect(await ALDN.delegates(feeRewardIncludedUser.address)).to.equal(owner.address);

            ALDN = await ALDN.connect(owner);
            await ALDN.transfer(feeRewardIncludedUser.address, "99999999999999999");
            ALDN = await ALDN.connect(feeRewardIncludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            await advanceTimeAndBlock(1000);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(user1);
            await ALDN.transfer(feeRewardIncludedUser.address, "99999999999999999");
            ALDN = await ALDN.connect(feeRewardIncludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            await ALDN.transfer(user1.address, "8888888888888888");
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            await ALDN.deliver("77777777777");
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(owner);
            await ALDN.excludeFromFee(feeRewardIncludedUser.address);
            ALDN = await ALDN.connect(feeRewardIncludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(owner);
            await ALDN.excludeFromReward(feeRewardIncludedUser.address);
            ALDN = await ALDN.connect(feeRewardIncludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());
          });

          it("Fee-Excluded", async function() {            
            expect(await ALDN.delegates(feeExcludedUser.address)).to.equal(owner.address);
            
            ALDN = await ALDN.connect(owner);
            await ALDN.transfer(feeExcludedUser.address, "99999999999999999");
            ALDN = await ALDN.connect(feeExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            await advanceTimeAndBlock(1000);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(user1);
            await ALDN.transfer(feeExcludedUser.address, "99999999999999999");
            ALDN = await ALDN.connect(feeExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            await ALDN.transfer(user1.address, "8888888888888888");
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(owner);
            await ALDN.includeInFee(feeExcludedUser.address);
            ALDN = await ALDN.connect(feeExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());
            
            await ALDN.deliver("77777777777");
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());
          });

          it("Reward-Excluded", async function() {
            expect(await ALDN.delegates(rewardExcludedUser.address)).to.equal(owner.address);

            ALDN = await ALDN.connect(owner);
            await ALDN.transfer(rewardExcludedUser.address, "99999999999999999");
            ALDN = await ALDN.connect(rewardExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            await advanceTimeAndBlock(1000);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(user1);
            await ALDN.transfer(rewardExcludedUser.address, "99999999999999999");
            ALDN = await ALDN.connect(rewardExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            await ALDN.transfer(user1.address, "8888888888888888");
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(owner);
            await ALDN.includeInReward(rewardExcludedUser.address);
            ALDN = await ALDN.connect(rewardExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());
            
            await ALDN.deliver("77777777777");
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());
          });

          it("Fee-Reward-Excluded", async function() {            
            expect(await ALDN.delegates(feeRewardExcludedUser.address)).to.equal(owner.address);

            ALDN = await ALDN.connect(owner);
            await ALDN.transfer(feeRewardExcludedUser.address, "99999999999999999");
            ALDN = await ALDN.connect(feeRewardExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            await advanceTimeAndBlock(1000);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(user1);
            await ALDN.transfer(feeRewardExcludedUser.address, "99999999999999999");
            ALDN = await ALDN.connect(feeRewardExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            await ALDN.transfer(user1.address, "8888888888888888");
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(owner);
            await ALDN.includeInFee(feeRewardExcludedUser.address);
            ALDN = await ALDN.connect(feeRewardExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());
            
            ALDN = await ALDN.connect(owner);
            await ALDN.includeInReward(feeRewardExcludedUser.address);
            ALDN = await ALDN.connect(feeRewardExcludedUser);
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());
            
            await ALDN.deliver("77777777777");
            expect(await ALDN.getPriorVotes(owner.address, await getBlockNumber() - 1)).to.equal(votes);
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());
          });

          it("All", async function() {
            ALDN = await ALDN.connect(user1);
            await ALDN.transfer(feeRewardIncludedUser.address, "999999999999999");
            await ALDN.transfer(feeExcludedUser.address, "99999999999999");
            await ALDN.transfer(rewardExcludedUser.address, "9999999999999");
            await ALDN.transfer(feeRewardExcludedUser.address, "999999999999");
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(feeRewardIncludedUser);
            await ALDN.transfer(owner.address, "8888888888888");
            await ALDN.transfer(feeExcludedUser.address, "888888888888");
            await ALDN.transfer(rewardExcludedUser.address, "88888888888");
            await ALDN.transfer(feeRewardExcludedUser.address, "8888888888");
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(feeExcludedUser);
            await ALDN.transfer(owner.address, "777777777777");
            await ALDN.transfer(feeRewardIncludedUser.address, "77777777777");
            await ALDN.transfer(rewardExcludedUser.address, "7777777777");
            await ALDN.transfer(feeRewardExcludedUser.address, "777777777");
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(rewardExcludedUser);
            await ALDN.transfer(owner.address, "6666666666666");
            await ALDN.transfer(feeRewardIncludedUser.address, "666666666666");
            await ALDN.transfer(feeExcludedUser.address, "66666666666");
            await ALDN.transfer(feeRewardExcludedUser.address, "6666666666");
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());

            ALDN = await ALDN.connect(feeRewardExcludedUser);
            await ALDN.transfer(owner.address, "555555555555");
            await ALDN.transfer(feeRewardIncludedUser.address, "55555555555");
            await ALDN.transfer(feeExcludedUser.address, "5555555555");
            await ALDN.transfer(rewardExcludedUser.address, "555555555");
            votes = await ALDN.getCurrentVotes(owner.address);
            expectBalance(votes, await getBalanceOfAllDelegates());
          });
        });
      });
    });
  });
});
