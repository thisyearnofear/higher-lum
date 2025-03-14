"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { COLLECTION_ADDRESS, NFT_METADATA } from "@/config/nft-config";
import { NFTType } from "@/types/nft-types";
import { getBestImageUrl } from "@/services/nftService";
import { getOriginalById } from "@/services/contract";
import type { OriginalNFT } from "@/types/nft-types";
import type { NFTMetadata } from "@/types/nft-types";

interface NFTModalProps {
  imageIndex: number;
  isOpen: boolean;
  onClose: () => void;
  isOnChainMode?: boolean;
  onChainNFTs?: NFTMetadata[];
}

export function NFTModal({
  imageIndex,
  isOpen,
  onClose,
  isOnChainMode = false,
  onChainNFTs = [],
}: NFTModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [originalData, setOriginalData] = useState<OriginalNFT | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
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

  // Fetch original NFT data if needed
  useEffect(() => {
    const fetchOriginalData = async () => {
      if (!isOnChainMode || !isOpen) return;

      setIsLoading(true);

      // Add a timeout to prevent getting stuck
      const fetchTimeout = setTimeout(() => {
        console.error("Fetching original data timed out");
        setIsLoading(false);
      }, 5000);

      try {
        const nft = onChainNFTs[imageIndex];
        if (nft && nft.originalId) {
          const data = await getOriginalById(nft.originalId);
          clearTimeout(fetchTimeout);
          setOriginalData(data);
        }
      } catch (error) {
        clearTimeout(fetchTimeout);
        console.error("Error fetching original data:", error);
      } finally {
        clearTimeout(fetchTimeout);
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchOriginalData();
    }
  }, [isOpen, imageIndex, isOnChainMode, onChainNFTs]);

  if (!mounted || (!isOpen && !isClosing)) return null;

  // Get the appropriate metadata based on mode
  let metadata;
  if (isOnChainMode && onChainNFTs.length > 0) {
    // Handle the case where imageIndex might be out of bounds
    const adjustedIndex = imageIndex % onChainNFTs.length;
    metadata = onChainNFTs[adjustedIndex];
  } else {
    metadata = NFT_METADATA[imageIndex + 1];
  }

  if (!metadata) {
    console.error(`No metadata found for image index ${imageIndex}`);
    return null;
  }

  const isOriginal = metadata.type === NFTType.ORIGINAL;
  const zoraUrl = isOriginal
    ? null
    : `https://zora.co/collect/base:${COLLECTION_ADDRESS}/${metadata.tokenId}`;

  const handleMintClick = () => {
    if (zoraUrl) {
      window.open(zoraUrl, "_blank");
    }
  };

  // Get the best image URL to display
  const imageUrl =
    isOnChainMode && metadata.groveUrl
      ? getBestImageUrl(metadata)
      : metadata.image;

  console.log(`Displaying NFT image: ${imageUrl}`);

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
        className={`relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden transform transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg
              className="w-6 h-6"
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

        <div className="p-6 text-center">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : (
            <>
              {/* Preview Image */}
              <div className="mb-6 rounded-lg overflow-hidden relative aspect-square">
                <Image
                  src={imageUrl}
                  alt={metadata.name || "NFT Image"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                />
              </div>

              <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                {metadata.name || "Higher NFT"}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 whitespace-pre-line leading-relaxed">
                {metadata.description}
              </p>

              {isOriginal ? (
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                    Original NFT
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    This is an original NFT from the Higher collection.
                  </p>
                  {originalData && (
                    <div className="text-sm text-left">
                      <p className="mb-1">
                        <span className="font-medium">Creator:</span>{" "}
                        {originalData.creator}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Token ID:</span>{" "}
                        {originalData.tokenId}
                      </p>
                      <p>
                        <span className="font-medium">Editions:</span>{" "}
                        {originalData.editionCount}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleMintClick}
                  className="w-full py-3 px-4 bg-[#4caf50] hover:bg-[#45a049] text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Mint
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
