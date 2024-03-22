// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error URIAlreadySet();
error URINotSet();

/// @title ERC721 contract for the webtoon NFTs
contract ERC721Webtoon is ERC721URIStorage, Ownable {
    /// @notice The next token ID
    uint256 private _nextTokenId;
    /// @notice Mapping of artist addresses to their approval status
    mapping(address => bool) public isApprovedArtist;

    /// @notice Event emitted when a new webtoon is minted
    event WebtoonMinted(
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI
    );
    /// @notice Event emitted when an artist is approved
    event ArtistApproved(address indexed artistAddress);

    constructor(
        address initialOwner
    ) ERC721("name", "symbol") Ownable(initialOwner) {}

    /// @notice Approves an artist to mint webtoons
    function approveArtist(address artistAddress) public onlyOwner {
        isApprovedArtist[artistAddress] = true;
        emit ArtistApproved(artistAddress);
    }

    /// @notice Mints a new webtoon NFT
    function mintWebtoon(
        address to,
        string memory tokenURI
    ) public returns (uint256) {
        if (!isApprovedArtist[msg.sender]) {
            revert("Not approved artist");
        } else {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, tokenURI);
            emit WebtoonMinted(to, tokenId, tokenURI);
            return tokenId;
        }
    }
}
