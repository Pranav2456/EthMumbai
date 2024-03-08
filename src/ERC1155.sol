// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC721.sol"; 

contract ERC1155WebtoonHolder is ERC1155 {
/// @notice The ERC721 contract that will be used to mint ERC1155 tokens.
    ERC721Webtoon public immutable erc721Contract;

/// @notice Mapping of ERC721 token IDs to ERC1155 token IDs.
    mapping(uint256 => uint256) private erc721ToERC1155;
/// @notice Mapping of ERC1155 token IDs to balances for each address.
    mapping(uint256 => mapping(address => uint256)) public erc1155Balances;

/// @notice Event emitted when an ERC1155 token is minted from an ERC721 token
    event MintedFromERC721(uint256 indexed erc721TokenId, uint256 indexed erc1155TokenId, address indexed account);

    constructor(address _erc721Contract) ERC1155("") {
        erc721Contract = ERC721Webtoon(_erc721Contract);
    }

    /**
     * @dev Mints ERC1155 tokens based on the provided ERC721 token IDs.
     * @param erc721TokenIds The IDs of the ERC721 tokens to mint ERC1155 tokens for.
     */
    function mintFromERC721(uint256[] calldata erc721TokenIds) public {
        for (uint256 i = 0; i < erc721TokenIds.length; i++) {
            uint256 erc721TokenId = erc721TokenIds[i];
            if (erc721Contract.ownerOf(erc721TokenId) != msg.sender) {
                revert("You don't own this ERC721 token");
            }

            uint256 erc1155TokenId = _mapERC721ToERC1155TokenId(erc721TokenId);
            _mint(msg.sender, erc1155TokenId, 1, "");
            erc1155Balances[erc1155TokenId][msg.sender]++;
            emit MintedFromERC721(erc721TokenId, erc1155TokenId, msg.sender);
        }
    }

    /**
     * @dev Returns the balance of a given ERC1155 token ID for a specific address.
     * @param account The address to check the balance for.
     * @param id The ID of the ERC1155 token to check the balance for.
     * @return The balance of the specified ERC1155 token for the given address.
     */
    function balanceOf(address account, uint256 id) public view override returns (uint256) {
        return erc1155Balances[id][account];
    }

    /**
     * @dev Ensure that the provided ERC721 token ID is associated with an ERC1155 token ID.
     * @param erc721TokenId The ID of the ERC721 token to get or create the ERC1155 token ID for.
     * @return The ERC1155 token ID associated with the provided ERC721 token ID.
     */
    function _mapERC721ToERC1155TokenId(uint256 erc721TokenId) private returns (uint256) {
    uint256 erc1155TokenId = erc721ToERC1155[erc721TokenId];
    if (erc1155TokenId == 0) {
        erc1155TokenId = erc721TokenId; // Directly use the ERC721 Token ID
        erc721ToERC1155[erc721TokenId] = erc1155TokenId;
    }
    return erc1155TokenId;
    }
}