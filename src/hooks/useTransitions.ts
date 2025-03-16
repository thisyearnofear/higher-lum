import { useCallback, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { NFTMetadata } from "@/types/nft-types";
import { fetchNFTsFromGrove } from "@/services/nftService";
import {
  COLLECTION_ADDRESS,
  SCROLLIFY_ORIGINALS_ADDRESS,
} from "@/config/nft-config";

type TransitionHookProps = {
  replaceAllRings: () => void;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  isOnChainModeRef: React.MutableRefObject<boolean>;
  isOnChainScrollModeRef: React.MutableRefObject<boolean>;
  setIsOnChainMode: (value: boolean) => void;
  setIsOnChainScrollMode: (value: boolean) => void;
  nftMetadata: NFTMetadata[];
  setNftMetadata: (nfts: NFTMetadata[]) => void;
  scrollNftMetadata: NFTMetadata[];
  setScrollNftMetadata: (nfts: NFTMetadata[]) => void;
};

// Cache keys for localStorage
const BASE_NFTS_CACHE_KEY = "higher-base-nfts-cache";
const SCROLL_NFTS_CACHE_KEY = "higher-scroll-nfts-cache";
const CACHE_TIMESTAMP_KEY = "higher-nfts-cache-timestamp";
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function useTransitions({
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
}: TransitionHookProps) {
  const [isHigherLoading, setIsHigherLoading] = useState(false);
  const [transitionLoadingProgress, setTransitionLoadingProgress] = useState(0);
  const transitionInProgressRef = useRef(false);
  const nftLoadAttemptedRef = useRef(false);
  const scrollNftLoadAttemptedRef = useRef(false);

  // Helper function to update progress incrementally
  const updateProgressIncremental = useCallback(
    (startValue: number, endValue: number, duration: number) => {
      const startTime = Date.now();

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.floor(
          startValue + (endValue - startValue) * progress
        );

        setTransitionLoadingProgress(currentValue);

        if (progress < 1) {
          requestAnimationFrame(updateProgress);
        }
      };

      updateProgress();
    },
    []
  );

  // Helper function to save NFTs to cache
  const saveNFTsToCache = useCallback((key: string, nfts: NFTMetadata[]) => {
    try {
      if (!nfts || nfts.length === 0) {
        console.warn(`Attempted to cache empty NFT array with key: ${key}`);
        return;
      }

      // Stringify the NFTs with a limit on size to prevent localStorage issues
      const nftsString = JSON.stringify(nfts);

      // Check if the data is too large (localStorage typically has a 5MB limit)
      if (nftsString.length > 4 * 1024 * 1024) {
        // 4MB safety limit
        console.warn(
          `NFT data for ${key} is too large for localStorage (${(
            nftsString.length /
            (1024 * 1024)
          ).toFixed(2)}MB), skipping cache`
        );
        return;
      }

      localStorage.setItem(key, nftsString);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log(`Saved ${nfts.length} NFTs to cache with key: ${key}`);
    } catch (error) {
      console.error(`Error saving NFTs to cache: ${error}`);

      // If we hit a quota error, try to clear old caches
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        try {
          console.log("Clearing old caches due to quota exceeded");
          localStorage.removeItem(key);
          // Don't clear timestamp as other caches might still be valid
        } catch (clearError) {
          console.error(
            `Failed to clear cache after quota error: ${clearError}`
          );
        }
      }
    }
  }, []);

  // Helper function to load NFTs from cache
  const loadNFTsFromCache = useCallback(
    (key: string, ignoreExpiry = false): NFTMetadata[] | null => {
      try {
        const cachedData = localStorage.getItem(key);
        if (!cachedData) {
          console.log(`No cached data found for key: ${key}`);
          return null;
        }

        const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        if (!timestamp) {
          console.log(`No timestamp found for cached data with key: ${key}`);
          return null;
        }

        // Check if cache is expired (unless we're ignoring expiry)
        if (!ignoreExpiry) {
          const cacheTime = parseInt(timestamp, 10);
          const now = Date.now();
          if (now - cacheTime > CACHE_EXPIRY_TIME) {
            console.log(`Cache expired for key: ${key}, will fetch fresh data`);
            return null;
          }
        }

        const nfts = JSON.parse(cachedData) as NFTMetadata[];
        console.log(
          `Loaded ${nfts.length} NFTs from cache with key: ${key}${
            ignoreExpiry ? " (ignoring expiry)" : ""
          }`
        );
        return nfts;
      } catch (error) {
        console.error(`Error loading NFTs from cache: ${error}`);
        return null;
      }
    },
    []
  );

  // Function to preload Base NFTs with improved caching
  const preloadBaseNFTs = useCallback(
    async (forceRefresh = false) => {
      // If we already have NFTs loaded and not forcing a refresh, no need to reload
      if (nftMetadata.length > 0 && !forceRefresh) {
        console.log("Base NFTs already loaded in memory, skipping fetch");
        updateProgressIncremental(1, 100, 1000);
        return;
      }

      // Mark that we've attempted to load NFTs
      nftLoadAttemptedRef.current = true;

      console.log(
        `Loading Base NFTs for transition... ${
          forceRefresh ? "(forced refresh)" : ""
        }`
      );
      setTransitionLoadingProgress(1);

      // Start incremental progress update from 1% to 40%
      updateProgressIncremental(1, 40, 1000);

      // Try to load from cache first if not forcing a refresh
      if (!forceRefresh) {
        const cachedNFTs = loadNFTsFromCache(BASE_NFTS_CACHE_KEY);
        if (cachedNFTs && cachedNFTs.length > 0) {
          console.log("Using cached Base NFTs");
          setNftMetadata(cachedNFTs);
          updateProgressIncremental(40, 100, 500);

          // Wait for state update to propagate
          await new Promise<void>((resolve) => {
            // Use a small timeout to ensure the state update has been processed
            setTimeout(() => {
              console.log(
                `State updated with ${cachedNFTs.length} cached Base NFTs`
              );
              resolve();
            }, 50);
          });

          return;
        }
      } else {
        console.log("Bypassing cache for forced refresh");
      }

      // If not in cache or forcing refresh, fetch from API
      try {
        console.log("Fetching Base NFTs from API");
        const baseNFTs = await fetchNFTsFromGrove(
          COLLECTION_ADDRESS,
          84532,
          "ERC721"
        );

        // Update progress from 40% to 80%
        updateProgressIncremental(40, 80, 500);

        if (baseNFTs.length > 0) {
          // Save to state and cache
          setNftMetadata(baseNFTs);
          saveNFTsToCache(BASE_NFTS_CACHE_KEY, baseNFTs);
          console.log("Base NFTs loaded successfully:", baseNFTs.length);
          updateProgressIncremental(80, 100, 500);

          // Wait for state update to propagate
          await new Promise<void>((resolve) => {
            // Use a small timeout to ensure the state update has been processed
            setTimeout(() => {
              console.log(
                `State updated with ${baseNFTs.length} fetched Base NFTs`
              );
              resolve();
            }, 50);
          });

          return;
        } else {
          console.error("No Base NFTs were returned from fetchNFTsFromGrove");

          // Try to use previously cached NFTs even if they're expired, but not if forcing refresh
          if (!forceRefresh) {
            const oldCachedNFTs = loadNFTsFromCache(BASE_NFTS_CACHE_KEY, true); // true = ignore expiry
            if (oldCachedNFTs && oldCachedNFTs.length > 0) {
              console.log("Using expired cached Base NFTs as fallback");
              setNftMetadata(oldCachedNFTs);
              updateProgressIncremental(80, 100, 500);

              // Wait for state update to propagate
              await new Promise<void>((resolve) => {
                // Use a small timeout to ensure the state update has been processed
                setTimeout(() => {
                  console.log(
                    `State updated with ${oldCachedNFTs.length} expired cached Base NFTs`
                  );
                  resolve();
                }, 50);
              });

              return;
            }
          }

          throw new Error("No Base NFTs available and no cache found");
        }
      } catch (error) {
        console.error("Error loading Base NFTs:", error);

        // Try to use previously cached NFTs even if they're expired
        const oldCachedNFTs = loadNFTsFromCache(BASE_NFTS_CACHE_KEY, true); // true = ignore expiry
        if (oldCachedNFTs && oldCachedNFTs.length > 0) {
          console.log("Using expired cached Base NFTs as fallback after error");
          setNftMetadata(oldCachedNFTs);
          updateProgressIncremental(80, 100, 500);

          // Wait for state update to propagate
          await new Promise<void>((resolve) => {
            // Use a small timeout to ensure the state update has been processed
            setTimeout(() => {
              console.log(
                `State updated with ${oldCachedNFTs.length} expired cached Base NFTs after error`
              );
              resolve();
            }, 50);
          });

          return;
        }

        // If all else fails, throw an error to prevent transition
        throw new Error("Failed to load Base NFTs and no cache found");
      }
    },
    [
      nftMetadata.length,
      setNftMetadata,
      updateProgressIncremental,
      loadNFTsFromCache,
      saveNFTsToCache,
    ]
  );

  // Function to preload Scroll NFTs with improved caching
  const preloadScrollNFTs = useCallback(
    async (forceRefresh = false) => {
      // If we already have NFTs loaded and not forcing a refresh, no need to reload
      if (scrollNftMetadata.length > 0 && !forceRefresh) {
        console.log("Scroll NFTs already loaded in memory, skipping fetch");
        updateProgressIncremental(1, 100, 1000);
        return;
      }

      // Mark that we've attempted to load Scroll NFTs
      scrollNftLoadAttemptedRef.current = true;

      console.log(
        `Loading Scroll NFTs for transition... ${
          forceRefresh ? "(forced refresh)" : ""
        }`
      );
      setTransitionLoadingProgress(1);

      // Start incremental progress update from 1% to 40%
      updateProgressIncremental(1, 40, 1000);

      // Try to load from cache first if not forcing a refresh
      if (!forceRefresh) {
        const cachedNFTs = loadNFTsFromCache(SCROLL_NFTS_CACHE_KEY);
        if (cachedNFTs && cachedNFTs.length > 0) {
          console.log("Using cached Scroll NFTs");
          setScrollNftMetadata(cachedNFTs);
          updateProgressIncremental(40, 100, 500);

          // Wait for state update to propagate
          await new Promise<void>((resolve) => {
            // Use a small timeout to ensure the state update has been processed
            setTimeout(() => {
              console.log(
                `State updated with ${cachedNFTs.length} cached Scroll NFTs`
              );
              resolve();
            }, 50);
          });

          return;
        }
      } else {
        console.log("Bypassing cache for forced refresh");
      }

      // If not in cache, fetch from API
      try {
        console.log("Fetching Scroll NFTs from API");
        const scrollNFTs = await fetchNFTsFromGrove(
          SCROLLIFY_ORIGINALS_ADDRESS,
          534351,
          "ERC721"
        );

        // Update progress from 40% to 80%
        updateProgressIncremental(40, 80, 500);

        if (scrollNFTs.length > 0) {
          // Save to state and cache
          setScrollNftMetadata(scrollNFTs);
          saveNFTsToCache(SCROLL_NFTS_CACHE_KEY, scrollNFTs);
          console.log("Scroll NFTs loaded successfully:", scrollNFTs.length);
          updateProgressIncremental(80, 100, 500);

          // Wait for state update to propagate
          await new Promise<void>((resolve) => {
            // Use a small timeout to ensure the state update has been processed
            setTimeout(() => {
              console.log(
                `State updated with ${scrollNFTs.length} fetched Scroll NFTs`
              );
              resolve();
            }, 50);
          });

          return;
        } else {
          console.error("No Scroll NFTs were returned from fetchNFTsFromGrove");

          // Try to use previously cached NFTs even if they're expired, but not if forcing refresh
          if (!forceRefresh) {
            const oldCachedNFTs = loadNFTsFromCache(
              SCROLL_NFTS_CACHE_KEY,
              true
            ); // true = ignore expiry
            if (oldCachedNFTs && oldCachedNFTs.length > 0) {
              console.log("Using expired cached Scroll NFTs as fallback");
              setScrollNftMetadata(oldCachedNFTs);
              updateProgressIncremental(80, 100, 500);

              // Wait for state update to propagate
              await new Promise<void>((resolve) => {
                // Use a small timeout to ensure the state update has been processed
                setTimeout(() => {
                  console.log(
                    `State updated with ${oldCachedNFTs.length} expired cached Scroll NFTs`
                  );
                  resolve();
                }, 50);
              });

              return;
            }
          }

          throw new Error("No Scroll NFTs available and no cache found");
        }
      } catch (error) {
        console.error("Error loading Scroll NFTs:", error);

        // Try to use previously cached NFTs even if they're expired
        const oldCachedNFTs = loadNFTsFromCache(SCROLL_NFTS_CACHE_KEY, true); // true = ignore expiry
        if (oldCachedNFTs && oldCachedNFTs.length > 0) {
          console.log(
            "Using expired cached Scroll NFTs as fallback after error"
          );
          setScrollNftMetadata(oldCachedNFTs);
          updateProgressIncremental(80, 100, 500);

          // Wait for state update to propagate
          await new Promise<void>((resolve) => {
            // Use a small timeout to ensure the state update has been processed
            setTimeout(() => {
              console.log(
                `State updated with ${oldCachedNFTs.length} expired cached Scroll NFTs after error`
              );
              resolve();
            }, 50);
          });

          return;
        }

        // If all else fails, throw an error to prevent transition
        throw new Error("Failed to load Scroll NFTs and no cache found");
      }
    },
    [
      scrollNftMetadata.length,
      setScrollNftMetadata,
      updateProgressIncremental,
      loadNFTsFromCache,
      saveNFTsToCache,
    ]
  );

  // Add a new helper function to preload images
  const preloadImages = useCallback(
    async (nfts: NFTMetadata[], progressStart: number, progressEnd: number) => {
      if (nfts.length === 0) return;

      console.log(`Preloading ${nfts.length} images...`);

      // Create an array to track loading progress
      const totalImages = nfts.length;
      let loadedImages = 0;

      // Function to update progress as images load
      const updateImageProgress = () => {
        loadedImages++;
        const progressPercent = loadedImages / totalImages;
        const currentProgress = Math.floor(
          progressStart + (progressEnd - progressStart) * progressPercent
        );
        setTransitionLoadingProgress(currentProgress);
        console.log(
          `Image preload progress: ${loadedImages}/${totalImages} (${currentProgress}%)`
        );
      };

      // Preload images in batches to avoid overwhelming the browser
      const batchSize = 5;
      const batches = Math.ceil(nfts.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const startIdx = i * batchSize;
        const endIdx = Math.min(startIdx + batchSize, nfts.length);
        const batchNfts = nfts.slice(startIdx, endIdx);

        // Create an array of promises for this batch
        const batchPromises = batchNfts.map((nft) => {
          return new Promise<void>((resolve) => {
            const img = new Image();

            img.onload = () => {
              updateImageProgress();
              resolve();
            };

            img.onerror = () => {
              console.warn(`Failed to preload image for NFT ${nft.id}`);
              updateImageProgress();
              resolve(); // Resolve anyway to continue the process
            };

            // Get the image URL from the NFT
            let imageUrl = nft.image;

            // Handle IPFS URLs
            if (imageUrl && imageUrl.startsWith("ipfs://")) {
              imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
            }

            // Set the source to start loading
            img.src = imageUrl;
          });
        });

        // Wait for this batch to complete before moving to the next
        await Promise.all(batchPromises);
      }

      console.log("Image preloading complete");
    },
    []
  );

  // Function to transition back to off-chain mode
  const transitionToOffChain = useCallback(async () => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    setIsHigherLoading(true);

    console.log("Transitioning back to off-chain mode");

    // Start incremental progress update
    updateProgressIncremental(1, 50, 300);

    // Change background color with transition
    if (sceneRef.current) {
      const startColor = sceneRef.current.background as THREE.Color;
      const endColor = new THREE.Color(0xffffff); // White for off-chain
      const duration = 800; // Reduced from 1000ms
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

        // Update loading progress based on color transition
        const progressValue = Math.floor(50 + progress * 30);
        setTransitionLoadingProgress(progressValue);

        if (progress < 1) {
          requestAnimationFrame(animateBackgroundColor);
        } else {
          // Update mode flags and state simultaneously
          isOnChainModeRef.current = false;
          isOnChainScrollModeRef.current = false;
          setIsOnChainMode(false);
          setIsOnChainScrollMode(false);

          // Replace rings immediately after mode change
          replaceAllRings();

          // Update progress to completion
          setTransitionLoadingProgress(100);

          // Complete the transition
          setTimeout(() => {
            transitionInProgressRef.current = false;
            setIsHigherLoading(false);
          }, 100);
        }
      };

      animateBackgroundColor();
    }
  }, [
    updateProgressIncremental,
    sceneRef,
    setIsOnChainMode,
    setIsOnChainScrollMode,
    replaceAllRings,
  ]);

  // Function to transition to on-chain experience (Base NFTs)
  const transitionToOnChain = useCallback(async () => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    setIsHigherLoading(true);

    console.log("Transitioning to Base NFT mode");

    try {
      // Start loading NFTs first - this will throw if NFTs can't be loaded
      await preloadBaseNFTs();

      // Verify we have NFTs before proceeding
      if (nftMetadata.length === 0) {
        console.log(
          "nftMetadata is still empty after preloading, checking again..."
        );

        // Try one more time with a small delay to ensure state updates have propagated
        await new Promise((resolve) => setTimeout(resolve, 100));

        // If still empty, throw an error
        if (nftMetadata.length === 0) {
          throw new Error("Base NFTs failed to load");
        }
      }

      console.log(
        `Successfully loaded ${nftMetadata.length} Base NFTs, proceeding with transition`
      );

      // Update progress to 60%
      setTransitionLoadingProgress(60);

      // Preload images before starting the visual transition
      await preloadImages(nftMetadata, 60, 80);

      // Update progress to 80%
      setTransitionLoadingProgress(80);

      // Change background color with transition
      if (sceneRef.current) {
        const startColor = new THREE.Color(0xffffff); // White for off-chain
        const endColor = new THREE.Color(0x000000); // Black for Base
        const duration = 1000;
        const startTime = Date.now();

        const animateBackgroundColor = async () => {
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

          // Update loading progress based on color transition
          const progressValue = Math.floor(80 + progress * 15);
          setTransitionLoadingProgress(progressValue);

          if (progress < 1) {
            requestAnimationFrame(animateBackgroundColor);
          } else {
            // Update mode flags
            isOnChainModeRef.current = true;
            isOnChainScrollModeRef.current = false;

            // Update progress to 95%
            setTransitionLoadingProgress(95);

            // Set state values after a small delay to ensure refs are updated first
            setTimeout(() => {
              setIsOnChainMode(true);
              setIsOnChainScrollMode(false);

              // Replace all rings with Base NFT rings
              replaceAllRings();

              // Final progress update
              setTransitionLoadingProgress(100);

              // Complete the transition after a small delay
              setTimeout(() => {
                transitionInProgressRef.current = false;
                setIsHigherLoading(false);
              }, 200);
            }, 50);
          }
        };

        animateBackgroundColor();
      }
    } catch (error) {
      console.error("Failed to transition to Base mode:", error);
      transitionInProgressRef.current = false;
      setIsHigherLoading(false);
      setTransitionLoadingProgress(0);

      // Show an error message to the user
      alert("Failed to load NFTs. Please check your connection and try again.");
    }
  }, [
    preloadBaseNFTs,
    preloadImages,
    replaceAllRings,
    sceneRef,
    isOnChainModeRef,
    isOnChainScrollModeRef,
    setIsOnChainMode,
    setIsOnChainScrollMode,
    nftMetadata,
  ]);

  // Function to transition to Scroll mode
  const transitionToScrollMode = useCallback(async () => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    setIsHigherLoading(true);

    console.log("Transitioning to Scroll NFT mode");

    try {
      // Start loading NFTs first - this will throw if NFTs can't be loaded
      await preloadScrollNFTs();

      // Verify we have NFTs before proceeding
      if (scrollNftMetadata.length === 0) {
        console.log(
          "scrollNftMetadata is still empty after preloading, checking again..."
        );

        // Try one more time with a small delay to ensure state updates have propagated
        await new Promise((resolve) => setTimeout(resolve, 100));

        // If still empty, throw an error
        if (scrollNftMetadata.length === 0) {
          throw new Error("Scroll NFTs failed to load");
        }
      }

      console.log(
        `Successfully loaded ${scrollNftMetadata.length} Scroll NFTs, proceeding with transition`
      );

      // Update progress to 60%
      setTransitionLoadingProgress(60);

      // Preload images before starting the visual transition
      await preloadImages(scrollNftMetadata, 60, 80);

      // Update progress to 80%
      setTransitionLoadingProgress(80);

      // Change background color with transition
      if (sceneRef.current) {
        const startColor = new THREE.Color(0x000000); // Black for Base
        const endColor = new THREE.Color(0xffd700); // Gold for Scroll
        const duration = 1000;
        const startTime = Date.now();

        const animateBackgroundColor = async () => {
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

          // Update loading progress based on color transition
          const progressValue = Math.floor(80 + progress * 15);
          setTransitionLoadingProgress(progressValue);

          if (progress < 1) {
            requestAnimationFrame(animateBackgroundColor);
          } else {
            // Update mode flags
            isOnChainModeRef.current = true;
            isOnChainScrollModeRef.current = true;

            // Update progress to 95%
            setTransitionLoadingProgress(95);

            // Set state values after a small delay to ensure refs are updated first
            setTimeout(() => {
              setIsOnChainMode(true);
              setIsOnChainScrollMode(true);

              // Replace all rings with Scroll NFT rings
              replaceAllRings();

              // Final progress update
              setTransitionLoadingProgress(100);

              // Complete the transition after a small delay
              setTimeout(() => {
                transitionInProgressRef.current = false;
                setIsHigherLoading(false);
              }, 200);
            }, 50);
          }
        };

        animateBackgroundColor();
      }
    } catch (error) {
      console.error("Failed to transition to Scroll mode:", error);
      transitionInProgressRef.current = false;
      setIsHigherLoading(false);
      setTransitionLoadingProgress(0);

      // Show an error message to the user
      alert(
        "Failed to load Scroll NFTs. Please check your connection and try again."
      );
    }
  }, [
    preloadScrollNFTs,
    preloadImages,
    replaceAllRings,
    sceneRef,
    isOnChainModeRef,
    isOnChainScrollModeRef,
    setIsOnChainMode,
    setIsOnChainScrollMode,
    scrollNftMetadata,
  ]);

  // Function to transition back to Base mode from Scroll
  const transitionToBase = useCallback(async () => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    setIsHigherLoading(true);

    console.log("Transitioning back to Base mode from Scroll");

    // Start incremental progress update
    updateProgressIncremental(1, 50, 500);

    if (sceneRef.current) {
      // Animate from gold (Scroll) to black (Base)
      const startColor = new THREE.Color(0xffd700);
      const endColor = new THREE.Color(0x000000);
      const duration = 1000;
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

        // Update loading progress based on color transition
        const progressValue = Math.floor(50 + progress * 40);
        setTransitionLoadingProgress(progressValue);

        if (progress < 1) {
          requestAnimationFrame(animateBackgroundColor);
        } else {
          // First transition to Base mode
          isOnChainScrollModeRef.current = false;

          // Update progress to 95%
          setTransitionLoadingProgress(95);

          // Set state values after a small delay to ensure refs are updated first
          setTimeout(() => {
            setIsOnChainScrollMode(false);
            isOnChainModeRef.current = true;
            setIsOnChainMode(true);

            // Force replace all visible rings with Base NFTs
            replaceAllRings();

            // Final progress update
            setTransitionLoadingProgress(100);

            // Complete the transition after a small delay
            setTimeout(() => {
              transitionInProgressRef.current = false;
              setIsHigherLoading(false);

              // Wait a bit longer before transitioning to off-chain
              setTimeout(async () => {
                await transitionToOffChain();
              }, 1000);
            }, 200);
          }, 50);
        }
      };

      animateBackgroundColor();
    }
  }, [
    replaceAllRings,
    sceneRef,
    isOnChainModeRef,
    isOnChainScrollModeRef,
    setIsOnChainMode,
    setIsOnChainScrollMode,
    transitionToOffChain,
    updateProgressIncremental,
  ]);

  // Function to handle mode transitions
  const transitionToNextMode = useCallback(async () => {
    if (transitionInProgressRef.current) return;

    const currentMode = isOnChainScrollModeRef.current
      ? "scroll"
      : isOnChainModeRef.current
      ? "base"
      : "offchain";

    console.log(`Current mode: ${currentMode}`);

    switch (currentMode) {
      case "offchain":
        // Forward: Off-chain -> Base
        await transitionToOnChain();
        break;
      case "base":
        // Forward: Base -> Scroll
        await transitionToScrollMode();
        break;
      case "scroll":
        // Backward: Scroll -> Base -> Off-chain
        await transitionToBase();
        break;
    }
  }, [transitionToOnChain, transitionToScrollMode, transitionToBase]);

  // Function to get current mode
  const getCurrentMode = useCallback(() => {
    if (isOnChainScrollModeRef.current) return "scroll";
    if (isOnChainModeRef.current) return "base";
    return "offchain";
  }, [isOnChainModeRef, isOnChainScrollModeRef]);

  // Try to preload NFTs from cache on initialization
  useEffect(() => {
    const preloadFromCache = async () => {
      // Only try to preload once
      if (nftLoadAttemptedRef.current && scrollNftLoadAttemptedRef.current)
        return;

      // Try to load Base NFTs from cache
      if (nftMetadata.length === 0 && !nftLoadAttemptedRef.current) {
        nftLoadAttemptedRef.current = true;
        const cachedBaseNFTs = loadNFTsFromCache(BASE_NFTS_CACHE_KEY);
        if (cachedBaseNFTs && cachedBaseNFTs.length > 0) {
          console.log("Preloaded Base NFTs from cache on init");
          setNftMetadata(cachedBaseNFTs);
        }
      }

      // Try to load Scroll NFTs from cache
      if (
        scrollNftMetadata.length === 0 &&
        !scrollNftLoadAttemptedRef.current
      ) {
        scrollNftLoadAttemptedRef.current = true;
        const cachedScrollNFTs = loadNFTsFromCache(SCROLL_NFTS_CACHE_KEY);
        if (cachedScrollNFTs && cachedScrollNFTs.length > 0) {
          console.log("Preloaded Scroll NFTs from cache on init");
          setScrollNftMetadata(cachedScrollNFTs);
        }
      }
    };

    preloadFromCache();
  }, [
    nftMetadata.length,
    scrollNftMetadata.length,
    setNftMetadata,
    setScrollNftMetadata,
    loadNFTsFromCache,
  ]);

  return {
    isHigherLoading,
    setIsHigherLoading,
    transitionLoadingProgress,
    transitionInProgressRef,
    transitionToNextMode,
    getCurrentMode,
    preloadBaseNFTs,
    preloadScrollNFTs,
  };
}
