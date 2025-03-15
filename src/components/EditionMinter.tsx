"use client";

import { useState, useEffect } from "react";
import { mintEdition } from "@/services/contract";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";

interface EditionMinterProps {
  originalId: number;
  editionCount: number;
  price: string;
  chainId?: number;
}

// Define the expected result type from mintEdition
interface MintResult {
  success: boolean;
  transactionHash?: string;
  editionTokenId?: number;
  originalTokenId?: number;
  chainId?: number;
  error?: string;
}

export function EditionMinter({
  originalId,
  editionCount,
  price,
  chainId = 84532,
}: EditionMinterProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const { isConnected, address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Check if user is on the correct network
  useEffect(() => {
    if (isConnected && chain?.id !== chainId) {
      setNetworkError(
        `Please switch to ${
          chainId === 534351 ? "Scroll" : "Base"
        } Sepolia network to mint this edition.`
      );
    } else {
      setNetworkError(null);
    }
  }, [isConnected, chain?.id, chainId]);

  // Function to parse user-friendly error messages
  const getReadableErrorMessage = (error: any): string => {
    const errorMessage = error?.message || String(error);

    // Check for user rejected transaction
    if (
      errorMessage.includes("user rejected") ||
      errorMessage.includes("User denied") ||
      errorMessage.includes("User rejected") ||
      errorMessage.includes("code: 4001")
    ) {
      return "Transaction was rejected. Please try again when you're ready to approve.";
    }

    // Check for wrong network errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("chain") ||
      errorMessage.includes("could not decode result data")
    ) {
      return `Please make sure you're connected to ${
        chainId === 534351 ? "Scroll" : "Base"
      } Sepolia network.`;
    }

    // Check for insufficient funds
    if (
      errorMessage.includes("insufficient funds") ||
      errorMessage.includes("not enough funds")
    ) {
      return `Insufficient funds. Please make sure you have enough ETH for gas and the mint price (${price} ETH).`;
    }

    // Default error message (shortened)
    if (errorMessage.length > 100) {
      return errorMessage.substring(0, 100) + "...";
    }

    return errorMessage;
  };

  const handleMint = async () => {
    setIsMinting(true);
    setError(null);
    setTxHash(null);

    // Check if on correct network first
    if (chain?.id !== chainId) {
      setError(
        `Please switch to ${
          chainId === 534351 ? "Scroll" : "Base"
        } Sepolia network first.`
      );
      setIsMinting(false);
      return;
    }

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

      console.log(`Minting with address: ${address} on chain ID: ${chainId}`);

      // Call the mintEdition function with the signer and chainId
      const result = (await mintEdition(
        originalId,
        signer,
        chainId
      )) as MintResult;

      clearTimeout(mintingTimeout);

      if (result.success && result.transactionHash) {
        setTxHash(result.transactionHash);
      } else {
        setError(getReadableErrorMessage(result.error));
      }
    } catch (err: any) {
      clearTimeout(mintingTimeout);
      console.error("Minting error:", err);
      setError(getReadableErrorMessage(err));
    } finally {
      clearTimeout(mintingTimeout);
      setIsMinting(false);
    }
  };

  // Get the correct block explorer URL based on chainId
  const getExplorerUrl = (hash: string) => {
    if (chainId === 534351) {
      // Scroll Sepolia
      return `https://sepolia.scrollscan.com/tx/${hash}`;
    } else {
      // Base Sepolia
      return `https://sepolia-explorer.base.org/tx/${hash}`;
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

      {/* Network warning banner */}
      {networkError && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-4">
          <p className="text-yellow-700 dark:text-yellow-300 text-sm flex items-center">
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {networkError}
          </p>
          <button
            onClick={() => {
              // Attempt to switch network
              if (window.ethereum) {
                try {
                  const params =
                    chainId === 534351
                      ? { chainId: "0x8274f" } // Scroll Sepolia
                      : { chainId: "0x14a34" }; // Base Sepolia

                  window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [params],
                  });
                } catch (err) {
                  console.error("Failed to switch network:", err);
                }
              }
            }}
            className="mt-2 text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
          >
            Switch to {chainId === 534351 ? "Scroll" : "Base"} Sepolia
          </button>
        </div>
      )}

      {txHash ? (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
          <p className="text-green-700 dark:text-green-300 text-sm">
            Edition minted successfully!
          </p>
          <a
            href={getExplorerUrl(txHash)}
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
                <li>
                  Switch to {chainId === 534351 ? "Scroll" : "Base"} Sepolia
                  testnet
                </li>
                <li>
                  Have some {chainId === 534351 ? "Scroll" : "Base"} Sepolia ETH
                  for gas
                </li>
                <li>Approve the transaction</li>
              </ol>
            </>
          )}
        </div>
      ) : null}

      <button
        onClick={handleMint}
        disabled={isMinting || !!networkError}
        className={`w-full py-3 px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-lg shadow-sm transition-colors ${
          isMinting || !!networkError ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {isMinting
          ? "Minting..."
          : networkError
          ? `Switch to ${chainId === 534351 ? "Scroll" : "Base"} Sepolia`
          : isConnected
          ? "Mint Edition"
          : "Connect Wallet to Mint"}
      </button>
    </div>
  );
}
