// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC721.sol"; 

contract ERC1155WebtoonHolder is ERC1155 {
    ERC721Webtoon public immutable erc721Contract;

    mapping(uint256 => uint256) private erc721ToERC1155;
    mapping(uint256 => mapping(address => uint256)) public erc1155Balances;

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

            uint256 erc1155TokenId = _getOrCreateERC1155TokenId(erc721TokenId);
            _mint(msg.sender, erc1155TokenId, 1, "");
            erc1155Balances[erc1155TokenId][msg.sender]++;
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
     * @dev Returns the ERC1155 token ID associated with the provided ERC721 token ID,
     *      creating a new one if it doesn't exist.
     * @param erc721TokenId The ID of the ERC721 token to get or create the ERC1155 token ID for.
     * @return The ERC1155 token ID associated with the provided ERC721 token ID.
     */
    function _getOrCreateERC1155TokenId(uint256 erc721TokenId) private returns (uint256) {
        uint256 erc1155TokenId = erc721ToERC1155[erc721TokenId];
        if (erc1155TokenId == 0) {
            erc1155TokenId = _generateUniqueERC1155TokenId(erc721TokenId);
            erc721ToERC1155[erc721TokenId] = erc1155TokenId;
        }
        return erc1155TokenId;
    }

    /**
     * @dev Generates a unique ERC1155 token ID based on the provided ERC721 token ID and token URI.
     * @param erc721TokenId The ID of the ERC721 token to generate the ERC1155 token ID for.
     * @return The generated ERC1155 token ID.
     */
    function _generateUniqueERC1155TokenId(uint256 erc721TokenId) private view returns (uint256) {
        string memory tokenURI = erc721Contract.tokenURI(erc721TokenId);
        return uint256(keccak256(abi.encodePacked(tokenURI)));
    }
}