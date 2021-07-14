// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  // const WrappedEther = await hre.ethers.getContractFactory("WETH9");
  // const WETH = await WrappedEther.deploy();
  // await WETH.deployed();
  // console.log("WrappedEther deployed to:", WETH.address);

  const GenieToken = await hre.ethers.getContractFactory("GenieToken");
  const GNI = await GenieToken.deploy("GenieToken", "GNI", 1625127000);
  await GNI.deployed();
  console.log("GNI deployed to:", GNI.address);

  const Gift = await hre.ethers.getContractFactory("mGift");
  const mGift = await Gift.deploy();
  await mGift.deployed();
  console.log("Magic Gift deployed to:", mGift.address);

  const gml = await hre.ethers.getContractFactory("ALDN");
  const ALDN = await gml.deploy();
  await ALDN.deployed();
  console.log("ALDN deployed to:", ALDN.address);

  const MagicNFT = await hre.ethers.getContractFactory("MagicLamps");
  const ML = await MagicNFT.deploy("MagicLamps", "ML", ALDN.address, GNI.address); // WETH: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
  await ML.deployed();
  console.log("ML deployed to:", ML.address);

  const MagicWallet = await hre.ethers.getContractFactory("MagicLampWallet");
  const Container = await MagicWallet.deploy();
  await Container.deployed();
  console.log("Container deployed to:", Container.address);

  const SwapFactory = await hre.ethers.getContractFactory('SwapAndLiquify');
  const Swap = await SwapFactory.deploy();
  await Swap.deployed();
  console.log("Swap contract deployed to:", Swap.address);

  const SwapProxyFactory = await hre.ethers.getContractFactory('SwapAndLiquifyProxy');
  let SwapProxy = await SwapProxyFactory.deploy();
  await SwapProxy.deployed();
  await SwapProxy.setImplementation(Swap.address);
  console.log("SwapProxy deployed to:", SwapProxy.address);
  SwapProxy = await SwapFactory.attach(SwapProxy.address);
  await SwapProxy.initialize(ALDN.address, '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', { gasLimit : 25000000 });

  const LP = await hre.ethers.getContractFactory("LpStaking");
  const LPStaking = await LP.deploy();
  await LPStaking.deployed();
  console.log("LP staking deployed to:", LPStaking.address);

  const NFT = await hre.ethers.getContractFactory("NFTStaking");
  const NFTStaking = await NFT.deploy();
  await NFTStaking.deployed();
  console.log("NFT staking deployed to:", NFTStaking.address);

  // Final settings
  await GNI.setMagicLampAddress(ML.address);
  await ML.initMagicLampWalletAddress(Container.address);
  await Container.support(ML.address);
  await ALDN.setSwapAndLiquifyAddress(SwapProxy.address);
  await ALDN.setSwapAndLiquifyEnabled(false);
  await ALDN.transfer(ML.address, "50000000000000000000000");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
