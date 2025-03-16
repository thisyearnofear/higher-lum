import * as THREE from "three";
import { Animation } from "../animation/Animation";
import { Freezable } from "./Freezable";

interface ImagePlaneConfig {
  imagePath: string;
  width: number;
  height: number;
  angle: number;
  worldPoint?: THREE.Vector3;
  isNft?: boolean;
  nftId?: string;
  flipHorizontal?: boolean;
}

// Cache for loaded textures to improve performance and prevent reloading
const textureCache = new Map<string, THREE.Texture>();

export class ImagePlane extends Freezable {
  private mesh: THREE.Mesh<
    THREE.CylinderGeometry,
    THREE.MeshBasicMaterial | THREE.MeshBasicMaterial[]
  >;
  private scaleAnimation: Animation;
  private isHovered: boolean = false;
  private isNft: boolean = false;
  private nftId?: string;

  constructor(config: ImagePlaneConfig) {
    super();
    const {
      imagePath,
      angle,
      isNft = false,
      nftId,
      flipHorizontal = false,
    } = config;
    this.isNft = isNft;
    this.nftId = nftId;

    // Check if this is a Grove URL
    const isGroveUrl = imagePath.includes("api.grove.storage");

    // Create a custom texture loader for local images
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    // Create consistent geometry for both NFT and local images
    // Use a slightly wider angle for NFT images to ensure they're visible
    // The original was 360 / 16 / 70 which is approximately 0.32 degrees
    const angleWidth = isNft ? 360 / 16 / 60 : 360 / 16 / 70; // Slightly wider for NFTs

    const geometry = new THREE.CylinderGeometry(
      1,
      1,
      0.4,
      8,
      1,
      true,
      0,
      angleWidth
    );
    geometry.rotateY(Math.PI / 1);

    // If flipping horizontally, scale the geometry on the X axis
    if (flipHorizontal) {
      geometry.scale(-1, 1, 1);
    }

    // Check cache first
    if (textureCache.has(imagePath)) {
      const texture = textureCache.get(imagePath)!;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });

      this.mesh = new THREE.Mesh(geometry, material);

      // Add NFT metadata to userData if this is an NFT
      if (this.isNft && this.nftId) {
        this.mesh.userData = { isNFT: true, nftId: this.nftId };
      }

      this.rotateMeshFromWorldPoint(angle, "y");
    } else {
      // Create placeholder material
      const placeholderMaterial = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
      });

      this.mesh = new THREE.Mesh(geometry, placeholderMaterial);

      // Add NFT metadata to userData if this is an NFT
      if (this.isNft && this.nftId) {
        this.mesh.userData = { isNFT: true, nftId: this.nftId };
      }

      this.rotateMeshFromWorldPoint(angle, "y");

      // Load the texture
      loader.load(
        imagePath,
        (texture) => {
          // Configure texture based on source
          if (isGroveUrl) {
            // For Grove URLs, we need to set flipY to true (opposite of what we had before)
            texture.flipY = true;
          } else {
            // For local images, keep flipY true
            texture.flipY = true;
          }

          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;

          // Store in cache
          textureCache.set(imagePath, texture);

          // Create a new material with the texture
          this.mesh.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
          });
        },
        undefined,
        (error) => {
          console.error(`Error loading texture from ${imagePath}:`, error);
        }
      );
    }

    // Use the same animation settings for both NFT and local images
    this.scaleAnimation = new Animation({
      startValue: 1,
      endValue: 1.2,
      duration: 2000,
      easingFunction: function easeOutExpo(
        t: number,
        b: number,
        c: number,
        d: number
      ) {
        return (c * (-Math.pow(2, (-10 * t) / d) + 1) * 1024) / 1023 + b;
      },
    });

    return this;
  }

  public getMesh() {
    return this.mesh;
  }

  public update() {
    if (this.isFrozen) return;
    this.scaleAnimation.update((val) => {
      this.mesh.scale.setX(val);
      this.mesh.scale.setY(val);
    });
    return this;
  }

  public onMouseMove(intersectingObject: THREE.Object3D | null) {
    if (this.isFrozen) return;
    if (!this.isHovered && intersectingObject === this.mesh) {
      this.mouseEnter();
    }
    if (
      this.isHovered &&
      intersectingObject &&
      intersectingObject !== this.mesh
    ) {
      this.mouseLeave();
    }
    return this;
  }

  public onClick() {
    return this;
  }

  private mouseEnter() {
    if (this.isFrozen) return;
    this.isHovered = true;
    this.scaleAnimation.forwards().start();
  }

  private mouseLeave() {
    if (this.isFrozen) return;
    this.isHovered = false;
    this.scaleAnimation.backwards().start();
  }

  private rotateMeshFromWorldPoint(
    angle: number,
    axis: "x" | "y" | "z" = "y",
    pointIsWorld = false
  ) {
    const obj = this.mesh;
    const point = new THREE.Vector3(0, 0, 0);

    if (pointIsWorld) {
      obj.parent?.localToWorld(obj.position);
    }

    const theta = THREE.MathUtils.degToRad(angle);
    obj.position.add(point);
    const vectorAxis = new THREE.Vector3(
      axis === "x" ? 1 : 0,
      axis === "y" ? 1 : 0,
      axis === "z" ? 1 : 0
    );
    obj.position.applyAxisAngle(vectorAxis, theta);
    obj.position.sub(point);

    if (pointIsWorld) {
      obj.parent?.worldToLocal(obj.position);
    }

    obj.rotateOnAxis(vectorAxis, theta);
  }
}
