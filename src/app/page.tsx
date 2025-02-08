"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ImageRing } from "@/lib/three/ImageRing";
import { MomentumDraggable } from "@/lib/three/MomentumDraggable";
import { MusicPlane } from "@/lib/three/MusicPlane";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for better performance
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(30);

    const momentumDraggable = new MomentumDraggable(canvas);

    const imagePaths = Array(16)
      .fill(0)
      .map((_, index) => `/image-${index + 1}.jpg`);

    const DEPTH_OFFSET = imagePaths.length * 3;
    const VERTICAL_OFFSET = 0.5;
    const VISIBLE_RINGS = 100;
    let currentRingIndex = 0;
    let lastScrollOffset = 0;

    const rings = new Map<number, ImageRing>();

    function createRing(index: number): ImageRing {
      return new ImageRing({
        angleOffset: 20 * index,
        imagePaths,
        yPosition: VERTICAL_OFFSET * index,
        depthOffset: DEPTH_OFFSET,
        isOdd: index % 2 === 0,
      });
    }

    // Initialize first set of rings
    for (let i = 0; i < VISIBLE_RINGS; i++) {
      const ring = createRing(i);
      rings.set(i, ring);
      scene.add(ring.getGroup());
    }

    const boom = new THREE.Group();
    boom.add(camera);
    scene.add(boom);
    camera.position.set(0, 0, 0);

    // Create music player
    const musicPlayer = new MusicPlane({
      x: 0,
      y: VISIBLE_RINGS * VERTICAL_OFFSET * 0.3,
      z: DEPTH_OFFSET * 0.5,
    });

    function updateRings(cameraY: number) {
      const baseIndex = Math.floor(cameraY / VERTICAL_OFFSET);

      if (Math.abs(baseIndex - currentRingIndex) > VISIBLE_RINGS / 4) {
        const newRings = new Map<number, ImageRing>();
        const startIndex = baseIndex - VISIBLE_RINGS / 2;
        const endIndex = baseIndex + VISIBLE_RINGS / 2;

        for (let i = startIndex; i < endIndex; i++) {
          if (rings.has(i)) {
            newRings.set(i, rings.get(i)!);
            rings.delete(i);
          } else {
            const ring = createRing(i);
            newRings.set(i, ring);
            scene.add(ring.getGroup());
          }
        }

        for (const ring of rings.values()) {
          scene.remove(ring.getGroup());
        }

        rings.clear();
        for (const [index, ring] of newRings) {
          rings.set(index, ring);
        }
        currentRingIndex = baseIndex;
      }
    }

    function init() {
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
      // Use raw values from momentum draggable
      const dragXOffset = originalDragOffset.x / 500;
      const dragYOffset = originalDragOffset.y / 500;

      boom.rotation.y = dragXOffset;
      const cameraY = dragYOffset + (VISIBLE_RINGS * VERTICAL_OFFSET) / 2;
      camera.position.y = cameraY;

      updateRings(cameraY);

      const rawSpeed = dragYOffset - lastScrollOffset;
      const speedMagnitude = Math.abs(rawSpeed);

      let amplifiedSpeed;
      if (speedMagnitude < 0.0001) {
        amplifiedSpeed = 0;
      } else {
        // Simpler speed calculation that matches the momentum
        amplifiedSpeed = rawSpeed * 2;
      }

      lastScrollOffset = dragYOffset;

      for (const ring of rings.values()) {
        ring.update(amplifiedSpeed);
      }
      musicPlayer.update(camera);

      renderer.render(scene, camera);
    }

    function getIntersectingObject(event: MouseEvent) {
      const vector = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(vector, camera);

      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        return intersects[0].object;
      }
      return null;
    }

    // Event Listeners
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const mesh = getIntersectingObject(event);
      for (const ring of rings.values()) {
        ring.onMouseMove(mesh);
      }
    };

    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
      const mesh = getIntersectingObject(event);
      if (mesh) {
        for (const ring of rings.values()) {
          ring.onClick();
        }
      }
    };

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    init();
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      momentumDraggable.dispose();
      musicPlayer.dispose();
      renderer.dispose();

      // Clean up rings
      for (const ring of rings.values()) {
        scene.remove(ring.getGroup());
      }
      rings.clear();
    };
  }, []);

  return (
    <>
      <canvas id="bg" ref={canvasRef} />
      <a
        href="https://warpcast.com/papa"
        target="_blank"
        rel="noopener"
        className="attribution papa-link"
      >
        papa
      </a>
      <a
        href="https://warpcast.com/~/channel/higher"
        target="_blank"
        rel="noopener"
        className="attribution higher-link"
      >
        HIGHER
      </a>
    </>
  );
}
