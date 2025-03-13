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
  onDoubleClick?: (imageIndex: number) => void;
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
  private readonly DOUBLE_CLICK_DELAY = 300; // ms
  private readonly onDoubleClick?: (imageIndex: number) => void;
  private isNftMode: boolean = false;
  private nftMetadata?: NFTMetadata[];
  private darkMode: boolean = false;

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
    const anglePiece = 360 / imagePaths.length;
    this.isNftMode = !!nftMetadata && nftMetadata.length > 0;
    this.nftMetadata = nftMetadata;
    this.darkMode = darkMode;

    // Create images
    if (this.isNftMode && nftMetadata) {
      // Use NFT metadata for images
      this.images = nftMetadata.map(
        (nft, index) =>
          new ImagePlane({
            imagePath: getBestImageUrl(nft),
            width: 800,
            height: 800,
            angle: anglePiece * index,
            worldPoint: new THREE.Vector3(0, 0, depthOffset),
            isNft: true,
            nftId: nft.id,
          })
      );
    } else {
      // Use local images
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

    // Create arrows between images
    this.arrows = imagePaths.map((_, index) => {
      const angle = anglePiece * (index + 0.5); // Position halfway between images
      const radians = (angle * Math.PI) / 180;
      const radius = depthOffset * 0.5; // Closer to center

      const arrow = new FloatingArrow({
        x: Math.cos(radians) * radius,
        y: 0,
        z: Math.sin(radians) * radius,
      });

      // Set arrow color if in dark mode
      if (this.darkMode) {
        const arrowMesh = arrow.getMesh();
        if (
          arrowMesh &&
          arrowMesh.material instanceof THREE.MeshBasicMaterial
        ) {
          arrowMesh.material.color.set(0x333333);
        }

        const secondaryMesh = arrow.getSecondaryMesh();
        if (
          secondaryMesh &&
          secondaryMesh.material instanceof THREE.MeshBasicMaterial
        ) {
          secondaryMesh.material.color.set(0x333333);
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
          return;
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
        }
      }
    }

    this.lastClickTime = currentTime;

    // Also trigger normal click behavior
    this.images.forEach((image) => image.onClick());
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
