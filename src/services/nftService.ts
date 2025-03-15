/**
 * Service for fetching NFT data from Grove or other decentralized storage
 */
import {
  createPublicClient,
  http,
  getContract,
  PublicClient,
  Chain,
} from "viem";
import { baseSepolia, scrollSepolia } from "@/config/wallet-config";
import { COLLECTION_ADDRESS } from "@/config/nft-config";
import { NFTType, NFTMetadata, OriginalNFT } from "@/types/nft-types";

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
];

// Re-export types for backward compatibility
export type { NFTMetadata, OriginalNFT };
export { NFTType };

// Cache for loaded NFT metadata to improve performance
const nftMetadataCache = new Map<string, NFTMetadata[]>();

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

// Helper function to get the full Grove URL
export function getFullGroveUrl(hash: string): string {
  if (!hash) return "";

  // If it's already a full URL, return it
  if (hash.startsWith("http")) return hash;

  // If it's a full Grove URL with the api.grove.storage domain
  if (hash.includes("api.grove.storage/")) {
    // Extract just the hash part if needed
    const match = hash.match(/api\.grove\.storage\/([a-f0-9]+)/i);
    if (match && match[1]) {
      return `https://api.grove.storage/${match[1]}`;
    }

    // If it doesn't match the pattern but includes the domain, ensure it has https://
    if (!hash.startsWith("https://")) {
      return `https://${hash.replace(/^http:\/\//, "")}`;
    }

    return hash;
  }

  // If it's just a hash, construct the full URL
  return `https://api.grove.storage/${hash}`;
}

