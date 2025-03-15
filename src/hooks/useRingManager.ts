import { useCallback, useRef } from "react";
import * as THREE from "three";
import { ImageRing } from "@/lib/three/ImageRing";
import { NFTMetadata } from "@/types/nft-types";

type RingManagerProps = {
  VERTICAL_OFFSET: number;
  VISIBLE_RINGS: number;
  DEPTH_OFFSET: number;
  isOnChainModeRef: React.MutableRefObject<boolean>;
  isOnChainScrollModeRef: React.MutableRefObject<boolean>;
  nftMetadata: NFTMetadata[];
  scrollNftMetadata: NFTMetadata[];
  handleNFTSelect: (imageIndex: number, nftId?: string) => void;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
};

export function useRingManager({
  VERTICAL_OFFSET,
  VISIBLE_RINGS,
  DEPTH_OFFSET,
  isOnChainModeRef,
  isOnChainScrollModeRef,
  nftMetadata,
  scrollNftMetadata,
  handleNFTSelect,
  sceneRef,
  cameraRef,
}: RingManagerProps) {
  const ringsRef = useRef<Map<number, ImageRing>>(new Map());
  const ringPoolRef = useRef<Map<string, ImageRing>>(new Map());
  const currentRingIndexRef = useRef(0);

  // Function to create a ring
  const createRing = useCallback(
    (index: number): ImageRing => {
      // Get the current mode from the refs
      const currentIsOnChainMode = isOnChainModeRef.current;
      const currentIsScrollMode = isOnChainScrollModeRef.current;

      // Get the appropriate NFT metadata based on the current mode
      const currentNftMetadata = currentIsScrollMode
        ? scrollNftMetadata
        : currentIsOnChainMode
        ? nftMetadata
        : [];

      // Only log for every 10th ring or when in on-chain mode to reduce console spam
      const shouldLog = index % 10 === 0 || currentIsOnChainMode;

      if (shouldLog) {
        console.log(
          `Creating ring with index ${index}, mode: ${
            currentIsScrollMode
              ? "scroll"
              : currentIsOnChainMode
              ? "base"
              : "offchain"
          }, nftMetadata length: ${currentNftMetadata.length}`
        );
      }

      // Create a key for the ring pool based on the current mode
      const ringKey = `${index}-${
        currentIsScrollMode
          ? "scroll"
          : currentIsOnChainMode
          ? "base"
          : "offchain"
      }`;

      // Check if we have a ring in the pool
      if (ringPoolRef.current.has(ringKey)) {
        if (shouldLog) {
          console.log(`Reusing ring from pool: ${ringKey}`);
        }
        const ring = ringPoolRef.current.get(ringKey)!;

        // Reset the ring's animation state to ensure it's active
        ring.resetArrowSpeeds();
        ring.resetRotationSpeed();

        return ring;
      }

      // Create a new ring if not in pool
      let newRing: ImageRing;

      if (currentIsOnChainMode) {
        // Create ring with NFT metadata
        if (shouldLog) {
          console.log(
            `Creating ${
              currentIsScrollMode ? "scroll" : "base"
            } ring with NFT metadata`
          );
        }

        if (currentNftMetadata.length === 0) {
          console.error(
            `No NFT metadata available for ${
              currentIsScrollMode ? "scroll" : "base"
            } mode. This should not happen - NFTs should be loaded before creating rings.`
          );

          // Create a temporary ring with a warning texture
          // This is just for debugging and should never happen in production
          const imagePaths = Array(16)
            .fill(0)
            .map(() => "/error-no-nft-data.jpg");

          newRing = new ImageRing({
            angleOffset: 20 * index,
            imagePaths,
            yPosition: VERTICAL_OFFSET * index,
            depthOffset: DEPTH_OFFSET,
            isOdd: index % 2 === 0,
            onDoubleClick: handleNFTSelect,
            nftMetadata: undefined,
            darkMode: !currentIsScrollMode,
          });

          // Log the error for debugging
          console.warn(
            `Created error ring for ${ringKey} due to missing NFT metadata`
          );
        } else {
          // Only log for important rings to reduce console spam
          if (shouldLog) {
            console.log(
              `Using ${currentNftMetadata.length} NFTs for ring ${ringKey}`
            );
          }

          // Create the ring with the NFT metadata
          newRing = new ImageRing({
            angleOffset: 20 * index,
            imagePaths: Array(currentNftMetadata.length).fill(""), // Placeholder, not used
            yPosition: VERTICAL_OFFSET * index,
            depthOffset: DEPTH_OFFSET,
            isOdd: index % 2 === 0,
            onDoubleClick: handleNFTSelect,
            nftMetadata: currentNftMetadata,
            darkMode: !currentIsScrollMode, // Dark mode for Base, light mode for Scroll
          });

          // Log success for important rings
          if (shouldLog) {
            console.log(
              `Successfully created ${
                currentIsScrollMode ? "scroll" : "base"
              } ring with ${currentNftMetadata.length} NFTs`
            );
          }
        }
      } else {
        // Create regular ring with local images
        if (shouldLog) {
          console.log("Creating off-chain ring with local images");
        }
        const imagePaths = Array(16)
          .fill(0)
          .map((_, index) => `/image-${index + 1}.jpg`);
        newRing = new ImageRing({
          angleOffset: 20 * index,
          imagePaths,
          yPosition: VERTICAL_OFFSET * index,
          depthOffset: DEPTH_OFFSET,
          isOdd: index % 2 === 0,
          onDoubleClick: handleNFTSelect,
          nftMetadata: undefined,
          darkMode: false,
        });
      }

      // Store the ring in the pool for future reuse
      ringPoolRef.current.set(ringKey, newRing);

      return newRing;
    },
    [
      isOnChainModeRef,
      isOnChainScrollModeRef,
      nftMetadata,
      scrollNftMetadata,
      VERTICAL_OFFSET,
      DEPTH_OFFSET,
      handleNFTSelect,
    ]
  );

  // Helper function to replace all rings
  const replaceAllRings = useCallback(() => {
    if (!ringsRef.current) return;

    const rings = ringsRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (!scene || !camera) {
      console.error("Cannot replace rings: scene or camera is null");
      return;
    }

    console.log("Replacing all rings");

    // Get current camera position
    const cameraY = camera.position.y;
    const baseIndex = Math.floor(cameraY / VERTICAL_OFFSET);
    const startIndex = Math.max(baseIndex - VISIBLE_RINGS / 2, -1000);
    const endIndex = Math.min(baseIndex + VISIBLE_RINGS / 2, 1000);

    console.log(
      `Camera position: ${cameraY}, baseIndex: ${baseIndex}, startIndex: ${startIndex}, endIndex: ${endIndex}`
    );

    // Remove existing rings from scene (but don't dispose them)
    for (const ring of rings.values()) {
      scene.remove(ring.getGroup());
    }
    rings.clear();

    // Create new rings
    for (let i = startIndex; i < endIndex; i++) {
      try {
        const ring = createRing(i);
        rings.set(i, ring);
        scene.add(ring.getGroup());

        // Ensure animations are active
        ring.resetArrowSpeeds();
        ring.resetRotationSpeed();
      } catch (error) {
        console.error(`Error creating ring at index ${i}:`, error);
      }
    }

    currentRingIndexRef.current = baseIndex;

    // Force a render to ensure rings are visible
    if (scene && camera) {
      for (const ring of rings.values()) {
        ring.resetArrowSpeeds();
        ring.resetRotationSpeed();
      }
    }
  }, [VERTICAL_OFFSET, VISIBLE_RINGS, createRing, sceneRef, cameraRef]);

  // Check if all rings in a range exist
  const areRingsInRange = useCallback(
    (startIndex: number, endIndex: number): boolean => {
      for (let i = startIndex; i <= endIndex; i++) {
        if (!ringsRef.current.has(i)) {
          return false;
        }
      }
      return true;
    },
    [ringsRef]
  );

  // Function to update rings based on camera position
  const updateRings = useCallback(
    (cameraY: number) => {
      // Calculate the base index for the current camera position
      const baseIndex = Math.floor(cameraY / VERTICAL_OFFSET);

      // Calculate the range of visible rings
      const startIndex = Math.max(0, baseIndex - Math.floor(VISIBLE_RINGS / 2));
      const endIndex = startIndex + VISIBLE_RINGS - 1;

      // Only log for every 10th ring or when in on-chain mode to reduce console spam
      const shouldLog =
        baseIndex % 10 === 0 ||
        isOnChainModeRef.current ||
        isOnChainScrollModeRef.current;

      if (shouldLog) {
        console.log(
          `Updating rings: baseIndex=${baseIndex}, startIndex=${startIndex}, endIndex=${endIndex}, currentRingIndex=${currentRingIndexRef.current}`
        );
      }

      // Check if we need to update the rings
      if (
        baseIndex !== currentRingIndexRef.current ||
        !areRingsInRange(startIndex, endIndex)
      ) {
        // Update the current ring index
        currentRingIndexRef.current = baseIndex;

        // Remove rings that are no longer visible
        for (const [index, ring] of ringsRef.current.entries()) {
          if (index < startIndex || index > endIndex) {
            if (ring) {
              if (shouldLog) {
                console.log(`Removing ring at index ${index}`);
              }
              sceneRef.current?.remove(ring.getGroup());
              ring.dispose();
              ringsRef.current.delete(index);
            }
          }
        }

        // Add new rings that are now visible
        for (let i = startIndex; i <= endIndex; i++) {
          if (!ringsRef.current.has(i)) {
            if (shouldLog) {
              console.log(`Adding ring at index ${i}`);
            }
            const ring = createRing(i);
            ringsRef.current.set(i, ring);
            sceneRef.current?.add(ring.getGroup());
          }
        }
      }
    },
    [
      VERTICAL_OFFSET,
      VISIBLE_RINGS,
      areRingsInRange,
      createRing,
      currentRingIndexRef,
      isOnChainModeRef,
      isOnChainScrollModeRef,
      ringsRef,
      sceneRef,
    ]
  );

  // Function to update rings directly (used by worker)
  const updateRingsDirectly = useCallback(
    (baseIndex: number, startIndex: number, endIndex: number) => {
      // Only log for every 10th ring or when in on-chain mode to reduce console spam
      const shouldLog =
        baseIndex % 10 === 0 ||
        isOnChainModeRef.current ||
        isOnChainScrollModeRef.current;

      if (shouldLog) {
        console.log(
          `Directly updating rings: baseIndex=${baseIndex}, startIndex=${startIndex}, endIndex=${endIndex}`
        );
      }

      // Update the current ring index
      currentRingIndexRef.current = baseIndex;

      // Remove rings that are no longer visible
      for (const [index, ring] of ringsRef.current.entries()) {
        if (index < startIndex || index > endIndex) {
          if (ring) {
            if (shouldLog) {
              console.log(`Removing ring at index ${index}`);
            }
            sceneRef.current?.remove(ring.getGroup());
            ring.dispose();
            ringsRef.current.delete(index);
          }
        }
      }

      // Add new rings that are now visible
      for (let i = startIndex; i <= endIndex; i++) {
        if (!ringsRef.current.has(i)) {
          if (shouldLog) {
            console.log(`Adding ring at index ${i}`);
          }
          const ring = createRing(i);
          ringsRef.current.set(i, ring);
          sceneRef.current?.add(ring.getGroup());
        }
      }
    },
    [
      createRing,
      currentRingIndexRef,
      isOnChainModeRef,
      isOnChainScrollModeRef,
      ringsRef,
      sceneRef,
    ]
  );

  // Update all rings with the calculated speed
  const updateRingAnimations = useCallback(
    (speed: number) => {
      if (!ringsRef.current) return;

      const camera = cameraRef.current;
      if (!camera) return;

      // Update all rings with the calculated speed
      // Only update rings that are potentially visible (performance optimization)
      const cameraPosition = camera.position;
      for (const [index, ring] of ringsRef.current.entries()) {
        if (ring) {
          const ringY = VERTICAL_OFFSET * index;
          const distanceFromCamera = Math.abs(ringY - cameraPosition.y);

          // Only update rings that are close to the camera
          if (distanceFromCamera < VISIBLE_RINGS * VERTICAL_OFFSET * 0.5) {
            ring.update(speed);
          }
        }
      }
    },
    [VERTICAL_OFFSET, VISIBLE_RINGS, cameraRef]
  );

  // Cleanup function to dispose all rings
  const disposeAllRings = useCallback(() => {
    if (!ringsRef.current) return;

    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up rings
    for (const ring of ringsRef.current.values()) {
      scene.remove(ring.getGroup());
    }

    // Dispose all rings in the pool
    for (const ring of ringPoolRef.current.values()) {
      ring.dispose();
    }

    ringPoolRef.current.clear();
    ringsRef.current.clear();
  }, [sceneRef]);

  return {
    ringsRef,
    ringPoolRef,
    currentRingIndexRef,
    createRing,
    replaceAllRings,
    updateRings,
    updateRingsDirectly,
    updateRingAnimations,
    disposeAllRings,
  };
}
