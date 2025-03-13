/**
 * Common NFT types used across the application
 */

export enum NFTType {
  ORIGINAL = "original",
  EDITION = "edition",
}

export interface NFTMetadata {
  id: string;
  name: string;
  description: string;
  image: string;
  tokenId: number;
  type: NFTType;
  originalId?: number;
  groveUrl?: string;
  imageFile?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface OriginalNFT {
  tokenId: number;
  creator: string;
  groveUrl: string;
  tokenURI: string;
  overlayType: string;
  editionCount: number;
}
