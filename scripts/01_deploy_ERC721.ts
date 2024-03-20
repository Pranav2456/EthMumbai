import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import fs from "fs"; 
import config from "../config";
import { ERC721Webtoon, ERC721Webtoon__factory } from "../src/types"; 

async function main() {
    if (hre.network.name != "sepolia" && hre.network.name != "mainnet") {
        console.error("Wrong network");
        process.exit(1);
    }
    const users = await hre.ethers.getSigners();
    const deployer = users[0];
    const webtoonConfig = config[hre.network.name].ERC721Webtoon; 

    var webtoonFactory: ERC721Webtoon__factory;
    var webtoonContract: ERC721Webtoon;

    webtoonFactory = await hre.ethers.getContractFactory("ERC721Webtoon") as ERC721Webtoon__factory;

    if (webtoonConfig.address != "") {
        console.log("Reusing ERC721Webtoon at: ", webtoonConfig.address);
        webtoonContract = await hre.ethers.getContractAt("ERC721Webtoon", webtoonConfig.address) as ERC721Webtoon;
    } else {
        console.log("Deploying ERC721Webtoon contract...");
        webtoonContract = await webtoonFactory.deploy(
            deployer.address,
        ) as ERC721Webtoon; 
        console.log("ERC721Webtoon deployed at:", webtoonContract.address);
    }

    const _config = config;
    _config[hre.network.name].ERC721Webtoon.address = webtoonContract.address;
    fs.writeFileSync('./config/data.json', JSON.stringify(_config, null, 2));
    console.log('Config updated');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });