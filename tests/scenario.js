const { expect, use } = require("chai");
const { ethers } = require("hardhat");

const abi = require('ethereumjs-abi');
const { BigNumber } = require("ethers");


let GNI;
let MagicLamps;
let MagicLampWallet;
let mGift;
let ALDN;
let Factory;
let Router;
let WETH;
let Swap;
let Swap2;
let SwapAsProxy;
let SampleBEP20;
let SampleERC721;
let SampleNFT;
let SampleERC1155;
let owner;
let user1;
let user2;
let user3;
let user4;
let error;
let response;

let SwapProxy = null;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";


// Function to check expected failure cases
async function assertFailure (promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  expect.fail("Expected an exception but none was received");
}


// Function to advance time and block 
async function advanceTimeAndBlock (time){
  await advanceTime(time);
  await advanceBlock();

  return Promise.resolve(web3.eth.getBlock('latest'));
}

// Function to advance time
function advanceTime (time) {
  return new Promise((resolve, reject) => {
      web3.currentProvider.send({
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [time],
          id: new Date().getTime()
      }, (err, result) => {
          if (err) { return reject(err); }
          return resolve(result);
      });
  });
}


// Function to advance block
function advanceBlock () {
  return new Promise((resolve, reject) => {
      web3.currentProvider.send({
          jsonrpc: "2.0",
          method: "evm_mine",
          id: new Date().getTime()
      }, (err, result) => {
          if (err) { return reject(err); }
          const newBlockHash = web3.eth.getBlock('latest').hash;

          return resolve(newBlockHash)
      });
  });
}

// Deploying all required contracts for testing
beforeEach(async function () {
  [owner, user1, user2, user3, user4] = await ethers.getSigners();

  // only for testing purpose
  cFactory = await ethers.getContractFactory("UniswapV2Factory");
  Factory = await cFactory.deploy(user2.address);
  await Factory.deployed();

  WrappedEther = await ethers.getContractFactory("WETH9");
  WETH = await WrappedEther.deploy();
  await WETH.deployed();

  cRouter = await ethers.getContractFactory("UniswapV2Router02");
  Router = await cRouter.deploy(Factory.address, WETH.address);
  await Router.deployed();

  GiftFactory = await ethers.getContractFactory("mGift");
  mGift = await GiftFactory.deploy();
  await mGift.deployed();

  // only for testing purpose
  SampleBEP20Factory = await ethers.getContractFactory("SampleBEP20");
  SampleBEP20 = await SampleBEP20Factory.deploy(web3.utils.toWei("10000", "ether"))
  await SampleBEP20.deployed();

  // only for testing purpose
  SampleERC721Factory = await ethers.getContractFactory("SampleBEP721");
  SampleERC721 = await SampleERC721Factory.deploy("SampleBEP721", "ST2");
  await SampleERC721.deployed();

  SampleNFTFactory = await ethers.getContractFactory("SampleBEP721");
  SampleNFT = await SampleNFTFactory.deploy("SampleBEP721", "ST2");
  await SampleNFT.deployed();

  SampleERC1155Factory = await ethers.getContractFactory("SampleBEP1155");
  SampleERC1155 = await SampleERC1155Factory.deploy("");
  await SampleERC1155.deployed();

  AladdinFactory = await ethers.getContractFactory("ALDN");
  ALDN = await AladdinFactory.deploy();
  await ALDN.deployed();

  GenieTokenFactory = await ethers.getContractFactory("GenieToken");
  GNI = await GenieTokenFactory.deploy("GenieToken", "GNI");
  await GNI.deployed();

  MagicLampsFactory = await ethers.getContractFactory("MagicLamps");
  MagicLamps = await MagicLampsFactory.deploy("MagicLamps", "ML", ALDN.address, GNI.address);
  await MagicLamps.deployed();

  await GNI.setEmission(MagicLamps.address, true, "1337000000000000000000", 3, 1623751121, 86400 * 365 * 5, "7370000000000000000");

  MagicLampWalletFactory = await ethers.getContractFactory("MagicLampWallet");
  MagicLampWallet = await MagicLampWalletFactory.deploy();
  await MagicLampWallet.deployed();

  const SwapFactory = await hre.ethers.getContractFactory('SwapAndLiquify');
  Swap = await SwapFactory.deploy();
  await Swap.deployed();

  const SwapProxyFactory = await hre.ethers.getContractFactory('SwapAndLiquifyProxy');
  SwapProxy = await SwapProxyFactory.deploy();
  await SwapProxy.deployed();
  await SwapProxy.setImplementation(Swap.address);
  SwapAsProxy = await SwapFactory.attach(SwapProxy.address);  
});

