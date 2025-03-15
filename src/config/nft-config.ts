/**
 * NFT Configuration
 */

// Define the type for hardcoded NFT metadata
interface HardcodedNFTMetadata {
  title: string;
  description: string;
  imageFile: string;
  tokenId: number;
}

// Scroll Sepolia contract addresses
export const SCROLLIFY_ORIGINALS_ADDRESS =
  "0xf230170c3afd6bea32ab0d7747c04a831bf24968"; // Deployed on Scroll Sepolia
export const SCROLLIFY_EDITIONS_ADDRESS =
  "0xE8fF059Db1598dc98F002c16cD6da2B8Bd75bD24"; // Deployed on Scroll Sepolia

// Collection address
export const COLLECTION_ADDRESS = "0xf83BEE9560F7DBf5b103e8449d7869AF1E5EBD80"; // Higher Base Originals on Base Sepolia

// Editions contract address
export const EDITIONS_ADDRESS = "0xB01156C091Bc299dce13dab15c78b066a7ECAD59"; // Higher Base Editions on Base Sepolia

// Hardcoded NFT metadata for the initial experience
export const NFT_METADATA: Record<number, HardcodedNFTMetadata> = {
  1: {
    title: "Higher-Coded Commit #01",
    description: "Rise beyond reach\nThe boundless soar",
    imageFile: "image-13.jpg",
    tokenId: 2,
  },
  2: {
    title: "Higher-Coded Commit #02",
    description: "Fall as deep as you must\nRise as high as you will",
    imageFile: "image-14.jpg",
    tokenId: 3,
  },
  3: {
    title: "Higher-Coded Commit #03",
    description: "The summit is but a pause,\nFor the ever-rising.",
    imageFile: "image-2.jpg",
    tokenId: 4,
  },
  4: {
    title: "Higher-Coded Commit #04",
    description: "No fall too great.\nFor souls set on rising.",
    imageFile: "image-4.jpg",
    tokenId: 17,
  },
  5: {
    title: "Higher-Coded Commit #05",
    description: "Commit to the climb.\nThe sky will make way.",
    imageFile: "image-5.jpg",
    tokenId: 18,
  },
  6: {
    title: "Higher-Coded Commit #06",
    description: "Seed must be buried,\nBefore it breaks the earth.",
    imageFile: "image-6.jpg",
    tokenId: 6,
  },
  7: {
    title: "Higher-Coded Commit #07",
    description: "Rise as response.\nThe infinite calls.",
    imageFile: "image-7.jpg",
    tokenId: 7,
  },
  8: {
    title: "Higher-Coded Commit #08",
    description: "Step up.\nSee how heavens yield.",
    imageFile: "image-8.jpg",
    tokenId: 8,
  },
  9: {
    title: "Higher-Coded Commit #09",
    description: "The higher you aim.\nThe clearer the path.",
    imageFile: "image-9.jpg",
    tokenId: 9,
  },
  10: {
    title: "Higher-Coded Commit #10",
    description: "Higher.\nNot to escape.\nTo become.",
    imageFile: "image-10.jpg",
    tokenId: 10,
  },
  11: {
    title: "Higher-Coded Commit #11",
    description: "Ascend not for heights.\nFor horizonless wonder.",
    imageFile: "image-11.jpg",
    tokenId: 11,
  },
  12: {
    title: "Higher-Coded Commit #12",
    description: "Burn with purpose.\nDefy gravity.",
    imageFile: "image-12.jpg",
    tokenId: 12,
  },
  13: {
    title: "Higher-Coded Commit #13",
    description: "Will is winged.\nShadow's elevation.",
    imageFile: "image-1.jpg",
    tokenId: 13,
  },
  14: {
    title: "Higher-Coded Commit #14",
    description: "Depth needn't be defeat.\nIt is gathering of strength.",
    imageFile: "image-3.jpg",
    tokenId: 14,
  },
  15: {
    title: "Higher-Coded Commit #15",
    description: "The ocean floor only teaches.\nThe sky's worth.",
    imageFile: "image-15.jpg",
    tokenId: 15,
  },
  16: {
    title: "Higher-Coded Commit #16",
    description: "The higher the aim.\nThe clearer the path.",
    imageFile: "image-16.jpg",
    tokenId: 16,
  },
};
