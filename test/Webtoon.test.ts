import { use, expect } from "chai";
import { ethers, waffle } from "hardhat";
import { Webtoon, Webtoon__factory } from "../src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { setupUsers } from "./utils";
use(waffle.solidity);

type User = { address: string } & { webtoon: Webtoon };

describe("01-Webtoon", function () {
    let users: User[], owner: User, _owner: SignerWithAddress, admin: User, artist: User;
    let webtoon: Webtoon;

    beforeEach(async () => {
        const signers = await ethers.getSigners();
        _owner = signers[0];

        // Webtoon
        const webtoonFactory = await ethers.getContractFactory("Webtoon") as Webtoon__factory;
        webtoon = await (await webtoonFactory.deploy()).deployed() as Webtoon;

        // User Setup
        const addresses = await Promise.all(signers.map(async signer => signer.getAddress()));
        users = await setupUsers(addresses, { webtoon });
        owner = users[0];
        admin = users[1];
        artist = users[2];
        users.splice(0, 3);

        // Owner Actions
        await owner.webtoon.setAdmin(admin.address, true);
        await owner.webtoon.setAdmin(artist.address, true);
    });

    describe("Deployment Tests", () => {
        it("should have correct name", async () => {
            const name = await webtoon.name();
            expect(name).to.be.equal("Webtoon");
        });
        it("should have correct symbol", async () => {
            const name = await webtoon.symbol();
            expect(name).to.be.equal("TOON");
        });
        it("should have correct owner", async () => {
            const name = await webtoon.owner();
            expect(name).to.be.equal(owner.address);
        });
    });

    describe("Access Tests", async () => {
        describe("Admin", async () => {
            it("owner should be able to set admin", async () => {
                const newAdmin = users[0];
                await expect(owner.webtoon.setAdmin(newAdmin.address, true))
                    .to.emit(webtoon, "AdminSet")
                    .withArgs(newAdmin.address, true);
                expect(await webtoon.isAdmin(newAdmin.address)).to.be.equal(true);
                await expect(owner.webtoon.setAdmin(newAdmin.address, false))
                    .to.emit(webtoon, "AdminSet")
                    .withArgs(newAdmin.address, false);
                expect(await webtoon.isAdmin(newAdmin.address)).to.be.equal(false);
            });
            it("non-owner should not be able to set admin", async () => {
                const user = users[0];
                await expect(user.webtoon.setAdmin(user.address, true))
                    .to.be.revertedWith("OwnableUnauthorizedAccount");
            });
            it("admin should not be able to set admin", async () => {
                const user = users[0];
                await expect(admin.webtoon.setAdmin(user.address, true))
                    .to.be.revertedWith("OwnableUnauthorizedAccount");
            });
        });
        describe('Pausable', async () => {
            it('owner should be able to pause/unpause', async () => {
                await expect(owner.webtoon.pause())
                    .to.be.emit(webtoon, 'Paused');
                expect(await webtoon.paused()).to.be.true;
                await expect(owner.webtoon.unpause())
                    .to.be.emit(webtoon, 'Unpaused');
                expect(await webtoon.paused()).to.be.false;
            });
            it('admin should be able to pause/unpause', async () => {
                await expect(admin.webtoon.pause())
                    .to.be.emit(webtoon, 'Paused');
                expect(await webtoon.paused()).to.be.true;
                await expect(admin.webtoon.unpause())
                    .to.be.emit(webtoon, 'Unpaused');
                expect(await webtoon.paused()).to.be.false;
            });
            it('user should not be able to pause/unpause', async () => {
                const user = users[0];
                await expect(user.webtoon.pause())
                    .to.be.revertedWith('Unauthorized');
                expect(await webtoon.paused()).to.be.false;
                await expect(user.webtoon.unpause())
                    .to.be.revertedWith('Unauthorized');
                expect(await webtoon.paused()).to.be.false;
            });
        });
    });

    describe("Minting Tests", async () => {
        it("owner should be able to mint", async () => {
            const user = users[0];
            const uri = "ipfs://some-uri-here";
            await expect(owner.webtoon.mint(user.address, uri))
                .to.emit(webtoon, "Minted")
                .withArgs(user.address, 1, uri)
                .to.emit(webtoon, "Transfer")
                .withArgs(ethers.constants.AddressZero, user.address, 1);

            expect(await webtoon.balanceOf(user.address)).to.be.equal(1);
            expect(await webtoon.tokenURI(1)).to.be.equal(uri);
        });
        it("admin should be able to mint", async () => {
            const user = users[0];
            const uri = "ipfs://some-uri-here";
            await expect(admin.webtoon.mint(user.address, uri))
                .to.emit(webtoon, "Minted")
                .withArgs(user.address, 1, uri)
                .to.emit(webtoon, "Transfer")
                .withArgs(ethers.constants.AddressZero, user.address, 1);

            expect(await webtoon.balanceOf(user.address)).to.be.equal(1);
            expect(await webtoon.tokenURI(1)).to.be.equal(uri);
        });
        it("artist should be able to mint", async () => {
            const user = users[0];
            const uri = "ipfs://some-uri-here";
            await expect(artist.webtoon.mint(user.address, uri))
                .to.emit(webtoon, "Minted")
                .withArgs(user.address, 1, uri)
                .to.emit(webtoon, "Transfer")
                .withArgs(ethers.constants.AddressZero, user.address, 1);

            expect(await webtoon.balanceOf(user.address)).to.be.equal(1);
            expect(await webtoon.tokenURI(1)).to.be.equal(uri);
        });
        it("user should not be able to mint", async () => {
            const user = users[0];
            const uri = "ipfs://some-uri-here";
            await expect(user.webtoon.mint(user.address, uri))
                .to.be.revertedWith("Unauthorized");
        });
        it("should not be able to mint if paused", async () => {
            await owner.webtoon.pause();
            const uri = "ipfs://some-uri-here";
            await expect(artist.webtoon.mint(artist.address, uri))
                .to.be.revertedWith("EnforcedPause");
        });
    });

    describe("Approval Tests", async () => {
        beforeEach(async () => {
            await artist.webtoon.mint(artist.address, "some-uri");
        });
        it("holder should be able to approve for token", async () => {
            const user = users[0];
            await expect(artist.webtoon.approve(user.address, 1))
                .to.emit(webtoon, "Approval")
                .withArgs(artist.address, user.address, 1);
            expect(await webtoon.getApproved(1)).to.be.equal(user.address);
        });
        it("holder should be able to approve for all", async () => {
            const user = users[0];

            await expect(artist.webtoon.setApprovalForAll(user.address, true))
                .to.emit(webtoon, "ApprovalForAll")
                .withArgs(artist.address, user.address, true);
            expect(await webtoon.isApprovedForAll(artist.address, user.address)).to.be.true;

            await expect(artist.webtoon.setApprovalForAll(user.address, false))
                .to.emit(webtoon, "ApprovalForAll")
                .withArgs(artist.address, user.address, false);
            expect(await webtoon.isApprovedForAll(artist.address, user.address)).to.be.false;
        });
    });

    describe("Transfer Tests", async () => {
        beforeEach(async () => {
            await artist.webtoon.mint(artist.address, "some-uri");
        });
        it("holder should be able to transfer", async () => {
            const user = users[0];
            await expect(artist.webtoon.transferFrom(artist.address, user.address, 1))
                .to.emit(webtoon, "Transfer")
                .withArgs(artist.address, user.address, 1);
            expect(await webtoon.balanceOf(artist.address)).to.be.equal(0);
            expect(await webtoon.balanceOf(user.address)).to.be.equal(1);
        });
        it("approved should be able to transfer", async () => {
            const user = users[0];
            await artist.webtoon.approve(user.address, 1);
            await expect(user.webtoon.transferFrom(artist.address, user.address, 1))
                .to.emit(webtoon, "Transfer")
                .withArgs(artist.address, user.address, 1);
            expect(await webtoon.balanceOf(artist.address)).to.be.equal(0);
            expect(await webtoon.balanceOf(user.address)).to.be.equal(1);
        });
        it("non-approved should not be able to transfer", async () => {
            const user = users[0];
            await expect(user.webtoon.transferFrom(artist.address, user.address, 1))
                .to.be.revertedWith("ERC721InsufficientApproval");
        });
    });
});