import { expect } from "chai";
import { ethers } from "hardhat";
import { Marketplace, Marketplace__factory } from "../src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Webtoon, ProxyWebtoon, Webtoon__factory, ProxyWebtoon__factory } from "../src/types";
import { BigNumber } from "ethers";

describe('Marketplace', () => {
    let erc721Contract: Webtoon;
    let erc1155Contract: ProxyWebtoon;
    let marketplaceContract: Marketplace;
    let owner: SignerWithAddress, seller: SignerWithAddress, buyer: SignerWithAddress, otherAccount: SignerWithAddress;

    beforeEach(async () => {
        // Get signers
        [owner, seller, buyer, otherAccount] = await ethers.getSigners();
        // Deploy ERC721 Contract
        const ERC721Factory = await ethers.getContractFactory('Webtoon');
        erc721Contract = await ERC721Factory.deploy(owner.address) as Webtoon;
        await erc721Contract.deployed();
        console.log("Webtoon deployed to:", erc721Contract.address);

        // Deploy ERC1155 Contract
        const ERC1155Factory = await ethers.getContractFactory('ProxyWebtoon');
        erc1155Contract = await ERC1155Factory.deploy(erc721Contract.address, 'https://example.com/webtoon.json') as ProxyWebtoon;
        await erc1155Contract.deployed();
        console.log("ProxyWebtoon deployed to:", erc1155Contract.address);

        // Deploy the Marketplace Contract
        const MarketplaceFactory = await ethers.getContractFactory('Marketplace');
        marketplaceContract = await MarketplaceFactory.deploy(
            erc721Contract.address,
            erc1155Contract.address,
            250, // 2.5% fee
            owner.address // Fee recipient
        ) as Marketplace;
        await marketplaceContract.deployed();
        console.log("Marketplace deployed to:", marketplaceContract.address);

        // Mint an initial NFT for testing
        await erc721Contract.connect(seller).mint(seller.address, "some-uri");
    });

    describe('list', () => {
        it('Should list an NFT for sale', async () => {
            const tokenId = 0; // Assuming NFT with ID 0 exists
            const listingPrice = ethers.utils.parseEther('1'); // 1 ETH for example

            // Approve marketplace as operator of the NFT (if not already done in beforeEach)
            await erc721Contract.connect(seller).approve(marketplaceContract.address, tokenId);

            // Call list
            await marketplaceContract.connect(seller).list(tokenId, seller.address, listingPrice);

            // Assertions
            const listing = await marketplaceContract.listings(tokenId);
            expect(listing.beneficiary).to.equal(seller.address);
            expect(listing.price).to.equal(listingPrice);

            // Event emission check
            await expect(marketplaceContract.connect(seller).list(tokenId, seller.address, listingPrice))
                .to.emit(marketplaceContract, 'Listed')
                .withArgs(tokenId, seller.address, listingPrice);
        });

        it('Should revert if not the NFT owner', async () => {
            const tokenId = 0;
            const signers = await ethers.getSigners();
            const buyer = signers[2];
            const listingPrice = ethers.utils.parseEther('1');

            await expect(marketplaceContract.connect(buyer).list(tokenId, seller.address, listingPrice))
                .to.be.revertedWith('NotOwner');
        });

        it('Should revert if the marketplace is not approved', async () => {
            const tokenId = 0;
            const listingPrice = ethers.utils.parseEther('1');

            // Revoke any existing approval if needed
            await erc721Contract.connect(seller).approve(ethers.constants.AddressZero, tokenId);

            await expect(marketplaceContract.connect(seller).list(tokenId, seller.address, listingPrice))
                .to.be.revertedWith('NotApproved');
        });
    });

    describe('purchase', () => {
        it('Should successfully facilitate an NFT purchase', async () => {
            const signers = await ethers.getSigners();
            const buyer = signers[2];
            const tokenId = 0;
            await erc721Contract.connect(seller).approve(marketplaceContract.address, tokenId);
            const listingPrice = ethers.utils.parseEther('1'); // 1 ETH for example
            const feeRecipient = owner;


            // List the NFT
            await marketplaceContract.connect(seller).list(tokenId, seller.address, listingPrice);

            // Calculate expected fees and payout
            const marketplaceFee = 250; // 2.5%
            const feeAmount = listingPrice.mul(marketplaceFee).div(10000);
            const expectedSellerPayout = listingPrice.sub(feeAmount);

            // Initial Balances
            const initialFeeRecipientBalance = await ethers.provider.getBalance(feeRecipient.address);
            const initialSellerBalance = await ethers.provider.getBalance(seller.address);

            // Execute the purchase transaction
            const tx = await marketplaceContract.connect(buyer).purchase(tokenId, { value: listingPrice });
            await tx.wait();


            // Assertions
            expect(await erc1155Contract.balanceOf(marketplaceContract.address, tokenId)).to.equal(1);
            expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(initialFeeRecipientBalance.add(feeAmount));
            expect(await ethers.provider.getBalance(seller.address)).to.equal(initialSellerBalance.add(expectedSellerPayout));
            await expect(tx).to.emit(marketplaceContract, 'Sold')
                .withArgs(tokenId, seller.address, buyer.address, listingPrice);
        });

        it('Should revert if insufficient funds are provided', async () => {
            const signers = await ethers.getSigners();
            const buyer = signers[2];
            const tokenId = 0;
            await erc721Contract.connect(seller).approve(marketplaceContract.address, tokenId);
            const listingPrice = ethers.utils.parseEther('1');

            // List the NFT
            await marketplaceContract.connect(seller).list(tokenId, seller.address, listingPrice);

            const tx = await expect(marketplaceContract.connect(buyer).purchase(tokenId, { value: listingPrice.sub(1) }))
                .to.be.revertedWith('InsufficientFunds');
        });

        it('Should revert if the NFT is not listed', async () => {
            const signers = await ethers.getSigners();
            const buyer = signers[2];
            const tokenId = 0;
            const listingPrice = ethers.utils.parseEther('1');

            await expect(marketplaceContract.connect(buyer).purchase(tokenId, { value: listingPrice }))
                .to.be.revertedWith('NFTnotListed');
        });

        it('Should calculate marketplace fees and pay the seller correctly', async () => {
        });

        it('Should revert if fee transfer fails', async () => {

        });

        it('Should revert if seller transfer fails', async () => {
        });

    });
});