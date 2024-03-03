import { ethers, network } from "hardhat";
import { expect } from "chai";
import {
    TestToken,
    TestToken__factory,
    PawFiStaking,
    PawFiStaking__factory,
} from "../src/types";
import { setupUsers } from './utils';
import { Signer, BigNumber } from "ethers";

const { parseEther } = ethers.utils;

type User =
    { address: string } &
    {
        stakingToken: TestToken,
        rewardToken: TestToken,
        staking: PawFiStaking
    }

describe("PawFiStaking.sol", () => {
    let staking: PawFiStaking;
    let stakingToken: TestToken;
    let rewardToken: TestToken;
    let users: User[];
    let owner: User;
    let alice: User;
    let bob: User;
    let rewardAmount: BigNumber;
    let duration: number;
    let cap: BigNumber;

    beforeEach(async () => {
        rewardAmount = parseEther("100"); // 100 tokens
        cap = parseEther("100"); // 100 tokens
        duration = 1; // 1 day
        // Token
        const tokenFactory = await ethers.getContractFactory("TestToken") as TestToken__factory;
        stakingToken = await (await tokenFactory.deploy()).deployed() as TestToken;
        rewardToken = await (await tokenFactory.deploy()).deployed() as TestToken;
        // Staking
        const stakingFactory = await ethers.getContractFactory("PawFiStaking") as PawFiStaking__factory;
        staking = await (await stakingFactory.deploy(rewardToken.address, stakingToken.address, duration, cap)).deployed() as PawFiStaking;
        // User Setup
        const signers = await ethers.getSigners();
        const addresses = await Promise.all(signers.map(async signer => signer.getAddress()));
        users = await setupUsers(addresses, { rewardToken, stakingToken, staking });
        owner = users[0];
        alice = users[1];
        bob = users[2];
        users.splice(0, 3);
    });

    describe("Deployment tests", () => {
        it("deploys with correct params", async () => {
            expect(await staking.sToken()).eq(stakingToken.address);
            expect(await staking.rToken()).eq(rewardToken.address);
            expect(await staking.endTime()).eq(0);
            expect(await staking.duration()).eq(duration * 86400);
        });
        it("doesn't deploy with incorrect params", async () => {
            const stakingFactory = await ethers.getContractFactory("PawFiStaking") as PawFiStaking__factory;
            await expect(stakingFactory.deploy(stakingToken.address, rewardToken.address, 0, cap)).to.be.revertedWith(
                "PawFiStaking: Duration must be greater 0"
            );
        });
    });

    describe("Emergency tests", () => {
        it("owner should be able to withdraw tokens", async () => {
            await owner.stakingToken.transfer(alice.address, parseEther("100"));
            await alice.stakingToken.approve(staking.address, parseEther("10"));
            await alice.staking.stake(parseEther("10"));
            const withdrawAmount = await stakingToken.balanceOf(staking.address);
            const ownerBalance = await stakingToken.balanceOf(owner.address);
            await owner.staking.withdrawERC20(stakingToken.address, withdrawAmount);
            expect(await stakingToken.balanceOf(owner.address))
                .to.be.equal(ownerBalance.add(withdrawAmount));
        });
        it("owner should be able set cap", async () => {
            const newCap = parseEther("200");
            await owner.staking.setCap(newCap);
            expect(await staking.cap()).to.be.equal(newCap);
        })
    });

    describe("Staking tests", () => {
        beforeEach(async () => {
            await advanceTime(20);
            await rewardToken.approve(staking.address, rewardAmount);
        });

        it("doesn't allow to stake without enough balance/approval of staking tokens", async () => {
            await staking.initiateStaking(rewardAmount);
            await stakingToken.transfer(alice.address, parseEther("10"));
            await expect(alice.staking.stake(parseEther("10"))).to.be.revertedWith(
                "ERC20: insufficient allowance"
            );
            await alice.stakingToken.approve(staking.address, parseEther("20"));
            await expect(alice.staking.stake(parseEther("20"))).to.be.revertedWith(
                "ERC20: transfer amount exceeds balance"
            );
        });
        it("allows only owner to pause", async () => {
            await expect(alice.staking.pause()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(staking.pause()).to.emit(staking, "Paused").withArgs(owner.address);
        });
        it("allows only owner to unpause", async () => {
            await expect(staking.pause()).to.emit(staking, "Paused").withArgs(owner.address);
            await expect(alice.staking.unpause()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(staking.unpause()).to.emit(staking, "Unpaused").withArgs(owner.address);
        });
        describe("Rewards Test", () => {
            beforeEach(async () => {
                await staking.initiateStaking(rewardAmount);
                await stakingToken.transfer(alice.address, parseEther("10000000"));
                await stakingToken.transfer(bob.address, parseEther("10000000"));
                await stakingToken.approve(staking.address, ethers.constants.MaxUint256);
                await alice.stakingToken.approve(staking.address, ethers.constants.MaxUint256);
                await bob.stakingToken.approve(staking.address, ethers.constants.MaxUint256);
            });
            it("allows alice to stake", async () => {
                const stakingTokenBalance = await stakingToken.balanceOf(alice.address);
                await alice.staking.stake(parseEther("10"));
                expect(await stakingToken.balanceOf(alice.address)).eq(stakingTokenBalance.sub(parseEther("10")));
            });
            it("allows alice and bob to stake", async () => {
                await alice.staking.stake(parseEther("20"));
                await bob.staking.stake(parseEther("10"));
            });
            it("reward check, case: alice stakes at the beginning", async () => {
                await alice.staking.stake(parseEther("10"));
                await advanceTime(43200);
                expect(await staking.earned(alice.address))
                    .gt(parseEther("49"))
                    .lt(parseEther("51"));
                await advanceTime(43200);
                expect(await staking.earned(alice.address)).gt(parseEther("99"));
            });
            it("reward check, case: bob joins in halfway", async () => {
                await alice.staking.stake(parseEther("10"));
                await advanceTime(43200);
                await bob.staking.stake(parseEther("10"));
                await advanceTime(43200);
                expect(await staking.earned(alice.address))
                    .gt(parseEther("74"))
                    .lt(parseEther("76"));
                expect(await staking.earned(bob.address))
                    .gt(parseEther("24"))
                    .lt(parseEther("26"));
            });
            it("reward check, case: owner stakes mid firsthalf, alice at mid, bob at mid secondhalf", async () => {
                await advanceTime(21600);
                await staking.stake(parseEther("10"));
                await advanceTime(21600);
                await alice.staking.stake(parseEther("20"));
                await advanceTime(21600);
                await bob.staking.stake(parseEther("30"));
                await advanceTime(21600);
                expect(await staking.earned(owner.address))
                    .gt(parseEther("37"))
                    .lt(parseEther("38"));
                expect(await staking.earned(alice.address))
                    .gt(parseEther("24"))
                    .lt(parseEther("25"));
                expect(await staking.earned(bob.address))
                    .gt(parseEther("12"))
                    .lt(parseEther("13"));
            });
            it("throws when attempting to stake if paused", async () => {
                await staking.pause();
                await expect(alice.staking.stake(parseEther("10"))).to.be.revertedWith(
                    "Pausable: paused"
                );
            });
            it("throws when attempting to stake 0", async () => {
                await expect(alice.staking.stake(parseEther("0"))).to.be.revertedWith(
                    "PawFiStaking: Cannot stake 0"
                );
            });
            it("throws when attempting to stake after cap is hit", async () => {
                await alice.staking.stake(parseEther("98"));
                await expect(alice.staking.stake(parseEther("10"))).to.be.revertedWith(
                    "PawFiStaking: Cap reached"
                );
            });
            it("throws when attempting to withdraw when paused", async () => {
                await alice.staking.stake(parseEther("10"));
                await advanceTime(86400);
                await staking.pause();
                await expect(alice.staking.exit()).to.be.revertedWith("Pausable: paused");
            });
            it("withdraws reward", async () => {
                await alice.staking.stake(parseEther("10"));
                await advanceTime(43200);
                await bob.staking.stake(parseEther("10"));
                await advanceTime(43200);
                const aliceStakingTokenBalance = await stakingToken.balanceOf(alice.address);
                const bobStakingTokenBalance = await stakingToken.balanceOf(bob.address);
                const aliceRewardTokenBalance = await rewardToken.balanceOf(alice.address);
                const bobRewardTokenBalance = await rewardToken.balanceOf(bob.address);
                await alice.staking.exit();
                await bob.staking.exit();
                expect(await rewardToken.balanceOf(alice.address)).gt(aliceRewardTokenBalance.add(parseEther("74")));
                expect(await rewardToken.balanceOf(bob.address)).gt(bobRewardTokenBalance.add(parseEther("24")));
            });
            it("throws on withdraw before stopTime", async () => {
                await alice.staking.stake(parseEther("10"));
                await advanceTime(43200);
                await expect(alice.staking.exit()).to.be.revertedWith(
                    "PawFiStaking: Staking period hasn't ended"
                );
            });
            it("doesn't allow to withdraw if didn't participate in staking", async () => {
                await advanceTime(86400);
                await expect(alice.staking.exit()).to.be.revertedWith("Cannot withdraw 0");
            });
            it("doesn't allow to rewithdraw", async () => {
                await alice.staking.stake(parseEther("10"));
                await advanceTime(86400);
                await alice.staking.exit();
                await expect(alice.staking.exit()).to.be.revertedWith("Cannot withdraw 0");
            });
            it("earned returns 0 when already withdrawn", async () => {
                await alice.staking.stake(parseEther("10"));
                await advanceTime(86400);
                await alice.staking.exit();
                expect(await staking.earned(alice.address)).eq(0);
            });
        });
    });

});

/**
 * Advance block timestamp
 */
async function advanceTime(seconds: number) {
    await network.provider.send("evm_increaseTime", [seconds]);
    await network.provider.send("evm_mine");
}

function now() {
    return Math.round(Date.now() / 1000);
}