// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "./ERC721.sol";
import "./ERC1155.sol";
 import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";



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
    event DeListed(uint256 indexed tokenId); 
    event PriceUpdated(uint256 indexed tokenId, uint256 newPrice);


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
    function buyNFT(uint256 tokenId, address buyer) public payable {
        Listing memory listing = listings[tokenId];

        if (msg.value < listing.price) {
            revert InsufficientFunds();
        }

        if ((listings[tokenId].seller == address(0))) {
            revert NFTnotListed();
        }

        // Calculate marketplace fee
       uint256 feeAmount = (listing.price * marketplaceFee) / 10000; 
       uint256 sellerPayout = listing.price - feeAmount;

       (bool feeSuccess, ) = payable(feeRecipient).call{value: feeAmount}("");
       (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerPayout}(""); 
       require(feeSuccess && sellerSuccess, "Payment transfers failed");
       erc1155Contract.mintFromERC721(tokenId, buyer);

       emit Sold(tokenId, listing.seller, buyer, listing.price);
    }

    /**
     * @dev Allows the seller to de-list a previously listed ERC721 token.
     * @param tokenId The ID of the ERC721 token to de-list.
    */
    function delistNFT(uint256 tokenId) public {
    Listing memory listing = listings[tokenId];

    if (listing.seller != msg.sender) {
        revert NotOwner();
    }

    delete listings[tokenId]; 
    emit DeListed(tokenId);
    
    }

    /**
    * @dev Allows the seller to update the price of a listed ERC721 token.
    * @param tokenId The ID of the ERC721 token to update the price for.
    * @param newPrice The new sale price.
    */
    function updatePrice(uint256 tokenId, uint256 newPrice) public {
    Listing storage listing = listings[tokenId]; 

    if (listing.seller != msg.sender) {
        revert NotOwner();
    }

    listing.price = newPrice;
    emit PriceUpdated(tokenId, newPrice); 
    
    }


}