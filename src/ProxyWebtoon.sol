// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "./utils/AccessLock.sol";
import "./interfaces/IWebtoon.sol";

/// @title ProxyWebtoon
/// @author HeimLabs <contact@heimlabs.com>
/// @notice ERC1155 Multi Token minted as a proxy to the original Webtoon
contract ProxyWebtoon is ERC1155URIStorage, AccessLock {
    /// @notice The ERC721 contract that will be used to mint ERC1155 tokens
    IWebtoon public immutable webtoon;

    /// @notice Event emitted when an ERC1155 token is minted from an ERC721 token
    event Minted(address indexed to, uint256 indexed tokenId);

    constructor(address _webtoon) {
        webtoon = IWebtoon(_webtoon);
    }

    /// @dev Mints single ERC1155 proxy for provided ERC721 token ID
    /// @param webtoonTokenId The ID of the ERC721 tokens to mint ERC1155 token for
    /// @param to Address of recipient
    function mint(uint256 webtoonTokenId, address to) external onlyAdmin {
        string memory tokenURI = webtoon.tokenURI(webtoonTokenId);

        _mint(buyer, erc1155TokenId, 1, "");
        _setURI(erc1155TokenId, tokenURI);
        emit Minted(to, webtoonTokenId);
    }
}
