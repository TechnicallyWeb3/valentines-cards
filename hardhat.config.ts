import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";
const VALENTINE_DEPLOYER = process.env.VALENTINE_DEPLOYER || "0000000000000000000000000000000000000000000000000000000000000000";
const ALL_ACCOUNTS = [
  VALENTINE_DEPLOYER,
  PRIVATE_KEY,
];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: false,
        // or if you want to enable with specific settings:
        // enabled: true,
        // runs: 200
      },
      viaIR: false  // you might also want to disable IR-based compilation
    }
  },
  networks: {
    // Hardhat VM - default network
    hardhat: {
      chainId: 1337
    },
    // Local node
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    // Sepolia testnet
    sepolia: {
      url: "https://ethereum-sepolia.publicnode.com",
      accounts: ALL_ACCOUNTS,
      chainId: 11155111
    },
    // Polygon mainnet
    polygon: {
      url: "https://polygon-bor.publicnode.com",
      accounts: ALL_ACCOUNTS,
      chainId: 137
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || ""
    }
  },
  sourcify: {
    enabled: true
  }
};

export default config;
