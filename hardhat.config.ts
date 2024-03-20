import '@typechain/hardhat';
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat/types";
import { HardhatUserConfig } from 'hardhat/types';
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.20',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
        ]
    },
    networks: {
        hardhat: {},
        sepolia: {
            url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY as string]
                : undefined,
        },
        mainnet: {
            url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY as string]
                : undefined,
        },
    },
    paths: {
        sources: 'src'
    },
    typechain: {
        outDir: 'src/types',
        target: 'ethers-v5'
    },
    etherscan: {
        apiKey: {
            sepolia: process.env.ETH_EXPLORER_API_KEY as string,
            mainnet: process.env.ETH_EXPLORER_API_KEY as string,
        }
    },

}

export default config;