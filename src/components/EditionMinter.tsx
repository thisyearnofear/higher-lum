"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { mintEdition, getAvailableScrollEditions } from "@/services/contract";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import {
  SCROLLIFY_EDITIONS_ADDRESS,
  EDITIONS_ADDRESS,
} from "@/config/nft-config";
import {
  ScrollifyEditionsABI,
  HigherBaseEditionsABI,
} from "@/services/contract";

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
  editionTokenId?: number | null;
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
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [availableEditions, setAvailableEditions] = useState<number[]>([]);
  const [currentEditionCount, setCurrentEditionCount] = useState(editionCount);
  const { isConnected, address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Track network switch attempts to prevent infinite loops
  const networkSwitchAttemptedRef = useRef(false);
  const lastNetworkSwitchTimeRef = useRef(0);

  // Function to refresh edition count
  const refreshEditionCount = useCallback(async () => {
    try {
      let provider;
      let contractAddress;
      let contractABI;

      if (chainId === 534351) {
        // Scroll Sepolia
        provider = new ethers.JsonRpcProvider("https://sepolia-rpc.scroll.io/");
        contractAddress = SCROLLIFY_EDITIONS_ADDRESS;
        contractABI = ScrollifyEditionsABI;
      } else {
        // Base Sepolia
        provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
        contractAddress = EDITIONS_ADDRESS;
        contractABI = HigherBaseEditionsABI;
      }

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );

      // Get both editionsMinted and check if the original exists
      const [count, originalExists] = await Promise.all([
        contract.editionsMinted(originalId),
        chainId === 534351
          ? contract.originalExists(originalId)
          : Promise.resolve(true),
      ]);

      if (!originalExists && chainId === 534351) {
        console.log(`Original #${originalId} doesn't exist on Scroll`);
        setCurrentEditionCount(0);
        return;
      }

      const editionCount = Number(count);
      setCurrentEditionCount(editionCount);
      console.log(`Edition count for original #${originalId}: ${editionCount}`);

      // Update available editions for Scroll
      if (chainId === 534351) {
        const available = await getAvailableScrollEditions();
        setAvailableEditions(available);
      }
    } catch (error) {
      console.error("Error refreshing edition count:", error);
      // On error, try again after a short delay
      setTimeout(refreshEditionCount, 2000);
    }
  }, [chainId, originalId]);

  // Poll for edition count updates more frequently right after minting
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let fastPollTimeout: NodeJS.Timeout;

    const startPolling = () => {
      // Initial fetch
      refreshEditionCount();

      // Fast polling for 30 seconds after mounting or minting
      const fastPoll = () => {
        pollInterval = setInterval(refreshEditionCount, 3000);
        // Switch to slower polling after 30 seconds
        fastPollTimeout = setTimeout(() => {
          clearInterval(pollInterval);
          pollInterval = setInterval(refreshEditionCount, 10000);
        }, 30000);
      };

      fastPoll();
    };

    startPolling();

    // Cleanup
    return () => {
      clearInterval(pollInterval);
      clearTimeout(fastPollTimeout);
    };
  }, [refreshEditionCount, txHash]); // Added txHash dependency to restart fast polling after minting

  // Update edition count when props change
  useEffect(() => {
    refreshEditionCount();
  }, [editionCount, refreshEditionCount]);

  // Update available editions for Scroll
  useEffect(() => {
    if (chainId === 534351) {
      const checkAvailableEditions = async () => {
        try {
          const available = await getAvailableScrollEditions();
          setAvailableEditions(available);
        } catch (err) {
          console.error("Error checking available editions:", err);
        }
      };

      checkAvailableEditions();
    }
  }, [chainId, currentEditionCount]);

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
      // Reset the network switch attempt flag when on the correct network
      networkSwitchAttemptedRef.current = false;
    }
  }, [isConnected, chain?.id, chainId]);

  // Function to parse user-friendly error messages
  const getReadableErrorMessage = (error: unknown): string => {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : "Unknown error";

    // Check for user rejected transaction
    if (
      errorMessage.includes("user rejected") ||
      errorMessage.includes("User denied") ||
      errorMessage.includes("User rejected") ||
      errorMessage.includes("code: 4001")
    ) {
      return "Transaction was rejected. Please try again when you're ready to approve.";
    }

    // Check for transaction reverted errors
    if (
      errorMessage.includes("reverted") ||
      errorMessage.includes("status: 0")
    ) {
      if (chainId === 534351) {
        return "Transaction reverted on Scroll. This could be because the NFT has already been minted or the contract doesn't recognize this original ID.";
      } else {
        return "Transaction reverted. This could be because the NFT has already been minted or there's an issue with the contract.";
      }
    }

    // Check for wrong network errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("chain") ||
      errorMessage.includes("could not decode result data") ||
      errorMessage.includes("missing revert data")
    ) {
      return `Please make sure you're connected to ${
        chainId === 534351 ? "Scroll" : "Base"
      } Sepolia network and refresh the page.`;
    }

    // Check for Scroll-specific errors
    if (chainId === 534351 && errorMessage.includes("CALL_EXCEPTION")) {
      return "There was an issue with the Scroll contract. Please try again later or contact support.";
    }

    // Check for insufficient funds
    if (
      errorMessage.includes("insufficient funds") ||
      errorMessage.includes("not enough funds")
    ) {
      return `Insufficient funds. Please make sure you have enough ETH for gas and the mint price (${price} ETH).`;
    }

    // Check for invalid original ID
    if (errorMessage.includes("Invalid original ID")) {
      return errorMessage;
    }

    // Default error message (shortened)
    if (errorMessage.length > 100) {
      return errorMessage.substring(0, 100) + "...";
    }

    return errorMessage;
  };

  // Function to handle network switching
  const handleSwitchNetwork = async () => {
    // Prevent rapid repeated switch attempts
    const now = Date.now();
    if (now - lastNetworkSwitchTimeRef.current < 3000) {
      console.log("Throttling network switch request");
      return;
    }

    lastNetworkSwitchTimeRef.current = now;
    networkSwitchAttemptedRef.current = true;
    setIsSwitchingNetwork(true);

    try {
      if (window.ethereum) {
        const hexChainId =
          chainId === 534351
            ? "0x8274f" // Scroll Sepolia
            : "0x14a34"; // Base Sepolia

        console.log(`Switching to chain ID: ${chainId} (${hexChainId})`);

        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }],
        });

        console.log("Network switch request sent");
      }
    } catch (err) {
      console.error("Failed to switch network:", err);
      setError(`Failed to switch network: ${getReadableErrorMessage(err)}`);
    } finally {
      // Add a delay before setting isSwitchingNetwork to false
      // This gives MetaMask time to process the request
      setTimeout(() => {
        setIsSwitchingNetwork(false);
      }, 2000);
    }
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

    // For Scroll, check if the edition is available
    if (chainId === 534351) {
      if (!availableEditions.includes(originalId)) {
        setError(
          `Maximum editions (100) already minted for original ID ${originalId}.`
        );
        setIsMinting(false);
        return;
      }
    }

    // Add a timeout to prevent getting stuck in minting state
    const mintingTimeout = setTimeout(() => {
      setIsMinting(false);
      setError("Minting operation timed out. Please try again.");
    }, 60000); // 60 second timeout for transaction

    try {
      // Check if wallet is connected
      if (!isConnected || !walletClient) {
        setError("Please connect your wallet to mint an edition.");
        clearTimeout(mintingTimeout);
        setIsMinting(false);
        return;
      }

      // Create an ethers signer from the walletClient
      const provider = new ethers.BrowserProvider(
        walletClient as ethers.Eip1193Provider
      );
      const signer = await provider.getSigner();

      console.log(`Minting with address: ${address} on chain ID: ${chainId}`);

      // Add extra logging for Scroll
      if (chainId === 534351) {
        console.log(`Minting Scroll edition for original ID: ${originalId}`);
        console.log(
          `Using contract: ${
            chainId === 534351 ? "ScrollifyEditions" : "HigherBaseEditions"
          }`
        );
      }

      // Call the mintEdition function with the signer and chainId
      const result: MintResult = await mintEdition(originalId, signer, chainId);

      clearTimeout(mintingTimeout);

      if (result.success && result.transactionHash) {
        setTxHash(result.transactionHash);
        // Refresh the edition count after successful mint
        await refreshEditionCount();
      } else {
        setError(getReadableErrorMessage(result.error));
      }
    } catch (err: unknown) {
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
    <div className="mt-2">
      <div className="flex items-center justify-center mb-2">
        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
          {price} ETH
        </span>
      </div>

      {/* Network warning banner */}
      {networkError && (
        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-2 text-center">
          <p className="text-yellow-700 dark:text-yellow-300 text-xs flex items-center justify-center">
            <svg
              className="w-3 h-3 mr-1"
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
            onClick={handleSwitchNetwork}
            disabled={isSwitchingNetwork}
            className={`mt-1 text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors ${
              isSwitchingNetwork ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSwitchingNetwork
              ? "Switching..."
              : `Switch to ${chainId === 534351 ? "Scroll" : "Base"} Sepolia`}
          </button>
        </div>
      )}

      {txHash ? (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg mb-2 text-center">
          <p className="text-green-700 dark:text-green-300 text-xs">
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
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-2 text-center">
          <p className="text-blue-700 dark:text-blue-300 text-xs">{error}</p>
          {!isConnected && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Connect your wallet to mint
            </p>
          )}
        </div>
      ) : null}

      <button
        onClick={handleMint}
        disabled={isMinting || !!networkError || currentEditionCount >= 100}
        className={`w-full py-2 px-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg shadow-sm transition-colors text-xs ${
          isMinting || !!networkError || currentEditionCount >= 100
            ? "opacity-70 cursor-not-allowed"
            : ""
        }`}
      >
        {isMinting
          ? "Minting..."
          : networkError
          ? `Switch to ${chainId === 534351 ? "Scroll" : "Base"} Sepolia`
          : isConnected
          ? currentEditionCount >= 100
            ? "Maximum Editions Minted"
            : "Mint Edition"
          : "Connect Wallet to Mint"}
      </button>
    </div>
  );
}
