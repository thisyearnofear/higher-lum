import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ImageRing } from "@/lib/three/ImageRing";
import { MomentumDraggable } from "@/lib/three/MomentumDraggable";
import { MusicPlane } from "@/lib/three/MusicPlane";

export const useThreeScene = (canvas: HTMLCanvasElement) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ringsRef = useRef<Map<number, ImageRing>>(new Map());
  const momentumDraggableRef = useRef<MomentumDraggable | null>(null);
  const musicPlayerRef = useRef<MusicPlane | null>(null);
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
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });

    // Optimize renderer
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for better performance
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false; // Disable shadows for better performance

    // Enable frustum culling
    camera.frustumCulled = true;
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
      const ring = new ImageRing({
        angleOffset: 20 * index,
        imagePaths,
        yPosition: VERTICAL_OFFSET * index,
        depthOffset: DEPTH_OFFSET,
        isOdd: index % 2 === 0,
      });
      ring.getGroup().frustumCulled = true; // Enable frustum culling for rings
      return ring;
    }

    // Initialize first set of rings with optimized loading
    const INITIAL_VISIBLE_RINGS = Math.min(VISIBLE_RINGS, 50); // Load fewer rings initially
    for (let i = 0; i < INITIAL_VISIBLE_RINGS; i++) {
      const ring = createRing(i);
      ringsRef.current.set(i, ring);
      scene.add(ring.getGroup());
    }

    // Gradually load remaining rings
    if (VISIBLE_RINGS > INITIAL_VISIBLE_RINGS) {
      setTimeout(() => {
        for (let i = INITIAL_VISIBLE_RINGS; i < VISIBLE_RINGS; i++) {
          const ring = createRing(i);
          ringsRef.current.set(i, ring);
          scene.add(ring.getGroup());
        }
      }, 1000);
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

    // Animation function with performance optimizations
    let lastTime = 0;
    const TARGET_FRAMERATE = 1000 / 60; // 60 FPS

    function animate(currentTime: number) {
      if (!momentumDraggableRef.current) return;

      requestAnimationFrame(animate);

      // Throttle updates to target framerate
      const deltaTime = currentTime - lastTime;
      if (deltaTime < TARGET_FRAMERATE) return;

      lastTime = currentTime;

      const originalDragOffset = momentumDraggableRef.current.getOffset();
      const dragXOffset = originalDragOffset.x / 500;
      const dragYOffset = originalDragOffset.y / 500;

      boom.rotation.y = dragXOffset;
      const cameraY = dragYOffset + (VISIBLE_RINGS * VERTICAL_OFFSET) / 2;
      camera.position.y = cameraY;

      // Update rings based on camera position
      updateRings(cameraY);

      // Calculate scroll speed with improved smoothing
      const rawSpeed = dragYOffset - lastScrollOffsetRef.current;
      const speedMagnitude = Math.abs(rawSpeed);

      let amplifiedSpeed;
      if (speedMagnitude < 0.0001) {
        amplifiedSpeed = 0;
      } else {
        // Simpler speed calculation that matches the momentum
        amplifiedSpeed = rawSpeed * 2;
      }

      lastScrollOffsetRef.current = dragYOffset;

      // Only update visible rings
      const visibleRings = Array.from(ringsRef.current.values()).filter(
        (ring) => {
          const distance = Math.abs(ring.getGroup().position.y - cameraY);
          return distance < (VERTICAL_OFFSET * VISIBLE_RINGS) / 2;
        }
      );

      visibleRings.forEach((ring) => ring.update(amplifiedSpeed));

      if (musicPlayerRef.current) {
        musicPlayerRef.current.update(camera);
      }

      renderer.render(scene, camera);
    }

    // Start animation with timestamp
    requestAnimationFrame(animate);

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

    const handleClick = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      const mouseEvent = event instanceof MouseEvent ? event : event.touches[0];
      if (!mouseEvent) return;

      const mesh = getIntersectingObject(mouseEvent);
      if (mesh) {
        ringsRef.current.forEach((ring) => ring.onClick(mesh));
      }
    };

    const handleTouch = (event: TouchEvent) => {
      event.preventDefault();
      handleClick(event);
    };

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleTouch);
    canvas.addEventListener("touchend", handleTouch);

    // Helper function to update rings
    function updateRings(cameraY: number) {
      const baseIndex = Math.floor(cameraY / VERTICAL_OFFSET);

      if (
        Math.abs(baseIndex - currentRingIndexRef.current) >
        VISIBLE_RINGS / 4
      ) {
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
            scene.add(ring.getGroup());
          }
        }

        // Remove old rings
        ringsRef.current.forEach((ring) => {
          scene.remove(ring.getGroup());
        });

        ringsRef.current.clear();
        newRings.forEach((ring, index) => {
          ringsRef.current.set(index, ring);
        });
        currentRingIndexRef.current = baseIndex;
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchstart", handleTouch);
      canvas.removeEventListener("touchend", handleTouch);

      if (musicPlayerRef.current) {
        musicPlayerRef.current.dispose();
      }

      renderer.dispose();
    };
  }, [canvas, DEPTH_OFFSET]);

  // Helper function to get intersecting object
  function getIntersectingObject(event: MouseEvent | Touch) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const vector = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(vector, cameraRef.current!);

    const intersects = raycaster.intersectObjects(
      sceneRef.current!.children,
      true
    );

    return intersects.length > 0 ? intersects[0].object : null;
  }
};