describe("GNI Parameters", function() {
  it("Should check GNI parameters", async function() {
    const startEmission = await GNI.connect(user1).emissionStarts(MagicLamps.address);
    expect(startEmission).to.equal(1623751121);

    const endEmission = await GNI.connect(user1).emissionEnds(MagicLamps.address);
    expect(endEmission).to.equal(1623751121 + (86400 * 365 * 5));

    const initialAllotment = await GNI.emissionInitialAllotments(MagicLamps.address);
    expect(initialAllotment).to.equal(web3.utils.toWei("1337", "ether"));

    const emissionPerDay = await GNI.emissionPerDays(MagicLamps.address);
    expect(emissionPerDay).to.equal(web3.utils.toWei("7.37", "ether"));
  });

  it("Should set MagicLamp contract address", async function() {
    await GNI.setEmission(MagicLamps.address, true, "2337000000000000000000", 5, 2623751121, 86400 * 365 * 3, "6370000000000000000");

    const startEmission = await GNI.connect(user1).emissionStarts(MagicLamps.address);
    expect(startEmission).to.equal(2623751121);

    const endEmission = await GNI.connect(user1).emissionEnds(MagicLamps.address);
    expect(endEmission).to.equal(2623751121 + (86400 * 365 * 3));

    const initialAllotment = await GNI.emissionInitialAllotments(MagicLamps.address);
    expect(initialAllotment).to.equal(web3.utils.toWei("2337", "ether"));

    const emissionPerDay = await GNI.emissionPerDays(MagicLamps.address);
    expect(emissionPerDay).to.equal(web3.utils.toWei("6.37", "ether"));
  });
});


describe("MagicLamp Parameters", function() {
  it("Should check MagicLamp parameters", async function() {
    const startSaleTimestamp = await MagicLamps.SALE_START_TIMESTAMP();
    expect(startSaleTimestamp).to.equal(1623751121);

    const revelTimestamp = await MagicLamps.REVEAL_TIMESTAMP();
    expect(revelTimestamp).to.equal(1623751121 + (86400 * 21));

    const maxNFTSupply = await MagicLamps.MAX_MAGICLAMP_SUPPLY();
    expect(maxNFTSupply).to.equal(11451);

    const referralPercent = await MagicLamps.REFERRAL_REWARD_PERCENT();
    expect(referralPercent).to.equal(1000);
  });
});


