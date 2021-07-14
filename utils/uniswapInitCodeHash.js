const { expect, use } = require("chai");
const { ethers } = require("hardhat");

let Factory;
let Router;
let WETH;

beforeEach(async function () {
    [owner, user1, user2, user3, user4] = await ethers.getSigners();
  
    // only for testing purpose
    cFactory = await ethers.getContractFactory("UniswapV2Factory");
    Factory = await cFactory.deploy(user2.address);
    await Factory.deployed();
});  

describe("Uniswap init code hash", function() {
    console.log(await Factory.INIT_CODE_PAIR_HASH());
});
    