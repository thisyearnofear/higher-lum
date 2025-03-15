// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title ScrollifyEditions
 * @dev ERC1155 contract for minting editions of original NFTs with pricing and royalties
 */
contract ScrollifyEditions is ERC1155, Ownable, IERC2981 {
    using Counters for Counters.Counter;

    // Constants
    uint256 public constant MINT_PRICE = 0.005 ether;
    uint96 public constant ROYALTY_PERCENTAGE = 5000; // 50% to original creator, 50% to contract owner
    uint256 public constant MAX_EDITIONS_PER_ORIGINAL = 100; // Maximum of 100 editions per original

    // Address of the ScrollifyOriginals contract
    address public originalsContract;

    // Mapping from original NFT ID to number of editions minted
    mapping(uint256 => uint256) public editionsMinted;
    
    // Mapping from original NFT ID to creator address
    mapping(uint256 => address) public originalCreators;
    
    // Mapping from edition ID to original NFT ID
    mapping(uint256 => uint256) public originalTokenId;
    
    // Mapping from token ID to token URI
    mapping(uint256 => string) private _tokenURIs;

    // Events
    event EditionMinted(uint256 indexed editionId, uint256 indexed originalId, address indexed recipient, address originalCreator);

    constructor(address _originalsContract) ERC1155("") Ownable(msg.sender) {
        originalsContract = _originalsContract;
    }

    /**
     * @dev Returns the price to mint an edition
     */
    function editionPrice() external pure returns (uint256) {
        return MINT_PRICE;
    }

    /**
     * @dev Mints an edition of an original NFT
     * @param originalId The ID of the original NFT to create an edition of
     */
    function mintEdition(uint256 originalId) external payable {
        require(msg.value == MINT_PRICE, "Incorrect ETH amount");
        require(editionsMinted[originalId] < MAX_EDITIONS_PER_ORIGINAL, "Max editions reached for this original");
        
        // Get the next edition number for this original
        uint256 editionNumber = editionsMinted[originalId] + 1;
        
        // Create a unique edition ID by combining original ID and edition number
        // Format: originalId * 1000 + editionNumber
        uint256 editionId = (originalId * 1000) + editionNumber;
        
        // Try to get the original creator from the originals contract
        address originalCreator;
        try IScrollifyOriginals(originalsContract).creators(originalId) returns (address creator) {
            originalCreator = creator;
            originalCreators[originalId] = creator;
        } catch {
            // If we can't get the creator, use the sender
            originalCreator = msg.sender;
            originalCreators[originalId] = msg.sender;
        }
        
        // Try to get the token URI from the originals contract
        string memory tokenUriFromOriginal;
        try IScrollifyOriginals(originalsContract).tokenURI(originalId) returns (string memory tokenUri) {
            tokenUriFromOriginal = tokenUri;
            _tokenURIs[editionId] = tokenUri;
        } catch {
            // If we can't get the URI, use a default one based on the original contract
            tokenUriFromOriginal = string(abi.encodePacked("ipfs://scroll-editions/", toString(originalId), "/", toString(editionNumber)));
            _tokenURIs[editionId] = tokenUriFromOriginal;
        }
        
        // Mint the edition
        _mint(msg.sender, editionId, 1, "");
        
        // Update the mappings
        originalTokenId[editionId] = originalId;
        editionsMinted[originalId]++;
        
        // Emit the event
        emit EditionMinted(editionId, originalId, msg.sender, originalCreator);
        
        // Split the payment between the original creator and the contract owner
        uint256 creatorShare = msg.value / 2;
        
        // Send the creator's share
        (bool sentToCreator, ) = payable(originalCreator).call{value: creatorShare}("");
        require(sentToCreator, "Failed to send creator share");
        
        // Owner's share is kept in the contract for later withdrawal
    }

    /**
     * @dev Returns the URI for a token ID
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory tokenURI = _tokenURIs[tokenId];
        
        // If there is no base URI, return the token URI.
        if (bytes(tokenURI).length > 0) {
            return tokenURI;
        }
        
        return super.uri(tokenId);
    }

    /**
     * @dev Withdraw contract balance to owner
     */
    function withdrawFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Implements EIP-2981 royalty info (50% to original creator, 50% to contract owner)
     */
    function royaltyInfo(uint256 editionId, uint256 salePrice) external view override returns (address receiver, uint256 royaltyAmount) {
        uint256 originalId = originalTokenId[editionId];
        address creator = originalCreators[originalId];
        uint256 royalty = (salePrice * ROYALTY_PERCENTAGE) / 10000;
        
        return (creator, royalty);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, IERC165) returns (bool) {
        return 
            interfaceId == type(IERC2981).interfaceId || 
            super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Helper function to convert uint to string
     */
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        
        uint256 temp = value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}

/**
 * @dev Interface for the ScrollifyOriginals contract
 */
interface IScrollifyOriginals {
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function creators(uint256 tokenId) external view returns (address);
}