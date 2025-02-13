"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { COLLECTION_ADDRESS, NFT_METADATA } from "@/config/nft-config";

interface NFTModalProps {
  imageIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function NFTModal({ imageIndex, isOpen, onClose }: NFTModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

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
  }, [isOpen]);

  if (!mounted || (!isOpen && !isClosing)) return null;

  const metadata = NFT_METADATA[imageIndex + 1];
  if (!metadata) {
    console.error(`No metadata found for image index ${imageIndex}`);
    return null;
  }

  const zoraUrl = `https://zora.co/collect/base:${COLLECTION_ADDRESS}/${metadata.tokenId}`;

  const handleMintClick = () => {
    window.open(zoraUrl, "_blank");
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-200 ${
          isClosing ? "bg-opacity-0" : "bg-opacity-75"
        } backdrop-blur-sm`}
        onClick={handleClose}
      />

      {/* Modal Content */}
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
          {/* Preview Image */}
          <div className="mb-6 rounded-lg overflow-hidden">
            <img
              src={`/${metadata.imageFile}`}
              alt={metadata.title}
              className="w-full h-auto"
            />
          </div>

          <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
            {metadata.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 whitespace-pre-line leading-relaxed">
            {metadata.description}
          </p>
          <button
            onClick={handleMintClick}
            className="w-full py-3 px-4 bg-[#4caf50] hover:bg-[#45a049] text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            Mint
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
