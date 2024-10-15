import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
dotenv.config({path: __dirname + '/.env'});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
    },
  },
  networks: {
      hardhat: {
          // mining: {
          //   auto: false,
          //   interval: [5000, 5000],
          // },
          chainId: 43114,
          forking: {
              url: process.env.FORK_URL_OVERRIDE || "https://rpc.ankr.com/eth",
          },
        //   accounts: [
        //     {
        //       balance: "100000000000000000000000000000",
        //       privateKey: process.env.PRIVATE_KEY as string,
        //     },
        //   ],
      },
      
      teth: {
          url: "https://goerli.infura.io/v3/",
          accounts: [process.env.PRIVATE_KEY as string || '']
      },
      tbsc: {
          url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
          accounts: [process.env.PRIVATE_KEY as string || '']
      },
      bsc: {
          url: "https://bsc-dataseed1.binance.org/",
          accounts: [process.env.PRIVATE_KEY as string || '']
      },
      eth: {
          url: "https://mainnet.infura.io/v3/",
          accounts: [process.env.PRIVATE_KEY as string || '']
      },
  },
  etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY || undefined,
  },
  mocha: {
      timeout: 100000000,
  },
  gasReporter: {
      enabled: true,
      currency: "USD",
  },
};

export default config;