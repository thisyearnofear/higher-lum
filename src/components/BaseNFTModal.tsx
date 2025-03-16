"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { COLLECTION_ADDRESS } from "@/config/nft-config";
import { NFTType } from "@/types/nft-types";
import { getBestImageUrl } from "@/services/nftService";
import {
  getOriginalById,
  originalExists,
  getCurrentEditionsMinted,
} from "@/services/contract";
import type { OriginalNFT } from "@/types/nft-types";
import type { NFTMetadata } from "@/types/nft-types";
import { EditionMinter } from "./EditionMinter";
import { getMaxEditionsForOriginal } from "@/services/contract";

interface BaseNFTModalProps {
  imageIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onChainNFTs: NFTMetadata[];
  selectedNFTId?: string;
}

export function BaseNFTModal({
  imageIndex,
  isOpen,
  onClose,
  onChainNFTs,
  selectedNFTId,
}: BaseNFTModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [originalData, setOriginalData] = useState<OriginalNFT | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTMetadata | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [editionCount, setEditionCount] = useState<number>(0);
  const [isPollingEditions, setIsPollingEditions] = useState(false);
  const [maxEditions, setMaxEditions] = useState<number>(10); // Base has 10 max editions by default
  const [originalDoesExist, setOriginalDoesExist] = useState<boolean>(true);

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

    // Try to find the NFT by ID first if provided
    if (selectedNFTId) {
      metadata = onChainNFTs.find((nft) => nft.id === selectedNFTId);
    }

    // If no NFT found by ID or no ID provided, fall back to index
    if (!metadata && onChainNFTs.length > 0) {
      // Handle the case where imageIndex might be out of bounds
      const adjustedIndex = imageIndex % onChainNFTs.length;
      metadata = onChainNFTs[adjustedIndex];
    }

    setSelectedNFT(metadata || null);

    // Fetch original data if this is an original NFT
    if (metadata && metadata.type === NFTType.ORIGINAL) {
      setIsLoading(true);

      // Add a timeout to prevent getting stuck
      const fetchTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 5000);

      getOriginalById(metadata.tokenId, false) // Pass false for isScroll
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
  }, [isOpen, imageIndex, onChainNFTs, selectedNFTId]);

  // Function to get current edition count
  const getCurrentEditionCount = useCallback(async () => {
    if (!selectedNFT) return;

    try {
      setIsPollingEditions(true);

      // For original NFTs, we need to use the tokenId
      const idToQuery =
        selectedNFT.type === NFTType.ORIGINAL
          ? Number(selectedNFT.tokenId)
          : selectedNFT.originalId
          ? Number(selectedNFT.originalId)
          : Number(selectedNFT.tokenId);

      console.log(`NFT details:`, {
        id: selectedNFT.id,
        tokenId: selectedNFT.tokenId,
        originalId: selectedNFT.originalId,
        type: selectedNFT.type,
        idToQuery,
      });
      console.log(`Querying editionsMinted for ID: ${idToQuery}`);

      // Check if the original exists
      try {
        const exists = await originalExists(idToQuery, false); // Pass false for isScroll
        setOriginalDoesExist(exists);
        console.log(`Original #${idToQuery} exists on Base: ${exists}`);

        if (!exists) {
          console.log(
            `Original #${idToQuery} doesn't exist, setting edition count to 0`
          );
          setEditionCount(0);
          setIsPollingEditions(false);
          return;
        }
      } catch (error) {
        console.warn(`Error checking if original #${idToQuery} exists:`, error);
        // If the function call fails, assume the original exists
        setOriginalDoesExist(true);
      }

      // Get the max editions for this original
      try {
        const maxForOriginal = await getMaxEditionsForOriginal(
          idToQuery,
          false
        ); // Pass false for isScroll
        setMaxEditions(maxForOriginal);
        console.log(
          `Max editions for original ID ${idToQuery}: ${maxForOriginal}`
        );
      } catch (error) {
        console.warn(
          `Error getting max editions for original ID ${idToQuery}:`,
          error
        );
        // Use default value if we can't get from contract
        setMaxEditions(100);
      }

      // Only query editions minted if the original exists
      if (originalDoesExist) {
        try {
          const editionsMinted = await getCurrentEditionsMinted(
            idToQuery,
            false
          ); // Pass false for isScroll
          console.log(
            `Edition count for NFT #${selectedNFT.id}: ${editionsMinted}`
          );
          setEditionCount(editionsMinted);
        } catch (error) {
          console.error(
            `Error getting editionsMinted for ID ${idToQuery}:`,
            error
          );
          // Keep the current count if there's an error
        }
      } else {
        // If the original doesn't exist, set edition count to 0
        console.log(
          `Original #${idToQuery} doesn't exist, setting edition count to 0`
        );
        setEditionCount(0);
      }
    } catch (error) {
      console.error("Error fetching edition count:", error);
    } finally {
      setIsPollingEditions(false);
    }
  }, [selectedNFT, originalDoesExist]);

  // Poll for edition count updates
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isOpen && selectedNFT) {
      // Initial fetch
      getCurrentEditionCount();

      // Poll every 10 seconds while modal is open
      pollInterval = setInterval(getCurrentEditionCount, 10000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isOpen, selectedNFT, getCurrentEditionCount]);

  // Update edition count when NFT selection changes
  useEffect(() => {
    if (selectedNFT) {
      getCurrentEditionCount();
    }
  }, [selectedNFT, getCurrentEditionCount]);

  // Reset edition count when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setEditionCount(0);
    }
  }, [isOpen]);

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

  // Determine the appropriate Zora URL
  const zoraUrl = isOriginal
    ? null
    : `https://zora.co/collect/base-sepolia:${COLLECTION_ADDRESS}/${selectedNFT.tokenId}`;

  const handleMintClick = () => {
    if (zoraUrl) {
      window.open(zoraUrl, "_blank");
    }
  };

  // Get the best image URL to display
  const imageUrl = getBestImageUrl(selectedNFT);

  // Calculate remaining editions
  const remainingEditions = maxEditions - editionCount;
  const isSoldOut = remainingEditions <= 0;

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

              {/* Display chain badge */}
              <div className="mb-1 text-center">
                <span
                  className="inline-block px-2 py-0.5 text-xs font-medium rounded-full 
                    bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  Base Sepolia
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-line leading-relaxed text-center">
                {selectedNFT.description}
              </p>

              {/* Warning if original doesn't exist */}
              {!originalDoesExist && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-300 text-center">
                  <p>This original NFT does not exist on Base.</p>
                </div>
              )}

              {/* Base-specific warning about one-per-address limit */}
              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300 text-center">
                <p>One edition per address • Max {maxEditions} per original</p>
              </div>

              {/* Error message display */}
              {mintError && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-300 text-center">
                  {mintError}
                </div>
              )}

              {/* Edition count display */}
              <div className="text-center mb-3">
                {isPollingEditions ? (
                  <div className="flex justify-center items-center py-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 dark:border-gray-400 mr-2"></div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Updating...
                    </p>
                  </div>
                ) : (
                  <p className="text-sm">
                    <span className="font-medium">{editionCount}</span>/
                    {maxEditions} minted
                    {!isSoldOut && remainingEditions > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                        ({remainingEditions} left)
                      </span>
                    )}
                    {isSoldOut && (
                      <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                        (Sold out)
                      </span>
                    )}
                  </p>
                )}
              </div>

              {isOriginal ? (
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg mb-3">
                  {originalData && (
                    <EditionMinter
                      originalId={Number(selectedNFT.tokenId)}
                      editionCount={editionCount}
                      price="0.01"
                      maxEditions={maxEditions}
                      isScroll={false} // This is the Base NFT modal, so isScroll is false
                    />
                  )}
                </div>
              ) : (
                <button
                  onClick={handleMintClick}
                  disabled={isSoldOut}
                  className={`w-full py-2 px-3 ${
                    isSoldOut
                      ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
                      : "bg-[#4caf50] hover:bg-[#45a049]"
                  } text-white font-medium rounded-lg shadow-sm transition-colors text-sm`}
                >
                  {isSoldOut ? "Sold Out" : "Mint on Zora"}
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
