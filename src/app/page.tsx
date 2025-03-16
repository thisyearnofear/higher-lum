"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { MomentumDraggable } from "@/lib/three/MomentumDraggable";
import { MusicPlane } from "@/lib/three/MusicPlane";
import { InfoModal } from "@/components/InfoModal";
import { checkNFTsReady } from "@/services/nftService";
import { isContractReady } from "@/services/contract";
import { NFTMetadata } from "@/types/nft-types";
import { WorkerManager } from "@/lib/workers/worker-manager";
import { useTransitions } from "@/hooks/useTransitions";
import { useRingManager } from "@/hooks/useRingManager";
import { OffChainNFTModal } from "@/components/OffChainNFTModal";
import { BaseNFTModal } from "@/components/BaseNFTModal";
import { ScrollNFTModal } from "@/components/ScrollNFTModal";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const momentumPausedRef = useRef(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedNFTId, setSelectedNFTId] = useState<string | undefined>(
    undefined
  );

  // State for the Higher button and on-chain experience
  const [higherButtonReady, setHigherButtonReady] = useState(false);
  const [isOnChainMode, setIsOnChainMode] = useState(false);
  const [isOnChainScrollMode, setIsOnChainScrollMode] = useState(false);
  const isOnChainModeRef = useRef(false);
  const isOnChainScrollModeRef = useRef(false);
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata[]>([]);
  const [scrollNftMetadata, setScrollNftMetadata] = useState<NFTMetadata[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const musicPlayerRef = useRef<MusicPlane | null>(null);
  const lastScrollOffsetRef = useRef(0);
  const currentRingIndexRef = useRef<number>(0);

  // Constants for the scene
  const DEPTH_OFFSET = 16 * 3; // 16 images * 3
  const VERTICAL_OFFSET = 0.5;
  const VISIBLE_RINGS = 100;

  // Add a worker manager for heavy calculations
  const workerManagerRef = useRef<WorkerManager | null>(null);

  // State for the refresh button
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create a ref for the NFT select handler
  const handleNFTSelectRef = useRef((imageIndex: number, nftId?: string) => {
    // Default implementation
    const currentIsOnChainMode = isOnChainModeRef.current;
    console.log(
      `NFT selected: index=${imageIndex}, nftId=${
        nftId || "none"
      }, isOnChainMode=${currentIsOnChainMode}`
    );
    const adjustedIndex = imageIndex % 16;
    setSelectedNFT(adjustedIndex);
    setSelectedNFTId(nftId);
    setIsModalOpen(true);
    momentumPausedRef.current = true;
  });

  // Use the ring manager hook
  const {
    ringsRef,
    createRing,
    replaceAllRings,
    updateRings,
    updateRingAnimations,
    disposeAllRings,
  } = useRingManager({
    VERTICAL_OFFSET,
    VISIBLE_RINGS,
    DEPTH_OFFSET,
    isOnChainModeRef,
    isOnChainScrollModeRef,
    nftMetadata,
    scrollNftMetadata,
    handleNFTSelect: handleNFTSelectRef.current,
    sceneRef,
    cameraRef,
  });

  // Update the NFT select handler
  useEffect(() => {
    handleNFTSelectRef.current = (imageIndex: number, nftId?: string) => {
      const currentIsOnChainMode = isOnChainModeRef.current;
      console.log(
        `NFT selected: index=${imageIndex}, nftId=${
          nftId || "none"
        }, isOnChainMode=${currentIsOnChainMode}, isOnChainMode (ref)=${
          isOnChainModeRef.current
        }`
      );
      const adjustedIndex = imageIndex % 16;
      setSelectedNFT(adjustedIndex);
      setSelectedNFTId(nftId);
      setIsModalOpen(true);
      momentumPausedRef.current = true;
    };
  }, [
    isOnChainModeRef,
    momentumPausedRef,
    setSelectedNFT,
    setSelectedNFTId,
    setIsModalOpen,
  ]);

  // Use the transitions hook
  const {
    isHigherLoading,
    setIsHigherLoading,
    transitionLoadingProgress,
    transitionInProgressRef,
    transitionToNextMode,
    getCurrentMode,
    preloadBaseNFTs,
    preloadScrollNFTs,
  } = useTransitions({
    replaceAllRings,
    sceneRef,
    isOnChainModeRef,
    isOnChainScrollModeRef,
    setIsOnChainMode,
    setIsOnChainScrollMode,
    nftMetadata,
    setNftMetadata,
    scrollNftMetadata,
    setScrollNftMetadata,
  });

  // Function to force a render
  const forceRender = useCallback(() => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, []);

  // Function to handle modal close
  const handleModalClose = () => {
    console.log("Closing modal, resetting state");

    // First set the modal to closing state
    setIsModalOpen(false);

    // Wait a frame before resetting other state and resuming animation
    requestAnimationFrame(() => {
      setSelectedNFT(null);
      setSelectedNFTId(undefined);

      // Resume the animation loop
      momentumPausedRef.current = false;
    });
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

  // Effect to replace all rings when mode changes
  useEffect(() => {
    if (!sceneRef.current || !ringsRef.current) return;

    console.log(`Effect triggered: mode changed to ${getCurrentMode()}`);
    console.log(
      `NFT data: Base=${nftMetadata.length}, Scroll=${scrollNftMetadata.length}`
    );

    // Wait a moment to ensure the state has been updated
    setTimeout(() => {
      const rings = ringsRef.current;
      const scene = sceneRef.current;

      if (!rings || !scene) return;

      // Set the background color based on the current mode
      const currentMode = getCurrentMode();
      let bgColor;
      if (currentMode === "scroll") {
        bgColor = 0xffd700; // Gold for Scroll mode
      } else if (currentMode === "base") {
        bgColor = 0x000000; // Black for Base mode
      } else {
        bgColor = 0xffffff; // White for off-chain mode
      }
      scene.background = new THREE.Color(bgColor);

      console.log(
        `Creating new rings in ${currentMode} mode, nftMetadata length=${nftMetadata.length}, scrollNftMetadata length=${scrollNftMetadata.length}`
      );

      // Force replace all rings when mode changes
      replaceAllRings();

      // Force a render to ensure rings are visible
      forceRender();
    }, 100); // Increased delay to ensure state is updated
  }, [
    isOnChainMode,
    isOnChainScrollMode,
    nftMetadata,
    scrollNftMetadata,
    getCurrentMode,
    replaceAllRings,
    forceRender,
    ringsRef,
    sceneRef,
  ]);

  // Update the ref when isOnChainMode changes
  useEffect(() => {
    isOnChainModeRef.current = isOnChainMode;
    // Update ring animations when mode changes
    if (ringsRef.current) {
      // Pass the current camera Y position
      updateRingAnimations(cameraRef.current?.position.y || 0);
    }
  }, [isOnChainMode, updateRingAnimations, ringsRef, cameraRef]);

  // Update the ref when isOnChainScrollMode changes
  useEffect(() => {
    isOnChainScrollModeRef.current = isOnChainScrollMode;
    console.log(
      `isOnChainScrollMode changed to ${isOnChainScrollMode}, updating ref`
    );
  }, [isOnChainScrollMode]);

  // Initialize the worker manager
  useEffect(() => {
    // Create the worker manager
    workerManagerRef.current = new WorkerManager();

    // Clean up on unmount
    return () => {
      if (workerManagerRef.current) {
        workerManagerRef.current.terminate();
        workerManagerRef.current = null;
      }
    };
  }, []);

  // Preload NFTs on initialization
  useEffect(() => {
    const preloadNFTs = async () => {
      try {
        // Try to preload Base NFTs in the background
        if (nftMetadata.length === 0) {
          console.log("Preloading Base NFTs on initialization");
          await preloadBaseNFTs();
          console.log(
            `After preloading, Base NFTs count: ${nftMetadata.length}`
          );
        }

        // Try to preload Scroll NFTs in the background
        if (scrollNftMetadata.length === 0) {
          console.log("Preloading Scroll NFTs on initialization");
          await preloadScrollNFTs();
          console.log(
            `After preloading, Scroll NFTs count: ${scrollNftMetadata.length}`
          );
        }
      } catch (error) {
        console.error("Error preloading NFTs:", error);
        // Non-critical error, don't show alert
      }
    };

    preloadNFTs();
  }, [
    preloadBaseNFTs,
    preloadScrollNFTs,
    nftMetadata.length,
    scrollNftMetadata.length,
  ]);

  // Function to update rings directly without worker
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateRingsDirectly = useCallback(
    (baseIndex: number, startIndex: number, endIndex: number) => {
      // Update the current ring index
      currentRingIndexRef.current = baseIndex;

      // Remove rings that are no longer visible
      for (const [index, ring] of ringsRef.current.entries()) {
        if (index < startIndex || index > endIndex) {
          if (ring) {
            sceneRef.current?.remove(ring.getGroup());
            ring.dispose();
            ringsRef.current.delete(index);
          }
        }
      }

      // Add new rings that are now visible
      for (let i = startIndex; i <= endIndex; i++) {
        if (!ringsRef.current.has(i)) {
          const ring = createRing(i);
          ringsRef.current.set(i, ring);
          sceneRef.current?.add(ring.getGroup());
        }
      }
    },
    [createRing, sceneRef]
  );

  // Handle the result from the worker
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleRingsUpdateResult = useCallback(
    (result: {
      startIndex?: number;
      endIndex?: number;
      needsUpdate: boolean;
      baseIndex?: number;
    }) => {
      if (
        result.needsUpdate &&
        result.startIndex !== undefined &&
        result.endIndex !== undefined &&
        cameraRef.current
      ) {
        // Pass the current camera Y position
        updateRings(cameraRef.current.position.y);
      }
    },
    [updateRings, cameraRef]
  );

  // Update rings based on camera position using the worker
  const updateRingsWithWorker = useCallback(
    (cameraY: number) => {
      if (workerManagerRef.current) {
        workerManagerRef.current.updateRings(
          cameraY,
          VERTICAL_OFFSET,
          VISIBLE_RINGS,
          currentRingIndexRef.current,
          handleRingsUpdateResult
        );
      } else {
        // Fallback to direct update if worker is not available
        updateRings(cameraY);
      }
    },
    [updateRings, currentRingIndexRef, handleRingsUpdateResult]
  );

  // Update the button to show loading state during transitions
  useEffect(() => {
    if (transitionInProgressRef.current) {
      setIsHigherLoading(true);
    }
  }, [transitionInProgressRef, setIsHigherLoading]);

  // Function to manually refresh NFT data
  const refreshNFTData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // Refresh Base NFTs if in Base mode
      if (isOnChainMode) {
        await preloadBaseNFTs();
      }

      // Refresh Scroll NFTs if in Scroll mode
      if (isOnChainScrollMode) {
        await preloadScrollNFTs();
      }
    } catch (error) {
      console.error("Error refreshing NFT data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnChainMode, isOnChainScrollMode, preloadBaseNFTs, preloadScrollNFTs]);

  // Set up automatic polling for NFT updates
  useEffect(() => {
    // Only poll when in on-chain mode and not during transitions
    if (
      (!isOnChainMode && !isOnChainScrollMode) ||
      transitionInProgressRef.current
    ) {
      return;
    }

    console.log("Setting up NFT polling");

    // Poll every 60 seconds (increased from 30 to reduce frequency)
    const pollInterval = setInterval(async () => {
      // Skip polling if a refresh is already in progress or a transition is happening
      if (isRefreshing || transitionInProgressRef.current) {
        console.log(
          "Skipping auto-refresh because a refresh or transition is already in progress"
        );
        return;
      }

      console.log("Running auto-refresh polling...");

      try {
        // Set refreshing state to prevent multiple refreshes
        setIsRefreshing(true);

        if (isOnChainMode && !isOnChainScrollMode) {
          console.log("Auto-refreshing Base NFTs");

          // Store the current count to check if we got new NFTs
          const previousCount = nftMetadata.length;

          // Force refresh to get latest data
          await preloadBaseNFTs(true);

          // Only update rings if we have new NFTs
          if (nftMetadata.length > previousCount) {
            console.log(
              `Found ${
                nftMetadata.length - previousCount
              } new Base NFTs, updating rings`
            );

            // Replace all rings with the new data
            replaceAllRings();
            forceRender();
          } else {
            console.log(
              "No new Base NFTs found during auto-refresh, skipping ring update"
            );
          }
        } else if (isOnChainScrollMode) {
          console.log("Auto-refreshing Scroll NFTs");

          // Store the current count to check if we got new NFTs
          const previousCount = scrollNftMetadata.length;

          // Force refresh to get latest data
          await preloadScrollNFTs(true);

          // Only update rings if we have new NFTs
          if (scrollNftMetadata.length > previousCount) {
            console.log(
              `Found ${
                scrollNftMetadata.length - previousCount
              } new Scroll NFTs, updating rings`
            );

            // Replace all rings with the new data
            replaceAllRings();
            forceRender();
          } else {
            console.log(
              "No new Scroll NFTs found during auto-refresh, skipping ring update"
            );
          }
        }
      } catch (error) {
        console.error("Error during auto-refresh:", error);
      } finally {
        setIsRefreshing(false);
      }
    }, 60000); // 60 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [
    isOnChainMode,
    isOnChainScrollMode,
    preloadBaseNFTs,
    preloadScrollNFTs,
    nftMetadata.length,
    scrollNftMetadata.length,
    replaceAllRings,
    forceRender,
    transitionInProgressRef,
    isRefreshing,
    setIsRefreshing,
  ]);

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

    // Initialize first set of rings
    for (let i = 0; i < VISIBLE_RINGS; i++) {
      const ring = createRing(i);
      ringsRef.current.set(i, ring);
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

    // Initialize the scene
    function init() {
      // Get the current mode from the refs
      const currentIsOnChainMode = isOnChainModeRef.current;
      const currentIsScrollMode = isOnChainScrollModeRef.current;

      // Set background color based on mode
      let bgColor;
      if (currentIsScrollMode) {
        bgColor = 0xffd700; // Gold for Scroll mode
      } else if (currentIsOnChainMode) {
        bgColor = 0x000000; // Black for Base mode
      } else {
        bgColor = 0xffffff; // White for off-chain mode
      }

      console.log(
        `Setting initial background color: ${bgColor.toString(16)}, mode: ${
          currentIsScrollMode
            ? "scroll"
            : currentIsOnChainMode
            ? "base"
            : "offchain"
        }`
      );
      scene.background = new THREE.Color(bgColor);

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

      // Update rings based on camera position using the worker
      updateRingsWithWorker(cameraY);

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

      // Update all rings with the calculated speed using our hook function
      updateRingAnimations(amplifiedSpeed);

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
      for (const ring of ringsRef.current.values()) {
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
        for (const ring of ringsRef.current.values()) {
          if (ring) {
            ring.onClick(mesh);
          }
        }
      }
    };

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    // Initialize the scene
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

      // Clean up rings using our hook function
      disposeAllRings();
    };
  }, [
    createRing,
    updateRings,
    updateRingsWithWorker,
    updateRingAnimations,
    disposeAllRings,
    VISIBLE_RINGS,
    VERTICAL_OFFSET,
    DEPTH_OFFSET,
    currentRingIndexRef,
    ringsRef,
  ]);

  return (
    <>
      <canvas id="bg" ref={canvasRef} />

      {/* Replace the NFTModal with specialized modals based on mode */}
      {isModalOpen && !isOnChainMode && !isOnChainScrollMode && (
        <OffChainNFTModal
          imageIndex={selectedNFT ?? 0}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />
      )}

      {isModalOpen && isOnChainMode && !isOnChainScrollMode && (
        <BaseNFTModal
          imageIndex={selectedNFT ?? 0}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onChainNFTs={nftMetadata}
          selectedNFTId={selectedNFTId}
        />
      )}

      {isModalOpen && isOnChainScrollMode && (
        <ScrollNFTModal
          imageIndex={selectedNFT ?? 0}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          scrollNFTs={scrollNftMetadata}
          selectedNFTId={selectedNFTId}
        />
      )}

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
          onClick={transitionToNextMode}
          className={`attribution higher-link ${
            higherButtonReady || isOnChainMode || isOnChainScrollMode
              ? "ready"
              : "loading"
          }`}
          disabled={
            !higherButtonReady && !isOnChainMode && !isOnChainScrollMode
          }
          style={{ minWidth: "100px" }}
        >
          HIGHER
          {!higherButtonReady && !isOnChainMode && !isOnChainScrollMode && (
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

      {/* Refresh button - only show in on-chain modes */}
      {(isOnChainMode || isOnChainScrollMode) && (
        <button
          onClick={refreshNFTData}
          className="attribution refresh-button"
          aria-label="Refresh NFTs"
          disabled={isRefreshing || transitionInProgressRef.current}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isRefreshing ? "default" : "pointer",
            opacity: isRefreshing ? 0.5 : 1,
          }}
        >
          {isRefreshing ? (
            <span className="animate-spin">↻</span>
          ) : (
            <span>↻</span>
          )}
        </button>
      )}
    </>
  );
}
