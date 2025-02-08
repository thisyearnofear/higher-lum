import { Freezable } from "./Freezable";
import { ImagePlane } from "./ImagePlane";
import { FloatingArrow } from "./FloatingArrow";
import * as THREE from "three";

interface ImageRingConfig {
  angleOffset: number;
  imagePaths: string[];
  yPosition: number;
  depthOffset: number;
  isOdd?: boolean;
}

export class ImageRing extends Freezable {
  private group: THREE.Group;
  private images: ImagePlane[];
  private arrows: FloatingArrow[];
  private lastOffset: number = 0;
  private isOdd: boolean = false;

  constructor({
    angleOffset,
    imagePaths,
    isOdd,
    yPosition,
    depthOffset,
  }: ImageRingConfig) {
    super();
    const anglePiece = 360 / imagePaths.length;

    // Create images
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

    // Create arrows between images
    this.arrows = imagePaths.map((_, index) => {
      const angle = anglePiece * (index + 0.5); // Position halfway between images
      const radians = (angle * Math.PI) / 180;
      const radius = depthOffset * 0.5; // Closer to center

      return new FloatingArrow({
        x: Math.cos(radians) * radius,
        y: 0,
        z: Math.sin(radians) * radius,
      });
    });

    this.group = new THREE.Group();
    this.images.forEach((image) => this.group.add(image.getMesh()));
    this.arrows.forEach((arrow) => {
      const mesh = arrow.getMesh();
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1.5, 1.5, 1.5);
      this.group.add(mesh);
    });

    this.group.position.set(0, yPosition, 0);
    this.group.rotation.y = angleOffset;
    this.isOdd = isOdd || false;
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

  public onClick() {
    this.images.forEach((image) => image.onClick());
  }
}
