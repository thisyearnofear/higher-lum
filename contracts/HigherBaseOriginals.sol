// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IHigherBaseOriginals {
    function ownerOf(uint256 tokenId) external view returns (address);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function creators(uint256 tokenId) external view returns (address);
}

contract HigherBaseEditions is ERC721Enumerable, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Reference to the originals contract
    IHigherBaseOriginals public originalsContract;

    // Mapping from edition token ID to original token ID
    mapping(uint256 => uint256) public originalTokenId;
    
    // Mapping from original token ID to number of editions minted
    mapping(uint256 => uint256) public editionsMinted;
    
    // Mapping from original token ID to max editions allowed
    mapping(uint256 => uint256) public maxEditions;
    
    // Default max editions per original
    uint256 public defaultMaxEditions = 10;
    
    // Edition price
    uint256 public editionPrice = 0.01 ether;
    
    // Creator royalty percentage (in basis points, e.g., 1000 = 10%)
    uint256 public creatorRoyaltyBps = 1000;
    
    // Platform fee percentage (in basis points)
    uint256 public platformFeeBps = 500;

    event EditionMinted(
        uint256 indexed editionTokenId,
        uint256 indexed originalTokenId,
        address indexed minter,
        address originalCreator
    );

    constructor(address _originalsContract) ERC721("Higher Base Editions", "HBE") Ownable(msg.sender) {
        originalsContract = IHigherBaseOriginals(_originalsContract);
    }

    /**
     * @dev Mint an edition of an original NFT
     * @param originalId The ID of the original NFT to create an edition of
     */
    function mintEdition(uint256 originalId) external payable {
        // Check if the original exists by trying to get its owner
        address originalOwner;
        try originalsContract.ownerOf(originalId) returns (address owner) {
            originalOwner = owner;
        } catch {
            revert("Original NFT does not exist");
        }

        // Check if max editions for this original has been reached
        uint256 maxForOriginal = maxEditions[originalId] > 0 ? maxEditions[originalId] : defaultMaxEditions;
        require(editionsMinted[originalId] < maxForOriginal, "Max editions reached for this original");
        
        // Check payment
        require(msg.value >= editionPrice, "Insufficient payment");

        // Get the original creator
        address originalCreator = originalsContract.creators(originalId);
        
        // Increment the token ID counter
        _tokenIds.increment();
        uint256 newEditionId = _tokenIds.current();
        
        // Mint the new edition
        _mint(msg.sender, newEditionId);
        
        // Set the token URI to be the same as the original
        string memory tokenUriFromOriginal = originalsContract.tokenURI(originalId);
        _setTokenURI(newEditionId, tokenUriFromOriginal);
        
        // Record the relationship between edition and original
        originalTokenId[newEditionId] = originalId;
        
        // Increment the editions minted counter
        editionsMinted[originalId]++;
        
        // Distribute payments
        _distributePayment(originalCreator);
        
        emit EditionMinted(newEditionId, originalId, msg.sender, originalCreator);
    }

    /**
     * @dev Distribute the payment between creator and platform
     * @param creator The creator of the original NFT
     */
    function _distributePayment(address creator) internal {
    uint256 creatorAmount = (msg.value * creatorRoyaltyBps) / 10000;
    uint256 platformAmount = (msg.value * platformFeeBps) / 10000;
    uint256 remaining = msg.value - creatorAmount - platformAmount;

    // Send royalty to creator
    (bool creatorSuccess, ) = payable(creator).call{value: creatorAmount}("");
    require(creatorSuccess, "Creator payment failed");

    // Send platform fee to contract owner
    (bool platformSuccess, ) = payable(owner()).call{value: platformAmount}("");
    require(platformSuccess, "Platform payment failed");

    // If there is any remaining ETH due to rounding, return it to the minter
    if (remaining > 0) {
        (bool refundSuccess, ) = payable(msg.sender).call{value: remaining}("");
        require(refundSuccess, "Refund failed");
    }
}

    /**
     * @dev Set the maximum number of editions for a specific original
     * @param originalId The ID of the original NFT
     * @param max The maximum number of editions allowed
     */
    function setMaxEditions(uint256 originalId, uint256 max) external onlyOwner {
        maxEditions[originalId] = max;
    }

    /**
     * @dev Set the default maximum number of editions per original
     * @param max The default maximum number of editions allowed
     */
    function setDefaultMaxEditions(uint256 max) external onlyOwner {
        defaultMaxEditions = max;
    }

    /**
     * @dev Set the price for minting an edition
     * @param price The new price in wei
     */
    function setEditionPrice(uint256 price) external onlyOwner {
        editionPrice = price;
    }

    /**
     * @dev Set the creator royalty percentage (in basis points)
     * @param bps The new royalty percentage in basis points (e.g., 1000 = 10%)
     */
    function setCreatorRoyaltyBps(uint256 bps) external onlyOwner {
        require(bps <= 5000, "Royalty too high"); // Max 50%
        creatorRoyaltyBps = bps;
    }

    /**
     * @dev Set the platform fee percentage (in basis points)
     * @param bps The new platform fee percentage in basis points
     */
    function setPlatformFeeBps(uint256 bps) external onlyOwner {
        require(bps <= 2000, "Platform fee too high"); // Max 20%
        platformFeeBps = bps;
    }

    /**
     * @dev Withdraw accumulated platform fees
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // Override functions to resolve conflicts between ERC721URIStorage and ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 