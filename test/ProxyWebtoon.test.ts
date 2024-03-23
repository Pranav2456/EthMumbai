import { use, expect } from "chai";
import { ethers, waffle } from "hardhat";
import { ProxyWebtoon, ProxyWebtoon__factory, Webtoon, Webtoon__factory } from "../src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { setupUsers } from "./utils";
use(waffle.solidity);

type User = { address: string } & { webtoon: Webtoon, proxyWebtoon: ProxyWebtoon };

describe('02-ProxyWebtoon', () => {
    let users: User[], owner: User, _owner: SignerWithAddress, admin: User;
    let webtoon: Webtoon, proxyWebtoon: ProxyWebtoon;

    beforeEach(async () => {
        const signers = await ethers.getSigners();
        _owner = signers[0];

        // Webtoon
        const webtoonFactory = await ethers.getContractFactory("Webtoon") as Webtoon__factory;
        webtoon = await (await webtoonFactory.deploy()).deployed() as Webtoon;

        // Proxy Webtoon
        const proxyWebtoonFactory = await ethers.getContractFactory("ProxyWebtoon") as ProxyWebtoon__factory;
        proxyWebtoon = await (await proxyWebtoonFactory.deploy()).deployed() as ProxyWebtoon;

        // User Setup
        const addresses = await Promise.all(signers.map(async signer => signer.getAddress()));
        users = await setupUsers(addresses, { webtoon, proxyWebtoon });
        owner = users[0];
        admin = users[1];
        users.splice(0, 2);

        // Owner Actions
        await owner.webtoon.setAdmin(admin.address, true);
        await owner.proxyWebtoon.setAdmin(admin.address, true);
    });

    describe("Access Tests", async () => {
        describe("Admin", async () => {
            it("owner should be able to set admin", async () => {
                const newAdmin = users[0];
                await expect(owner.proxyWebtoon.setAdmin(newAdmin.address, true))
                    .to.emit(proxyWebtoon, "AdminSet")
                    .withArgs(newAdmin.address, true);
                expect(await proxyWebtoon.isAdmin(newAdmin.address)).to.be.equal(true);
                await expect(owner.proxyWebtoon.setAdmin(newAdmin.address, false))
                    .to.emit(proxyWebtoon, "AdminSet")
                    .withArgs(newAdmin.address, false);
                expect(await proxyWebtoon.isAdmin(newAdmin.address)).to.be.equal(false);
            });
            it("non-owner should not be able to set admin", async () => {
                const user = users[0];
                await expect(user.proxyWebtoon.setAdmin(user.address, true))
                    .to.be.revertedWith("OwnableUnauthorizedAccount");
            });
            it("admin should not be able to set admin", async () => {
                const user = users[0];
                await expect(admin.proxyWebtoon.setAdmin(user.address, true))
                    .to.be.revertedWith("OwnableUnauthorizedAccount");
            });
        });
        describe('Pausable', async () => {
            it('owner should be able to pause/unpause', async () => {
                await expect(owner.proxyWebtoon.pause())
                    .to.be.emit(proxyWebtoon, 'Paused');
                expect(await proxyWebtoon.paused()).to.be.true;
                await expect(owner.proxyWebtoon.unpause())
                    .to.be.emit(proxyWebtoon, 'Unpaused');
                expect(await proxyWebtoon.paused()).to.be.false;
            });
            it('admin should be able to pause/unpause', async () => {
                await expect(admin.proxyWebtoon.pause())
                    .to.be.emit(proxyWebtoon, 'Paused');
                expect(await proxyWebtoon.paused()).to.be.true;
                await expect(admin.proxyWebtoon.unpause())
                    .to.be.emit(proxyWebtoon, 'Unpaused');
                expect(await proxyWebtoon.paused()).to.be.false;
            });
            it('user should not be able to pause/unpause', async () => {
                const user = users[0];
                await expect(user.proxyWebtoon.pause())
                    .to.be.revertedWith('Unauthorized');
                expect(await proxyWebtoon.paused()).to.be.false;
                await expect(user.proxyWebtoon.unpause())
                    .to.be.revertedWith('Unauthorized');
                expect(await proxyWebtoon.paused()).to.be.false;
            });
        });
    });


    describe("Minting Tests", async () => {
        it("owner should be able to mint", async () => {
            const user = users[0];
            const uri = "ipfs://some-uri-here";
            const tokenId = 1;
            await expect(owner.proxyWebtoon.mint(user.address, tokenId, uri))
                .to.emit(proxyWebtoon, "Minted")
                .withArgs(user.address, 1, uri)
                .to.emit(proxyWebtoon, "TransferSingle")
                .withArgs(owner.address, ethers.constants.AddressZero, user.address, tokenId, 1);

            expect(await proxyWebtoon.balanceOf(user.address, tokenId)).to.be.equal(1);
            expect(await proxyWebtoon.uri(tokenId)).to.be.equal(uri);
        });
        it("admin should be able to mint", async () => {
            const user = users[0];
            const uri = "ipfs://some-uri-here";
            const tokenId = 1;
            await expect(admin.proxyWebtoon.mint(user.address, tokenId, uri))
                .to.emit(proxyWebtoon, "Minted")
                .withArgs(user.address, 1, uri)
                .to.emit(proxyWebtoon, "TransferSingle")
                .withArgs(admin.address, ethers.constants.AddressZero, user.address, tokenId, 1);

            expect(await proxyWebtoon.balanceOf(user.address, tokenId)).to.be.equal(1);
            expect(await proxyWebtoon.uri(tokenId)).to.be.equal(uri);
        });
        it("user should not be able to mint", async () => {
            const user = users[0];
            const uri = "ipfs://some-uri-here";
            const tokenId = 1;
            await expect(user.proxyWebtoon.mint(user.address, tokenId, uri))
                .to.be.revertedWith("Unauthorized");
        });
        it("should not be able to mint if paused", async () => {
            await owner.proxyWebtoon.pause();
            const user = users[0];
            const uri = "ipfs://some-uri-here";
            const tokenId = 1;
            await expect(admin.proxyWebtoon.mint(user.address, tokenId, uri))
                .to.be.revertedWith("EnforcedPause");
        });
    });

    describe("Approval Tests", async () => {
        beforeEach(async () => {
            await admin.proxyWebtoon.mint(users[0].address, 1, "some-uri");
        });
        it("holder should be able to approve for all", async () => {
            const user = users[0];
            const spender = users[1];
            await expect(user.proxyWebtoon.setApprovalForAll(spender.address, true))
                .to.emit(proxyWebtoon, "ApprovalForAll")
                .withArgs(user.address, spender.address, true);
            expect(await proxyWebtoon.isApprovedForAll(user.address, spender.address)).to.be.true;

            await expect(user.proxyWebtoon.setApprovalForAll(spender.address, false))
                .to.emit(proxyWebtoon, "ApprovalForAll")
                .withArgs(user.address, spender.address, false);
            expect(await proxyWebtoon.isApprovedForAll(user.address, spender.address)).to.be.false;
        });
    });

    describe("Transfer Tests", async () => {
        beforeEach(async () => {
            await admin.proxyWebtoon.mint(users[0].address, 1, "some-uri");
        });
        it("holder should be able to transfer", async () => {
            const holder = users[0];
            const user = users[1];
            await expect(holder.proxyWebtoon.safeTransferFrom(holder.address, user.address, 1, 1, ethers.constants.HashZero))
                .to.emit(proxyWebtoon, "TransferSingle")
                .withArgs(holder.address, holder.address, user.address, 1, 1);
            expect(await proxyWebtoon.balanceOf(user.address, 1)).to.be.equal(1);
            expect(await proxyWebtoon.balanceOf(holder.address, 1)).to.be.equal(0);
        });
        it("approved should be able to transfer", async () => {
            const holder = users[0];
            const user = users[1];
            await holder.proxyWebtoon.setApprovalForAll(user.address, true);
            await expect(user.proxyWebtoon.safeTransferFrom(holder.address, user.address, 1, 1, ethers.constants.HashZero))
                .to.emit(proxyWebtoon, "TransferSingle")
                .withArgs(user.address, holder.address, user.address, 1, 1);
            expect(await proxyWebtoon.balanceOf(user.address, 1)).to.be.equal(1);
            expect(await proxyWebtoon.balanceOf(holder.address, 1)).to.be.equal(0);
        });
        it("non-approved should not be able to transfer", async () => {
            const holder = users[0];
            const user = users[1];
            await expect(user.proxyWebtoon.safeTransferFrom(holder.address, user.address, 1, 1, ethers.constants.HashZero))
                .to.be.revertedWith("ERC1155MissingApprovalForAll");
        });
    });

});

