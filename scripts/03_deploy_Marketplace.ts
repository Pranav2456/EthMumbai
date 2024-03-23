import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import fs from "fs";
import config from "../config";
import { Webtoon, ProxyWebtoon, Marketplace__factory, Marketplace } from "../src/types";

async function main() {
    if (hre.network.name != "sepolia" && hre.network.name != "mainnet") {
        console.error("Wrong network");
        process.exit(1);
    }

    const users = await hre.ethers.getSigners();
    const deployer = users[0];
    const webtoonConfig = config[hre.network.name].Webtoon;
    const proxyWebtoonConfig = config[hre.network.name].ProxyWebtoon;
    const marketplaceConfig = config[hre.network.name].Marketplace;

    var webtoon: Webtoon;
    var proxyWebtoon: ProxyWebtoon;
    var marketplace: Marketplace;
    var marketplaceFactory: Marketplace__factory;

    marketplaceFactory = await hre.ethers.getContractFactory("Marketplace") as Marketplace__factory;

    // Webtoon
    if (webtoonConfig.address != "") {
        console.log("Reusing Webtoon at: ", webtoonConfig.address)
        webtoon = await hre.ethers.getContractAt("Webtoon", webtoonConfig.address) as Webtoon;
    }
    else {
        throw Error('Webtoon not deployed');
    }

    // ProxyWebtoon
    if (webtoonConfig.address != "") {
        console.log("Reusing ProxyWebtoon at: ", proxyWebtoonConfig.address)
        proxyWebtoon = await hre.ethers.getContractAt("ProxyWebtoon", proxyWebtoonConfig.address) as ProxyWebtoon;
    }
    else {
        throw Error('ProxyWebtoon not deployed');
    }

    // Marketplace
    if (marketplaceConfig.address != "") {
        console.log("Reusing Marketplace at: ", marketplaceConfig.address);
        marketplace = await hre.ethers.getContractAt("Marketplace", marketplaceConfig.address) as Marketplace;
    } else {
        console.log("Deploying Marketplace contract...");
        marketplace = await marketplaceFactory.deploy(webtoon.address, proxyWebtoon.address) as Marketplace;
        console.log("Marketplace deployed at:", marketplace.address);
        const _config = config;
        _config[hre.network.name].Marketplace.address = marketplace.address;
        fs.writeFileSync('./config/data.json', JSON.stringify(_config, null, 2));
        console.log('Config updated');
    }

    // Set Admin
    console.log('Setting Marketplace as admin on ProxyWebtoon ...');
    await proxyWebtoon.connect(deployer).setAdmin(marketplace.address, true);
    console.log('Marketplace set as admin on ProxyWebtoon!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });