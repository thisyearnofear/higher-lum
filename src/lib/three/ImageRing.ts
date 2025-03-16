import { Freezable } from "./Freezable";
import { ImagePlane } from "./ImagePlane";
import { FloatingArrow } from "./FloatingArrow";
import * as THREE from "three";
import { NFTMetadata } from "@/types/nft-types";
import { getBestImageUrl } from "@/services/nftService";

interface ImageRingConfig {
  angleOffset: number;
  imagePaths: string[];
  yPosition: number;
  depthOffset: number;
  isOdd?: boolean;
  onDoubleClick?: (imageIndex: number, nftId?: string) => void;
  nftMetadata?: NFTMetadata[]; // Optional NFT metadata for on-chain mode
  darkMode?: boolean; // For on-chain mode arrows
}

export class ImageRing extends Freezable {
  private group: THREE.Group;
  private images: ImagePlane[];
  private arrows: FloatingArrow[];
  private lastOffset: number = 0;
  private isOdd: boolean = false;
  private lastClickTime: number = 0;
  private lastClickedMesh: THREE.Object3D | null = null;
  private readonly DOUBLE_CLICK_DELAY = 500; // Increased from 300ms to 500ms for better detection
  private readonly onDoubleClick?: (imageIndex: number, nftId?: string) => void;
  private isNftMode: boolean = false;
  private nftMetadata?: NFTMetadata[];
  private darkMode: boolean = false;
  private lastClickedIndex: number = -1;

