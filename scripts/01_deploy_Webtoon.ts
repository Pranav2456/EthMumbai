import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import fs from "fs";
import config from "../config";
import { Webtoon, Webtoon__factory } from "../src/types";

async function main() {
    if (hre.network.name != "sepolia" && hre.network.name != "mainnet") {
        console.error("Wrong network");
        process.exit(1);
    }

    const users = await hre.ethers.getSigners();
    const deployer = users[0];
    const webtoonConfig = config[hre.network.name].Webtoon;

    var webtoonFactory: Webtoon__factory;
    var webtoon: Webtoon;

    webtoonFactory = await hre.ethers.getContractFactory("Webtoon") as Webtoon__factory;

    if (webtoonConfig.address != "") {
        console.log("Reusing Webtoon at: ", webtoonConfig.address);
        webtoon = await hre.ethers.getContractAt("Webtoon", webtoonConfig.address) as Webtoon;
    } else {
        console.log("Deploying Webtoon contract...");
        webtoon = await webtoonFactory.deploy() as Webtoon;
        console.log("Webtoon deployed at:", webtoon.address);
        const _config = config;
        _config[hre.network.name].Webtoon.address = webtoon.address;
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