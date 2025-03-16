/**
 * Service for interacting with the NFT contract
 */

import { createPublicClient, http, getContract } from "viem";
import { baseSepolia } from "@/config/wallet-config";
import {
  COLLECTION_ADDRESS,
  EDITIONS_ADDRESS,
  SCROLLIFY_EDITIONS_ADDRESS,
  SCROLLIFY_ORIGINALS_ADDRESS,
} from "@/config/nft-config";
import { OriginalNFT } from "@/types/nft-types";
import { ethers, FunctionFragment } from "ethers";

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
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "creators",
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
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "overlayTypes",
    outputs: [
      {
        internalType: "enum HigherBaseOriginals.OverlayType",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "groveUrl",
        type: "string",
      },
    ],
    name: "groveUrlToTokenId",
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
    name: "getTokenOverlayTypeString",
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
    name: "originalsContract",
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
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "originalId",
        type: "uint256",
      },
    ],
    name: "hasUserMintedEdition",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
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
    name: "mintEdition",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "balanceOf",
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
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "tokenOfOwnerByIndex",
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
    name: "originalTokenId",
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
    name: "defaultMaxEditions",
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
    name: "maxEditions",
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
    name: "originalExists",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ABI for the ScrollifyOriginals contract
// This ABI is used for type checking and reference
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
    name: "originalExists",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
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
const basePublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Create a public client for Scroll Sepolia
const scrollPublicClient = createPublicClient({
  chain: {
    id: 534351,
    name: "Scroll Sepolia",
    network: "scroll-sepolia",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: { http: ["https://sepolia-rpc.scroll.io/"] },
      public: { http: ["https://sepolia-rpc.scroll.io/"] },
    },
  },
  transport: http("https://sepolia-rpc.scroll.io/"),
});

// Helper function to create Base originals contract instance
function getBaseOriginalsContractInstance() {
  console.log(
    `Using Base originals contract at address: ${COLLECTION_ADDRESS}`
  );
  return getContract({
    address: COLLECTION_ADDRESS as `0x${string}`,
    abi: HigherBaseOriginalsABI,
    client: basePublicClient,
  });
}

// Helper function to create Scroll originals contract instance
function getScrollOriginalsContractInstance() {
  console.log(
    `Using Scroll originals contract at address: ${SCROLLIFY_ORIGINALS_ADDRESS}`
  );
  return getContract({
    address: SCROLLIFY_ORIGINALS_ADDRESS as `0x${string}`,
    abi: ScrollifyOriginalsABI,
    client: scrollPublicClient,
  });
}

