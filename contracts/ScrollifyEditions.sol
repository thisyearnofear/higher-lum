// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title ScrollifyEditions
 * @dev ERC1155 contract for minting limited edition NFTs with pricing and royalties
 */
contract ScrollifyEditions is ERC1155, Ownable, IERC2981 {
    using Counters for Counters.Counter;
    Counters.Counter private _editionIds;

    uint256 public constant MINT_PRICE_PER_EDITION = 0.005 ether;
    uint96 public constant ROYALTY_PERCENTAGE = 5000; // 50% to minter, 50% to contract owner
    uint256 public constant MAX_EDITIONS_PER_ORIGINAL = 100; // Maximum of 100 editions per original

    struct Edition {
        uint256 maxSupply;
        uint256 currentSupply;
        address creator;
    }

    mapping(uint256 => Edition) public editions;
    mapping(uint256 => string) private _tokenURIs;
    
    // Enumeration mappings
    mapping(uint256 => uint256) private _allTokens;
    uint256 private _allTokensIndex;

    // Interface ID constant
    bytes4 private constant _INTERFACE_ID_ERC1155_ENUMERABLE = 0x780e9d63;

    event EditionCreated(uint256 indexed editionId, address indexed creator, uint256 maxSupply, string tokenURI);
    event EditionMinted(uint256 indexed editionId, address indexed recipient, uint256 amount);

    constructor() ERC1155("") Ownable(msg.sender) {}

    /**
     * @dev Returns the total number of editions
     */
    function totalSupply() public view returns (uint256) {
        return _editionIds.current();
    }

    /**
     * @dev Returns the token ID at the given index
     */
    function tokenByIndex(uint256 index) public view returns (uint256) {
        require(index < totalSupply(), "Index out of bounds");
        return _allTokens[index];
    }

    /**
     * @dev Creates a new limited edition NFT
     * @param maxEditionSupply Max number of copies
     * @param tokenURI Metadata URI
     */
    function createEdition(uint256 maxEditionSupply, string calldata tokenURI) external onlyOwner returns (uint256) {
        require(maxEditionSupply > 0, "Edition supply must be greater than zero");
        require(maxEditionSupply <= MAX_EDITIONS_PER_ORIGINAL, "Exceeds maximum editions per original");

        _editionIds.increment();
        uint256 newEditionId = _editionIds.current();

        editions[newEditionId] = Edition(maxEditionSupply, 0, msg.sender);
        _setURI(newEditionId, tokenURI);
        
        // Add to enumeration
        _allTokens[_allTokensIndex] = newEditionId;
        _allTokensIndex++;

        emit EditionCreated(newEditionId, msg.sender, maxEditionSupply, tokenURI);
        return newEditionId;
    }

    /**
     * @dev Set token URI
     */
    function _setURI(uint256 tokenId, string memory tokenURI) internal virtual {
        _tokenURIs[tokenId] = tokenURI;
    }

    /**
     * @dev Mints editions of an NFT
     * @param to Recipient address
     * @param editionId Edition ID
     * @param amount Number of copies to mint
     */
    function mintEdition(address to, uint256 editionId, uint256 amount) external payable {
        require(amount > 0, "Mint amount must be greater than zero");
        require(msg.value == MINT_PRICE_PER_EDITION * amount, "Incorrect ETH amount");
        require(editions[editionId].currentSupply + amount <= editions[editionId].maxSupply, "Exceeds max supply");

        editions[editionId].currentSupply += amount;
        _mint(to, editionId, amount, "");

        emit EditionMinted(editionId, to, amount);
    }

    /**
     * @dev Withdraw contract balance to owner
     */
    function withdrawFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Implements EIP-2981 royalty info (50% to creator, 50% to contract owner)
     */
    function royaltyInfo(uint256 editionId, uint256 salePrice) external view override returns (address receiver, uint256 royaltyAmount) {
        Edition storage edition = editions[editionId];
        uint256 royalty = (salePrice * ROYALTY_PERCENTAGE) / 10000;
        
        // For simplicity, we'll return the creator as the receiver
        // In a production environment, you might want to implement a more sophisticated
        // royalty distribution system
        return (edition.creator, royalty);
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
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, IERC165) returns (bool) {
        return 
            interfaceId == type(IERC2981).interfaceId || 
            interfaceId == _INTERFACE_ID_ERC1155_ENUMERABLE || 
            super.supportsInterface(interfaceId);
    }
}