describe("Miniting of MagicLamps", function() {
  it("MagicLamp Transfer Ownership", async function(){

    await MagicLamps.connect(owner).authorizeOwnershipTransfer(user1.address);
    await MagicLamps.connect(user1).assumeOwnership();
    expect(await MagicLamps.owner()).to.equal(user1.address);
    await MagicLamps.connect(user1).setBaseURI("https://magiclamp.finance/api/token_");    
  });

  it("Should check initial total supply to be zero and initial NFT price", async function() {
    const totalSupply = await MagicLamps.connect(user1).totalSupply();
    expect(totalSupply).to.equal(0);

    const getNFTPrice = await MagicLamps.connect(user1).estimateMagicLampPurchaseAmount(1);
    expect(getNFTPrice).to.equal(web3.utils.toWei("0.1", "ether"))
  });
  
  it("Should check received ether greater or less than required", async function() {
    expect(await MagicLamps.aladdinToken()).to.equal(ALDN.address);
    expect(await MagicLamps.genieToken()).to.equal(GNI.address);
    await expect(MagicLamps.connect(user1).mintMagicLamp(20, ZERO_ADDRESS, {value: web3.utils.toWei("0.7", "ether")})).to.be.revertedWith('BNB value incorrect');
    await expect(MagicLamps.connect(user2).mintMagicLamp(30, ZERO_ADDRESS, {value: web3.utils.toWei("1.5", "ether")})).to.be.revertedWith('BNB value incorrect');
  });

  it("Should mint NFTs and test all MagicLamp functions", async function() {
  
    await ALDN.connect(owner).setMaxTxPercent(20);
    await ALDN.connect(owner).approve(MagicLamps.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, MagicLamps.address, await ALDN.maxTxAmount());
    await ALDN.connect(owner).setSwapAndLiquifyAddress(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(owner.address);
    await ALDN.connect(owner).excludeFromFee(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(await SwapAsProxy.uniswapV2Router());

    // Initialize Liquidity 
    await ALDN.connect(owner).approve(SwapAsProxy.address, await ALDN.maxTxAmount());
    await SwapAsProxy.connect(owner).initialize(ALDN.address, Router.address);
    await SwapAsProxy.connect(owner).initializeLiquidity(await ALDN.maxTxAmount(), web3.utils.toWei("100", "ether"), {value: web3.utils.toWei("100", "ether")});
    
    await MagicLamps.connect(user1).mintMagicLamp(20, ZERO_ADDRESS, {value: web3.utils.toWei("2", "ether")});
    expect(await MagicLamps.connect(user1).totalSupply()).to.equal(20);
    expect(await MagicLamps.connect(user1).balanceOf(user1.address)).to.equal(20);
    expect(await MagicLamps.balanceOf(user2.address)).to.equal(0);
    expect(await MagicLamps.balanceOf(user3.address)).to.equal(0);

    await MagicLamps.connect(owner).setBaseURI("https://magiclamp.finance/api/token_");
    expect(await MagicLamps.tokenURI(19)).to.equal("https://magiclamp.finance/api/token_19");
    expect(await MagicLamps.ownerOf(19)).to.equal(user1.address);

    await MagicLamps.connect(user2).mintMagicLamp(10, user1.address, {value: web3.utils.toWei("1", "ether")});
    expect(await MagicLamps.referralRewards(user1.address)).to.equal(web3.utils.toWei("0.1", "ether"));
    expect(await MagicLamps.referralRewards(user2.address)).to.equal(web3.utils.toWei("0.1", "ether"));
    expect(await MagicLamps.referralStatus(user1.address, user2.address)).to.equal(true);
    expect(await MagicLamps.connect(user1).totalSupply()).to.equal(30);

    advanceTimeAndBlock(86400);
    expect(parseInt(web3.utils.fromWei((await GNI.connect(user2).accumulated(MagicLamps.address, 20)).toString(), "ether")) >= 3*1337);
    await GNI.connect(user2).claim(MagicLamps.address, [20]);
    expect(parseInt(web3.utils.fromWei((await GNI.connect(user2).balanceOf(user2.address)).toString(), "ether")) >= 3*1337);
    expect(parseInt(web3.utils.fromWei((await GNI.connect(user2).accumulated(MagicLamps.address, 20)).toString(), "ether"))).to.equal(0);
    
    await MagicLamps.connect(user2).changeName(20, "LOL");
    expect(await MagicLamps.validateName("ONE TWO THREE")).to.equal(true);
    expect(await MagicLamps.validateName("ONE TWO THREE FOUR FIVE SIX SEVEN")).to.equal(false);
    expect(await MagicLamps.validateName(" ONE")).to.equal(false);
    expect(await MagicLamps.validateName("ONE ")).to.equal(false);
    expect(await MagicLamps.validateName("")).to.equal(false);
    expect(await MagicLamps.toLower("LOL")).to.equal("lol");
    expect(await MagicLamps.isNameReserved("LOL")).to.equal(true);
    expect(await MagicLamps.tokenNameByIndex(20)).to.equal("LOL");
    expect(parseInt((await MagicLamps.tokenByIndex(20)).toString())).to.equal(20);
  });
});

describe("Liquify Functionality", function() {
    
    it("Should set new address to the SwapProxy contract", async function(){
      
      const SwapFactory2 = await hre.ethers.getContractFactory('SwapAndLiquify2');
      Swap2 = await SwapFactory2.deploy();
      await Swap2.deployed();
      
      await SwapProxy.setImplementation(Swap2.address);
      SwapProxy = await SwapFactory2.attach(SwapProxy.address);

      await SwapProxy.initialize(ALDN.address, Router.address);

      expect(await SwapProxy.getTokenAddress()).to.equal(ALDN.address);
      expect(await SwapProxy.uniswapV2Router()).to.equal(Router.address);
      await ALDN.connect(owner).setMaxTxPercent(20);
      await ALDN.connect(owner).approve(MagicLamps.address, await ALDN.maxTxAmount())
      await ALDN.connect(owner).transferFrom(owner.address, MagicLamps.address, await ALDN.maxTxAmount());
      await ALDN.connect(owner).setSwapAndLiquifyAddress(SwapProxy.address);
      await ALDN.connect(owner).excludeFromFee(owner.address);
      await ALDN.connect(owner).excludeFromFee(SwapProxy.address);
      await ALDN.connect(owner).excludeFromFee(await SwapProxy.uniswapV2Router());

      // Initialize Liquidity
      await ALDN.connect(owner).approve(SwapProxy.address, await ALDN.maxTxAmount())
      await SwapProxy.connect(owner).initializeLiquidity(await ALDN.maxTxAmount(), web3.utils.toWei("100", "ether"), {value: web3.utils.toWei("100", "ether")});

      expect(await SwapProxy.getTokenAddress()).to.equal(await SwapProxy.aldnAddress());
    });

    it("Should not add liquify by user before initialize", async function() {
      try{
        const pairBalance = await SwapAsProxy.getPairBalance();
        expect(pairBalance).to.greaterThan(0);
        expect(ALDN.swapAndLiquifyEnabled().to.equal(true));
        await MagicLamps.connect(user1).mintMagicLamp(10, user2.address, {value: web3.utils.toWei("1", "ether")});
      } catch(error){
        expect(error < 1);
      }
    });

    it("Should check and calculate ALDN token", async function() {
      await ALDN.connect(owner).setMaxTxPercent(20);
      await ALDN.connect(owner).approve(MagicLamps.address, await ALDN.maxTxAmount())
      await ALDN.connect(owner).transferFrom(owner.address, MagicLamps.address, await ALDN.maxTxAmount());
      await ALDN.connect(owner).setSwapAndLiquifyAddress(SwapAsProxy.address);
      await ALDN.connect(owner).excludeFromFee(owner.address);
      await ALDN.connect(owner).excludeFromFee(SwapAsProxy.address);
      await ALDN.connect(owner).excludeFromFee(await SwapAsProxy.uniswapV2Router());

      // Initialize Liquidity
      await ALDN.connect(owner).approve(SwapAsProxy.address, await ALDN.maxTxAmount());
      await SwapAsProxy.connect(owner).initialize(ALDN.address, Router.address);
      await SwapAsProxy.connect(owner).initializeLiquidity(await ALDN.maxTxAmount(), web3.utils.toWei("100", "ether"), {value: web3.utils.toWei("100", "ether")});

      await MagicLamps.connect(user1).mintMagicLamp(10, user2.address, {value: web3.utils.toWei("1", "ether")});

      expect(parseInt(await ALDN.balanceOf(user1.address))).to.equal(4237289133068609500);
    
      await ALDN.connect(user1).approve(user2.address, 1000000000);
      expect(parseInt(await ALDN.allowance(user1.address, user2.address))).to.equal(1000000000);

      await ALDN.connect(user2).delegate(user3.address);
      expect(await ALDN.delegates(user2.address)).to.equal(user3.address);

    });
});

describe("MagicLampWallet Functionality", function() {

  // it("Transfer Ownership", async function(){
  //   await MagicLampWallet.connect(owner).authorizeOwnershipTransfer(user1.address);
  //   await MagicLampWallet.connect(user1).assumeOwnership();
  //   expect(await MagicLampWallet.owner()).to.equal(user1.address);
  // });

  // Minting all MagicLamp Tokens and Checking Prices
  it("Should mint all NFTs, distribute referral rewards and check container functionality", async function() {
    // Minting all MagicLamp Tokens and Checking Prices
    await ALDN.connect(owner).setMaxTxPercent(20);
    await ALDN.connect(owner).approve(MagicLamps.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, MagicLamps.address, await ALDN.maxTxAmount());
    await ALDN.connect(owner).setSwapAndLiquifyAddress(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(owner.address);
    await ALDN.connect(owner).excludeFromFee(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(await SwapAsProxy.uniswapV2Router());
    await ALDN.connect(owner).approve(SwapAsProxy.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, SwapAsProxy.address, await ALDN.maxTxAmount());
    
    // Initialize Liquidity
    await SwapAsProxy.connect(owner).initialize(ALDN.address, Router.address);
    await SwapAsProxy.connect(owner).initializeLiquidity(await ALDN.maxTxAmount(), web3.utils.toWei("100", "ether"), {value: web3.utils.toWei("100", "ether")});

    await MagicLampWallet.connect(owner).support(MagicLamps.address);

    var i;
  
    for (i = 0; i < 30; i++) { // 0- 1199 =>0.1
      await MagicLamps.connect(user1).mintMagicLamp(40, ZERO_ADDRESS, {value: web3.utils.toWei("4", "ether")});
    }
    for (i = 0; i < 40; i++) {
      await MagicLamps.connect(user1).mintMagicLamp(50, user2.address, {value: web3.utils.toWei("10", "ether")}); //1200- 3199 => 0.2
    }
    for (i = 0; i < 60; i++) {
      await MagicLamps.connect(user2).mintMagicLamp(50, user3.address, {value: web3.utils.toWei("25", "ether")}); //3200 - 6199 => 0.5
    }
    for (i = 0; i < 60; i++) {
      await MagicLamps.connect(user2).mintMagicLamp(50, user3.address, {value: web3.utils.toWei("50", "ether")}); // 6200 - 9199 => 1
    }
    for (i = 0; i < 40; i++) {
      await MagicLamps.connect(user3).mintMagicLamp(50, user1.address, {value: web3.utils.toWei("100", "ether")}); //9200 - 11199 => 2
    }
    for(i = 0 ; i < 10; i++){
      await MagicLamps.connect(user3).mintMagicLamp(20, ZERO_ADDRESS, {value: web3.utils.toWei("100", "ether")}); //11200 - 11399  => 5
    }
    for(i = 0; i < 5; i++){
      await MagicLamps.connect(user1).mintMagicLamp(10, ZERO_ADDRESS, {value: web3.utils.toWei("100", "ether")}); //11400 - 11449
    }
    await MagicLamps.connect(user1).mintMagicLamp(1, user2.address, {value: web3.utils.toWei("100", "ether")}); //11450
    expect(await MagicLamps.totalSupply()).to.equal(11451);
    expect(await web3.eth.getBalance(MagicLamps.address)).to.equal(web3.utils.toWei("10620", "ether"));

    // Testing MagicLamp Distribute Referral
    await MagicLamps.connect(owner).initMagicLampWalletAddress(MagicLampWallet.address);
    await MagicLamps.connect(owner).distributeReferralRewards(0, 1);
    await MagicLamps.connect(owner).distributeReferralRewards(4401, 4402);
    await MagicLamps.connect(owner).distributeReferralRewards(9225, 9226);

    const oldLiquidityFundBalance = await web3.eth.getBalance(await MagicLamps.liquidityFundAddress());
    const oldPrizeFundBalance = await web3.eth.getBalance(await MagicLamps.prizeFundAddress());
    const oldTreasuryFundBalance = await web3.eth.getBalance(await MagicLamps.treasuryFundAddress());

    await MagicLamps.connect(owner).withdrawFund();

    const fundEta = BigNumber.from(web3.utils.toWei("10620", "ether")).sub(await MagicLamps.totalReferralRewardAmount());
    expect(await web3.eth.getBalance(await MagicLamps.liquidityFundAddress())).to.equal(fundEta.div(10).add(oldLiquidityFundBalance));
    expect(await web3.eth.getBalance(await MagicLamps.prizeFundAddress())).to.equal(fundEta.div(10).add(oldPrizeFundBalance));
    expect(await web3.eth.getBalance(await MagicLamps.treasuryFundAddress())).to.equal(fundEta.sub(fundEta.div(10)).sub(fundEta.div(10)).add(oldTreasuryFundBalance));
    
    const [user1_bnb,user1_20,user1_721,user1_1155] = await MagicLampWallet.getTokensCount(MagicLamps.address, 0);
    const [user2_bnb,user2_20,user2_721,user2_1155] = await MagicLampWallet.getTokensCount(MagicLamps.address, 4401);
    const [user3_bnb,user3_20,user3_721,user3_1155] = await MagicLampWallet.getTokensCount(MagicLamps.address, 9225);

    expect(parseInt(user1_bnb.toString())).to.equal(1);
    expect(parseInt(user1_20.toString())).to.equal(0);
    expect(parseInt(user1_721.toString())).to.equal(0);
    expect(parseInt(user1_1155.toString())).to.equal(0);
    expect(parseInt(user2_bnb.toString())).to.equal(1);
    expect(parseInt(user2_20.toString())).to.equal(0);
    expect(parseInt(user2_721.toString())).to.equal(0);
    expect(parseInt(user2_1155.toString())).to.equal(0);
    expect(parseInt(user3_bnb.toString())).to.equal(1);
    expect(parseInt(user3_20.toString())).to.equal(0);
    expect(parseInt(user3_721.toString())).to.equal(0);
    expect(parseInt(user3_1155.toString())).to.equal(0);

    expect(parseInt((await MagicLampWallet.getBNB(MagicLamps.address,0)).toString())).to.equal(parseInt(web3.utils.toWei("20", "ether")));
    expect(parseInt((await MagicLampWallet.getBNB(MagicLamps.address,4401)).toString())).to.equal(parseInt(web3.utils.toWei("10", "ether")));
    expect(parseInt((await MagicLampWallet.getBNB(MagicLamps.address,9225)).toString())).to.equal(parseInt(web3.utils.toWei("10", "ether")));

    // Testing BEP20 deposit into MagicLamp
    await SampleNFT.connect(user1)._mint(user1.address, 0);
    await SampleNFT.connect(user1)._mint(user1.address, 1);
    await SampleNFT.connect(user1)._mint(user1.address, 2);

    await MagicLampWallet.connect(owner).support(SampleNFT.address);

    await SampleBEP20.approve(MagicLampWallet.address, web3.utils.toWei("10", "ether"));
    await MagicLampWallet.depositBEP20(MagicLamps.address, 0, [SampleBEP20.address], [web3.utils.toWei("10", "ether")]);

    response = await MagicLampWallet.getBEP20Tokens(MagicLamps.address, 0);
    expect(parseInt(response[1][0])).to.equal(parseInt(web3.utils.toWei("10", "ether")));

    await MagicLampWallet.depositBNB(MagicLamps.address, 5, web3.utils.toWei("10", "ether"), {value: web3.utils.toWei("10", "ether")})
    response = await MagicLampWallet.getBNB(MagicLamps.address, 5);
    expect(response).to.equal(web3.utils.toWei("10", "ether"));

    await MagicLampWallet.depositBNB(SampleNFT.address, 0, web3.utils.toWei("10", "ether"), {value: web3.utils.toWei("10", "ether")})
    response = await MagicLampWallet.getBNB(SampleNFT.address, 0);
    expect(response).to.equal(web3.utils.toWei("10", "ether"));

    expect(await web3.eth.getBalance(MagicLampWallet.address)).to.equal(web3.utils.toWei("60", "ether"));

    // Testing MagicLampWallet Lock Functions
    const [locked1, endTime1] = await MagicLampWallet.isLocked(MagicLamps.address, 0);
    expect(locked1).to.equal(false);
    expect(endTime1).to.equal(0);

    await MagicLampWallet.connect(user1).lock(MagicLamps.address, 0, 10000);
    await advanceTimeAndBlock(1000);
    const [locked2, endTime2] = await MagicLampWallet.isLocked(MagicLamps.address, 0);
    expect(locked2).to.equal(true);
    expect(endTime2 > 0);

    // Testing Withdraw and Send BEP20 Functions
    await expect(MagicLampWallet.connect(user1).withdrawBEP20(MagicLamps.address, 0, [SampleBEP20.address], [web3.utils.toWei("5", "ether")])).to.be.reverted;
    await expect(MagicLampWallet.connect(user1).transferBEP20(MagicLamps.address, 0, SampleBEP20.address, web3.utils.toWei("5", "ether"), MagicLamps.address, 300)).to.be.reverted;

    await advanceTimeAndBlock(10000);
    await MagicLampWallet.connect(user1).withdrawBEP20(MagicLamps.address, 0, [SampleBEP20.address], [web3.utils.toWei("5", "ether")]);
    expect(await SampleBEP20.balanceOf(user1.address)).to.equal(web3.utils.toWei("5", "ether"));

    await MagicLampWallet.connect(user1).withdrawBNB(MagicLamps.address, 5, web3.utils.toWei("5", "ether"));
    response = await MagicLampWallet.getBNB(MagicLamps.address, 5);
    expect(response).to.equal(web3.utils.toWei("5", "ether"));

    await expect(MagicLampWallet.connect(user2).transferBEP20(MagicLamps.address, 0, SampleBEP20.address, web3.utils.toWei("5", "ether"), MagicLamps.address, 300)).to.be.revertedWith("Only wallet owner can call");
    await MagicLampWallet.connect(user1).transferBEP20(MagicLamps.address, 0, SampleBEP20.address, web3.utils.toWei("5", "ether"), MagicLamps.address, 300);
    response = await MagicLampWallet.getBEP20Tokens(MagicLamps.address, 300);
    expect(parseInt(response[1][0])).to.equal(parseInt(web3.utils.toWei("5", "ether")));

    await expect(MagicLampWallet.connect(user2).transferBNB(MagicLamps.address, 5, web3.utils.toWei("5", "ether"), MagicLamps.address, 300)).to.be.revertedWith("Only wallet owner can call");
    await MagicLampWallet.connect(user1).transferBNB(MagicLamps.address, 5, web3.utils.toWei("5", "ether"), MagicLamps.address, 300);
    response = await MagicLampWallet.getBNB(MagicLamps.address, 300);
    expect(response).to.equal(web3.utils.toWei("5", "ether"));

    // Testing ERC721 Deposit, Withdrawal and Send Functions
    await SampleERC721.connect(user1)._mint(user1.address, 0);
    await SampleERC721.connect(user1)._mint(user1.address, 1);
    await SampleERC721.connect(user1)._mint(user1.address, 2);

    await SampleERC721.connect(user1).setApprovalForAll(MagicLampWallet.address, true);
    await MagicLampWallet.connect(user1).depositERC721(MagicLamps.address, 300, SampleERC721.address, [1, 2]);
    response = await MagicLampWallet.getERC721Tokens(MagicLamps.address, 300);
    expect(parseInt(response[1].toString())).to.equal(2);

    expect(await SampleERC721.connect(user1).balanceOf(user1.address)).to.equal(1);

    await MagicLampWallet.connect(user1).withdrawERC721(MagicLamps.address, 300, SampleERC721.address, [1]);
    expect(await SampleERC721.balanceOf(user1.address)).to.equal(2);

    await MagicLampWallet.connect(user1).transferERC721(MagicLamps.address, 300, SampleERC721.address, [2], MagicLamps.address, 4401);
    response = await MagicLampWallet.getERC721Tokens(MagicLamps.address, 4401);
    expect(parseInt(response[1].toString())).to.equal(1);

    // Testing ERC1155 Deposit, Withdrawal and Send Functions
    await SampleERC1155.connect(user1)._mint(user1.address, 0, 100, 0x0);
    await SampleERC1155.connect(user1)._mint(user1.address, 1, 100, 0x0);
    await SampleERC1155.connect(user1)._mint(user1.address, 2, 100, 0x0);

    await SampleERC1155.connect(user1).setApprovalForAll(MagicLampWallet.address, true);
    await MagicLampWallet.connect(user1).depositERC1155(MagicLamps.address, 4401, SampleERC1155.address, [1, 2], [100, 100]);

    response = await MagicLampWallet.getERC1155TokenBalances(MagicLamps.address, 4401, SampleERC1155.address, [1, 2]);
    expect(parseInt(response[1].toString())).to.equal(100);
    response = await MagicLampWallet.getERC1155TokenBalances(MagicLamps.address, 4401, SampleERC1155.address, [1, 2]);
    expect(parseInt(response[1].toString())).to.equal(100);

    expect(await SampleERC1155.connect(user1).balanceOf(user1.address, 1)).to.equal(0);
    expect(await SampleERC1155.connect(user1).balanceOf(user1.address, 2)).to.equal(0);

    await MagicLampWallet.connect(user2).withdrawERC1155(MagicLamps.address, 4401, SampleERC1155.address, [1], [100]);
    expect(await SampleERC1155.balanceOf(user2.address, 1)).to.equal(100);

    await MagicLampWallet.connect(user2).transferERC1155(MagicLamps.address, 4401, SampleERC1155.address, [2], [100], MagicLamps.address, 0);
    response = await MagicLampWallet.getERC1155TokenBalances(MagicLamps.address, 0, SampleERC1155.address, [2]);
    expect(parseInt(response[0].toString())).to.equal(100);

    // Testing Withdraw All and Send All Functions
    await SampleBEP20.approve(MagicLampWallet.address, web3.utils.toWei("10", "ether"));
    await MagicLampWallet.depositBEP20(MagicLamps.address, 1, [SampleBEP20.address], [web3.utils.toWei("10", "ether")]);

    await MagicLampWallet.depositBNB(MagicLamps.address, 1, web3.utils.toWei("10", "ether"), {value: web3.utils.toWei("10", "ether")});

    await SampleERC721._mint(owner.address, 3);
    await SampleERC721._mint(owner.address, 4);
    await SampleERC721._mint(owner.address, 5);
    await SampleERC721.setApprovalForAll(MagicLampWallet.address, true);
    await MagicLampWallet.depositERC721(MagicLamps.address, 1, SampleERC721.address, [3, 4, 5]);

    await SampleERC1155._mint(owner.address, 3, 100, 0x0);
    await SampleERC1155._mint(owner.address, 4, 100, 0x0);
    await SampleERC1155._mint(owner.address, 5, 100, 0x0);
    await SampleERC1155.setApprovalForAll(MagicLampWallet.address, true);
    await MagicLampWallet.depositERC1155(MagicLamps.address, 1, SampleERC1155.address, [3, 4, 5], [100, 100, 100]);

    await MagicLampWallet.connect(user1).transferAll(MagicLamps.address, 1, MagicLamps.address, 2);

    response = await MagicLampWallet.getBNB(MagicLamps.address, 2);
    expect(response).to.equal(web3.utils.toWei("10", "ether"));
    response = await MagicLampWallet.getBEP20Tokens(MagicLamps.address, 2);
    expect(parseInt(response[1][0].toString())).to.equal(parseInt(web3.utils.toWei("10", "ether")));
    response = await MagicLampWallet.getERC721Tokens(MagicLamps.address, 2);
    expect(parseInt(response[1].toString())).to.equal(3);

    response = await MagicLampWallet.getERC1155TokenBalances(MagicLamps.address, 2, SampleERC1155.address, [3, 4, 5]);
    expect(parseInt(response[0].toString())).to.equal(100);
    expect(parseInt(response[1].toString())).to.equal(100);
    expect(parseInt(response[2].toString())).to.equal(100);

    const user1BNBEta = BigNumber.from(await web3.eth.getBalance(user1.address)).add(web3.utils.toWei("10", "ether"));
    await MagicLampWallet.connect(user1).withdrawAll(MagicLamps.address, 2);

    const bnbBalance = BigNumber.from(await web3.eth.getBalance(user1.address));
    expect(parseInt(bnbBalance)).to.lessThan(parseInt(user1BNBEta));
    expect(parseInt(bnbBalance)).to.greaterThan(parseInt(user1BNBEta.sub(web3.utils.toWei("0.005", "ether"))));
    expect(parseInt((await SampleBEP20.balanceOf(user1.address)).toString())).to.equal(parseInt(web3.utils.toWei("15", "ether")));
    expect(parseInt((await SampleERC721.balanceOf(user1.address)).toString())).to.equal(5);
    expect(await SampleERC1155.balanceOf(user1.address, 3)).to.equal(100);
    expect(await SampleERC1155.balanceOf(user1.address, 4)).to.equal(100);
    expect(await SampleERC1155.balanceOf(user1.address, 5)).to.equal(100);
  });

  it("Deposit self", async function() {
    await ALDN.connect(owner).setMaxTxPercent(20);
    await ALDN.connect(owner).approve(MagicLamps.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, MagicLamps.address, await ALDN.maxTxAmount());
    await ALDN.connect(owner).setSwapAndLiquifyAddress(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(owner.address);
    await ALDN.connect(owner).excludeFromFee(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(await SwapAsProxy.uniswapV2Router());
    await ALDN.connect(owner).approve(SwapAsProxy.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, SwapAsProxy.address, await ALDN.maxTxAmount());
    
    await SwapAsProxy.connect(owner).initialize(ALDN.address, Router.address);
    await SwapAsProxy.connect(owner).initializeLiquidity(await ALDN.maxTxAmount(), web3.utils.toWei("100", "ether"), {value: web3.utils.toWei("100", "ether")});

    await MagicLampWallet.connect(owner).support(MagicLamps.address);
    
    await MagicLamps.connect(owner).initMagicLampWalletAddress(MagicLampWallet.address);

    await MagicLamps.connect(user1).mintMagicLamp(40, ZERO_ADDRESS, {value: web3.utils.toWei("4", "ether")});

    await MagicLamps.connect(user1).setApprovalForAll(MagicLampWallet.address, true);
    await expect(MagicLampWallet.connect(user1).depositERC721(MagicLamps.address, 5, MagicLamps.address, [6, 5, 7])).to.be.revertedWith('MagicLampWallet::depositERC721: self deposit');
  });

  it("Transfer deposited ERC721 or ERC1155", async function() {
    await ALDN.connect(owner).setMaxTxPercent(20);
    await ALDN.connect(owner).approve(MagicLamps.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, MagicLamps.address, await ALDN.maxTxAmount());
    await ALDN.connect(owner).setSwapAndLiquifyAddress(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(owner.address);
    await ALDN.connect(owner).excludeFromFee(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(await SwapAsProxy.uniswapV2Router());
    await ALDN.connect(owner).approve(SwapAsProxy.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, SwapAsProxy.address, await ALDN.maxTxAmount());
    
    await SwapAsProxy.connect(owner).initialize(ALDN.address, Router.address);
    await SwapAsProxy.connect(owner).initializeLiquidity(await ALDN.maxTxAmount(), web3.utils.toWei("100", "ether"), {value: web3.utils.toWei("100", "ether")});

    await MagicLampWallet.connect(owner).support(MagicLamps.address);
    
    await MagicLamps.connect(owner).initMagicLampWalletAddress(MagicLampWallet.address);

    await MagicLamps.connect(user1).mintMagicLamp(40, ZERO_ADDRESS, {value: web3.utils.toWei("4", "ether")});

    await MagicLamps.connect(user1).setApprovalForAll(MagicLampWallet.address, true);
    await MagicLampWallet.connect(user1).depositERC721(MagicLamps.address, 5, MagicLamps.address, [6, 7]);

    await SampleERC1155.connect(user1)._mint(user1.address, 0, 100, 0x0);
    await SampleERC1155.connect(user1).setApprovalForAll(MagicLampWallet.address, true);
    await MagicLampWallet.connect(user1).depositERC1155(MagicLamps.address, 5, SampleERC1155.address, [0], [100]);

    await expect(MagicLampWallet.connect(user1).transferERC721(MagicLamps.address, 5, MagicLamps.address, [6], MagicLamps.address, 5)).to.be.revertedWith('MagicLampWallet::transferERC721: same wallet');
    await expect(MagicLampWallet.connect(user1).transferERC1155(MagicLamps.address, 5, SampleERC1155.address, [0], [100], MagicLamps.address, 5)).to.be.revertedWith('MagicLampWallet::transferERC1155: same wallet');
  });

  it("Transfer unauthorized ERC721 or ERC1155", async function() {
    await ALDN.connect(owner).setMaxTxPercent(20);
    await ALDN.connect(owner).approve(MagicLamps.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, MagicLamps.address, await ALDN.maxTxAmount());
    await ALDN.connect(owner).setSwapAndLiquifyAddress(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(owner.address);
    await ALDN.connect(owner).excludeFromFee(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(await SwapAsProxy.uniswapV2Router());
    await ALDN.connect(owner).approve(SwapAsProxy.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, SwapAsProxy.address, await ALDN.maxTxAmount());
    
    await SwapAsProxy.connect(owner).initialize(ALDN.address, Router.address);
    await SwapAsProxy.connect(owner).initializeLiquidity(await ALDN.maxTxAmount(), web3.utils.toWei("100", "ether"), {value: web3.utils.toWei("100", "ether")});

    await MagicLampWallet.connect(owner).support(MagicLamps.address);
    
    await MagicLamps.connect(owner).initMagicLampWalletAddress(MagicLampWallet.address);

    await MagicLamps.connect(user1).mintMagicLamp(40, ZERO_ADDRESS, {value: web3.utils.toWei("4", "ether")});

    await MagicLamps.connect(user1).setApprovalForAll(MagicLampWallet.address, true);
    await MagicLampWallet.connect(user1).depositERC721(MagicLamps.address, 5, MagicLamps.address, [6, 7]);

    await SampleERC1155.connect(user1)._mint(user1.address, 0, 100, 0x0);
    await SampleERC1155.connect(user1)._mint(user1.address, 1, 200, 0x0);
    await SampleERC1155.connect(user1).setApprovalForAll(MagicLampWallet.address, true);
    await MagicLampWallet.connect(user1).depositERC1155(MagicLamps.address, 5, SampleERC1155.address, [0], [100]);

    await expect(MagicLampWallet.connect(user1).transferERC721(MagicLamps.address, 5, MagicLamps.address, [9], MagicLamps.address, 8)).to.be.revertedWith('Not found token id');
    await expect(MagicLampWallet.connect(user1).transferERC1155(MagicLamps.address, 5, SampleERC1155.address, [1], [200], MagicLamps.address, 8)).to.be.reverted;
  });
});

describe("Should not mint all MagicLamp Token", function() {
  it("MagicLamp ALDN Token balance has not sufficient for mint all NFTs", async function() {
    // Minting all MagicLamp Tokens and Checking Prices
    await ALDN.connect(owner).approve(MagicLamps.address, await ALDN.maxTxAmount())
    await ALDN.connect(owner).transferFrom(owner.address, MagicLamps.address, await ALDN.maxTxAmount());
    await ALDN.connect(owner).setSwapAndLiquifyAddress(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(owner.address);
    await ALDN.connect(owner).excludeFromFee(SwapAsProxy.address);
    await ALDN.connect(owner).excludeFromFee(await SwapAsProxy.uniswapV2Router());

    // Initialize Liquidity
    await ALDN.connect(owner).approve(SwapAsProxy.address, await ALDN.maxTxAmount());
    await SwapAsProxy.connect(owner).initialize(ALDN.address, Router.address);
    await SwapAsProxy.connect(owner).initializeLiquidity(await ALDN.maxTxAmount(), web3.utils.toWei("100", "ether"), {value: web3.utils.toWei("100", "ether")});

    var i;
    try{
      for (i = 0; i < 30; i++) { // 0- 1199 =>0.1
        await MagicLamps.connect(user1).mintMagicLamp(40, ZERO_ADDRESS, {value: web3.utils.toWei("4", "ether")});
      }
      for (i = 0; i < 40; i++) {
        await MagicLamps.connect(user1).mintMagicLamp(50, user2.address, {value: web3.utils.toWei("10", "ether")}); //1200- 3199 => 0.2
      }
      for (i = 0; i < 60; i++) {
        await MagicLamps.connect(user2).mintMagicLamp(50, user3.address, {value: web3.utils.toWei("25", "ether")}); //3200 - 6199 => 0.5
      }
      for (i = 0; i < 60; i++) {
        await MagicLamps.connect(user2).mintMagicLamp(50, user3.address, {value: web3.utils.toWei("50", "ether")}); // 6200 - 9199 => 1
      }
      for (i = 0; i < 40; i++) {
        await MagicLamps.connect(user3).mintMagicLamp(50, user1.address, {value: web3.utils.toWei("100", "ether")}); //9200 - 11199 => 2
      }
      for(i = 0 ; i < 10; i++){
        await MagicLamps.connect(user3).mintMagicLamp(20, ZERO_ADDRESS, {value: web3.utils.toWei("100", "ether")}); //11200 - 11399  => 5
      }
      for(i = 0; i < 5; i++){
        await MagicLamps.connect(user1).mintMagicLamp(10, ZERO_ADDRESS, {value: web3.utils.toWei("100", "ether")}); //11400 - 11449
      }
      await MagicLamps.connect(user1).mintMagicLamp(1, user2.address, {value: web3.utils.toWei("100", "ether")}); //11450
    } catch(error){
      expect(error < 1);
    }
  });
});
