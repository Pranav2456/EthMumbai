import { expect } from "chai";
import { ethers } from "hardhat";
import { Webtoon,ProxyWebtoon } from "../src/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


describe('ProxyWebtoon', () => {
    let erc721Contract: Webtoon;
    let erc1155Contract: ProxyWebtoon;
    let owner: SignerWithAddress, artist: SignerWithAddress, otherAccount: SignerWithAddress;
  
    beforeEach(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        artist = signers[1];
        // Deploy ERC721 Contract
        const ERC721Factory = await ethers.getContractFactory('Webtoon');
        erc721Contract = (await ERC721Factory.deploy(owner.address)) as Webtoon; 
        await erc721Contract.deployed();
        console.log("Webtoon deployed to:", erc721Contract.address);  
    
        // Deploy ERC1155 Contract
        const ERC1155Factory = await ethers.getContractFactory('ProxyWebtoon');
        erc1155Contract = (await ERC1155Factory.deploy(erc721Contract.address, 'https://example.com/webtoon.json')) as ProxyWebtoon;
        await erc1155Contract.deployed();
        console.log("ProxyWebtoon deployed to:", erc1155Contract.address);
    
        // Mint some ERC721 tokens if needed for testing
        // await erc721Contract.approveArtist(artist.address); 
        // await erc721Contract.connect(artist).mintWebtoon(artist.address, "some-uri");
      });

      describe('mint', () => {
        it('Mints ERC1155 tokens and maps to ERC721 token IDs', async () => {
          const erc721TokenId = 0; 
          const erc721TokenIds = [erc721TokenId];
    
          await erc1155Contract.mint(erc721TokenIds,owner.address);
    
          // Assertions
          expect(await erc1155Contract.balanceOf(owner.address, erc721TokenId)).to.equal(1);
        });
        it('Handles invalid ERC721 token IDs', async () => { 
            const invalidTokenId = 123; // Assuming this ID doesn't exist 
            await expect(erc1155Contract.mint([invalidTokenId], owner.address))
                     .to.be.revertedWith('ERC721NonexistentToken'); 
          });
        it('Allows multiple mints from the same ERC721 token', async () => { 
            const erc721TokenId = 0; 
            await erc1155Contract.mint([erc721TokenId], owner.address); 
            await erc1155Contract.mint([erc721TokenId], owner.address); 
      
            expect(await erc1155Contract.balanceOf(owner.address, erc721TokenId)).to.equal(2);
          });
      });

      describe('balanceOf', () => {
        it('Returns zero for accounts with no tokens', async () => {
            const signers = await ethers.getSigners();
            otherAccount = signers[3];
            const nonexistentTokenId = 555;
            expect(await erc1155Contract.balanceOf(otherAccount.address, nonexistentTokenId)).to.equal(0);  
        });
      });

      describe('uri', () => {
        it('Retrieves the correct URI from the ERC721 token', async () => {
          const erc721TokenId = 0;
          const expectedURI = await erc721Contract.tokenURI(erc721TokenId); 
    
          await erc1155Contract.mint([erc721TokenId], owner.address);
          expect(await erc1155Contract.uri(erc721TokenId)).to.equal(expectedURI); 
        });
      });
    
   
  }); 

