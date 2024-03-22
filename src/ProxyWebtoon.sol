// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "./utils/AccessLock.sol";
import "./interfaces/IWebtoon.sol";

contract ProxyWebtoon is ERC1155URIStorage {
    /// @notice The ERC721 contract that will be used to mint ERC1155 tokens.
    IWebtoon public immutable erc721Contract;

    /// @notice Event emitted when an ERC1155 token is minted from an ERC721 token
    event Minted(address indexed to, uint256 indexed tokenId);

    constructor(
        address _erc721Contract,
        string memory baseURI
    ) ERC1155(baseURI) {
        erc721Contract = IWebtoon(_erc721Contract);
    }

    /**
     * @dev Mints ERC1155 tokens based on the provided ERC721 token IDs.
     * @param erc721TokenId The ID of the ERC721 tokens to mint ERC1155 token for.
     */
    function mintFromERC721(uint256 erc721TokenId, address buyer) public {
        uint256 erc1155TokenId = _mapERC721ToERC1155TokenId(erc721TokenId);
        string memory tokenURI = erc721Contract.tokenURI(erc721TokenId);

        _mint(buyer, erc1155TokenId, 1, "");
        _setURI(erc1155TokenId, tokenURI);
        erc1155Balances[erc1155TokenId][msg.sender]++;
        emit MintedFromERC721(erc721TokenId, erc1155TokenId, buyer);
    }

    /**
     * @dev Returns the balance of a given ERC1155 token ID for a specific address.
     * @param account The address to check the balance for.
     * @param id The ID of the ERC1155 token to check the balance for.
     * @return The balance of the specified ERC1155 token for the given address.
     */

    function balanceOf(
        address account,
        uint256 id
    ) public view override returns (uint256) {
        return erc1155Balances[id][account];
    }

    // Overrides for ERC1155URIStorage and ERC1155Supply compatibility
    function uri(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC1155, ERC1155URIStorage)
        returns (string memory)
    {
        return ERC1155URIStorage.uri(tokenId);
    }

    /**
     * @dev Ensure that the provided ERC721 token ID is associated with an ERC1155 token ID.
     * @param erc721TokenId The ID of the ERC721 token to get or create the ERC1155 token ID for.
     * @return The ERC1155 token ID associated with the provided ERC721 token ID.
     */
    function _mapERC721ToERC1155TokenId(
        uint256 erc721TokenId
    ) private returns (uint256) {
        uint256 erc1155TokenId = erc721ToERC1155[erc721TokenId];
        if (erc1155TokenId == 0) {
            erc1155TokenId = erc721TokenId; // Directly use the ERC721 Token ID
            erc721ToERC1155[erc721TokenId] = erc1155TokenId;
        }
        return erc1155TokenId;
    }
}