// Helper function to get the appropriate originals contract instance
function getOriginalsContractInstance(isScroll = false) {
  return isScroll
    ? getScrollOriginalsContractInstance()
    : getBaseOriginalsContractInstance();
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
export async function getOriginalById(
  id: number,
  isScroll = false
): Promise<OriginalNFT> {
  try {
    let tokenURI: string;
    let creator: string = "0x0000000000000000000000000000000000000000";
    let overlayType: string = "none";

    if (isScroll) {
      // For Scroll, use a different approach since the ABI might be different
      // Create a provider for Scroll Sepolia
      const scrollProvider = new ethers.JsonRpcProvider(
        "https://sepolia-rpc.scroll.io/"
      );

      // Create contract instance with minimal ABI that just has the functions we need
      const contract = new ethers.Contract(
        SCROLLIFY_ORIGINALS_ADDRESS,
        [
          {
            inputs: [
              { internalType: "uint256", name: "tokenId", type: "uint256" },
            ],
            name: "tokenURI",
            outputs: [{ internalType: "string", name: "", type: "string" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint256", name: "tokenId", type: "uint256" },
            ],
            name: "ownerOf",
            outputs: [{ internalType: "address", name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        scrollProvider
      );

      // Get the token URI
      tokenURI = await contract.tokenURI(id);
      console.log(`Token URI for Scroll ID ${id}:`, tokenURI);

      // For Scroll, we might not have a creators function, so use a default value
      creator = "0x0000000000000000000000000000000000000000";

      // For Scroll, we might not have overlay types, so use a default value
      overlayType = "none";
    } else {
      // For Base, use the existing approach
      // Create a contract instance
      const contract = getOriginalsContractInstance(isScroll);

      // Get the token URI
      tokenURI = (await contract.read.tokenURI([BigInt(id)])) as string;
      console.log(`Token URI for ID ${id}:`, tokenURI);

      // Get the creator address
      creator = (await contract.read.creators([BigInt(id)])) as string;
      console.log(`Creator for ID ${id}:`, creator);

      // Get the overlay type string directly from the contract
      try {
        overlayType = (await contract.read.getTokenOverlayTypeString([
          BigInt(id),
        ])) as string;
        console.log(`Overlay type string for ID ${id}:`, overlayType);
      } catch (error) {
        console.warn(`Error getting overlay type string for ID ${id}:`, error);

        // Fallback to manual conversion if the function call fails
        try {
          const overlayTypeEnum = Number(
            await contract.read.overlayTypes([BigInt(id)])
          );
          console.log(`Overlay type enum for ID ${id}:`, overlayTypeEnum);

          if (overlayTypeEnum === 0) overlayType = "higher";
          else if (overlayTypeEnum === 1) overlayType = "base";
          else if (overlayTypeEnum === 2) overlayType = "dickbuttify";
        } catch (enumError) {
          console.warn(
            `Error getting overlay type enum for ID ${id}:`,
            enumError
          );
        }
      }
    }

    // Check if the tokenURI contains a Grove URL directly
    if (tokenURI.includes("api.grove.storage")) {
      const hash = extractGroveHash(tokenURI);
      return {
        tokenId: id,
        creator,
        groveUrl: hash || "",
        tokenURI,
        overlayType,
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
        creator,
        groveUrl,
        tokenURI,
        overlayType,
        editionCount: await getCurrentEditionsMinted(id),
      };
    } catch (metadataError) {
      console.error(`Error fetching metadata for token ${id}:`, metadataError);

      // If we can extract a Grove hash from the tokenURI directly
      if (tokenURI.includes("baseify") || tokenURI.includes("higherify")) {
        const hash = extractGroveHash(tokenURI);
        if (hash) {
          return {
            tokenId: id,
            creator,
            groveUrl: hash,
            tokenURI,
            overlayType,
            editionCount: await getCurrentEditionsMinted(id),
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
    const contract = getOriginalsContractInstance();

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

// Function to check if a user has already minted an edition for a specific original
export async function hasUserMintedEdition(
  userAddress: string,
  originalId: number,
  isScroll = false
): Promise<boolean> {
  try {
    if (isScroll) {
      // For Scroll, use a direct approach with ethers.js
      const scrollProvider = new ethers.JsonRpcProvider(
        "https://sepolia-rpc.scroll.io/"
      );

      // Create contract instance with minimal ABI
      const contract = new ethers.Contract(
        SCROLLIFY_EDITIONS_ADDRESS,
        [
          {
            inputs: [
              { internalType: "address", name: "user", type: "address" },
              { internalType: "uint256", name: "originalId", type: "uint256" },
            ],
            name: "hasMinted",
            outputs: [{ internalType: "bool", name: "", type: "bool" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        scrollProvider
      );

      try {
        // Try to call the hasMinted function directly
        console.log(
          `Checking if user ${userAddress} has minted Scroll original ${originalId}`
        );
        const hasMinted = await contract.hasMinted(userAddress, originalId);
        console.log(
          `User ${userAddress} has minted Scroll original ${originalId}: ${hasMinted}`
        );

        return hasMinted;
      } catch (error) {
        console.warn(
          `Error checking if user has minted Scroll original ${originalId}:`,
          error
        );
        return false;
      }
    } else {
      // For Base, use the existing approach with better error handling
      try {
        // Get the contract instance
        const contract = await getEditionsContract(isScroll);

        // Call the hasUserMintedEdition function on the contract
        console.log(
          `Checking if user ${userAddress} has minted Base original ${originalId}`
        );

        // Use a try-catch block specifically for the contract call
        try {
          const hasMinted = await contract.hasUserMintedEdition(
            userAddress,
            originalId
          );
          console.log(
            `User ${userAddress} has minted Base original ${originalId}: ${hasMinted}`
          );
          return hasMinted;
        } catch (callError: unknown) {
          // If we get an empty response or decode error, assume they haven't minted
          if (
            callError &&
            typeof callError === "object" &&
            "message" in callError &&
            typeof callError.message === "string" &&
            callError.message.includes("could not decode result data")
          ) {
            console.log(
              `Got empty response for hasUserMintedEdition, assuming not minted`
            );
            return false;
          }
          throw callError; // Re-throw other errors
        }
      } catch (error) {
        console.error("Error checking if user has minted:", error);
        return false;
      }
    }
  } catch (error) {
    console.error("Error in hasUserMintedEdition:", error);
    return false;
  }
}

// Function to get the max editions allowed for an original
export async function getMaxEditionsForOriginal(
  originalId: number,
  isScroll = false
): Promise<number> {
  try {
    if (isScroll) {
      // For Scroll, we always use 100 as the max editions
      console.log(
        `Using hardcoded max editions for Scroll original ${originalId}: 100`
      );
      return 100;
    } else {
      // For Base, use the existing approach
      // Get the contract instance
      const contract = await getEditionsContract(isScroll);

      // First check if there's a specific max set for this original
      console.log(`Getting max editions for Base original ${originalId}`);
      try {
        const maxForOriginal = await contract.maxEditions(originalId);

        // If specific max is set, return it
        if (maxForOriginal.toString() !== "0") {
          console.log(
            `Max editions for Base original ${originalId}: ${maxForOriginal.toString()}`
          );
          return Number(maxForOriginal.toString());
        }
      } catch (error) {
        console.warn(
          `Error getting specific max editions for Base original ${originalId}:`,
          error
        );
      }

      // If no specific max or error, get the default max editions
      try {
        const defaultMax = await contract.defaultMaxEditions();
        console.log(`Default max editions for Base: ${defaultMax.toString()}`);
        return Number(defaultMax.toString());
      } catch (error) {
        console.warn(`Error getting default max editions for Base:`, error);

        // If we can't get the default max, return a hardcoded value
        const hardcodedDefault = 100;
        console.log(
          `Using hardcoded default max editions for Base: ${hardcodedDefault}`
        );
        return hardcodedDefault;
      }
    }
  } catch (error) {
    console.error("Error getting max editions:", error);

    // If all else fails, return a hardcoded value
    return 100;
  }
}

export async function getCurrentEditionsMinted(
  originalId: number,
  isScroll = false
): Promise<number> {
  try {
    if (isScroll) {
      // For Scroll, use a direct approach with ethers.js
      const scrollProvider = new ethers.JsonRpcProvider(
        "https://sepolia-rpc.scroll.io/"
      );

      // Create contract instance with minimal ABI
      const contract = new ethers.Contract(
        SCROLLIFY_EDITIONS_ADDRESS,
        [
          {
            inputs: [
              { internalType: "uint256", name: "originalId", type: "uint256" },
            ],
            name: "editionsMinted",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        scrollProvider
      );

      // Call the editionsMinted function directly
      console.log(`Getting editions minted for Scroll original ${originalId}`);
      const count = await contract.editionsMinted(originalId);
      const editionsMinted = Number(count);
      console.log(
        `Editions minted for Scroll original ${originalId}: ${editionsMinted}`
      );

      return editionsMinted;
    } else {
      // For Base, use the existing approach with better error handling
      try {
        // Get the contract instance
        const contract = await getEditionsContract(isScroll);

        // Call the editionsMinted function on the contract
        console.log(`Getting editions minted for Base original ${originalId}`);

        try {
          const editionsMinted = await contract.editionsMinted(originalId);
          console.log(
            `Editions minted for Base original ${originalId}: ${editionsMinted}`
          );
          return Number(editionsMinted.toString());
        } catch (callError: unknown) {
          // If we get an empty response or decode error, assume 0 editions minted
          if (
            callError &&
            typeof callError === "object" &&
            "message" in callError &&
            typeof callError.message === "string" &&
            callError.message.includes("could not decode result data")
          ) {
            console.log(`Got empty response for editionsMinted, assuming 0`);
            return 0;
          }
          throw callError; // Re-throw other errors
        }
      } catch (error) {
        console.error("Error getting editions minted:", error);
        return 0;
      }
    }
  } catch (error) {
    console.error("Error in getCurrentEditionsMinted:", error);
    return 0;
  }
}

// Function to check if an original NFT exists
export async function originalExists(
  originalId: number,
  isScroll = false
): Promise<boolean> {
  try {
    if (isScroll) {
      // For Scroll, use a different approach since the ABI might be different
      // Create a provider for Scroll Sepolia
      const scrollProvider = new ethers.JsonRpcProvider(
        "https://sepolia-rpc.scroll.io/"
      );

      // Create contract instance with minimal ABI that just has the function we need
      const contract = new ethers.Contract(
        SCROLLIFY_ORIGINALS_ADDRESS,
        [
          {
            inputs: [
              { internalType: "uint256", name: "tokenId", type: "uint256" },
            ],
            name: "ownerOf",
            outputs: [{ internalType: "address", name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        scrollProvider
      );

      // Try to get the owner of the original NFT
      await contract.ownerOf(originalId);

      // If we get here, the original exists
      return true;
    } else {
      // For Base, use the existing approach
      // Create a contract instance for the originals contract directly
      const contract = getOriginalsContractInstance(isScroll);

      // Try to get the owner of the original NFT
      // If it exists, this will return an address
      // If it doesn't exist, it will throw an error
      await contract.read.ownerOf([BigInt(originalId)]);

      // If we get here, the original exists
      return true;
    }
  } catch (error) {
    console.error(`Error checking if original #${originalId} exists:`, error);
    // If there's an error, the original probably doesn't exist
    return false;
  }
}

// Function to mint an edition
export async function mintEdition(
  originalId: number,
  isScrollEdition: boolean = false
): Promise<{ success: boolean; message: string; txHash?: string }> {
  try {
    console.log(`Minting edition for original ID: ${originalId}`);

    // Check if the original exists
    const exists = await originalExists(originalId, isScrollEdition);
    if (!exists) {
      return {
        success: false,
        message: "The original NFT does not exist",
      };
    }

    // Get the contract instance
    const contract = await getEditionsContract(isScrollEdition);

    // Get the mint price
    let mintPrice;
    try {
      mintPrice = await contract.editionPrice();
      console.log(`Mint price: ${ethers.formatEther(mintPrice)} ETH`);
    } catch (error) {
      console.error("Error getting mint price:", error);
      mintPrice = ethers.parseEther("0.01"); // Default to 0.01 ETH if we can't get the price
      console.log(
        `Using default mint price: ${ethers.formatEther(mintPrice)} ETH`
      );
    }

    // Call the mintEdition function on the contract
    console.log(
      `Calling mintEdition with originalId=${originalId} and value=${ethers.formatEther(
        mintPrice
      )} ETH`
    );

    // Log the contract address and ABI to verify
    console.log(`Contract address: ${contract.target}`);
    try {
      // Try to log the contract methods
      const methods = contract.interface.fragments
        .map((f) => (f instanceof FunctionFragment ? f.name : null))
        .filter((name): name is string => name !== null);
      console.log(`Contract ABI methods: ${methods.join(", ")}`);
    } catch (error) {
      console.warn("Could not log contract methods:", error);
    }

    // Ensure we're passing the originalId as a number
    const originalIdNumber = Number(originalId);
    console.log(`Converted originalId to number: ${originalIdNumber}`);

    // Check if the user has already minted this original
    try {
      // Get the signer's address directly
      const signer = await getProvider().getSigner();
      const userAddress = await signer.getAddress();

      if (userAddress) {
        const hasMinted = await contract.hasUserMintedEdition(
          userAddress,
          originalIdNumber
        );
        console.log(
          `User ${userAddress} has minted original ${originalIdNumber}: ${hasMinted}`
        );
        if (hasMinted) {
          return {
            success: false,
            message: "You have already minted an edition for this original",
          };
        }
      }
    } catch (error) {
      console.warn("Error checking if user has minted:", error);
      // Continue even if we can't check this
    }

    // Try to use a more direct approach to call the contract
    console.log(`Using BigInt for originalId: ${BigInt(originalIdNumber)}`);

    // Call the contract function with explicit parameters
    const tx = await contract.mintEdition(
      BigInt(originalIdNumber), // Convert to BigInt explicitly
      {
        value: mintPrice,
        gasLimit: 500000, // Increase gas limit to be safe
      }
    );

    console.log(`Transaction sent: ${tx.hash}`);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log(`Transaction confirmed: ${receipt.transactionHash}`);

    return {
      success: true,
      message: "Edition minted successfully!",
      txHash: receipt.transactionHash,
    };
  } catch (error: unknown) {
    console.error("Error minting edition:", error);

    // Handle specific error messages
    let errorMessage = "Failed to mint edition. Please try again.";

    if (error instanceof Error && error.message) {
      if (error.message.includes("Max editions reached")) {
        errorMessage = "Maximum editions reached for this original";
      } else if (error.message.includes("already minted")) {
        errorMessage = "You have already minted an edition for this original";
      } else if (error.message.includes("Insufficient payment")) {
        errorMessage = "Insufficient payment for minting";
      } else if (error.message.includes("Original NFT does not exist")) {
        errorMessage = "The original NFT does not exist";
      } else if (error.message.includes("user rejected transaction")) {
        errorMessage = "Transaction was rejected by the user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds in your wallet to mint this edition";
      } else if (
        error.message.includes("network") ||
        error.message.includes("chain")
      ) {
        errorMessage = isScrollEdition
          ? "Please make sure you're connected to Scroll Sepolia network"
          : "Please make sure you're connected to Base Sepolia network";
      }
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
}

// Function to get available editions on Scroll
export async function getAvailableScrollEditions(): Promise<number[]> {
  try {
    // Create a provider for Scroll Sepolia
    const scrollProvider = new ethers.JsonRpcProvider(
      "https://sepolia-rpc.scroll.io/"
    );

    // Create contract instance
    const contract = new ethers.Contract(
      SCROLLIFY_EDITIONS_ADDRESS,
      ScrollifyEditionsABI,
      scrollProvider
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
        console.log(`Editions minted for original ID ${i}: ${editionsMinted}`);

        // If the original has been minted, add it to the available editions
        if (editionsMinted > 0) {
          availableEditions.push(i);
        }
      } catch (error) {
        console.error(`Error checking editions for original ID ${i}:`, error);
      }
    }

    return availableEditions;
  } catch (error) {
    console.error("Error fetching available Scroll editions:", error);
    return [];
  }
}

// Function to get the editions contract instance
export async function getEditionsContract(isScroll = false) {
  const provider = getProvider();
  const signer = await provider.getSigner();

  if (isScroll) {
    console.log(
      `Getting Scroll editions contract at address: ${SCROLLIFY_EDITIONS_ADDRESS}`
    );
    return new ethers.Contract(
      SCROLLIFY_EDITIONS_ADDRESS,
      ScrollifyEditionsABI,
      signer
    );
  } else {
    console.log(
      `Getting Base editions contract at address: ${EDITIONS_ADDRESS}`
    );
    return new ethers.Contract(EDITIONS_ADDRESS, HigherBaseEditionsABI, signer);
  }
}

// Function to get the provider
export function getProvider() {
  if (!window.ethereum) {
    throw new Error(
      "No Ethereum provider found. Please install MetaMask or another wallet."
    );
  }
  return new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
}
