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
  const [isHigherLoading, setIsHigherLoading] = useState(false);
  const [isOnChainMode, setIsOnChainMode] = useState(false);
  const [nftMetadata, setNftMetadata] = useState<any[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ringsRef = useRef<Map<number, ImageRing>>(new Map());
  const musicPlayerRef = useRef<MusicPlane | null>(null);
  const transitionInProgressRef = useRef(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [transitionLoadingProgress, setTransitionLoadingProgress] = useState(0);

  // Animation state refs
  const currentRingIndexRef = useRef(0);
  const lastScrollOffsetRef = useRef(0);

  // Constants for the scene
  const DEPTH_OFFSET = 16 * 3; // 16 images * 3
  const VERTICAL_OFFSET = 0.5;
  const VISIBLE_RINGS = 100;

  // Function to create a ring
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
      const imagePaths = Array(16)
        .fill(0)
        .map((_, index) => `/image-${index + 1}.jpg`);
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
    if (transitionInProgressRef.current) return;

    // If not in on-chain mode and button is not ready, don't proceed
    if (!isOnChainMode && !higherButtonReady) return;

    transitionInProgressRef.current = true;
    setIsHigherLoading(true);

    // If already in on-chain mode, transition back to off-chain
    if (isOnChainMode) {
      console.log("Transitioning back to off-chain mode");

      // Change background color with transition
      if (sceneRef.current) {
        // Animate background color change
        const startColor = new THREE.Color(0x000000);
        const endColor = new THREE.Color(0xffffff);
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
            // Transition complete - now set the off-chain mode flag
            console.log(
              "Background transition complete, switching to off-chain mode"
            );

            // Important: We're not recreating the scene or music player,
            // just changing a flag that affects how new rings are created
            setIsOnChainMode(false);

            // Force replace all visible rings immediately
            setTimeout(() => {
              if (sceneRef.current && ringsRef.current && cameraRef.current) {
                const rings = ringsRef.current;
                const scene = sceneRef.current;
                const cameraY = cameraRef.current.position.y;
                const baseIndex = Math.floor(cameraY / VERTICAL_OFFSET);
                const startIndex = baseIndex - VISIBLE_RINGS / 2;
                const endIndex = baseIndex + VISIBLE_RINGS / 2;

                // Remove all existing rings
                for (const [index, ring] of rings.entries()) {
                  scene.remove(ring.getGroup());
                  ring.dispose();
                }
                rings.clear();

                // Create new rings with the updated mode
                for (let i = startIndex; i < endIndex; i++) {
                  const ring = createRing(i);
                  rings.set(i, ring);
                  scene.add(ring.getGroup());

                  // Reset arrow speeds for all arrows in the ring
                  ring.resetArrowSpeeds();
                  // Reset rotation speed
                  ring.resetRotationSpeed();
                }

                currentRingIndexRef.current = baseIndex;
              }
            }, 100);

            transitionInProgressRef.current = false;
            setIsHigherLoading(false);
          }
        };

        animateBackgroundColor();
      } else {
        console.log("No scene reference, setting off-chain mode directly");
        setIsOnChainMode(false);

        transitionInProgressRef.current = false;
        setIsHigherLoading(false);
      }

      return;
    }

    // Otherwise, transition to on-chain mode
    console.log("Starting transition to on-chain mode");

    try {
      // Fetch NFT data if not already loaded
      if (nftMetadata.length === 0) {
        // Start loading animation
        setTransitionLoadingProgress(10);
        console.log("Fetching NFT data...");

        // Check if contract is ready
        const contractReady = await isContractReady();
        if (!contractReady) {
          console.error("Contract is not ready");
          transitionInProgressRef.current = false;
          setIsHigherLoading(false);
          return;
        }

        setTransitionLoadingProgress(30);

        // Pre-fetch NFT data - this loads the metadata but uses local images
        const nfts = await fetchNFTsFromGrove(COLLECTION_ADDRESS);
        console.log(`Fetched ${nfts.length} NFTs from Grove`);
        setTransitionLoadingProgress(80);
        setNftMetadata(nfts);
        setTransitionLoadingProgress(100);
      } else {
        // If NFTs are already loaded, just show 100%
        setTransitionLoadingProgress(100);
      }

      // Change background color with transition
      if (sceneRef.current) {
        // Animate background color change
        const startColor = new THREE.Color(0xffffff);
        const endColor = new THREE.Color(0x000000); // Pure black instead of dark gray
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

            // Important: We're not recreating the scene or music player,
            // just changing a flag that affects how new rings are created
            setIsOnChainMode(true);

            // Force replace all visible rings immediately
            setTimeout(() => {
              if (sceneRef.current && ringsRef.current && cameraRef.current) {
                const rings = ringsRef.current;
                const scene = sceneRef.current;
                const cameraY = cameraRef.current.position.y;
                const baseIndex = Math.floor(cameraY / VERTICAL_OFFSET);
                const startIndex = baseIndex - VISIBLE_RINGS / 2;
                const endIndex = baseIndex + VISIBLE_RINGS / 2;

                // Remove all existing rings
                for (const [index, ring] of rings.entries()) {
                  scene.remove(ring.getGroup());
                  ring.dispose();
                }
                rings.clear();

                // Create new rings with the updated mode
                for (let i = startIndex; i < endIndex; i++) {
                  const ring = createRing(i);
                  rings.set(i, ring);
                  scene.add(ring.getGroup());

                  // Reset arrow speeds for all arrows in the ring
                  ring.resetArrowSpeeds();
                  // Reset rotation speed
                  ring.resetRotationSpeed();
                }

                currentRingIndexRef.current = baseIndex;
              }
            }, 100);

            transitionInProgressRef.current = false;
            setIsHigherLoading(false);
          }
        };

        animateBackgroundColor();
      } else {
        console.log("No scene reference, setting on-chain mode directly");
        setIsOnChainMode(true);

        transitionInProgressRef.current = false;
        setIsHigherLoading(false);
      }
    } catch (error) {
      console.error("Error transitioning to on-chain mode:", error);
      transitionInProgressRef.current = false;
      setIsHigherLoading(false);
    }
  };

  // Check if Higher button should be ready
  useEffect(() => {
    const checkReady = async () => {
      try {
        // Check if NFTs are ready
        const isReady = await checkNFTsReady();

        // Check if contract is ready
        const contractReady = await isContractReady();

        // Only set button ready if both checks pass
        setHigherButtonReady(isReady && contractReady);
      } catch (error) {
        console.error("Error checking readiness:", error);
        setHigherButtonReady(false);
      }
    };

    checkReady();
  }, []);

  // Effect to replace all rings when on-chain mode changes
  useEffect(() => {
    if (!sceneRef.current || !ringsRef.current) return;

    const rings = ringsRef.current;
    const scene = sceneRef.current;

    // Force replace all rings when mode changes
    const newRings = new Map<number, ImageRing>();
    const startIndex = -VISIBLE_RINGS / 2;
    const endIndex = VISIBLE_RINGS / 2;

    // Remove all existing rings
    for (const [index, ring] of rings.entries()) {
      scene.remove(ring.getGroup());
      ring.dispose();
    }
    rings.clear();

    // Create new rings
    for (let i = startIndex; i < endIndex; i++) {
      const ring = createRing(i);
      newRings.set(i, ring);
      scene.add(ring.getGroup());
    }

    // Update rings reference
    for (const [index, ring] of newRings) {
      rings.set(index, ring);
    }
  }, [isOnChainMode]);

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

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    rendererRef.current = renderer;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    camera.position.setZ(30);

    const momentumDraggable = new MomentumDraggable(canvas);

    const rings = new Map<number, ImageRing>();
    ringsRef.current = rings;

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
    musicPlayerRef.current = musicPlayer;
    scene.add(musicPlayer.getMesh());

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
          if (rings.has(i)) {
            const existingRing = rings.get(i)!;
            // Check if the ring needs replacement based on mode
            const isNftRing = existingRing.getGroup().userData.isNftRing;
            const ringDarkMode = existingRing.getGroup().userData.darkMode;

            // Replace if:
            // 1. In on-chain mode but ring is not an NFT ring
            // 2. In off-chain mode but ring is an NFT ring
            // 3. Dark mode setting doesn't match current mode
            const needsReplacement =
              (isOnChainMode && !isNftRing) ||
              (!isOnChainMode && isNftRing) ||
              ringDarkMode !== isOnChainMode;

            if (!needsReplacement) {
              newRings.set(i, existingRing);
              rings.delete(i);
            } else {
              // Remove the old ring and create a new one
              const scene = sceneRef.current as THREE.Scene;
              scene.remove(existingRing.getGroup());
              existingRing.dispose();

              // Create new ring
              const ring = createRing(i);
              newRings.set(i, ring);
              scene.add(ring.getGroup());
            }
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

        currentRingIndexRef.current = baseIndex;
      }
    }

    function init() {
      // Set background color based on mode
      scene.background = new THREE.Color(isOnChainMode ? 0x000000 : 0xffffff);

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

      // Update all rings with the calculated speed
      for (const ring of rings.values()) {
        if (ring) {
          ring.update(amplifiedSpeed);
        }
      }

      // Update music player
      if (musicPlayerRef.current) {
        musicPlayerRef.current.update(camera);
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

      // Dispose of music player
      if (musicPlayerRef.current) {
        musicPlayerRef.current.dispose();
        musicPlayerRef.current = null;
      }

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
          <span className="loading-text ml-2">
            {transitionLoadingProgress}%
          </span>
        </div>
      ) : (
        <button
          onClick={transitionToOnChain}
          className={`attribution higher-link ${
            higherButtonReady || isOnChainMode ? "ready" : "loading"
          }`}
          disabled={!higherButtonReady && !isOnChainMode}
          style={{ minWidth: "100px" }}
        >
          HIGHER
          {!higherButtonReady && !isOnChainMode && (
            <span className="loading-text ml-2">...</span>
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
