"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150); // Slightly faster transition for better responsiveness
  };

  // Handle escape key
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

  console.log("NFTModal rendering with image index:", imageIndex);

  // Construct Zora URL for the specific NFT
  const COLLECTION_ADDRESS = "0x1dd4245bc6b1bbd43caf9a5033e887067852123d";
  const zoraUrl = `https://zora.co/collect/base:${COLLECTION_ADDRESS}/${
    imageIndex + 1
  }`;

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

        <div className="p-6">
          {/* Preview Image */}
          <div className="mb-6 rounded-lg overflow-hidden">
            <img
              src={`/image-${imageIndex + 1}.jpg`}
              alt={`NFT #${imageIndex + 1}`}
              className="w-full h-auto"
            />
          </div>

          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Mint this NFT
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You're about to mint image #{imageIndex + 1} from the HIGHER
            collection.
          </p>
          <button
            onClick={handleMintClick}
            className="w-full py-3 px-4 bg-[#4caf50] hover:bg-[#45a049] text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            Open Zora to Mint
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
