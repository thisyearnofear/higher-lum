/**
 * NFT Configuration
 */

import { NFTType, NFTMetadata } from "@/types/nft-types";

// Scroll Sepolia contract addresses
export const SCROLLIFY_ORIGINALS_ADDRESS =
  "0xf230170c3afd6bea32ab0d7747c04a831bf24968"; // Deployed on Scroll Sepolia
export const SCROLLIFY_EDITIONS_ADDRESS =
  "0x91a14d576A83414A06D29C79173fc377Fe44edB0"; // Deployed on Scroll Sepolia

// Collection address
export const COLLECTION_ADDRESS = "0xf83BEE9560F7DBf5b103e8449d7869AF1E5EBD80"; // Higher Base Originals on Base Sepolia

// Editions contract address
export const EDITIONS_ADDRESS = "0xB01156C091Bc299dce13dab15c78b066a7ECAD59"; // Higher Base Editions on Base Sepolia

// Hardcoded NFT metadata for the initial experience
export const NFT_METADATA: Record<number, NFTMetadata> = {
  1: {
    id: "1",
    name: "Higher #1",
    description: "A Higher NFT from the collection",
    image: "/image-1.jpg",
    imageFile: "image-1.jpg",
    tokenId: 1,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  2: {
    id: "2",
    name: "Higher #2",
    description: "A Higher NFT from the collection",
    image: "/image-2.jpg",
    imageFile: "image-2.jpg",
    tokenId: 2,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  3: {
    id: "3",
    name: "Higher #3",
    description: "A Higher NFT from the collection",
    image: "/image-3.jpg",
    imageFile: "image-3.jpg",
    tokenId: 3,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  4: {
    id: "4",
    name: "Higher #4",
    description: "A Higher NFT from the collection",
    image: "/image-4.jpg",
    imageFile: "image-4.jpg",
    tokenId: 4,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  5: {
    id: "5",
    name: "Higher #5",
    description: "A Higher NFT from the collection",
    image: "/image-5.jpg",
    imageFile: "image-5.jpg",
    tokenId: 5,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  6: {
    id: "6",
    name: "Higher #6",
    description: "A Higher NFT from the collection",
    image: "/image-6.jpg",
    imageFile: "image-6.jpg",
    tokenId: 6,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  7: {
    id: "7",
    name: "Higher #7",
    description: "A Higher NFT from the collection",
    image: "/image-7.jpg",
    imageFile: "image-7.jpg",
    tokenId: 7,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  8: {
    id: "8",
    name: "Higher #8",
    description: "A Higher NFT from the collection",
    image: "/image-8.jpg",
    imageFile: "image-8.jpg",
    tokenId: 8,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  9: {
    id: "9",
    name: "Higher #9",
    description: "A Higher NFT from the collection",
    image: "/image-9.jpg",
    imageFile: "image-9.jpg",
    tokenId: 9,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  10: {
    id: "10",
    name: "Higher #10",
    description: "A Higher NFT from the collection",
    image: "/image-10.jpg",
    imageFile: "image-10.jpg",
    tokenId: 10,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  11: {
    id: "11",
    name: "Higher #11",
    description: "A Higher NFT from the collection",
    image: "/image-11.jpg",
    imageFile: "image-11.jpg",
    tokenId: 11,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  12: {
    id: "12",
    name: "Higher #12",
    description: "A Higher NFT from the collection",
    image: "/image-12.jpg",
    imageFile: "image-12.jpg",
    tokenId: 12,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  13: {
    id: "13",
    name: "Higher #13",
    description: "A Higher NFT from the collection",
    image: "/image-13.jpg",
    imageFile: "image-13.jpg",
    tokenId: 13,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  14: {
    id: "14",
    name: "Higher #14",
    description: "A Higher NFT from the collection",
    image: "/image-14.jpg",
    imageFile: "image-14.jpg",
    tokenId: 14,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  15: {
    id: "15",
    name: "Higher #15",
    description: "A Higher NFT from the collection",
    image: "/image-15.jpg",
    imageFile: "image-15.jpg",
    tokenId: 15,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
  16: {
    id: "16",
    name: "Higher #16",
    description: "A Higher NFT from the collection",
    image: "/image-16.jpg",
    imageFile: "image-16.jpg",
    tokenId: 16,
    type: NFTType.EDITION,
    attributes: [{ trait_type: "Type", value: "Higher" }],
  },
};
