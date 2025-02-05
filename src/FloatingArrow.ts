import * as THREE from "three";
import { Animation } from "./Animation";

export class FloatingArrow {
  private mesh: THREE.Mesh;
  private floatAnimation: Animation;
  private basePosition: THREE.Vector3;
  private totalOffset: number = 0;
  private readonly RESET_THRESHOLD = 10;

  constructor({ x = 0, y = 0, z = 0 }) {
    // Create a mathematical up-arrow shape (↑)
    const arrowShape = new THREE.Shape();
    // Vertical line
    arrowShape.moveTo(-0.02, 0); // Start thin vertical line
    arrowShape.lineTo(0.02, 0); // End thin vertical line
    arrowShape.lineTo(0.02, 0.7); // Up the right side
    // Arrow head
    arrowShape.lineTo(0.15, 0.7); // Right extension
    arrowShape.lineTo(0, 1); // Point
    arrowShape.lineTo(-0.15, 0.7); // Left extension
    arrowShape.lineTo(-0.02, 0.7); // Back to vertical
    arrowShape.lineTo(-0.02, 0); // Complete the shape

    const extrudeSettings = {
      depth: 0.002, // Even thinner
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

    // Setup continuous upward animation
    this.floatAnimation = new Animation({
      startValue: 0,
      endValue: 2,
      duration: 2000,
      easingFunction: (t: number) => t % 1,
    });
    this.floatAnimation.start();
  }

  update(scrollSpeed: number = 0) {
    this.floatAnimation.update((val) => {
      // Accumulate total offset
      this.totalOffset += scrollSpeed * 0.5;

      // Reset position if we've moved too far
      if (Math.abs(this.totalOffset) > this.RESET_THRESHOLD) {
        // If moving up, reset to bottom. If moving down, reset to top
        const resetDirection = this.totalOffset > 0 ? -1 : 1;
        this.totalOffset = resetDirection * (this.RESET_THRESHOLD * 0.2);
      }

      // Calculate final position
      const floatOffset = val;

      // Keep X and Z fixed
      this.mesh.position.x = this.basePosition.x;
      this.mesh.position.z = this.basePosition.z;

      // Update Y position with both float and scroll offsets
      this.mesh.position.y =
        this.basePosition.y + floatOffset + this.totalOffset;
    });

    if (!(this.floatAnimation as any).isAnimating) {
      this.floatAnimation.start();
    }
  }

  getMesh() {
    return this.mesh;
  }
}
