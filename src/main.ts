import { ImageRing } from "./ImageRing";
import { MomentumDraggable } from "./MomentumDraggable";
import { MusicPlane } from "./MusicPlane";
import "./style.css";
import * as THREE from "three";

const canvas = document.querySelector("#bg") as HTMLCanvasElement;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);

const momentumDraggable = new MomentumDraggable(canvas);

const imagePaths = Array(13)
  .fill(0)
  .map((_, index) => `/image-${index + 1}.jpg`);

const DEPTH_OFFSET = imagePaths.length * 3;
const VERTICAL_OFFSET = 0.5;

const rings = Array(100)
  .fill(0)
  .map(
    (_, index) =>
      new ImageRing({
        angleOffset: 20 * index,
        imagePaths,
        yPosition: VERTICAL_OFFSET * index,
        depthOffset: DEPTH_OFFSET,
        isOdd: index % 2 === 0,
      })
  );

const boom = new THREE.Group();
boom.add(camera);
scene.add(boom);
camera.position.set(0, 0, 0);

// Create music player
const musicPlayer = new MusicPlane({
  x: 0,
  y: rings.length * VERTICAL_OFFSET * 0.3,
  z: DEPTH_OFFSET * 0.5,
});

function init() {
  rings.forEach((ring) => scene.add(ring.getGroup()));
  scene.add(musicPlayer.getMesh());

  scene.background = new THREE.Color(0xffffff);

  const ambientLight = new THREE.AmbientLight(0xffffff);
  ambientLight.intensity = 4.5;
  scene.add(ambientLight);

  camera.lookAt(0, 0, 0);
}

function animate() {
  requestAnimationFrame(animate);
  const originalDragOffset = momentumDraggable.getOffset();
  const dragXOffset = originalDragOffset.x / 10000;
  const dragYOffset = originalDragOffset.y / 10000;

  boom.rotation.y = dragXOffset;
  camera.position.y = dragYOffset + (rings.length * VERTICAL_OFFSET) / 2;

  rings.forEach((ring) => ring.update(dragYOffset));
  musicPlayer.update(camera);

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

canvas.addEventListener("mousemove", (event) => {
  event.preventDefault();
  const mesh = getIntersectingObject(event);
  rings.forEach((ring) => ring.onMouseMove(mesh));
});

canvas.addEventListener("click", (event) => {
  event.preventDefault();
  const mesh = getIntersectingObject(event);
  if (mesh) {
    rings.forEach((ring) => ring.onClick());
  }
});

function getIntersectingObject(event: MouseEvent) {
  const vector = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(vector, camera);

  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length > 0) {
    return intersects[0].object;
  }
  return null;
}

init();
animate();
