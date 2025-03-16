"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { NFT_METADATA, BASE_MAINNET_ADDRESS } from "@/config/nft-config";
import { NFTType } from "@/types/nft-types";
import { getBestImageUrl } from "@/services/nftService";
import type { NFTMetadata } from "@/types/nft-types";

interface OffChainNFTModalProps {
  imageIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function OffChainNFTModal({
  imageIndex,
  isOpen,
  onClose,
}: OffChainNFTModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTMetadata | null>(null);

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

  // Find the appropriate NFT
  useEffect(() => {
    if (!isOpen) return;

    // Use the hardcoded NFT metadata with 1-based indexing
    const adjustedIndex = (imageIndex % 16) + 1;
    const hardcodedNFT = NFT_METADATA[adjustedIndex];

    // Convert from hardcoded format to NFTMetadata format
    if (hardcodedNFT) {
      const metadata = {
        id: adjustedIndex.toString(),
        name: hardcodedNFT.title,
        description: hardcodedNFT.description,
        image: `/${hardcodedNFT.imageFile}`,
        tokenId: hardcodedNFT.tokenId,
        type: NFTType.EDITION,
        attributes: [],
        chainId: 0,
        chainName: "Base",
        contractAddress: BASE_MAINNET_ADDRESS, // Use Base mainnet address for hardcoded NFTs
        isScrollNFT: false,
        tokenURI: "",
      };
      setSelectedNFT(metadata);
    }
  }, [isOpen, imageIndex]);

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

  // Determine the appropriate Zora URL
  const zoraUrl = `https://zora.co/collect/base:${BASE_MAINNET_ADDRESS}/${selectedNFT.tokenId}`;

  const handleMintClick = () => {
    if (zoraUrl) {
      window.open(zoraUrl, "_blank");
    }
  };

  // Get the best image URL to display
  const imageUrl = getBestImageUrl(selectedNFT);

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
                bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            >
              Base
            </span>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-line leading-relaxed text-center">
            {selectedNFT.description}
          </p>

          <button
            onClick={handleMintClick}
            className="w-full py-2 px-3 bg-[#4caf50] hover:bg-[#45a049] text-white font-medium rounded-lg shadow-sm transition-colors text-sm"
          >
            Mint on Zora
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
