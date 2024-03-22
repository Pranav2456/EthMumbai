// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

interface IWebtoon is IERC721Metadata {
    function mint(address to, string memory tokenURI) external returns (uint256);
}
