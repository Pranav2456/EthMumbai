// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


error URIAlreadySet();
error URINotSet();

/// @title ERC721 contract for the webtoon NFTs
contract ERC721Webtoon is ERC721URIStorage{
    uint256 private _nextTokenId;
    address private _owner;
    string private _name;
    string private _symbol;

/// @notice Event emitted when a new webtoon is minted
    event WebtoonMinted(
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI
    );

   constructor(string memory name, string memory symbol) ERC721(name,symbol) {
        _name = name;
        _symbol = symbol;
    }

    function mintWebtoon(address to, string memory tokenURI) public returns (uint256){
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }
   }
   
   