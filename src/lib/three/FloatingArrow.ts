import * as THREE from "three";
import { Animation } from "../animation/Animation";

interface FloatingArrowConfig {
  x?: number;
  y?: number;
  z?: number;
  isSecondary?: boolean;
}

export class FloatingArrow {
  private mesh: THREE.Mesh;
  private floatAnimation: Animation;
  private rotateAnimation: Animation;
  private basePosition: THREE.Vector3;
  private totalOffset: number = 0;
  private readonly RESET_THRESHOLD = 10;
  private readonly OVERLAP_DISTANCE = 5;
  private currentSpeed: number = 0;
  private readonly SPEED_DECAY = 0.98;
  private readonly SPEED_SCALE = 0.1;
  private readonly BASE_SPEED = 0.01;
  private resetInProgress: boolean = false;
  private secondaryArrow: FloatingArrow | null = null;

  constructor({
    x = 0,
    y = 0,
    z = 0,
    isSecondary = false,
  }: FloatingArrowConfig) {
    // Create a mathematical up-arrow shape (↑)
    const arrowShape = new THREE.Shape();
    // Vertical line
    arrowShape.moveTo(-0.02, 0);
    arrowShape.lineTo(0.02, 0);
    arrowShape.lineTo(0.02, 0.7);
    // Arrow head
    arrowShape.lineTo(0.15, 0.7);
    arrowShape.lineTo(0, 1);
    arrowShape.lineTo(-0.15, 0.7);
    arrowShape.lineTo(-0.02, 0.7);
    arrowShape.lineTo(-0.02, 0);

    const extrudeSettings = {
      depth: 0.002,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(arrowShape, extrudeSettings);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4caf50,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, z);
    this.basePosition = new THREE.Vector3(x, y, z);

    // Setup continuous base float animation
    this.floatAnimation = new Animation({
      startValue: 0,
      endValue: 0.5,
      duration: 2000,
      easingFunction: (t: number) => Math.sin(t * Math.PI * 2) * 0.5 + 0.5,
    });

    // Setup gentle rotation animation
    this.rotateAnimation = new Animation({
      startValue: 0,
      endValue: Math.PI * 2,
      duration: 8000,
      easingFunction: (t: number) => t,
    });

    this.floatAnimation.start();
    this.rotateAnimation.start();

    // Create secondary arrow only if this is not already a secondary arrow
    if (!isSecondary) {
      this.secondaryArrow = new FloatingArrow({
        x,
        y: y + this.RESET_THRESHOLD,
        z,
        isSecondary: true,
      });
    }
  }

  update(scrollSpeed: number = 0) {
    // Add base upward motion to scroll speed
    const effectiveSpeed = scrollSpeed + this.BASE_SPEED;

    // Update current speed with momentum
    this.currentSpeed =
      this.currentSpeed * this.SPEED_DECAY + effectiveSpeed * this.SPEED_SCALE;

    // Accumulate total offset
    this.totalOffset += this.currentSpeed;

    // Handle position reset with overlap
    if (
      Math.abs(this.totalOffset) > this.RESET_THRESHOLD &&
      !this.resetInProgress
    ) {
      this.resetInProgress = true;
      const resetDirection = this.totalOffset > 0 ? -1 : 1;
      this.totalOffset = resetDirection * this.OVERLAP_DISTANCE;

      // Update secondary arrow position for seamless transition
      if (this.secondaryArrow) {
        this.secondaryArrow.setOffset(
          this.totalOffset + resetDirection * this.RESET_THRESHOLD
        );
      }

      requestAnimationFrame(() => {
        this.resetInProgress = false;
      });
    }

    // Update float animation
    this.floatAnimation.update((val) => {
      const floatOffset = val;
      this.mesh.position.x = this.basePosition.x;
      this.mesh.position.z = this.basePosition.z;
      this.mesh.position.y =
        this.basePosition.y + floatOffset + this.totalOffset;
    });

    // Update rotation animation
    this.rotateAnimation.update((val) => {
      this.mesh.rotation.y = val * 0.2;
    });

    // Update secondary arrow if it exists
    if (this.secondaryArrow) {
      this.secondaryArrow.update(scrollSpeed);
    }

    // Reset animations when complete
    if (!this.floatAnimation.isAnimating) {
      this.floatAnimation.start();
    }
    if (!this.rotateAnimation.isAnimating) {
      this.rotateAnimation.start();
    }
  }

  setOffset(offset: number) {
    this.totalOffset = offset;
  }

  getMesh() {
    return this.mesh;
  }

  getSecondaryMesh() {
    return this.secondaryArrow?.getMesh() || null;
  }

  dispose() {
    if (this.mesh.material) {
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    if (this.secondaryArrow) {
      this.secondaryArrow.dispose();
    }
  }
}
