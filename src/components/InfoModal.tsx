"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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

  if (!mounted || (!isOpen && !isClosing)) return null;

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
        className={`relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden transform transition-all duration-200 ${
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

        <div className="p-8 text-center">
          <div className="flex justify-center space-x-4 mb-6 text-4xl text-[#4caf50]">
            <span>↑</span>
            <span>△</span>
            <span>⬆</span>
            <span>⤴︎</span>
          </div>

          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            Higher Coded
          </h2>

          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            An art collection & viewing experience built on Base as part of a
            Farcaster originated collective's vision to aim higher and inspire
            commitment to the pursuit of authenticity, agency, optimism &
            greatness.
          </p>

          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            NFTs mintable on Zora garnering higher potential energy for an
            upcoming music experience collaboration with anatu.
          </p>

          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              How to Use
            </h3>
            <ul className="text-left text-gray-600 dark:text-gray-300 space-y-2">
              <li className="flex items-start">
                <span className="mr-2 text-[#4caf50]">•</span>
                <span>Double click any image to mint it</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-[#4caf50]">•</span>
                <span>
                  Wait for the "HIGHER" button to fill and glow to access the
                  on-chain NFT experience
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-[#4caf50]">•</span>
                <span>
                  Click and drag to navigate through the immersive gallery
                </span>
              </li>
            </ul>
          </div>

          <div className="flex justify-center space-x-4">
            <a
              href="https://www.aimhigher.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#4caf50] hover:bg-[#45a049] text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              Aim Higher
            </a>
            <a
              href="https://anatu.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              anatu
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
