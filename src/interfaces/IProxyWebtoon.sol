// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";

interface IProxyWebtoon is IERC1155MetadataURI {
    function mint(uint256 webtoonTokenId, address to) external;
}
