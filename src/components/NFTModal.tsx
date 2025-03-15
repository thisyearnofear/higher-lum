"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  COLLECTION_ADDRESS,
  NFT_METADATA,
  SCROLLIFY_ORIGINALS_ADDRESS,
} from "@/config/nft-config";
import { NFTType } from "@/types/nft-types";
import { getBestImageUrl } from "@/services/nftService";
import { getOriginalById } from "@/services/contract";
import type { OriginalNFT } from "@/types/nft-types";
import type { NFTMetadata } from "@/types/nft-types";
import { EditionMinter } from "./EditionMinter";
import { useAccount } from "wagmi";

interface NFTModalProps {
  imageIndex: number;
  isOpen: boolean;
  onClose: () => void;
  isOnChainMode: boolean;
  isOnChainScrollMode: boolean;
  onChainNFTs: NFTMetadata[];
  scrollNFTs: NFTMetadata[];
  selectedNFTId?: string;
}

export function NFTModal({
  imageIndex,
  isOpen,
  onClose,
  isOnChainMode,
  isOnChainScrollMode,
  onChainNFTs,
  scrollNFTs,
  selectedNFTId,
}: NFTModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [originalData, setOriginalData] = useState<OriginalNFT | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTMetadata | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isConnected, chain } = useAccount();

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setMintError(null);
    }, 150);
  }, [onClose]);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      setIsClosing(false);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClose]);

  // Find the appropriate NFT and fetch original data if needed
  useEffect(() => {
    if (!isOpen) return;

    let metadata: NFTMetadata | undefined;

    // For off-chain mode, use the hardcoded metadata
    if (!isOnChainMode) {
      // Use the hardcoded NFT metadata with 1-based indexing
      const adjustedIndex = (imageIndex % 16) + 1;
      const hardcodedNFT = NFT_METADATA[adjustedIndex];

      // Convert from hardcoded format to NFTMetadata format
      if (hardcodedNFT) {
        metadata = {
          id: adjustedIndex.toString(),
          name: hardcodedNFT.title,
          description: hardcodedNFT.description,
          image: `/${hardcodedNFT.imageFile}`,
          tokenId: hardcodedNFT.tokenId,
          type: NFTType.EDITION,
          attributes: [],
          chainId: 0,
          chainName: "Zora",
          contractAddress: COLLECTION_ADDRESS,
          isScrollNFT: false,
          tokenURI: "",
        };
      }

      setSelectedNFT(metadata || null);
      return;
    }

    // Determine which NFT array to use based on mode
    const nftsToUse = isOnChainScrollMode ? scrollNFTs : onChainNFTs;

    // Try to find the NFT by ID first if provided
    if (selectedNFTId) {
      metadata = nftsToUse.find((nft) => nft.id === selectedNFTId);
    }

    // If no NFT found by ID or no ID provided, fall back to index
    if (!metadata && nftsToUse.length > 0) {
      // Handle the case where imageIndex might be out of bounds
      const adjustedIndex = imageIndex % nftsToUse.length;
      metadata = nftsToUse[adjustedIndex];
    }

    setSelectedNFT(metadata || null);

    // Fetch original data if this is an original NFT
    if (metadata && metadata.type === NFTType.ORIGINAL) {
      setIsLoading(true);

      // Add a timeout to prevent getting stuck
      const fetchTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 5000);

      getOriginalById(metadata.tokenId)
        .then((data) => {
          clearTimeout(fetchTimeout);
          setOriginalData(data);
          setIsLoading(false);
        })
        .catch(() => {
          clearTimeout(fetchTimeout);
          setIsLoading(false);
        });
    }
  }, [
    isOpen,
    imageIndex,
    isOnChainMode,
    isOnChainScrollMode,
    onChainNFTs,
    scrollNFTs,
    selectedNFTId,
  ]);

  if (!mounted || (!isOpen && !isClosing)) return null;

  if (!selectedNFT) {
    return createPortal(
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-200 ${
            isClosing ? "bg-opacity-0" : "bg-opacity-75"
          } backdrop-blur-sm`}
          onClick={handleClose}
        />

        <div
          className={`relative z-10 w-full max-w-xs bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden transform transition-all duration-200 ${
            isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <div className="p-4 text-center">
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const isOriginal = selectedNFT.type === NFTType.ORIGINAL;

  // Determine the appropriate Zora URL based on the chain
  const zoraUrl = isOriginal
    ? null
    : isOnChainScrollMode
    ? `https://zora.co/collect/scroll-sepolia:${SCROLLIFY_ORIGINALS_ADDRESS}/${selectedNFT.tokenId}`
    : isOnChainMode
    ? `https://zora.co/collect/base:${COLLECTION_ADDRESS}/${selectedNFT.tokenId}`
    : `https://zora.co/collect/base:${selectedNFT.contractAddress}/${selectedNFT.tokenId}`;

  const handleMintClick = () => {
    if (zoraUrl) {
      window.open(zoraUrl, "_blank");
    }
  };

  // Get the best image URL to display
  const imageUrl = getBestImageUrl(selectedNFT);

  // Determine the chain ID based on the mode
  const chainId = isOnChainScrollMode ? 534351 : 84532;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-200 ${
          isClosing ? "bg-opacity-0" : "bg-opacity-75"
        } backdrop-blur-sm`}
        onClick={handleClose}
      />

      <div
        className={`relative z-10 w-full max-w-xs bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden transform transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors bg-white dark:bg-gray-800 rounded-full p-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : (
            <>
              {/* Preview Image */}
              <div className="mb-3 rounded-lg overflow-hidden relative aspect-square">
                <Image
                  src={imageUrl}
                  alt={selectedNFT.name || "NFT Image"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                />
              </div>

              <h2 className="text-lg font-bold mb-1 text-gray-900 dark:text-white text-center">
                {selectedNFT.name || "Higher NFT"}
              </h2>

              {/* Display chain badge for on-chain NFTs */}
              {isOnChainMode && (
                <div className="mb-1 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      isOnChainScrollMode
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}
                  >
                    {isOnChainScrollMode ? "Scroll Sepolia" : "Base Sepolia"}
                  </span>
                </div>
              )}

              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-line leading-relaxed text-center">
                {selectedNFT.description}
              </p>

              {/* Error message display */}
              {mintError && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-300 text-center">
                  {mintError}
                </div>
              )}

              {isOnChainMode && isOriginal ? (
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg mb-3 text-xs text-center">
                  {originalData && (
                    <>
                      <div className="mb-2">
                        <p className="mb-1">
                          <span className="font-medium">
                            Editions Available:
                          </span>{" "}
                          {100 - originalData.editionCount} / 100
                        </p>
                      </div>

                      <EditionMinter
                        originalId={originalData.tokenId}
                        editionCount={originalData.editionCount}
                        price={isOnChainScrollMode ? "0.005" : "0.01"}
                        chainId={chainId}
                      />
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleMintClick}
                  className="w-full py-2 px-3 bg-[#4caf50] hover:bg-[#45a049] text-white font-medium rounded-lg shadow-sm transition-colors text-sm"
                >
                  Mint on Zora
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
