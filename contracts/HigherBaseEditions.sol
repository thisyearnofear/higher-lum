// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract HigherBaseOriginals is ERC721Enumerable, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    enum OverlayType { HIGHER, BASE, DICKBUTTIFY }

    mapping(uint256 => address) public creators;
    mapping(uint256 => OverlayType) public overlayTypes;
    mapping(string => uint256) public groveUrlToTokenId;

    uint256 public constant MAX_ORIGINALS = 100;
    uint256 public constant ORIGINAL_PRICE = 0.05 ether;

    event OriginalNFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string groveUrl,
        string metadataURI,
        OverlayType overlayType
    );

    constructor() ERC721("Higher Base Originals", "HBO") Ownable(msg.sender) {}

    function mintOriginalNFT(
        address to,
        address creator,
        string calldata groveUrl,
        string calldata metadataURI, // Renamed to avoid shadowing
        OverlayType overlayType
    ) external payable returns (uint256) {
        require(_tokenIds.current() < MAX_ORIGINALS, "Max originals minted");
        require(msg.value >= ORIGINAL_PRICE, "Insufficient payment");
        require(groveUrlToTokenId[groveUrl] == 0, "Grove URL already used");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(to, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        creators[newTokenId] = creator;
        overlayTypes[newTokenId] = overlayType;
        groveUrlToTokenId[groveUrl] = newTokenId;

        emit OriginalNFTMinted(newTokenId, creator, groveUrl, metadataURI, overlayType);

        return newTokenId;
    }

    // Override functions to resolve conflicts between ERC721URIStorage and ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

   function tokenURI(uint256 tokenId) 
    public 
    view 
    override(ERC721, ERC721URIStorage) 
    returns (string memory) 
{
    return super.tokenURI(tokenId);
}

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}


***

EditionMinter.tsx

"use client";

import { useState } from "react";
import { mintEdition } from "@/services/contract";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";

interface EditionMinterProps {
  originalId: number;
  editionCount: number;
  price: string;
}

// Define the expected result type from mintEdition
interface MintResult {
  success: boolean;
  transactionHash?: string;
  editionTokenId?: number;
  originalTokenId?: number;
  error?: string;
}

export function EditionMinter({
  originalId,
  editionCount,
  price,
}: EditionMinterProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const handleMint = async () => {
    setIsMinting(true);
    setError(null);
    setTxHash(null);

    // Add a timeout to prevent getting stuck in minting state
    const mintingTimeout = setTimeout(() => {
      setIsMinting(false);
      setError("Minting operation timed out. Please try again.");
    }, 30000); // 30 second timeout for transaction

    try {
      // Check if wallet is connected
      if (!isConnected || !walletClient) {
        setError("Please connect your wallet to mint an edition.");
        clearTimeout(mintingTimeout);
        setIsMinting(false);
        return;
      }

      // Create an ethers signer from the walletClient
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();

      // Call the mintEdition function with the signer
      const result = (await mintEdition(originalId, signer)) as MintResult;

      clearTimeout(mintingTimeout);

      if (result.success && result.transactionHash) {
        setTxHash(result.transactionHash);
      } else {
        setError(result.error || "Failed to mint edition");
      }
    } catch (err: any) {
      clearTimeout(mintingTimeout);
      console.error("Minting error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      clearTimeout(mintingTimeout);
      setIsMinting(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-600 dark:text-gray-300">
          Editions minted: {editionCount} / 100
        </span>
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {price} ETH
        </span>
      </div>

      {txHash ? (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
          <p className="text-green-700 dark:text-green-300 text-sm">
            Edition minted successfully!
          </p>
          <a
            href={`https://sepolia-explorer.base.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-600 dark:text-green-400 underline mt-1 inline-block"
          >
            View transaction
          </a>
        </div>
      ) : error ? (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
          <p className="text-blue-700 dark:text-blue-300 text-sm">{error}</p>
          {!isConnected && (
            <>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                To mint an edition, you need to:
              </p>
              <ol className="text-xs text-blue-600 dark:text-blue-400 list-decimal pl-5 mt-1">
                <li>
                  Connect your wallet using the button in the top-left corner
                </li>
                <li>Switch to Base Sepolia testnet</li>
                <li>Have some Base Sepolia ETH for gas</li>
                <li>Approve the transaction</li>
              </ol>
            </>
          )}
        </div>
      ) : null}

      <button
        onClick={handleMint}
        disabled={isMinting}
        className={`w-full py-3 px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-lg shadow-sm transition-colors ${
          isMinting ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {isMinting
          ? "Minting..."
          : isConnected
          ? "Mint Edition"
          : "Connect Wallet to Mint"}
      </button>
    </div>
  );
}