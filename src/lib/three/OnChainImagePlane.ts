import * as THREE from "three";
import { Animation } from "../animation/Animation";
import { Freezable } from "./Freezable";
import { NFTMetadata } from "@/types/nft-types";
import { getBestImageUrl } from "@/services/nftService";

interface OnChainImagePlaneConfig {
  nft: NFTMetadata;
  width: number;
  height: number;
  angle: number;
  worldPoint?: THREE.Vector3;
}

// Cache for loaded textures to improve performance and prevent reloading
const textureCache = new Map<string, THREE.Texture>();

export class OnChainImagePlane extends Freezable {
  private mesh: THREE.Mesh<
    THREE.CylinderGeometry,
    THREE.MeshBasicMaterial | THREE.MeshBasicMaterial[]
  >;
  private scaleAnimation: Animation;
  private isHovered: boolean = false;
  private nft: NFTMetadata;

  constructor(config: OnChainImagePlaneConfig) {
    super();
    const { nft, width, height, angle, worldPoint } = config;
    this.nft = nft;

    // Get the best image URL from the NFT metadata
    const imageUrl = getBestImageUrl(nft);
    const isGroveUrl = imageUrl.includes("api.grove.storage");

    // Create a custom texture loader
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    // Check cache first
    if (textureCache.has(imageUrl)) {
      const texture = textureCache.get(imageUrl)!;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });

      const geometry = new THREE.CylinderGeometry(
        1,
        1,
        0.4,
        8,
        1,
        true,
        0,
        360 / 16 / 70
      );
      geometry.rotateY(Math.PI / 1);

      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.userData = { isNFT: true, nftId: nft.id };
      this.rotateMeshFromWorldPoint(angle, "y");
    } else {
      // Create placeholder material
      const placeholderMaterial = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
      });

      const geometry = new THREE.CylinderGeometry(
        1,
        1,
        0.4,
        8,
        1,
        true,
        0,
        360 / 16 / 70
      );
      geometry.rotateY(Math.PI / 1);

      this.mesh = new THREE.Mesh(geometry, placeholderMaterial);
      this.mesh.userData = { isNFT: true, nftId: nft.id };
      this.rotateMeshFromWorldPoint(angle, "y");

      // Load the texture
      loader.load(
        imageUrl,
        (texture) => {
          // Configure texture based on source
          if (isGroveUrl) {
            // For Grove URLs, we need to set flipY to false
            texture.flipY = true;
          } else {
            // For local images, keep flipY true
            texture.flipY = true;
          }

          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;

          // Store in cache
          textureCache.set(imageUrl, texture);

          // Create a new material with the texture
          this.mesh.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
          });

          console.log(
            `Loaded texture for NFT ${nft.id} from ${imageUrl.substring(
              0,
              50
            )}...`
          );
        },
        // Progress callback
        (xhr) => {
          // This is called while the texture is loading
          if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            console.log(
              `Loading NFT ${nft.id}: ${Math.round(percentComplete)}% complete`
            );
          }
        },
        // Error callback
        (error) => {
          console.error(
            `Error loading texture for NFT ${nft.id} from ${imageUrl}:`,
            error
          );

          // Fallback to a placeholder color on error
          this.mesh.material = new THREE.MeshBasicMaterial({
            color: 0x333333,
            side: THREE.DoubleSide,
          });
        }
      );
    }

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

  public dispose(): void {
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }

    if (this.mesh.material instanceof THREE.MeshBasicMaterial) {
      // Don't dispose textures that are in the cache
      if (
        this.mesh.material.map &&
        !textureCache.has(this.mesh.material.map.source.data)
      ) {
        this.mesh.material.map.dispose();
      }
      this.mesh.material.dispose();
    } else if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((material) => {
        if (material instanceof THREE.MeshBasicMaterial) {
          if (material.map && !textureCache.has(material.map.source.data)) {
            material.map.dispose();
          }
          material.dispose();
        }
      });
    }
  }
}
