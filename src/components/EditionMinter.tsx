"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  mintEdition,
  getMaxEditionsForOriginal,
  getCurrentEditionsMinted,
  hasUserMintedEdition,
  originalExists,
} from "@/services/contract";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";

interface EditionMinterProps {
  originalId: number;
  editionCount: number;
  price: string;
  maxEditions?: number;
  isScroll?: boolean;
}

// Define the expected result type from mintEdition
interface MintResult {
  success: boolean;
  message: string;
  txHash?: string;
}

export function EditionMinter({
  originalId,
  editionCount,
  price,
  maxEditions = 100,
  isScroll = false,
}: EditionMinterProps) {
  // Ensure originalId is a number
  const safeOriginalId = Number(originalId);

  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [currentEditionCount, setCurrentEditionCount] = useState(editionCount);
  const { isConnected, address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [hasAlreadyMinted, setHasAlreadyMinted] = useState<boolean>(false);
  const [originalDoesExist, setOriginalDoesExist] = useState<boolean>(true);
  const [maxEditionsForOriginal, setMaxEditionsForOriginal] =
    useState<number>(maxEditions);

  // Track network switch attempts to prevent infinite loops
  const networkSwitchAttemptedRef = useRef(false);
  const lastNetworkSwitchTimeRef = useRef(0);

  // Chain IDs
  const baseSepoliaChainId = 84532;
  const scrollSepoliaChainId = 534351;
  const chainId = isScroll ? scrollSepoliaChainId : baseSepoliaChainId;

  // Log the originalId when the component mounts or when it changes
  useEffect(() => {
    console.log(
      `EditionMinter: Received originalId=${originalId} (${typeof originalId}), converted to safeOriginalId=${safeOriginalId}`
    );

    // Validate originalId
    if (isNaN(safeOriginalId) || safeOriginalId <= 0) {
      setError(
        `Invalid original ID: ${originalId}. Must be a positive number.`
      );
      setOriginalDoesExist(false);
    }
  }, [originalId, safeOriginalId]);

  // Function to refresh edition count
  const refreshEditionCount = useCallback(async () => {
    try {
      // Check if the original exists
      const exists = await originalExists(safeOriginalId, isScroll);
      setOriginalDoesExist(exists);

      if (!exists) {
        console.log(`Original #${safeOriginalId} doesn't exist`);
        setCurrentEditionCount(0);
        return;
      }

      // Get the max editions for this original
      const maxForOriginal = await getMaxEditionsForOriginal(
        safeOriginalId,
        isScroll
      );
      setMaxEditionsForOriginal(maxForOriginal);
      console.log(
        `Max editions for original #${safeOriginalId}: ${maxForOriginal}`
      );

      // Get the edition count
      const editionCount = await getCurrentEditionsMinted(
        safeOriginalId,
        isScroll
      );
      setCurrentEditionCount(editionCount);
      console.log(
        `Edition count for original #${safeOriginalId}: ${editionCount}`
      );
    } catch (error) {
      console.error("Error refreshing edition count:", error);
      // On error, try again after a short delay
      setTimeout(refreshEditionCount, 2000);
    }
  }, [safeOriginalId, isScroll]);

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

  // Check if user is on the correct network
  const isCorrectNetwork = chain?.id === chainId;

  // Network check effect
  useEffect(() => {
    if (isConnected && chain?.id !== chainId) {
      const networkName = isScroll ? "Scroll Sepolia" : "Base Sepolia";
      setNetworkError(
        `Please switch to ${networkName} network to mint this edition.`
      );
    } else {
      setNetworkError(null);
      // Reset the network switch attempt flag when on the correct network
      networkSwitchAttemptedRef.current = false;
    }
  }, [isConnected, chain?.id, chainId, isScroll]);

  // Check if the user has already minted an edition for this original
  useEffect(() => {
    if (!isConnected || !address) return;

    const checkIfMinted = async () => {
      try {
        const minted = await hasUserMintedEdition(
          address,
          safeOriginalId,
          isScroll
        );
        setHasAlreadyMinted(minted);
        if (minted) {
          setError("You've already minted an edition for this original.");
        }
      } catch (error) {
        console.error("Error checking if user has minted:", error);
      }
    };

    checkIfMinted();
  }, [isConnected, address, safeOriginalId, isScroll]);

  // Check if the original exists
  useEffect(() => {
    const checkOriginalExists = async () => {
      try {
        const exists = await originalExists(safeOriginalId, isScroll);
        setOriginalDoesExist(exists);
        if (!exists) {
          setError(
            `Original #${safeOriginalId} does not exist. Please choose a valid original ID.`
          );
        }
      } catch (error) {
        console.error("Error checking if original exists:", error);
      }
    };

    checkOriginalExists();
  }, [safeOriginalId, isScroll]);

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
      return "Transaction reverted. This could be because you've already minted this edition or the contract has reached its maximum supply.";
    }

    // Check for wrong network errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("chain") ||
      errorMessage.includes("could not decode result data") ||
      errorMessage.includes("missing revert data")
    ) {
      const networkName = isScroll ? "Scroll Sepolia" : "Base Sepolia";
      return `Please make sure you're connected to ${networkName} network and refresh the page.`;
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

    if (!walletClient || networkSwitchAttemptedRef.current) {
      return;
    }

    try {
      setIsSwitchingNetwork(true);
      networkSwitchAttemptedRef.current = true;

      // Request network switch
      await walletClient.switchChain({ id: chainId });

      const networkName = isScroll ? "Scroll Sepolia" : "Base Sepolia";
      console.log(`Successfully switched to ${networkName}`);
      setNetworkError(null);
    } catch (error) {
      console.error("Error switching network:", error);
      setError(getReadableErrorMessage(error));
    } finally {
      setIsSwitchingNetwork(false);
      // Reset the network switch attempt flag after a delay
      setTimeout(() => {
        networkSwitchAttemptedRef.current = false;
      }, 5000);
    }
  };

  // Function to handle minting
  const handleMint = async () => {
    if (!isConnected) {
      setError("Please connect your wallet to mint an edition.");
      return;
    }

    if (chain?.id !== chainId) {
      const networkName = isScroll ? "Scroll Sepolia" : "Base Sepolia";
      setNetworkError(
        `Please switch to ${networkName} network to mint this edition.`
      );
      return;
    }

    // Check if the original exists
    if (!originalDoesExist) {
      setError(
        `Original #${safeOriginalId} does not exist. Please choose a valid original ID.`
      );
      return;
    }

    // Check if the user has already minted an edition for this original
    if (hasAlreadyMinted) {
      setError(
        "You have already minted an edition for this original. Each address can only mint one edition per original."
      );
      return;
    }

    // Check if all editions have been minted
    if (currentEditionCount >= maxEditionsForOriginal) {
      setError(
        `All ${maxEditionsForOriginal} editions have been minted for this original.`
      );
      return;
    }

    try {
      setIsMinting(true);
      setError(null);
      setTxHash(null);

      console.log(
        `Minting edition for original #${safeOriginalId} with price ${price} ETH`
      );

      // Call the mintEdition function
      const result = await mintEdition(safeOriginalId, isScroll);

      if (result.success) {
        setTxHash(result.txHash || null);
        // Refresh the edition count after successful mint
        refreshEditionCount();
        // Set hasAlreadyMinted to true after successful mint
        setHasAlreadyMinted(true);
      } else {
        // Handle error message from the result
        setError(result.message);
      }
    } catch (error) {
      console.error("Error minting edition:", error);
      setError(getReadableErrorMessage(error));
    } finally {
      setIsMinting(false);
    }
  };

  // Calculate remaining editions
  const remainingEditions = maxEditionsForOriginal - currentEditionCount;

  // Disable the mint button if:
  // 1. Not connected to wallet
  // 2. Wrong network
  // 3. Already minted
  // 4. Sold out
  // 5. Original doesn't exist
  const isMintDisabled =
    !isConnected ||
    !isCorrectNetwork ||
    hasAlreadyMinted ||
    currentEditionCount >= maxEditionsForOriginal ||
    !originalDoesExist;

  // Determine the button text based on state
  const getMintButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (!isCorrectNetwork) {
      const networkName = isScroll ? "Scroll Sepolia" : "Base Sepolia";
      return `Switch to ${networkName}`;
    }
    if (hasAlreadyMinted) return "Already Minted";
    if (currentEditionCount >= maxEditionsForOriginal) return "Sold Out";
    if (!originalDoesExist) return "Original Not Found";
    if (isMinting) return "Minting...";
    return `Mint for ${price} ETH`;
  };

  return (
    <div className="w-full">
      <div className="flex flex-col mb-3">
        <p className="text-sm">
          <span className="font-medium">Editions Minted:</span>{" "}
          {currentEditionCount}/{maxEditionsForOriginal}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {remainingEditions > 0
            ? `${remainingEditions} editions available`
            : "Sold out"}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Price: {price} ETH
        </p>
      </div>

      {txHash ? (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3">
          <p className="text-green-700 dark:text-green-300 text-sm">
            Edition minted successfully!
          </p>
          <a
            href={
              isScroll
                ? `https://sepolia-blockscout.scroll.io/tx/${txHash}`
                : `https://sepolia-explorer.base.org/tx/${txHash}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-600 dark:text-green-400 underline mt-1 inline-block"
          >
            View transaction
          </a>
        </div>
      ) : error ? (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg mb-3">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      ) : networkError ? (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3">
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            {networkError}
          </p>
        </div>
      ) : null}

      {/* Warning if original doesn't exist */}
      {!originalDoesExist && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-300 text-center mb-3">
          <p>This original NFT does not exist.</p>
        </div>
      )}

      <button
        onClick={!isCorrectNetwork ? handleSwitchNetwork : handleMint}
        disabled={isMintDisabled && isCorrectNetwork}
        className={`w-full py-2 px-3 ${
          isMintDisabled && isCorrectNetwork
            ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
            : "bg-[#4caf50] hover:bg-[#45a049]"
        } text-white font-medium rounded-lg shadow-sm transition-colors text-sm`}
      >
        {getMintButtonText()}
      </button>
    </div>
  );
}
