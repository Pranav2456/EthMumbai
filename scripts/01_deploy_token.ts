import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import fs from "fs";
import { TestToken, TestToken__factory } from "../src/types";
import config from "../config";

async function main() {
    if (hre.network.name != "sepolia") {
        console.error("Wrong network");
        process.exit(1);
    }

    const users = await hre.ethers.getSigners();
    const deployer = users[0];
    const tokenConfig = config[hre.network.name].TestToken;

    var tokenFactory: TestToken__factory;
    var token: TestToken;

    tokenFactory = await hre.ethers.getContractFactory("TestToken") as TestToken__factory;

    if (tokenConfig.address != "") {
        console.log("Reusing TestToken at: ", tokenConfig.address)
        token = await hre.ethers.getContractAt("TestToken", tokenConfig.address) as TestToken;
    }
    else {
        console.log("Deploying TestToken contract...");
        token =
            await tokenFactory.deploy() as TestToken;
        console.log("TestToken deployed at:", token.address);

        const _config = config;
        _config[hre.network.name].TestToken.address = token.address;
        fs.writeFileSync('./config/data.json', JSON.stringify(_config, null, 2));
        console.log('Config updated');
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });