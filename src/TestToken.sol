// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestToken is ERC20("TEST", "TEST") {
    constructor() {
        uint256 supply = 1_000_000_000 ether;
        _mint(msg.sender, supply);
    }
}
