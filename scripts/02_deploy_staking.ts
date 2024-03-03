import "@nomiclabs/hardhat-ethers";
import hre, { ethers } from "hardhat";
import fs from "fs";
import { TestToken, PawFiStaking, PawFiStaking__factory } from "../src/types";
import config from "../config";

async function main() {
    if (hre.network.name != "sepolia" && hre.network.name != "mainnet") {
        console.error("Wrong network");
        process.exit(1);
    }

    const users = await hre.ethers.getSigners();
    const deployer = users[0];
    var stakingTokenConfig;
    var rewardTokenConfig;
    if (hre.network.name == 'mainnet') {
        stakingTokenConfig = config[hre.network.name].StakingToken;
        rewardTokenConfig = config[hre.network.name].RewardToken;
    }
    else {
        stakingTokenConfig = config[hre.network.name].TestToken;
        rewardTokenConfig = config[hre.network.name].TestToken;
    }
    const stakingConfig = config[hre.network.name].PawFiStaking;

    var stakingFactory: PawFiStaking__factory;
    var staking: PawFiStaking;
    var stakingToken: TestToken;
    var rewardToken: TestToken;

    stakingFactory = await hre.ethers.getContractFactory("PawFiStaking") as PawFiStaking__factory;

    // Token
    if (stakingTokenConfig.address != "" && rewardTokenConfig.address != "") {
        console.log("Reusing StakingToken at: ", stakingTokenConfig.address);
        console.log("Reusing RewardToken at: ", rewardTokenConfig.address);
        stakingToken = await hre.ethers.getContractAt("TestToken", stakingTokenConfig.address) as TestToken;
        rewardToken = await hre.ethers.getContractAt("TestToken", rewardTokenConfig.address) as TestToken;
    }
    else {
        throw Error('Tokens not deployed');
    }

    // Staking
    if (stakingConfig.address != "") {
        console.log("Reusing PawFiStaking at: ", stakingConfig.address)
        staking = await hre.ethers.getContractAt("PawFiStaking", stakingConfig.address) as PawFiStaking;
    }
    else {
        console.log("Deploying PawFiStaking contract...");
        staking = await stakingFactory.deploy(
            rewardToken.address,
            stakingToken.address,
            5,
            hre.ethers.utils.parseEther("10000")
        ) as PawFiStaking;
        console.log("PawFiStaking deployed at:", staking.address);

        const _config = config;
        _config[hre.network.name].PawFiStaking.address = staking.address;
        fs.writeFileSync('./config/data.json', JSON.stringify(_config, null, 2));
        console.log('Config updated');
    }


    if (hre.network.name == "sepolia") {
        // Unpause
        try {
            console.log('Unpausing...');
            await staking.connect(deployer).unpause();
            console.log('Unpaused!');
        }
        catch (err) {
            console.error('[FAIL] Unpause Failed');
            console.error(err);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

