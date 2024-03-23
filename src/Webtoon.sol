// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./utils/AccessLock.sol";

/// @title Webtoon
/// @author HeimLabs <contact@heimlabs.com>
/// @notice ERC721 NFT Contract for original Webtoons
contract Webtoon is ERC721URIStorage, AccessLock {
    /// @notice Track minted tokens
    uint256 private _tokenCounter;

    /// @notice Event emitted when a new webtoon is minted
    event Minted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor() ERC721("Webtoon", "TOON") {}

    /// @notice Mints a new webtoon NFT
    /// @param to Recipient of the minted NFT
    /// @param tokenURI IPFS Metadata URI of the NFT
    /// @return tokenId
    function mint(
        address to,
        string memory tokenURI
    ) public onlyAdmin whenNotPaused returns (uint256) {
        uint256 tokenId = ++_tokenCounter;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        emit Minted(to, tokenId, tokenURI);
        return tokenId;
    }
}
