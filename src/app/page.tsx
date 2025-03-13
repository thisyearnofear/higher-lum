"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ImageRing } from "@/lib/three/ImageRing";
import { MomentumDraggable } from "@/lib/three/MomentumDraggable";
import { MusicPlane } from "@/lib/three/MusicPlane";
import { NFTModal } from "@/components/NFTModal";
import { InfoModal } from "@/components/InfoModal";
import { checkNFTsReady, fetchNFTsFromGrove } from "@/services/nftService";
import { isContractReady } from "@/services/contract";
import { COLLECTION_ADDRESS } from "@/config/nft-config";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const momentumPausedRef = useRef(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // State for the Higher button and on-chain experience
  const [higherButtonReady, setHigherButtonReady] = useState(false);
  const [isHigherLoading, setIsHigherLoading] = useState(true);
  const [isOnChainMode, setIsOnChainMode] = useState(false);
  const [nftMetadata, setNftMetadata] = useState<any[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ringsRef = useRef<Map<number, ImageRing>>(new Map());
  const transitionInProgressRef = useRef(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Function to handle NFT selection
  const handleNFTSelect = (imageIndex: number) => {
    setSelectedNFT(imageIndex);
    setIsModalOpen(true);
    momentumPausedRef.current = true;
  };

  // Function to handle modal close
  const handleModalClose = () => {
    // First set the modal to closing state
    setIsModalOpen(false);
    setSelectedNFT(null);

    // Wait a frame before resuming animation to ensure smooth transition
    requestAnimationFrame(() => {
      // Resume the animation loop
      momentumPausedRef.current = false;
    });
  };

  // Function to transition to on-chain experience
  const transitionToOnChain = async () => {
    if (!higherButtonReady || transitionInProgressRef.current) return;

    transitionInProgressRef.current = true;
    console.log("Starting transition to on-chain mode");

    try {
      // Fetch NFT data if not already loaded
      if (nftMetadata.length === 0) {
        // Start loading animation
        setLoadingProgress(10);
        console.log("Fetching NFT data...");

        // Check if contract is ready
        const contractReady = await isContractReady();
        if (!contractReady) {
          console.error("Contract is not ready");
          transitionInProgressRef.current = false;
          return;
        }

        setLoadingProgress(30);

        // Pre-fetch NFT data - this loads the metadata but uses local images
        const nfts = await fetchNFTsFromGrove(COLLECTION_ADDRESS);
        console.log(`Fetched ${nfts.length} NFTs from Grove`);
        setLoadingProgress(80);
        setNftMetadata(nfts);
        setLoadingProgress(100);
      }

      // Change background color with transition
      if (sceneRef.current) {
        // Animate background color change
        const startColor = new THREE.Color(0xffffff);
        const endColor = new THREE.Color(0x0a0a0a);
        const duration = 1000; // ms
        const startTime = Date.now();

        const animateBackgroundColor = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const currentColor = new THREE.Color().lerpColors(
            startColor,
            endColor,
            progress
          );

          if (sceneRef.current) {
            sceneRef.current.background = currentColor;
          }

          if (progress < 1) {
            requestAnimationFrame(animateBackgroundColor);
          } else {
            // Transition complete - now set the on-chain mode flag
            console.log(
              "Background transition complete, switching to on-chain mode"
            );
            setIsOnChainMode(true);
            transitionInProgressRef.current = false;
          }
        };

        animateBackgroundColor();
      } else {
        console.log("No scene reference, setting on-chain mode directly");
        setIsOnChainMode(true);
        transitionInProgressRef.current = false;
      }
    } catch (error) {
      console.error("Error transitioning to on-chain mode:", error);
      transitionInProgressRef.current = false;
    }
  };

  // Check if Higher button should be ready
  useEffect(() => {
    const checkReady = async () => {
      setIsHigherLoading(true);

      try {
        // Start loading animation
        setLoadingProgress(0);

        // Check if NFTs are ready
        const isReady = await checkNFTsReady();
        setLoadingProgress(50);

        // Check if contract is ready
        const contractReady = await isContractReady();
        setLoadingProgress(100);

        // Only set button ready if both checks pass
        setHigherButtonReady(isReady && contractReady);
      } catch (error) {
        console.error("Error checking readiness:", error);
        setHigherButtonReady(false);
      } finally {
        setIsHigherLoading(false);
      }
    };

    checkReady();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // Remove the global TextureLoader override as it's causing issues
    // Instead, we'll handle texture settings in each component

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    rendererRef.current = renderer;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for better performance
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Fix WebGL texture issues
    renderer.outputColorSpace = THREE.SRGBColorSpace;

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
    ringsRef.current = rings;

    function createRing(index: number): ImageRing {
      if (isOnChainMode && nftMetadata.length > 0) {
        // Create ring with NFT metadata
        return new ImageRing({
          angleOffset: 20 * index,
          imagePaths: Array(nftMetadata.length).fill(""), // Placeholder, not used
          yPosition: VERTICAL_OFFSET * index,
          depthOffset: DEPTH_OFFSET,
          isOdd: index % 2 === 0,
          onDoubleClick: handleNFTSelect,
          nftMetadata: nftMetadata,
          darkMode: true,
        });
      } else {
        // Create regular ring with local images
        return new ImageRing({
          angleOffset: 20 * index,
          imagePaths,
          yPosition: VERTICAL_OFFSET * index,
          depthOffset: DEPTH_OFFSET,
          isOdd: index % 2 === 0,
          onDoubleClick: handleNFTSelect,
        });
      }
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
            // Create new ring
            const ring = createRing(i);
            newRings.set(i, ring);
            const scene = sceneRef.current as THREE.Scene;
            scene.add(ring.getGroup());
          }
        }

        // Remove old rings from the scene
        for (const [index, ring] of rings.entries()) {
          const scene = sceneRef.current as THREE.Scene;
          scene.remove(ring.getGroup());
          ring.dispose();
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
      // Always request next frame to keep the loop alive
      requestAnimationFrame(animate);

      // Only process animation if not paused
      if (!momentumDraggable || momentumPausedRef.current) return;

      const originalDragOffset = momentumDraggable.getOffset();
      // Use raw values from momentum draggable
      const dragXOffset = originalDragOffset.x / 500;
      const dragYOffset = originalDragOffset.y / 500;

      boom.rotation.y = dragXOffset;
      const cameraY = dragYOffset + (VISIBLE_RINGS * VERTICAL_OFFSET) / 2;
      camera.position.y = cameraY;

      // Update rings based on camera position
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

      // Update all rings with the calculated speed
      for (const ring of rings.values()) {
        if (ring) {
          ring.update(amplifiedSpeed);
        }
      }

      // Update music player
      if (musicPlayer) {
        musicPlayer.update(camera);
      }

      // Render the scene
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
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
      if (camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
      if (renderer) {
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const mesh = getIntersectingObject(event);

      // Pass mouse move event to all rings
      for (const ring of rings.values()) {
        if (ring) {
          ring.onMouseMove(mesh);
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
      const mesh = getIntersectingObject(event);
      if (mesh) {
        // Pass the click to all rings
        for (const ring of rings.values()) {
          if (ring) {
            ring.onClick(mesh);
          }
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
        const scene = sceneRef.current as THREE.Scene;
        scene.remove(ring.getGroup());
        ring.dispose();
      }
      rings.clear();
    };
  }, [isOnChainMode, nftMetadata]);

  return (
    <>
      <canvas id="bg" ref={canvasRef} />
      <NFTModal
        imageIndex={selectedNFT ?? 0}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        isOnChainMode={isOnChainMode}
        onChainNFTs={nftMetadata}
      />
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
      <a
        href="https://warpcast.com/papa"
        target="_blank"
        rel="noopener"
        className="attribution papa-link"
      >
        papa
      </a>
      {isHigherLoading ? (
        <div
          className="attribution higher-link loading"
          style={{ minWidth: "100px" }}
        >
          <span>HIGHER</span>
          <span className="loading-text ml-2">{loadingProgress}%</span>
        </div>
      ) : (
        <button
          onClick={transitionToOnChain}
          className={`attribution higher-link ${
            higherButtonReady ? "ready" : "loading"
          }`}
          disabled={!higherButtonReady}
          style={{ minWidth: "100px" }}
        >
          HIGHER
          {!higherButtonReady && (
            <span className="loading-text ml-2">{loadingProgress}%</span>
          )}
        </button>
      )}
      <button
        onClick={() => setIsInfoModalOpen(true)}
        className="attribution info-button"
        aria-label="Show information"
      >
        ⬆
      </button>
    </>
  );
}
