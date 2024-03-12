import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC721Webtoon } from "../src/types"; 
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


describe("ERC721Webtoon", function () {
  let webtoonContract: ERC721Webtoon;
  let owner: SignerWithAddress, artist: SignerWithAddress, otherAccount: SignerWithAddress;

  beforeEach(async function () {
    
    const signers = await ethers.getSigners();
    const WebtoonContractFactory = await ethers.getContractFactory("ERC721Webtoon");
    const owner = signers[0];
    webtoonContract = (await WebtoonContractFactory.deploy(owner.address)) as ERC721Webtoon; 
    console.log("WebtoonContract deployed to:", webtoonContract.address);
    await webtoonContract.deployed();
  });

  it("Minting a webtoon by a non-artist should fail", async function () {
    const signers = await ethers.getSigners();
    otherAccount = signers[1];
    const tokenURI = "https://example.com/webtoon.json";
    await expect(    
    webtoonContract.connect(otherAccount).mintWebtoon(otherAccount.address, tokenURI)
    ).to.be.revertedWith("Not approved artist");
  });

  it("Minting a webtoon by an approved artist should succeed", async function () {
    const tokenURI = "https://example.com/webtoon.json";
    const signers = await ethers.getSigners();
    artist = signers[2];
    await webtoonContract.approveArtist(artist.address); 

    await expect(
      webtoonContract.connect(artist).mintWebtoon(artist.address, tokenURI)
    )
      .to.emit(webtoonContract, "WebtoonMinted")
      .withArgs(artist.address, 0, tokenURI); 
  });     
  
});