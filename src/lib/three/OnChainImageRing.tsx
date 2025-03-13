import * as THREE from "three";
import { Freezable } from "./Freezable";
import { OnChainImagePlane } from "./OnChainImagePlane";
import { FloatingArrow } from "./FloatingArrow";
import { NFTMetadata, NFTType } from "@/types/nft-types";

interface OnChainImageRingConfig {
  nfts: NFTMetadata[];
  angleOffset?: number;
  yPosition?: number;
  depthOffset?: number;
  darkMode?: boolean;
  onDoubleClick?: (imageIndex: number) => void;
}

export class OnChainImageRing extends Freezable {
  private group: THREE.Group;
  private images: OnChainImagePlane[] = [];
  private arrows: FloatingArrow[] = [];
  private nfts: NFTMetadata[];
  private darkMode: boolean;
  private lastOffset: number = 0;
  private lastClickTime: number = 0;
  private readonly DOUBLE_CLICK_DELAY = 300; // ms
  private readonly onDoubleClick?: (imageIndex: number) => void;

  constructor(config: OnChainImageRingConfig) {
    super();
    const {
      nfts,
      angleOffset = 0,
      yPosition = 0,
      depthOffset = 0,
      darkMode = true,
      onDoubleClick,
    } = config;

    this.nfts = nfts;
    this.darkMode = darkMode;
    this.onDoubleClick = onDoubleClick;
    this.group = new THREE.Group();

    // Create image planes for each NFT
    const totalNfts = nfts.length;
    const angleStep = 360 / totalNfts;

    // Create images
    this.images = nfts.map((nft, index) => {
      try {
        return new OnChainImagePlane({
          nft,
          width: 800,
          height: 800,
          angle: angleStep * index,
          worldPoint: new THREE.Vector3(0, 0, depthOffset),
        });
      } catch (error) {
        console.error(
          `Error creating OnChainImagePlane for NFT ${nft.id}:`,
          error
        );
        // Return a placeholder if there's an error
        return new OnChainImagePlane({
          nft: {
            id: `error-${index}`,
            name: "Error",
            description: "Failed to load NFT",
            image: "/placeholder.jpg",
            tokenId: 0,
            type: NFTType.ORIGINAL,
            originalId: 0,
          },
          width: 800,
          height: 800,
          angle: angleStep * index,
          worldPoint: new THREE.Vector3(0, 0, depthOffset),
        });
      }
    });

    // Create arrows between images
    this.arrows = Array(totalNfts)
      .fill(0)
      .map((_, index) => {
        const angle = angleStep * (index + 0.5); // Position halfway between images
        const radians = (angle * Math.PI) / 180;
        const radius = depthOffset * 0.5; // Closer to center

        const arrow = new FloatingArrow({
          x: Math.cos(radians) * radius,
          y: 0,
          z: Math.sin(radians) * radius,
        });

        // Set arrow color based on dark mode
        const arrowColor = this.darkMode ? 0x333333 : 0xffffff;
        const arrowMesh = arrow.getMesh();
        if (arrowMesh && arrowMesh.material) {
          const material = arrowMesh.material;
          if (material instanceof THREE.MeshBasicMaterial) {
            material.color.set(arrowColor);
          }
        }

        // Also set color for secondary arrow if it exists
        const secondaryMesh = arrow.getSecondaryMesh();
        if (secondaryMesh && secondaryMesh.material) {
          if (secondaryMesh.material instanceof THREE.MeshBasicMaterial) {
            secondaryMesh.material.color.set(arrowColor);
          }
        }

        return arrow;
      });

    // Add all meshes to the group
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

    // Set group position and rotation
    this.group.position.set(0, yPosition, 0);
    this.group.rotation.y = angleOffset * (Math.PI / 180);

    return this;
  }

  public getGroup() {
    return this.group;
  }

  public update(scrollSpeed: number = 0) {
    if (this.isFrozen) return;

    // Update all image planes
    this.images.forEach((image) => {
      image.update();
    });

    // Update all arrows with scroll speed
    this.arrows.forEach((arrow) => {
      arrow.update(scrollSpeed);
    });

    // Update ring rotation - ensure we're using a consistent approach
    if (typeof scrollSpeed === "number" && !isNaN(scrollSpeed)) {
      const newOffset = scrollSpeed / 3;
      this.group.rotation.y += newOffset - this.lastOffset;
      this.lastOffset = newOffset;
    }

    return this;
  }

  public onMouseMove(intersectingObject: THREE.Object3D | null) {
    if (this.isFrozen) return;

    // Pass mouse move to all image planes
    this.images.forEach((image) => {
      image.onMouseMove(intersectingObject);
    });

    return this;
  }

  public onClick(mesh?: THREE.Object3D | null) {
    if (!mesh) return;

    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastClickTime;

    if (timeDiff < this.DOUBLE_CLICK_DELAY) {
      // Double click detected
      // First check if the mesh itself is an NFT
      if (mesh.userData && mesh.userData.isNFT) {
        const imageIndex = this.images.findIndex(
          (plane) => plane.getMesh().userData.nftId === mesh.userData.nftId
        );

        if (imageIndex !== -1 && this.onDoubleClick) {
          this.onDoubleClick(imageIndex);
          this.lastClickTime = 0; // Reset to prevent triple-click
          return this;
        }
      }

      // If not found directly, check if it's a child of an image plane
      const imagePlane = this.images.find(
        (plane) =>
          plane.getMesh() === mesh ||
          (plane.getMesh().children && plane.getMesh().children.includes(mesh))
      );

      if (imagePlane) {
        const imageIndex = this.images.indexOf(imagePlane);
        if (this.onDoubleClick) {
          this.onDoubleClick(imageIndex);
          this.lastClickTime = 0; // Reset to prevent triple-click
        }
      }
    }

    this.lastClickTime = currentTime;

    // Also trigger normal click behavior
    this.images.forEach((image) => {
      image.onClick();
    });

    return this;
  }

  public freeze() {
    super.freeze();

    // Freeze all image planes
    this.images.forEach((image) => {
      image.freeze();
    });

    return this;
  }

  public unfreeze() {
    super.unfreeze();

    // Unfreeze all image planes
    this.images.forEach((image) => {
      image.unfreeze();
    });

    return this;
  }

  public dispose(): void {
    // Dispose all image planes
    this.images.forEach((image) => {
      image.dispose();
    });

    // Dispose all arrows
    this.arrows.forEach((arrow) => {
      arrow.dispose();
    });

    // Clear arrays
    this.images = [];
    this.arrows = [];
  }
}
