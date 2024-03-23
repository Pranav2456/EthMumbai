import { use, expect } from "chai";
import { ethers, waffle } from "hardhat";
import { ProxyWebtoon, ProxyWebtoon__factory, Webtoon, Webtoon__factory, Marketplace, Marketplace__factory } from "../src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { setupUsers } from "./utils";
use(waffle.solidity);

type User = { address: string } & { webtoon: Webtoon, proxyWebtoon: ProxyWebtoon, marketplace: Marketplace };

describe('03-Marketplace', () => {
    let users: User[], owner: User, _owner: SignerWithAddress, artist: User, admin: User;
    let webtoon: Webtoon, proxyWebtoon: ProxyWebtoon, marketplace: Marketplace;

    const tokenURI = "ipfs://some-uri-here";

    beforeEach(async () => {
        const signers = await ethers.getSigners();
        _owner = signers[0];

        // Webtoon
        const webtoonFactory = await ethers.getContractFactory("Webtoon") as Webtoon__factory;
        webtoon = await (await webtoonFactory.deploy()).deployed() as Webtoon;

        // Proxy Webtoon
        const proxyWebtoonFactory = await ethers.getContractFactory("ProxyWebtoon") as ProxyWebtoon__factory;
        proxyWebtoon = await (await proxyWebtoonFactory.deploy()).deployed() as ProxyWebtoon;

        // Marketplace
        const marketplaceFactory = await ethers.getContractFactory("Marketplace") as Marketplace__factory;
        marketplace = await (await marketplaceFactory.deploy(webtoon.address, proxyWebtoon.address)).deployed() as Marketplace;

        // User Setup
        const addresses = await Promise.all(signers.map(async signer => signer.getAddress()));
        users = await setupUsers(addresses, { webtoon, proxyWebtoon, marketplace });
        owner = users[0];
        admin = users[1];
        artist = users[2];
        users.splice(0, 3);

        // Owner Actions
        await owner.webtoon.setAdmin(admin.address, true);
        await owner.webtoon.setAdmin(artist.address, true);
        await owner.proxyWebtoon.setAdmin(admin.address, true);
        await owner.proxyWebtoon.setAdmin(marketplace.address, true);
        await owner.marketplace.setAdmin(admin.address, true);
    });

    describe("Deployment Tests", async () => {
        it("should have correct webtoon contract", async () => {
            const webtoonContract = await marketplace.webtoon();
            expect(webtoonContract).to.be.equal(webtoon.address);
        });
        it("should have correct proxy webtoon contract", async () => {
            const proxyWebtoonContract = await marketplace.proxyWebtoon();
            expect(proxyWebtoonContract).to.be.equal(proxyWebtoon.address);
        });
    });

    describe("Access Tests", async () => {
        describe("Admin", async () => {
            it("owner should be able to set admin", async () => {
                const newAdmin = users[0];
                await expect(owner.marketplace.setAdmin(newAdmin.address, true))
                    .to.emit(marketplace, "AdminSet")
                    .withArgs(newAdmin.address, true);
                expect(await marketplace.isAdmin(newAdmin.address)).to.be.equal(true);
                await expect(owner.marketplace.setAdmin(newAdmin.address, false))
                    .to.emit(marketplace, "AdminSet")
                    .withArgs(newAdmin.address, false);
                expect(await marketplace.isAdmin(newAdmin.address)).to.be.equal(false);
            });
            it("non-owner should not be able to set admin", async () => {
                const user = users[0];
                await expect(user.marketplace.setAdmin(user.address, true))
                    .to.be.revertedWith("OwnableUnauthorizedAccount");
            });
            it("admin should not be able to set admin", async () => {
                const user = users[0];
                await expect(admin.marketplace.setAdmin(user.address, true))
                    .to.be.revertedWith("OwnableUnauthorizedAccount");
            });
        });
        describe('Pausable', async () => {
            it('owner should be able to pause/unpause', async () => {
                await expect(owner.marketplace.pause())
                    .to.be.emit(marketplace, 'Paused');
                expect(await marketplace.paused()).to.be.true;
                await expect(owner.marketplace.unpause())
                    .to.be.emit(marketplace, 'Unpaused');
                expect(await marketplace.paused()).to.be.false;
            });
            it('admin should be able to pause/unpause', async () => {
                await expect(admin.marketplace.pause())
                    .to.be.emit(marketplace, 'Paused');
                expect(await marketplace.paused()).to.be.true;
                await expect(admin.marketplace.unpause())
                    .to.be.emit(marketplace, 'Unpaused');
                expect(await marketplace.paused()).to.be.false;
            });
            it('user should not be able to pause/unpause', async () => {
                const user = users[0];
                await expect(user.marketplace.pause())
                    .to.be.revertedWith('Unauthorized');
                expect(await marketplace.paused()).to.be.false;
                await expect(user.marketplace.unpause())
                    .to.be.revertedWith('Unauthorized');
                expect(await marketplace.paused()).to.be.false;
            });
        });
    });

    describe("Listing Tests", async () => {
        beforeEach(async () => {
            await artist.webtoon.mint(artist.address, tokenURI);
        });
        it("owner should be able to list", async () => {
            const price = ethers.utils.parseEther("1");
            const tokenId = 1;
            await expect(owner.marketplace.list(tokenId, artist.address, price))
                .to.emit(marketplace, "Listed")
                .withArgs(tokenId, artist.address, price);
            const listing = await marketplace.listings(tokenId);
            expect(listing.beneficiary).to.be.equal(artist.address);
            expect(listing.price).to.be.equal(price);
        });
        it("admin should be able to list", async () => {
            const price = ethers.utils.parseEther("1");
            const tokenId = 1;
            await expect(admin.marketplace.list(tokenId, artist.address, price))
                .to.emit(marketplace, "Listed")
                .withArgs(tokenId, artist.address, price);
            const listing = await marketplace.listings(tokenId);
            expect(listing.beneficiary).to.be.equal(artist.address);
            expect(listing.price).to.be.equal(price);
        });
        it("artist should be able to list", async () => {
            const price = ethers.utils.parseEther("1");
            const tokenId = 1;
            await expect(artist.marketplace.list(tokenId, artist.address, price))
                .to.emit(marketplace, "Listed")
                .withArgs(tokenId, artist.address, price);
            const listing = await marketplace.listings(tokenId);
            expect(listing.beneficiary).to.be.equal(artist.address);
            expect(listing.price).to.be.equal(price);
        });
        it("user should not be able to list", async () => {
            const price = ethers.utils.parseEther("1");
            const tokenId = 1;
            const user = users[0];
            await expect(user.marketplace.list(tokenId, artist.address, price))
                .to.be.revertedWith("Unauthorized")
        });
        it("should not be able to list with invalid beneficiary", async () => {
            const price = ethers.utils.parseEther("1");
            const tokenId = 1;
            await expect(owner.marketplace.list(tokenId, ethers.constants.AddressZero, price))
                .to.be.revertedWith("InvalidAddress")
        });
        it("should not be able to list invalid token", async () => {
            const price = ethers.utils.parseEther("1");
            const tokenId = 2;
            const user = users[0];
            await expect(user.marketplace.list(tokenId, artist.address, price))
                .to.be.revertedWith("ERC721NonexistentToken")
        });
    });

    describe("Price Update Tests", async () => {
        beforeEach(async () => {
            await artist.webtoon.mint(artist.address, tokenURI);
            await artist.marketplace.list(1, artist.address, ethers.utils.parseEther("1"));
        });
        it("owner should be able to update price", async () => {
            const newPrice = ethers.utils.parseEther("2");
            const tokenId = 1;
            await expect(owner.marketplace.updatePrice(tokenId, newPrice))
                .to.emit(marketplace, "PriceUpdated")
                .withArgs(tokenId, newPrice);
        });
        it("admin should be able to update price", async () => {
            const newPrice = ethers.utils.parseEther("2");
            const tokenId = 1;
            await expect(admin.marketplace.updatePrice(tokenId, newPrice))
                .to.emit(marketplace, "PriceUpdated")
                .withArgs(tokenId, newPrice);
        });
        it("artist should be able to update price", async () => {
            const newPrice = ethers.utils.parseEther("2");
            const tokenId = 1;
            await expect(artist.marketplace.updatePrice(tokenId, newPrice))
                .to.emit(marketplace, "PriceUpdated")
                .withArgs(tokenId, newPrice);
        });
        it("user should not be able to update price", async () => {
            const newPrice = ethers.utils.parseEther("2");
            const tokenId = 1;
            const user = users[0];
            await expect(user.marketplace.updatePrice(tokenId, newPrice))
                .to.be.revertedWith("Unauthorized");
        });
    });

    describe("Purchase Tests", async () => {
        beforeEach(async () => {
            await artist.webtoon.mint(artist.address, tokenURI);
            await artist.marketplace.list(1, artist.address, ethers.utils.parseEther("1"));
        });
        it("should be able to purchase with sufficient value", async () => {
            const buyer = users[0];
            const tokenId = 1;
            const listing = await marketplace.listings(tokenId);

            const buyerPrevBalance = await ethers.provider.getBalance(buyer.address);
            const artistPrevBalance = await ethers.provider.getBalance(artist.address);

            const tx = await buyer.marketplace.purchase(tokenId, { value: listing.price });

            await expect(tx)
                .to.emit(marketplace, "Sold")
                .withArgs(tokenId, listing.beneficiary, buyer.address, listing.price);

            const txn = await tx.wait();
            const gas = (txn.gasUsed.mul(txn.effectiveGasPrice));

            const buyerNextBalance = await ethers.provider.getBalance(buyer.address);
            const artistNextBalance = await ethers.provider.getBalance(artist.address);

            expect(buyerNextBalance).to.be.equal((buyerPrevBalance.sub(gas)).sub(listing.price));
            expect(artistNextBalance).to.be.equal(artistPrevBalance.add(listing.price));
            expect(await proxyWebtoon.balanceOf(buyer.address, tokenId)).to.be.equal(1);
        });
        it("should be able to purchase with extra value", async () => {
            const buyer = users[0];
            const tokenId = 1;
            const listing = await marketplace.listings(tokenId);
            const extraAmount = ethers.utils.parseEther("1");

            const buyerPrevBalance = await ethers.provider.getBalance(buyer.address);
            const artistPrevBalance = await ethers.provider.getBalance(artist.address);

            const tx = await buyer.marketplace.purchase(tokenId, { value: listing.price.add(extraAmount) });

            await expect(tx)
                .to.emit(marketplace, "Sold")
                .withArgs(tokenId, listing.beneficiary, buyer.address, listing.price);

            const txn = await tx.wait();
            const gas = (txn.gasUsed.mul(txn.effectiveGasPrice));

            const buyerNextBalance = await ethers.provider.getBalance(buyer.address);
            const artistNextBalance = await ethers.provider.getBalance(artist.address);

            expect(buyerNextBalance).to.be.equal((buyerPrevBalance.sub(gas)).sub(listing.price));
            expect(artistNextBalance).to.be.equal(artistPrevBalance.add(listing.price));
            expect(await proxyWebtoon.balanceOf(buyer.address, tokenId)).to.be.equal(1);
        });
        it("should not be able to purchase with insufficient value", async () => {
            const buyer = users[0];
            const tokenId = 1;
            const listing = await marketplace.listings(tokenId);

            await expect(buyer.marketplace.purchase(tokenId, { value: listing.price.sub(1) }))
                .to.be.revertedWith("InsufficientValue");
        });
        it("should not be able to purchase when paused", async () => {
            await owner.marketplace.pause();

            const buyer = users[0];
            const tokenId = 1;
            const listing = await marketplace.listings(tokenId);

            await expect(buyer.marketplace.purchase(tokenId, { value: listing.price }))
                .to.be.revertedWith("EnforcedPause");
        });
        it("should not be able to purchase when not listed", async () => {
            const buyer = users[0];
            const tokenId = 2;
            const listing = await marketplace.listings(tokenId);

            await expect(buyer.marketplace.purchase(tokenId, { value: listing.price }))
                .to.be.revertedWith("NotListed");
        });
        it("should not be able to purchase multiple", async () => {
            const buyer = users[0];
            const tokenId = 1;
            const listing = await marketplace.listings(tokenId);

            await buyer.marketplace.purchase(tokenId, { value: listing.price });

            await expect(buyer.marketplace.purchase(tokenId, { value: listing.price }))
                .to.be.revertedWith("DuplicatePurchase");
        });
    });

    describe("Delisting Tests", async () => {
        beforeEach(async () => {
            await artist.webtoon.mint(artist.address, tokenURI);
            await artist.marketplace.list(1, artist.address, ethers.utils.parseEther("1"));
        });
        it("owner should be able to delist", async () => {
            const tokenId = 1;

            await expect(owner.marketplace.delist(tokenId))
                .to.emit(marketplace, "Delisted")
                .withArgs(tokenId);

            const listing = await marketplace.listings(tokenId);
            expect(listing.beneficiary).to.be.equal(ethers.constants.AddressZero);
            expect(listing.price).to.be.equal(0);
        });
        it("admin should be able to delist", async () => {
            const tokenId = 1;

            await expect(admin.marketplace.delist(tokenId))
                .to.emit(marketplace, "Delisted")
                .withArgs(tokenId);

            const listing = await marketplace.listings(tokenId);
            expect(listing.beneficiary).to.be.equal(ethers.constants.AddressZero);
            expect(listing.price).to.be.equal(0);
        });
        it("artist should be able to delist", async () => {
            const tokenId = 1;

            await expect(artist.marketplace.delist(tokenId))
                .to.emit(marketplace, "Delisted")
                .withArgs(tokenId);

            const listing = await marketplace.listings(tokenId);
            expect(listing.beneficiary).to.be.equal(ethers.constants.AddressZero);
            expect(listing.price).to.be.equal(0);
        });
        it("user should not be able to delist", async () => {
            const tokenId = 1;
            const user = users[0];

            await expect(user.marketplace.delist(tokenId))
                .to.be.revertedWith("Unauthorized");
        });
    });
});