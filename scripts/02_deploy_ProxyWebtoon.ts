import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import fs from "fs";
import config from "../config";
import { ProxyWebtoon, ProxyWebtoon__factory } from "../src/types";

async function main() {
    if (hre.network.name != "sepolia" && hre.network.name != "mainnet") {
        console.error("Wrong network");
        process.exit(1);
    }

    const users = await hre.ethers.getSigners();
    const deployer = users[0];
    const proxyWebtoonConfig = config[hre.network.name].ProxyWebtoon;

    var proxyWebtoonFactory: ProxyWebtoon__factory;
    var proxyWebtoon: ProxyWebtoon;

    proxyWebtoonFactory = await hre.ethers.getContractFactory("ProxyWebtoon") as ProxyWebtoon__factory;

    if (proxyWebtoonConfig.address != "") {
        console.log("Reusing ProxyWebtoon at: ", proxyWebtoonConfig.address);
        proxyWebtoon = await hre.ethers.getContractAt("ProxyWebtoon", proxyWebtoonConfig.address) as ProxyWebtoon;
    } else {
        console.log("Deploying ProxyWebtoon contract...");
        proxyWebtoon = await proxyWebtoonFactory.deploy() as ProxyWebtoon;
        console.log("ProxyWebtoon deployed at:", proxyWebtoon.address);
        const _config = config;
        _config[hre.network.name].ProxyWebtoon.address = proxyWebtoon.address;
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