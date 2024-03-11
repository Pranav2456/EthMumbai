// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "./ERC721.sol";
import "./ERC1155.sol";


contract WebtoonSale {
    ERC721Webtoon public immutable erc721Contract;
    ERC1155WebtoonHolder public immutable erc1155Contract;

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;

    uint256 public marketplaceFee; 
    address public feeRecipient;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price); 

    error InsufficientFunds();
    error NFTnotListed();
    error NotOwner();
    error NotApproved();

    /**
     * @dev Constructor to initialize the contract.
     * @param _erc721Address The address of the ERC721 Webtoon contract.
     * @param _erc1155Address The address of the ERC1155 Webtoon Holder contract.
     * @param _marketplaceFee The marketplace fee (in basis points, e.g., 250 = 2.5%).
     * @param _feeRecipient The address to receive marketplace fees.
     */
    constructor(address _erc721Address, address _erc1155Address, uint256 _marketplaceFee, address _feeRecipient) {
        erc721Contract = ERC721Webtoon(_erc721Address);
        erc1155Contract = ERC1155WebtoonHolder(_erc1155Address);
        marketplaceFee = _marketplaceFee;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Lists an ERC721 token for sale.
     * @param tokenId The ID of the ERC721 token to list.
     * @param price The sale price of the token.
     */
    function listNFT(uint256 tokenId, uint256 price) public {
        if (erc721Contract.ownerOf(tokenId) != msg.sender) {
            revert NotOwner();
        }

        if (erc721Contract.getApproved(tokenId) != address(this)) { 
            revert NotApproved();
        }

        listings[tokenId] = Listing(tokenId, msg.sender, price);
        emit Listed(tokenId, msg.sender, price);
    }

    /**
     * @dev Facilitates the purchase of a listed ERC721 token.
     * @param tokenId The ID of the ERC721 token to purchase.
     */
    function buyNFT(uint256 tokenId) public payable {
        Listing memory listing = listings[tokenId];

        if (msg.value < listing.price) {
            revert InsufficientFunds();
        }

        // Calculate marketplace fee
        uint256 feeAmount = (listing.price * marketplaceFee) / 10000; 
        uint256 sellerPayout = listing.price - feeAmount; // Amount due to the seller

        // Transfer funds
        (bool feeSuccess, ) = payable(feeRecipient).call{value: feeAmount}("");
        (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerPayout}("");
        require(feeSuccess && sellerSuccess, "Payment transfers failed");

        // Update ownership and mint ERC1155 tokens
        erc1155Contract.mintFromERC721(new uint256[](tokenId)); 

        emit Sold(tokenId, listing.seller, msg.sender, listing.price);
    }
}