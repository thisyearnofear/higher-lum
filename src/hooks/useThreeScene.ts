import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ImageRing } from "@/lib/three/ImageRing";
import { MomentumDraggable } from "@/lib/three/MomentumDraggable";
import { MusicPlane } from "@/lib/three/MusicPlane";

export const useThreeScene = (canvas: HTMLCanvasElement) => {
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const ringsRef = useRef<Map<number, ImageRing>>(new Map());
  const momentumDraggableRef = useRef<MomentumDraggable>();
  const musicPlayerRef = useRef<MusicPlane>();
  const lastScrollOffsetRef = useRef<number>(0);
  const currentRingIndexRef = useRef<number>(0);

  const DEPTH_OFFSET = 16 * 3; // imagePaths.length * 3
  const VERTICAL_OFFSET = 0.5;
  const VISIBLE_RINGS = 100;

  useEffect(() => {
    if (!canvas) return;

    // Scene setup
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

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    momentumDraggableRef.current = new MomentumDraggable(canvas);

    // Create boom for camera
    const boom = new THREE.Group();
    boom.add(camera);
    scene.add(boom);
    camera.position.set(0, 0, 0);

    // Image paths (to be moved to configuration)
    const imagePaths = Array(16)
      .fill(0)
      .map((_, index) => `/image-${index + 1}.jpg`);

    // Create initial rings
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
      ringsRef.current.set(i, ring);
      scene.add(ring.getGroup());
    }

    // Create music player
    const musicPlayer = new MusicPlane({
      x: 0,
      y: VISIBLE_RINGS * VERTICAL_OFFSET * 0.3,
      z: DEPTH_OFFSET * 0.5,
    });
    musicPlayerRef.current = musicPlayer;
    scene.add(musicPlayer.getMesh());

    // Scene initialization
    scene.background = new THREE.Color(0xffffff);
    const ambientLight = new THREE.AmbientLight(0xffffff);
    ambientLight.intensity = 4.5;
    scene.add(ambientLight);
    camera.lookAt(0, 0, 0);

    // Animation function
    function animate() {
      if (!momentumDraggableRef.current) return;

      requestAnimationFrame(animate);
      const originalDragOffset = momentumDraggableRef.current.getOffset();
      const dragXOffset = originalDragOffset.x / 10000;
      const dragYOffset = originalDragOffset.y / 10000;

      boom.rotation.y = dragXOffset;
      const cameraY = dragYOffset + (VISIBLE_RINGS * VERTICAL_OFFSET) / 2;
      camera.position.y = cameraY;

      // Update rings based on camera position
      updateRings(cameraY);

      // Calculate scroll speed with improved non-linear scaling
      const rawSpeed = dragYOffset - lastScrollOffsetRef.current;
      const speedMagnitude = Math.abs(rawSpeed);

      let amplifiedSpeed;
      if (speedMagnitude < 0.0001) {
        amplifiedSpeed = 0;
      } else if (speedMagnitude < 0.001) {
        amplifiedSpeed = rawSpeed * 30;
      } else {
        amplifiedSpeed =
          Math.sign(rawSpeed) * Math.pow(speedMagnitude * 60, 1.5);
      }

      lastScrollOffsetRef.current = dragYOffset;

      // Update components
      ringsRef.current.forEach((ring) => ring.update(amplifiedSpeed));
      if (musicPlayerRef.current) {
        musicPlayerRef.current.update(camera);
      }

      renderer.render(scene, camera);
    }

    // Start animation
    animate();

    // Event listeners
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const mesh = getIntersectingObject(event);
      ringsRef.current.forEach((ring) => ring.onMouseMove(mesh));
    };

    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
      const mesh = getIntersectingObject(event);
      if (mesh) {
        ringsRef.current.forEach((ring) => ring.onClick());
      }
    };

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);

      if (musicPlayerRef.current) {
        musicPlayerRef.current.dispose();
      }

      renderer.dispose();
    };
  }, [canvas]);

  // Helper function to update rings
  function updateRings(cameraY: number) {
    if (!sceneRef.current) return;

    const baseIndex = Math.floor(cameraY / VERTICAL_OFFSET);

    if (Math.abs(baseIndex - currentRingIndexRef.current) > VISIBLE_RINGS / 4) {
      const newRings = new Map<number, ImageRing>();
      const startIndex = baseIndex - VISIBLE_RINGS / 2;
      const endIndex = baseIndex + VISIBLE_RINGS / 2;

      for (let i = startIndex; i < endIndex; i++) {
        if (ringsRef.current.has(i)) {
          newRings.set(i, ringsRef.current.get(i)!);
          ringsRef.current.delete(i);
        } else {
          const ring = new ImageRing({
            angleOffset: 20 * i,
            imagePaths: Array(16)
              .fill(0)
              .map((_, index) => `/image-${index + 1}.jpg`),
            yPosition: VERTICAL_OFFSET * i,
            depthOffset: DEPTH_OFFSET,
            isOdd: i % 2 === 0,
          });
          newRings.set(i, ring);
          sceneRef.current.add(ring.getGroup());
        }
      }

      // Remove old rings
      ringsRef.current.forEach((ring) => {
        sceneRef.current?.remove(ring.getGroup());
      });

      ringsRef.current.clear();
      newRings.forEach((ring, index) => {
        ringsRef.current.set(index, ring);
      });
      currentRingIndexRef.current = baseIndex;
    }
  }

  // Helper function to get intersecting object
  function getIntersectingObject(event: MouseEvent) {
    if (!cameraRef.current || !sceneRef.current) return null;

    const vector = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(vector, cameraRef.current);

    const intersects = raycaster.intersectObjects(
      sceneRef.current.children,
      true
    );
    if (intersects.length > 0) {
      return intersects[0].object;
    }
    return null;
  }
};
