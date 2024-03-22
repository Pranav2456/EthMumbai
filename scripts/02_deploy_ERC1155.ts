import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import fs from "fs"; 
import config from "../config";
import { ERC1155WebtoonHolder, ERC1155WebtoonHolder__factory } from "../src/types"; 

async function main() {
    if (hre.network.name != "sepolia" && hre.network.name != "mainnet") {
        console.error("Wrong network");
        process.exit(1);
    }
    const users = await hre.ethers.getSigners();
    const deployer = users[0];
    const webtoonERC721Config = config[hre.network.name].ERC721Webtoon;
    const webtoonERC1155Config = config[hre.network.name].ERC1155WebtoonHolder; 
    const erc721ContractAddress = webtoonERC721Config.address;
    const baseURI = "ipfs://ipfs.io/webtoon-metadata/";

    var webtoon1155Factory: ERC1155WebtoonHolder__factory;
    var webtoon1155Contract: ERC1155WebtoonHolder;

    webtoon1155Factory = await hre.ethers.getContractFactory("ERC1155WebtoonHolder") as ERC1155WebtoonHolder__factory;

    if (webtoonERC1155Config.address != "") {
        console.log("Reusing ERC1155WebtoonHolder at: ", webtoonERC1155Config.address);
        webtoon1155Contract = await hre.ethers.getContractAt("ERC1155WebtoonHolder", webtoonERC1155Config.address) as ERC1155WebtoonHolder;
    } else {
        console.log("Deploying ERC1155WebtoonHolder contract...");
        webtoon1155Contract = await webtoon1155Factory.deploy(
            erc721ContractAddress,
            baseURI
        ) as ERC1155WebtoonHolder; 
        console.log("ERC721Webtoon deployed at:", webtoon1155Contract.address);
    }

    const _config = config;
    _config[hre.network.name].ERC1155WebtoonHolder.address = webtoon1155Contract.address;
    _config[hre.network.name].ERC1155WebtoonHolder.erc721ContractAddress = erc721ContractAddress;
    fs.writeFileSync('./config/data.json', JSON.stringify(_config, null, 2));
    console.log('Config updated');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });