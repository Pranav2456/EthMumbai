import { expect } from "chai";
import { ethers } from "hardhat";
import { WebtoonSale, WebtoonSale__factory } from "../src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ERC721Webtoon, ERC1155WebtoonHolder, ERC721Webtoon__factory, ERC1155WebtoonHolder__factory } from "../src/types";

describe('WebtoonSale', () => {
    let erc721Contract: ERC721Webtoon;
    let erc1155Contract: ERC1155WebtoonHolder;
    let marketplaceContract: WebtoonSale;  
    let owner: SignerWithAddress, seller: SignerWithAddress, buyer: SignerWithAddress, otherAccount: SignerWithAddress;

    beforeEach(async () => {
         // Get signers
         [owner, seller, buyer, otherAccount] = await ethers.getSigners();

         // Deploy ERC721 Contract
         const ERC721Factory = await ethers.getContractFactory('ERC721Webtoon');
         erc721Contract = await ERC721Factory.deploy(owner.address) as ERC721Webtoon; 
         await erc721Contract.deployed(); 
         console.log("ERC721Webtoon deployed to:", erc721Contract.address);  
 
         // Deploy ERC1155 Contract
         const ERC1155Factory = await ethers.getContractFactory('ERC1155WebtoonHolder');
         erc1155Contract = await ERC1155Factory.deploy(erc721Contract.address, 'ipfs://ipfs.io/webtoon-metadata/') as ERC1155WebtoonHolder;
         await erc1155Contract.deployed();
         console.log("ERC1155WebtoonHolder deployed to:", erc1155Contract.address);
 
         // Deploy the Marketplace Contract
         const MarketplaceFactory = await ethers.getContractFactory('WebtoonSale');
         marketplaceContract = await MarketplaceFactory.deploy(
             erc721Contract.address,
             erc1155Contract.address,
             250, // 2.5% fee
             owner.address // Fee recipient
         ) as WebtoonSale;
         await marketplaceContract.deployed();
         console.log("WebtoonSale deployed to:", marketplaceContract.address);
 
         // Mint an initial NFT for testing 
         await erc721Contract.approveArtist(seller.address); 
         await erc721Contract.approveArtist(buyer.address);
         await erc721Contract.approveArtist(owner.address);

         await erc721Contract.connect(seller).mintWebtoon(seller.address, "some-uri");
    });

    describe('listNFT', () => {
        it('Should list an NFT for sale', async () => {
            const tokenId = 0; // Assuming NFT with ID 0 exists
            const listingPrice = ethers.utils.parseEther('1'); // 1 ETH for example
    
            // Approve marketplace as operator of the NFT (if not already done in beforeEach)
            await erc721Contract.connect(seller).approve(marketplaceContract.address, tokenId);  
    
            // Call listNFT
            await marketplaceContract.connect(seller).listNFT(tokenId, listingPrice);
    
            // Assertions
            const listing = await marketplaceContract.listings(tokenId);
            expect(listing.seller).to.equal(seller.address);
            expect(listing.price).to.equal(listingPrice);        
    
            // Event emission check
            await expect(marketplaceContract.connect(seller).listNFT(tokenId, listingPrice))
                      .to.emit(marketplaceContract, 'Listed') 
                      .withArgs(tokenId, seller.address, listingPrice); 
        });
    
        it('Should revert if not the NFT owner', async () => {
           const tokenId = 0; 
           const listingPrice = ethers.utils.parseEther('1');  
    
           await expect(marketplaceContract.connect(buyer).listNFT(tokenId, listingPrice))
                       .to.be.revertedWith('NotOwner');
        });
    
        it('Should revert if the marketplace is not approved', async () => {
             const tokenId = 0;
             const listingPrice = ethers.utils.parseEther('1');  
    
             // Revoke any existing approval if needed
             await erc721Contract.connect(seller).approve(ethers.constants.AddressZero, tokenId); 
    
             await expect(marketplaceContract.connect(seller).listNFT(tokenId, listingPrice))
                        .to.be.revertedWith('NotApproved');
        });    
    });

    describe('buyNFT', () => {
        it('Should successfully facilitate an NFT purchase', async () => { 
            const tokenId = 0; 
            await erc721Contract.connect(seller).approve(marketplaceContract.address, tokenId);
            const listingPrice = ethers.utils.parseEther('1'); // 1 ETH for example
            const feeRecipient = owner;
            const erc1155TokenId = tokenId;
        
    
            // List the NFT
            await marketplaceContract.connect(seller).listNFT(tokenId, listingPrice);
    
            // Calculate expected fees and payout
            const marketplaceFee = 250; // 2.5%
            const feeAmount =listingPrice.mul(marketplaceFee).div(10000);  
            const expectedSellerPayout = listingPrice.sub(feeAmount);
    
            // Initial Balances
            const initialFeeRecipientBalance = await ethers.provider.getBalance(feeRecipient.address);
            const initialSellerBalance = await ethers.provider.getBalance(seller.address);
    
            // Execute the buyNFT transaction
            const tx = await marketplaceContract.connect(buyer).buyNFT(tokenId, { value: listingPrice });

    
            // Assertions
            expect(await erc1155Contract.balanceOf(buyer.address, erc1155TokenId)).to.equal(1);
            expect(await ethers.provider.getBalance(feeRecipient.address)).to.equal(initialFeeRecipientBalance.add(feeAmount)); 
            expect(await ethers.provider.getBalance(seller.address)).to.equal(initialSellerBalance.add(expectedSellerPayout)); 
            await expect(tx).to.emit(marketplaceContract, 'Sold')
                             .withArgs(tokenId, seller.address, buyer.address, listingPrice); 
        });

        it('Should revert if insufficient funds are provided', async () => {
            const tokenId = 0;
            await erc721Contract.connect(seller).approve(marketplaceContract.address, tokenId);
            const listingPrice = ethers.utils.parseEther('1');  

            // List the NFT
            await marketplaceContract.connect(seller).listNFT(tokenId, listingPrice);

            await expect(marketplaceContract.connect(buyer).buyNFT(tokenId, { value: listingPrice.sub(1) })) 
                    .to.be.revertedWith('InsufficientFunds');          
        });

        it('Should revert if the NFT is not listed', async () => {
            const tokenId = 0; 
            const listingPrice = ethers.utils.parseEther('1');  

            await expect(marketplaceContract.connect(buyer).buyNFT(tokenId, { value: listingPrice }))
                    .to.be.revertedWith('NFTnotListed'); 
        });

        it('Should calculate marketplace fees and pay the seller correctly', async () => {
            // ... (Test logic similar to o 
        });

        it('Should revert if fee transfer fails', async () => {
             // ... (Setup for simulating payment failure if possible) ...  
        });

        it('Should revert if seller transfer fails', async () => {
            // ... (Setup for simulating payment failure if possible) ... 
        });

    });
});