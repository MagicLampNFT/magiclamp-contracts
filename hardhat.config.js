const { solidity } = require('ethereum-waffle');
const { privateKey, etherScanApiKey, bscscanApiKey } = require('./secrets.json');

require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-web3");
require('@openzeppelin/hardhat-upgrades');

task("accounts", "👩🕵👨🙋👷 Prints the list of accounts (only for localhost)", async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
  console.log("👩🕵 👨🙋👷 these accounts only for localhost network.");
  console.log('To see their private keys🔑🗝 when you run "npx hardhat node."');
});


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  etherscan: {
    apiKey: bscscanApiKey
  },

  defaultNetwork: "localhost", 

  networks: {
    hardhat: {
      accounts: {
        accountsBalance: "10000000000000000000000000",
        count: 10,
      }
    },

    localhost: {
      url: "http://127.0.0.1:8545"
    },

    Ganache: {
      url: "http://127.0.0.1:7545"
    },

    // Ropsten: {
    //   url: 'https://eth-ropsten.alchemyapi.io/v2/Gwy3q1VE1ub6RtnpUTNz0ZrUD_B4fjEk',
    //   accounts: [privateKey]
    // },

    // mainnet: {
    //   url: 'https://mainnet.infura.io/v3/898373c22b1848568ff85c4669d2f825',
    //   accounts: [privateKey]
    // }

    bscTestnet: {
      url: "https://data-seed-prebsc-2-s3.binance.org:8545/",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [privateKey]
    },

    bscMainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [privateKey]
    },
    // hardhat: {
    // },
  },

  solidity: {
    compilers: [
      {
        version: "0.4.21",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }   
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }   
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
    overrides: {
      "contracts/uniswap/core/*.sol": {
        version: "0.5.16",
      },
      "contracts/uniswap/router/*.sol": {
        version: "0.6.6",
      }
    }
  },

  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  mocha: {
    timeout: 2000000
  }
};