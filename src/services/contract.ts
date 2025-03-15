/**
 * Service for interacting with the NFT contract
 */

import { createPublicClient, http, getContract } from "viem";
import { baseSepolia } from "@/config/wallet-config";
import {
  COLLECTION_ADDRESS,
  EDITIONS_ADDRESS,
  SCROLLIFY_EDITIONS_ADDRESS,
} from "@/config/nft-config";
import { OriginalNFT } from "@/types/nft-types";
import { ethers } from "ethers";

// ABI for the HigherBaseOriginals contract (minimal version for what we need)
const HigherBaseOriginalsABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "tokenURI",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "ownerOf",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ABI for the HigherBaseEditions contract
export const HigherBaseEditionsABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "originalId",
        type: "uint256",
      },
    ],
    name: "editionsMinted",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "editionPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ABI for the ScrollifyOriginals contract
// This ABI is used for type checking and reference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ScrollifyOriginalsABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "tokenURI",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "tokenByIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "originalId",
        type: "uint256",
      },
    ],
    name: "editionsMinted",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ABI for the ScrollifyEditions contract
export const ScrollifyEditionsABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "uri",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "tokenByIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "editionPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "originalId",
        type: "uint256",
      },
    ],
    name: "editionsMinted",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "originalId",
        type: "uint256",
      },
    ],
    name: "mintEdition",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

// Create a public client for Base Sepolia
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Helper function to create contract instance
function getContractInstance() {
  return getContract({
    address: COLLECTION_ADDRESS as `0x${string}`,
    abi: HigherBaseOriginalsABI,
    client: publicClient,
  });
}

