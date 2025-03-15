/**
 * Service for interacting with the NFT contract
 */

import { createPublicClient, http, getContract } from "viem";
import { baseSepolia } from "@/config/wallet-config";
import {
  COLLECTION_ADDRESS,
  EDITIONS_ADDRESS,
  SCROLLIFY_ORIGINALS_ADDRESS,
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

// ABI for the HigherBaseEditions contract (minimal version for what we need)
const HigherBaseEditionsABI = [
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
const ScrollifyEditionsABI = [
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

// Function to mint an edition of an original NFT
export async function mintEdition(
  originalId: number,
  signer: ethers.Signer,
  chainId: number = 84532 // Default to Base Sepolia
) {
  try {
    // Determine which contract to use based on chainId
    let contractAddress: string;
    let contractABI: any;

    if (chainId === 534351) {
      // Scroll Sepolia
      contractAddress = SCROLLIFY_EDITIONS_ADDRESS;
      contractABI = ScrollifyEditionsABI;
      console.log("Minting edition on Scroll Sepolia");
    } else {
      // Default to Base Sepolia
      contractAddress = EDITIONS_ADDRESS;
      contractABI = HigherBaseEditionsABI;
      console.log("Minting edition on Base Sepolia");
    }

    // Verify the connected network matches the expected chainId
    const network = await signer.provider?.getNetwork();
    const connectedChainId = network?.chainId
      ? Number(network.chainId)
      : undefined;

    if (connectedChainId !== undefined && connectedChainId !== chainId) {
      console.error(
        `Network mismatch: Connected to ${connectedChainId}, but trying to mint on ${chainId}`
      );
      return {
        success: false,
        error: `Please switch to ${
          chainId === 534351 ? "Scroll" : "Base"
        } Sepolia network (Chain ID: ${chainId})`,
      };
    }

    // Create a contract instance with the signer
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // Get the edition price
    let editionPrice;
    try {
      editionPrice = await contract.editionPrice();
      console.log(`Edition price: ${ethers.formatEther(editionPrice)} ETH`);
    } catch (error) {
      console.error("Error fetching edition price:", error);
      return {
        success: false,
        error:
          "Could not get edition price. Please make sure you're connected to the correct network.",
      };
    }

    // Get the number of editions minted for this original
    let editionsMinted;
    try {
      editionsMinted = await contract.editionsMinted(originalId);
      console.log(
        `Editions minted for original #${originalId}: ${editionsMinted}`
      );
    } catch (error) {
      console.error("Error fetching editions minted:", error);
      return {
        success: false,
        error:
          "Could not get editions minted. Please make sure you're connected to the correct network.",
      };
    }

    // Mint the edition
    const tx = await contract.mintEdition(originalId, {
      value: editionPrice,
    });

    console.log("Minting transaction sent:", tx.hash);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log("Minting transaction confirmed:", receipt);

    // Return the result
    return {
      success: true,
      transactionHash: tx.hash,
      originalTokenId: originalId,
      chainId: chainId,
    };
  } catch (error: any) {
    console.error("Error minting edition:", error);

    // Check for specific error types
    const errorMessage = error?.message || String(error);

    // User rejected transaction
    if (
      errorMessage.includes("user rejected") ||
      errorMessage.includes("User denied") ||
      errorMessage.includes("User rejected")
    ) {
      return {
        success: false,
        error: "Transaction was rejected by user",
      };
    }

    // Wrong network errors
    if (errorMessage.includes("could not decode result data")) {
      return {
        success: false,
        error: `Please make sure you're connected to ${
          chainId === 534351 ? "Scroll" : "Base"
        } Sepolia network`,
      };
    }

    // Insufficient funds
    if (errorMessage.includes("insufficient funds")) {
      return {
        success: false,
        error: "Insufficient funds for gas and mint price",
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
