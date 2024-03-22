// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./utils/AccessLock.sol";
import "./interfaces/IWebtoon.sol";
import "./interfaces/IProxyWebtoon.sol";

error InsufficientFunds();
error PaymentFailed();
error NotListed();
error NotOwner();
error DuplicatePurchase();
error InvalidAddress();

/// @title Marketplace
/// @author HeimLabs <contact@heimlabs.com>
/// @notice List & Purchase Webtoons
contract Marketplace is AccessLock, ReentrancyGuard {
    /// @notice Original ERC721 Webtoon
    IWebtoon public immutable webtoon;
    /// @notice Proxy ERC1155 Webtoon
    IProxyWebtoon public immutable proxyWebtoon;

    struct Listing {
        address beneficiary;
        uint256 price;
    }

    /// @notice Mapping of tokenId to Listing
    mapping(uint256 => Listing) public listings;

    /// @notice Event emitted when webtoon is listed
    event Listed(
        uint256 indexed tokenId,
        address indexed beneficiary,
        uint256 price
    );
    /// @notice Event emitted when webtoon is sold
    event Sold(
        uint256 indexed tokenId,
        address indexed beneficiary,
        address indexed buyer,
        uint256 price
    );
    /// @notice Event emitted when webtoon is delisted
    event Delisted(uint256 indexed tokenId);
    /// @notice Event emitted when listing price is updated
    event PriceUpdated(uint256 indexed tokenId, uint256 newPrice);

    /// @dev Constructor to initialize the contract.
    /// @param _webtoon The address of the ERC721 Webtoon contract.
    /// @param _proxyWebtoon The address of the ERC1155 Webtoon Holder contract.
    constructor(IWebtoon _webtoon, IProxyWebtoon _proxyWebtoon) {
        webtoon = _webtoon;
        proxyWebtoon = _proxyWebtoon;
    }

    /// @notice Lists an ERC721 Webtoon for sale
    /// @param tokenId The ID of the ERC721 token to list
    /// @param beneficiary Address of the sale beneficiary
    /// @param price The sale price of the token
    function list(
        uint256 tokenId,
        address beneficiary,
        uint256 price
    ) external {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (
            webtoon.ownerOf(tokenId) != msg.sender ||
            !isAdmin[msg.sender] ||
            owner() != msg.sender
        ) revert Unauthorized();

        listings[tokenId] = Listing(beneficiary, price);
        emit Listed(tokenId, msg.sender, price);
    }

    /// @dev Facilitates the purchase of a listed ERC721 token
    /// @param tokenId The ID of the ERC721 token to purchase
    function purchase(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        address buyer = msg.sender;

        if (msg.value < listing.price) revert InsufficientFunds();
        if (listing.beneficiary == address(0)) revert NotListed();
        if (proxyWebtoon.balanceOf(buyer, tokenId) > 0)
            revert DuplicatePurchase();

        (bool sellerSuccess, ) = payable(listing.beneficiary).call{
            value: listing.price
        }("");
        if (!sellerSuccess) revert PaymentFailed();

        uint256 excess = msg.value - listing.price;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(buyer).call{value: excess}("");
            if (!refundSuccess) revert PaymentFailed();
        }

        proxyWebtoon.mint(tokenId, buyer);

        emit Sold(tokenId, listing.beneficiary, buyer, listing.price);
    }

    /// @dev Allows the seller to de-list a previously listed ERC721 token.
    /// @param tokenId The ID of the ERC721 token to de-list.
    function delist(uint256 tokenId) external {
        if (
            webtoon.ownerOf(tokenId) != msg.sender ||
            !isAdmin[msg.sender] ||
            owner() != msg.sender
        ) revert Unauthorized();

        delete listings[tokenId];
        emit Delisted(tokenId);
    }

    /// @dev Allows the seller to update the price of a listed ERC721 token.
    /// @param tokenId The ID of the ERC721 token to update the price for.
    /// @param newPrice The new sale price.
    function updatePrice(uint256 tokenId, uint256 newPrice) public {
        Listing storage listing = listings[tokenId];

        if (
            webtoon.ownerOf(tokenId) != msg.sender ||
            !isAdmin[msg.sender] ||
            owner() != msg.sender
        ) revert Unauthorized();

        listing.price = newPrice;
        emit PriceUpdated(tokenId, newPrice);
    }
}