// Helper function to fetch and parse IPFS metadata
async function fetchIPFSMetadata(
  uri: string
): Promise<Record<string, unknown>> {
  try {
    // Convert IPFS URI to HTTP URL if needed
    let url = uri;

    // Handle ipfs:// protocol
    if (uri.startsWith("ipfs://")) {
      const ipfsHash = uri.replace("ipfs://", "").replace("ipfs/", "");
      url = `https://ipfs.io/ipfs/${ipfsHash}`;
    }

    // Check if this is a baseify URL containing a Grove URL
    if (
      url.includes("ipfs.io/ipfs/baseify/") ||
      url.includes("ipfs.io/ipfs/higherify/") ||
      url.includes("ipfs.io/ipfs/dickbuttify/")
    ) {
      // Extract the encoded Grove URL
      const encodedGroveUrl = url.split("/ipfs/")[1].split("/")[1];

      // Decode the URL to get the Grove URL
      const decodedUrl = decodeURIComponent(encodedGroveUrl);

      // If it's a Grove URL, use it directly
      if (decodedUrl.includes("api.grove.storage")) {
        console.log("Extracted Grove URL:", decodedUrl);
        return { image: decodedUrl }; // Return a simple metadata object with the image URL
      }
    }

    // Check if the URL is already a direct Grove URL
    if (url.includes("api.grove.storage")) {
      console.log("Direct Grove URL:", url);
      return { image: url }; // Return a simple metadata object with the image URL
    }

    console.log("Fetching metadata from:", url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching IPFS metadata:", error);

    // If the URL contains a Grove URL, extract and use it directly
    if (uri.includes("api.grove.storage")) {
      const groveHash = extractGroveHash(uri);
      if (groveHash) {
        return {
          image: getFullGroveUrl(groveHash),
          name: "Higher Original NFT",
          description: "A Higher Original NFT from the collection",
        };
      }
    }

    throw error;
  }
}

// Helper function to extract Grove hash from various URL formats
export function extractGroveHash(url: string): string | null {
  if (!url) return null;

  // Direct Grove URL
  if (url.includes("api.grove.storage/")) {
    const match = url.match(/api\.grove\.storage\/([a-f0-9]+)/i);
    if (match && match[1]) return match[1];
  }

  // Encoded in IPFS URL
  if (url.includes("ipfs.io/ipfs/") && url.includes("api.grove.storage")) {
    const match = url.match(/api\.grove\.storage%2F([a-f0-9]+)/i);
    if (match && match[1]) return match[1];

    // Try to decode the URL
    try {
      let encodedPart = "";
      if (url.includes("baseify/")) {
        encodedPart = url.split("baseify/")[1];
      } else if (url.includes("dickbuttify/")) {
        encodedPart = url.split("dickbuttify/")[1];
      } else if (url.includes("higherify/")) {
        encodedPart = url.split("higherify/")[1];
      } else {
        // Try to extract the encoded part after ipfs/
        const parts = url.split("ipfs/");
        if (parts.length > 1) {
          encodedPart = parts[1];
        }
      }

      if (encodedPart) {
        const decodedGroveUrl = decodeURIComponent(encodedPart);
        if (decodedGroveUrl.includes("api.grove.storage/")) {
          const hashMatch = decodedGroveUrl.match(
            /api\.grove\.storage\/([a-f0-9]+)/i
          );
          if (hashMatch && hashMatch[1]) return hashMatch[1];
        }
      }
    } catch (e) {
      console.error("Failed to decode URL:", e);
    }
  }

  return null;
}

// Function to get the full Grove URL
export function getFullGroveUrl(hash: string): string {
  if (!hash) return "";

  // If it's already a full URL, return it
  if (hash.startsWith("http")) return hash;

  // If it's just a hash, construct the full URL
  return `https://api.grove.storage/${hash}`;
}

// Function to get original NFT data by ID
export async function getOriginalById(id: number): Promise<OriginalNFT> {
  try {
    // Create a contract instance
    const contract = getContractInstance();

    // Get the token URI
    const tokenURI = (await contract.read.tokenURI([BigInt(id)])) as string;
    console.log(`Token URI for ID ${id}:`, tokenURI);

    // Check if the tokenURI contains a Grove URL directly
    if (tokenURI.includes("api.grove.storage")) {
      const hash = extractGroveHash(tokenURI);
      return {
        tokenId: id,
        creator: "0x1234...5678", // Default creator
        groveUrl: hash || "",
        tokenURI,
        overlayType: "none",
        editionCount: 0,
      };
    }

    // Fetch metadata from IPFS
    try {
      const metadata = await fetchIPFSMetadata(tokenURI);

      // Extract Grove URL from metadata
      let groveUrl = "";
      if (typeof metadata.image === "string") {
        const hash = extractGroveHash(metadata.image);
        if (hash) groveUrl = hash;
        // If the image is a direct Grove URL
        else if (metadata.image.includes("api.grove.storage")) {
          groveUrl = metadata.image;
        }
      }

      return {
        tokenId: id,
        creator:
          typeof metadata.creator === "string"
            ? metadata.creator
            : "0x1234...5678", // Use metadata.creator if available
        groveUrl,
        tokenURI,
        overlayType:
          typeof metadata.overlayType === "string"
            ? metadata.overlayType
            : "none",
        editionCount:
          typeof metadata.editionCount === "number" ? metadata.editionCount : 0,
      };
    } catch (metadataError) {
      console.error(`Error fetching metadata for token ${id}:`, metadataError);

      // If we can extract a Grove hash from the tokenURI directly
      if (tokenURI.includes("baseify") || tokenURI.includes("higherify")) {
        const hash = extractGroveHash(tokenURI);
        if (hash) {
          return {
            tokenId: id,
            creator: "0x1234...5678",
            groveUrl: hash,
            tokenURI,
            overlayType: "none",
            editionCount: 0,
          };
        }
      }

      throw metadataError;
    }
  } catch (error) {
    console.error(`Error fetching original NFT #${id}:`, error);

    // Fallback to mock data if there's an error
    return {
      tokenId: id,
      creator: "0x1234...5678",
      groveUrl:
        "a3c83e726d821d6f6714182731bb50eb00ea6f79b9e5508b3d645035e27af7f7",
      tokenURI: `ipfs://ipfs/QmHash/${id}`,
      overlayType: "none",
      editionCount: Math.floor(Math.random() * 10),
    };
  }
}

// Function to check if the contract is ready
export async function isContractReady(): Promise<boolean> {
  try {
    // Create a contract instance
    const contract = getContractInstance();

    // Try to call totalSupply to check if the contract is accessible
    const totalSupply = await contract.read.totalSupply();

    // If we get here, the contract is accessible
    console.log(`Contract is ready. Total supply: ${totalSupply}`);
    return true;
  } catch (error) {
    console.error("Error checking contract readiness:", error);
    return false;
  }
}

// Function to mint an edition
export async function mintEdition(
  originalId: number,
  signer: ethers.Signer,
  chainId: number = 84532 // Default to Base Sepolia
) {
  try {
    console.log(
      `Minting edition for original ID ${originalId} on chain ${chainId}`
    );

    // Determine which contract to use based on chainId
    const contractAddress =
      chainId === 534351 ? SCROLLIFY_EDITIONS_ADDRESS : EDITIONS_ADDRESS;

    const abi =
      chainId === 534351 ? ScrollifyEditionsABI : HigherBaseEditionsABI;

    console.log(`Using contract address: ${contractAddress}`);

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, signer);

    // Get the mint price - use hardcoded price for Scroll to avoid the editionPrice error
    let mintPrice;
    if (chainId === 534351) {
      try {
        // Try to get the price from the contract
        mintPrice = await contract.editionPrice();
        console.log(
          `Mint price from contract: ${ethers.formatEther(mintPrice)} ETH`
        );
      } catch (error: unknown) {
        console.error("Error getting mint price:", error);
        // Fallback to hardcoded price if contract call fails
        mintPrice = ethers.parseEther("0.005");
        console.log(
          `Using fallback mint price for Scroll: ${ethers.formatEther(
            mintPrice
          )} ETH`
        );
      }
    } else {
      try {
        mintPrice = await contract.editionPrice();
        console.log(
          `Mint price from contract: ${ethers.formatEther(mintPrice)} ETH`
        );
      } catch (error: unknown) {
        console.error("Error getting mint price:", error);
        // Fallback to hardcoded price if contract call fails
        mintPrice = ethers.parseEther("0.01"); // Base Sepolia price
        console.log(
          `Using fallback mint price: ${ethers.formatEther(mintPrice)} ETH`
        );
      }
    }

    // For Scroll, check if the edition exists before trying to mint
    if (chainId === 534351) {
      try {
        // Check how many editions have been minted for this original
        const editionsMinted = await contract.editionsMinted(originalId);
        console.log(
          `Editions minted for original ID ${originalId}: ${editionsMinted}`
        );

        // Check if we've reached the max editions
        if (editionsMinted >= 100) {
          return {
            success: false,
            error: `Maximum editions (100) already minted for original ID ${originalId}.`,
          };
        }
      } catch (error: unknown) {
        console.error(
          `Error checking editions minted for original ID ${originalId}:`,
          error
        );
        // This is not a critical error, we can still try to mint
      }
    }

    // Prepare transaction
    console.log(
      `Calling mintEdition with originalId: ${originalId} and value: ${ethers.formatEther(
        mintPrice
      )} ETH`
    );

    let tx;

    // For Scroll, the mintEdition function now takes just the originalId
    if (chainId === 534351) {
      tx = await contract.mintEdition(originalId, {
        value: mintPrice,
        gasLimit: 500000, // Higher gas limit for Scroll
      });
      console.log(`Transaction sent: ${tx.hash}`);
    } else {
      // For Base, use the normal contract method
      tx = await contract.mintEdition(originalId, { value: mintPrice });
      console.log(`Transaction sent: ${tx.hash}`);
    }

    try {
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`Transaction confirmed: ${receipt.hash}`);

      // Check if the transaction was successful
      if (receipt.status === 0) {
        throw new Error(
          "Transaction failed on-chain. The contract reverted the transaction."
        );
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        editionTokenId: null, // We don't get this back from the contract
        originalTokenId: originalId,
        chainId: chainId,
      };
    } catch (receiptError) {
      console.error("Error getting transaction receipt:", receiptError);

      // Type guard for receipt error
      interface TransactionError {
        receipt?: {
          status: number;
        };
      }

      // Check if the transaction was reverted
      if (
        receiptError &&
        typeof receiptError === "object" &&
        receiptError !== null &&
        (receiptError as TransactionError).receipt?.status === 0
      ) {
        throw new Error(
          "Transaction reverted on-chain. This could be because the NFT has already been minted or the contract doesn't recognize this original ID."
        );
      }

      throw receiptError;
    }
  } catch (error: unknown) {
    console.error("Error minting edition:", error);

    // Check for specific error types
    if (isUserRejectionError(error)) {
      return {
        success: false,
        error: "Transaction was rejected by the user.",
      };
    }

    // Transaction reverted errors
    if (
      error instanceof Error &&
      error.message &&
      error.message.includes("reverted")
    ) {
      if (chainId === 534351) {
        return {
          success: false,
          error:
            "Transaction reverted on Scroll. This could be because the edition doesn't exist, has already been minted, or has reached its maximum supply.",
        };
      } else {
        return {
          success: false,
          error:
            "Transaction reverted. This could be because the NFT has already been minted or there's an issue with the contract.",
        };
      }
    }

    // Network errors
    if (
      error instanceof Error &&
      error.message &&
      (error.message.includes("network") ||
        error.message.includes("chain") ||
        error.message.includes("could not decode") ||
        error.message.includes("missing revert data"))
    ) {
      return {
        success: false,
        error: `Please make sure you're connected to ${
          chainId === 534351 ? "Scroll" : "Base"
        } Sepolia network.`,
      };
    }

    // Contract errors - likely an issue with the contract itself
    if (
      error instanceof Error &&
      error.message &&
      error.message.includes("call exception")
    ) {
      if (chainId === 534351) {
        return {
          success: false,
          error:
            "There was an issue with the Scroll contract. Please try again later or contact support.",
        };
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while minting.",
    };
  }
}