  constructor({
    angleOffset,
    imagePaths,
    isOdd,
    yPosition,
    depthOffset,
    onDoubleClick,
    nftMetadata,
    darkMode = false,
  }: ImageRingConfig) {
    super();
    this.isNftMode = !!nftMetadata && nftMetadata.length > 0;
    this.nftMetadata = nftMetadata;
    this.darkMode = darkMode;

    console.log(
      `ImageRing constructor: isNftMode=${this.isNftMode}, darkMode=${
        this.darkMode
      }, nftMetadata length=${nftMetadata?.length || 0}`
    );

    if (this.isNftMode && nftMetadata) {
      console.log(
        "NFT Metadata in ring:",
        nftMetadata.map((nft) => ({
          id: nft.id,
          name: nft.name,
          tokenId: nft.tokenId,
          type: nft.type,
          isScroll:
            nft.name?.toLowerCase().includes("scroll") ||
            nft.description?.toLowerCase().includes("scroll") ||
            nft.chainId === 534351,
        }))
      );
    }

    // Calculate angle piece based on the number of images
    // For NFT mode, we want to ensure consistent spacing regardless of NFT count
    const MAX_IMAGES_PER_RING = 16; // Standard number of images in off-chain mode
    const totalImages =
      this.isNftMode && nftMetadata
        ? Math.min(nftMetadata.length, MAX_IMAGES_PER_RING)
        : imagePaths.length;

    const anglePiece = 360 / totalImages;

    // Create images
    if (this.isNftMode && nftMetadata) {
      // Use NFT metadata for images, but limit to MAX_IMAGES_PER_RING
      console.log("Creating NFT image planes");

      // Log all available NFTs before selection
      console.log(
        "All available NFTs before selection:",
        nftMetadata.map((nft) => ({
          id: nft.id,
          name: nft.name,
          chainId: nft.chainId,
          chainName: nft.chainName,
          isScrollNFT: nft.isScrollNFT,
        }))
      );

      // Instead of taking first N NFTs, distribute them evenly around the ring
      const totalNfts = nftMetadata.length;
      const nftsToDisplay = Array(Math.min(totalNfts, MAX_IMAGES_PER_RING))
        .fill(null)
        .map((_, i) => {
          const originalIndex = Math.floor(
            (i * totalNfts) / Math.min(totalNfts, MAX_IMAGES_PER_RING)
          );
          return nftMetadata[originalIndex];
        });

      console.log(
        "Selected NFTs for display:",
        nftsToDisplay.map((nft) => ({
          id: nft.id,
          name: nft.name,
          chainId: nft.chainId,
          chainName: nft.chainName,
          isScrollNFT: nft.isScrollNFT,
          position: nftsToDisplay.indexOf(nft),
        }))
      );

      this.images = nftsToDisplay.map((nft, index) => {
        // In the initial transition, we only have Base NFTs
        const isScrollNFT = false;

        console.log(`Creating image plane for NFT at position ${index}:`, {
          id: nft.id,
          name: nft.name,
          isScrollNFT,
          chainId: nft.chainId,
          chainName: nft.chainName,
          imageUrl: getBestImageUrl(nft),
        });

        // Create the image plane with enhanced metadata
        const plane = new ImagePlane({
          imagePath: getBestImageUrl(nft),
          width: 800,
          height: 800,
          angle: anglePiece * index,
          worldPoint: new THREE.Vector3(0, 0, depthOffset),
          isNft: true,
          nftId: nft.id,
          // Flip horizontally if it's a Scroll NFT (chainId 534351 is Scroll Sepolia)
          flipHorizontal: nft.chainId === 534351,
        });

        // Add additional metadata to the mesh userData
        const mesh = plane.getMesh();
        mesh.userData = {
          ...mesh.userData,
          isNFT: true,
          nftId: nft.id,
          nftIndex: index,
          nftType: nft.type,
          isScrollNFT: false, // Always false in initial transition
          chainId: nft.chainId,
          chainName: nft.chainName,
          nftName: nft.name,
          nftDescription: nft.description,
          originalPosition: nftMetadata.findIndex((n) => n.id === nft.id),
        };

        console.log(`Created image plane for NFT at position ${index}:`, {
          id: nft.id,
          name: nft.name,
          isScrollNFT: false,
          chainId: nft.chainId,
          chainName: nft.chainName,
          imageUrl: getBestImageUrl(nft),
        });

        return plane;
      });
    } else {
      // Use local images
      console.log("Creating local image planes");
      this.images = imagePaths.map(
        (imagePath, index) =>
          new ImagePlane({
            imagePath,
            width: 800,
            height: 800,
            angle: anglePiece * index,
            worldPoint: new THREE.Vector3(0, 0, depthOffset),
          })
      );
    }

    // Create arrows between images - ensure consistent number of arrows
    this.arrows = Array(totalImages)
      .fill(0)
      .map((_, index) => {
        const angle = anglePiece * (index + 0.5); // Position halfway between images
        const radians = (angle * Math.PI) / 180;
        const radius = depthOffset * 0.5; // Closer to center

        const arrow = new FloatingArrow({
          x: Math.cos(radians) * radius,
          y: 0,
          z: Math.sin(radians) * radius,
        });

        // Set arrow color if in dark mode - keep them green
        if (this.darkMode) {
          const arrowMesh = arrow.getMesh();
          if (
            arrowMesh &&
            arrowMesh.material instanceof THREE.MeshBasicMaterial
          ) {
            // Keep the default green color
            // arrowMesh.material.color.set(0x333333); - removed
          }

          const secondaryMesh = arrow.getSecondaryMesh();
          if (
            secondaryMesh &&
            secondaryMesh.material instanceof THREE.MeshBasicMaterial
          ) {
            // Keep the default green color
            // secondaryMesh.material.color.set(0x333333); - removed
          }
        }

        return arrow;
      });

    this.group = new THREE.Group();
    this.images.forEach((image) => this.group.add(image.getMesh()));
    this.arrows.forEach((arrow) => {
      const mesh = arrow.getMesh();
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1.5, 1.5, 1.5);
      this.group.add(mesh);

      // Add secondary arrow if it exists
      const secondaryMesh = arrow.getSecondaryMesh();
      if (secondaryMesh) {
        secondaryMesh.rotation.set(0, 0, 0);
        secondaryMesh.scale.set(1.5, 1.5, 1.5);
        this.group.add(secondaryMesh);
      }
    });