// Helper function to extract Grove hash from various URL formats
export function extractGroveHash(url: string): string | null {
  if (!url) return null;

  // Direct Grove URL
  if (url.includes("api.grove.storage/")) {
    const match = url.match(/api\.grove\.storage\/([a-f0-9]+)/i);
    if (match && match[1]) return match[1];
  }

  // Handle baseify/higherify/dickbuttify URLs
  if (
    url.includes("/ipfs/baseify/") ||
    url.includes("/ipfs/higherify/") ||
    url.includes("/ipfs/dickbuttify/")
  ) {
    try {
      // Extract the encoded part
      let encodedPart = "";
      if (url.includes("baseify/")) {
        encodedPart = url.split("baseify/")[1];
      } else if (url.includes("dickbuttify/")) {
        encodedPart = url.split("dickbuttify/")[1];
      } else if (url.includes("higherify/")) {
        encodedPart = url.split("higherify/")[1];
      }

      if (encodedPart) {
        // Decode the URL
        const decodedGroveUrl = decodeURIComponent(encodedPart);

        // Extract the hash from the decoded URL
        if (decodedGroveUrl.includes("api.grove.storage/")) {
          const hashMatch = decodedGroveUrl.match(
            /api\.grove\.storage\/([a-f0-9]+)/i
          );
          if (hashMatch && hashMatch[1]) {
            console.log("Extracted Grove hash from baseify URL:", hashMatch[1]);
            return hashMatch[1];
          }
        }
      }
    } catch (e) {
      console.error("Failed to decode URL:", e);
    }

    return null;
  }

  // Encoded in IPFS URL
  if (url.includes("ipfs.io/ipfs/") && url.includes("api.grove.storage")) {
    const match = url.match(/api\.grove\.storage%2F([a-f0-9]+)/i);
    if (match && match[1]) return match[1];

    // Try to decode the URL
    try {
      let encodedPart = "";
      // Try to extract the encoded part after ipfs/
      const parts = url.split("ipfs/");
      if (parts.length > 1) {
        encodedPart = parts[1];
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
    throw error;
  }
}

// Function to get the best image URL from metadata
export function getBestImageUrl(metadata: NFTMetadata): string {
  // First check if we have a valid groveUrl
  if (metadata.groveUrl && metadata.groveUrl.length > 10) {
    return getFullGroveUrl(metadata.groveUrl);
  }

  // Then check if we can extract a Grove hash from the image field
  if (metadata.image) {
    // Check if it's a baseify/higherify URL
    if (
      metadata.image.includes("/ipfs/baseify/") ||
      metadata.image.includes("/ipfs/higherify/") ||
      metadata.image.includes("/ipfs/dickbuttify/")
    ) {
      try {
        // Extract the encoded part
        let encodedPart = "";
        if (metadata.image.includes("baseify/")) {
          encodedPart = metadata.image.split("baseify/")[1];
        } else if (metadata.image.includes("dickbuttify/")) {
          encodedPart = metadata.image.split("dickbuttify/")[1];
        } else if (metadata.image.includes("higherify/")) {
          encodedPart = metadata.image.split("higherify/")[1];
        }

        if (encodedPart) {
          // Decode the URL to get the Grove URL
          const decodedGroveUrl = decodeURIComponent(encodedPart);
          if (decodedGroveUrl.includes("api.grove.storage/")) {
            return `https://${decodedGroveUrl}`;
          }
        }
      } catch (e) {
        console.error("Failed to decode URL:", e);
      }
    }

    // Check if it's a direct Grove URL
    if (metadata.image.includes("api.grove.storage/")) {
      if (!metadata.image.startsWith("https://")) {
        return `https://${metadata.image.replace(/^http:\/\//, "")}`;
      }
      return metadata.image;
    }

    // Try to extract a Grove hash
    const hash = extractGroveHash(metadata.image);
    if (hash) return getFullGroveUrl(hash);

    // If not a Grove URL, use the image directly
    return metadata.image;
  }

  // Finally, check the imageFile field
  if (metadata.imageFile) {
    const hash = extractGroveHash(metadata.imageFile);
    if (hash) return getFullGroveUrl(hash);

    // If it's a relative path, add the leading slash
    if (
      !metadata.imageFile.startsWith("/") &&
      !metadata.imageFile.startsWith("http")
    ) {
      return `/${metadata.imageFile}`;
    }

    return metadata.imageFile;
  }

  // Fallback to a placeholder
  return "/placeholder.jpg";
}

// Function to get original NFT data by ID
export async function getOriginalById(id: number): Promise<OriginalNFT> {
  try {
    // Create a contract instance
    const contract = getContract({
      address: COLLECTION_ADDRESS as `0x${string}`,
      abi: HigherBaseOriginalsABI,
      client: publicClient,
    });

    // Get token URI
    const tokenURI = await contract.read.tokenURI([BigInt(id)]);

    // Fetch metadata from IPFS
    const metadata = await fetchIPFSMetadata(tokenURI as string);

    // Extract Grove URL from metadata
    let groveUrl = "";
    if (metadata.image && typeof metadata.image === "string") {
      const hash = extractGroveHash(metadata.image as string);
      if (hash) groveUrl = hash;
    }

    return {
      tokenId: id,
      creator: (metadata.creator as string) || "0x1234...5678", // Use metadata.creator if available
      groveUrl,
      tokenURI: tokenURI as string,
      overlayType: (metadata.overlayType as string) || "none",
      editionCount: (metadata.editionCount as number) || 0,
    };
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

// Modify the fetchNFTsFromGrove function to support different contract types and chains

export async function fetchNFTsFromGrove(
  contractAddress: string = COLLECTION_ADDRESS,
  chainId: number = 84532, // Base Sepolia by default
  contractType: "ERC721" | "ERC1155" = "ERC721"
): Promise<NFTMetadata[]> {
  try {
    // Check cache first
    const cacheKey = `${contractAddress}-${chainId}`;
    if (nftMetadataCache.has(cacheKey)) {
      console.log("Using cached NFT metadata");
      return nftMetadataCache.get(cacheKey)!;
    }

    // Create a client for the specified chain
    let chainClient: PublicClient;
    if (chainId === 84532) {
      // Base Sepolia
      chainClient = createPublicClient({
        chain: baseSepolia,
        transport: http(baseSepolia.rpcUrls.default.http[0]),
      });
      console.log("Using Base Sepolia client");
    } else if (chainId === 534351) {
      // Scroll Sepolia
      chainClient = createPublicClient({
        chain: scrollSepolia,
        transport: http(scrollSepolia.rpcUrls.default.http[0]),
      });
      console.log("Using Scroll Sepolia client");
    } else {
      // Fallback to Base Sepolia for unsupported chains
      console.warn(
        `Unsupported chain ID ${chainId}, using Base Sepolia client as fallback`
      );
      chainClient = createPublicClient({
        chain: baseSepolia,
        transport: http(baseSepolia.rpcUrls.default.http[0]),
      });
    }

    // Choose the appropriate ABI based on contract type
    const contractAbi =
      contractType === "ERC721"
        ? contractAddress.toLowerCase() === COLLECTION_ADDRESS.toLowerCase()
          ? HigherBaseOriginalsABI
          : ScrollifyOriginalsABI
        : ScrollifyEditionsABI;

    // Create a contract instance
    const contract = getContract({
      address: contractAddress as `0x${string}`,
      abi: contractAbi,
      client: chainClient,
    });

    // Get total supply
    let totalSupply: bigint;
    try {
      totalSupply = (await contract.read.totalSupply()) as bigint;
    } catch (error) {
      console.error("Error fetching total supply:", error);
      throw new Error("Failed to fetch total supply from contract");
    }

    console.log(`Total NFTs in collection: ${totalSupply}`);

    // Limit to 16 NFTs for performance
    const nftCount = Math.min(Number(totalSupply), 16);

    // Fetch token IDs and metadata
    const nfts: NFTMetadata[] = [];

    for (let i = 0; i < nftCount; i++) {
      try {
        // Get token ID at index
        const tokenIdBigInt = (await contract.read.tokenByIndex([
          BigInt(i),
        ])) as bigint;

        // Get token URI - different method name for ERC1155
        const tokenURI =
          contractType === "ERC721"
            ? await contract.read.tokenURI([tokenIdBigInt])
            : await contract.read.uri([tokenIdBigInt]);

        console.log(`Token URI for ID ${tokenIdBigInt}: ${tokenURI}`);

        // Fetch metadata from IPFS
        const metadata = await fetchIPFSMetadata(tokenURI as string);

        // Extract Grove URL if present
        let groveUrl = "";
        let imageUrl = "";
        if (metadata.image && typeof metadata.image === "string") {
          const hash = extractGroveHash(metadata.image as string);
          if (hash) {
            groveUrl = hash;
            // Store the Grove URL but use local images for faster loading
            imageUrl = `/image-${(i % 16) + 1}.jpg`;
          } else {
            // If not a Grove URL, use the image directly
            imageUrl = metadata.image as string;
          }
        }

        // Determine NFT type based on contract type
        const nftType =
          contractType === "ERC721" ? NFTType.ORIGINAL : NFTType.EDITION;

        // Use local images for faster loading but store Grove URL for later
        nfts.push({
          id: tokenIdBigInt.toString(),
          name:
            (metadata.name as string) ||
            `${chainId === 534351 ? "Scrollify" : "Higher"} ${
              nftType === NFTType.ORIGINAL ? "Original" : "Edition"
            } #${tokenIdBigInt.toString()}`,
          description:
            (metadata.description as string) ||
            `A ${chainId === 534351 ? "Scrollify" : "Higher"} ${
              nftType === NFTType.ORIGINAL ? "Original" : "Edition"
            } NFT from the collection`,
          image: imageUrl, // Use local image for faster loading
          tokenId: Number(tokenIdBigInt),
          type: nftType,
          originalId: Number(tokenIdBigInt),
          groveUrl, // Store the Grove hash for later use
          attributes: (metadata.attributes as Array<{
            trait_type: string;
            value: string | number;
          }>) || [
            {
              trait_type: "Type",
              value: `${chainId === 534351 ? "Scrollify" : "Higher"} ${
                nftType === NFTType.ORIGINAL ? "Original" : "Edition"
              }`,
            },
          ],
        });
      } catch (error) {
        console.error(`Error fetching NFT at index ${i}:`, error);
      }
    }

    // Cache the results
    nftMetadataCache.set(cacheKey, nfts);

    return nfts;
  } catch (error) {
    console.error("Error fetching NFTs from Grove:", error);
    return [];
  }
}

// Function to check if NFTs are ready to be loaded
export async function checkNFTsReady(): Promise<boolean> {
  try {
    // Create a contract instance
    const contract = getContractInstance();

    // Try to call totalSupply to check if the contract is accessible
    const totalSupply = await contract.read.totalSupply();

    // If we get here, the contract is accessible
    console.log(`Contract is ready. Total supply: ${totalSupply}`);
    return true;
  } catch (error) {
    console.error("Error checking NFT readiness:", error);
    return false;
  }
}