// Type guard for user rejection errors
function isUserRejectionError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const err = error as { code?: number; message?: string };
    return (
      err.code === 4001 ||
      (typeof err.message === "string" &&
        (err.message.includes("user rejected") ||
          err.message.includes("User denied")))
    );
  }
  return false;
}

// Function to get available editions on Scroll
export async function getAvailableScrollEditions(): Promise<number[]> {
  try {
    // Create a provider for Scroll Sepolia
    const provider = new ethers.JsonRpcProvider(
      "https://sepolia-rpc.scroll.io/"
    );

    // Create contract instance
    const contract = new ethers.Contract(
      SCROLLIFY_EDITIONS_ADDRESS,
      ScrollifyEditionsABI,
      provider
    );

    // With the new contract design, all original IDs are valid for minting
    // We just need to check if they've reached the max editions (100)

    // For simplicity, let's return a range of IDs (1-16) that users can mint
    const availableEditions: number[] = [];

    // Check the first 16 original IDs
    for (let i = 1; i <= 16; i++) {
      try {
        // Check how many editions have been minted for this original
        const editionsMinted = await contract.editionsMinted(i);
        console.log(`Original ID ${i} has ${editionsMinted} editions minted`);

        // If less than 100 editions minted, this original ID is available
        if (editionsMinted < 100) {
          availableEditions.push(i);
        }
      } catch (error) {
        console.error(
          `Error checking editions minted for original ID ${i}:`,
          error
        );
        // If we can't check, assume it's available (the contract will validate)
        availableEditions.push(i);
      }
    }

    console.log(
      `Available original IDs for minting on Scroll: ${availableEditions.join(
        ", "
      )}`
    );
    return availableEditions;
  } catch (error) {
    console.error("Error getting available editions on Scroll:", error);
    // Return all IDs 1-16 as a fallback
    return Array.from({ length: 16 }, (_, i) => i + 1);
  }
}