    // Store metadata about this ring in the group's userData
    this.group.userData = {
      isNftRing: this.isNftMode,
      darkMode: this.darkMode,
    };

    this.group.position.set(0, yPosition, 0);
    this.group.rotation.y = angleOffset;
    this.isOdd = isOdd || false;
    this.onDoubleClick = onDoubleClick;
  }

  public onWheel(event: WheelEvent) {
    if (this.isFrozen) return;
    const direction = event.deltaY > 0 ? "down" : "up";
    this.group.rotation.y += direction === "down" ? -0.01 : 0.01;
  }

  public getGroup() {
    return this.group;
  }

  public update(scrollSpeed: number) {
    if (this.isFrozen) return;

    // Update images
    this.images.forEach((image) => image.update());

    // Update arrows with scroll speed
    this.arrows.forEach((arrow) => arrow.update(scrollSpeed));

    // Update ring rotation
    const newOffset = scrollSpeed / 3;
    this.group.rotation.y +=
      (newOffset - this.lastOffset) * (this.isOdd ? -1 : 1);
    this.lastOffset = newOffset;
  }

  public onMouseMove(intersectingObject: THREE.Object3D | null) {
    if (this.isFrozen) return;
    this.images.forEach((image) => image.onMouseMove(intersectingObject));
  }

  public onClick(mesh: THREE.Object3D | null) {
    if (!mesh) return;

    // Try to find which image this mesh belongs to
    let imageIndex = -1;
    let foundImage = false;

    // Check if the mesh is one of our image planes or a child of one
    for (let i = 0; i < this.images.length; i++) {
      const imageMesh = this.images[i].getMesh();

      if (mesh === imageMesh) {
        // Direct match
        imageIndex = i;
        foundImage = true;
        break;
      }

      // Check if it's a child of this image
      if (imageMesh.children) {
        for (const child of imageMesh.children) {
          if (mesh === child) {
            imageIndex = i;
            foundImage = true;
            break;
          }
        }
      }

      if (foundImage) break;
    }

    // If we didn't find a matching image, exit
    if (imageIndex === -1) return;

    // Check if we have a double click
    const now = Date.now();
    if (
      this.lastClickTime &&
      now - this.lastClickTime < 300 &&
      this.lastClickedIndex === imageIndex
    ) {
      // This is a double click
      console.log(`Double click detected on image ${imageIndex}`);

      // Call the onDoubleClick callback with the index
      if (this.onDoubleClick) {
        // If we have NFT metadata, pass the NFT ID
        if (this.nftMetadata && this.nftMetadata[imageIndex]) {
          const nftId = this.nftMetadata[imageIndex].id;
          console.log(
            `Calling onDoubleClick with index ${imageIndex} and NFT ID ${nftId}`
          );
          this.onDoubleClick(imageIndex, nftId);
        } else {
          // Otherwise just pass the index
          console.log(`Calling onDoubleClick with index ${imageIndex} only`);
          this.onDoubleClick(imageIndex);
        }
      }
    }

    // Update the last click time and index
    this.lastClickTime = now;
    this.lastClickedIndex = imageIndex;
  }

  // Reset the speed of all arrows in this ring
  public resetArrowSpeeds(): void {
    this.arrows.forEach((arrow) => {
      if (typeof arrow.resetSpeed === "function") {
        arrow.resetSpeed();
      }
    });
  }

  // Reset the rotation speed of the ring
  public resetRotationSpeed(): void {
    this.lastOffset = 0;
  }

  public dispose(): void {
    // Clean up resources
    this.images.forEach((image) => {
      const mesh = image.getMesh();
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        if (mesh.material.map) {
          mesh.material.map.dispose();
        }
        mesh.material.dispose();
      }
      mesh.geometry.dispose();
    });

    // Clean up arrow resources
    this.arrows.forEach((arrow) => {
      const mesh = arrow.getMesh();
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.dispose();
      }
      mesh.geometry.dispose();
    });

    this.images = [];
    this.arrows = [];
  }
}
