// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "./utils/AccessLock.sol";
import "./interfaces/IWebtoon.sol";

/// @title ProxyWebtoon
/// @author HeimLabs <contact@heimlabs.com>
/// @notice ERC1155 Multi Token minted as a proxy to the original Webtoon
contract ProxyWebtoon is ERC1155URIStorage, AccessLock {
    /// @notice Event emitted when an ERC1155 token is minted from an ERC721 token
    event Minted(address indexed to, uint256 indexed tokenId);

    constructor() ERC1155("") {}

    /// @dev Mints single ERC1155
    /// @param to Address of recipient
    /// @param tokenId ID of the ERC721 tokens to mint ERC1155 token for
    /// @param tokenURI IPFS Metadata URI of ERC721 token
    function mint(
        address to,
        uint256 tokenId,
        string calldata tokenURI
    ) external onlyAdmin {
        _mint(to, tokenId, 1, "");
        _setURI(tokenId, tokenURI);
        emit Minted(to, tokenId);
    }
}
