/**
 * Worker Manager for handling web worker lifecycle and communication
 */

// Define the worker response types
type WorkerResponse = {
  type: "positionsCalculated" | "ringsUpdateCalculated";
  data: PositionsResponseData | RingsUpdateResponseData;
};

// Define response data types
type PositionsResponseData = {
  startIndex: number;
  endIndex: number;
  needsUpdate: boolean;
  baseIndex: number;
};

type RingsUpdateResponseData = {
  startIndex?: number;
  endIndex?: number;
  needsUpdate: boolean;
  baseIndex?: number;
};

// Define the callback types
type PositionsCallback = (data: PositionsResponseData) => void;

type RingsUpdateCallback = (data: RingsUpdateResponseData) => void;

export class WorkerManager {
  private worker: Worker | null = null;
  private positionsCallback: PositionsCallback | null = null;
  private ringsUpdateCallback: RingsUpdateCallback | null = null;
  private isSupported: boolean = false;

  constructor() {
    // Check if web workers are supported
    this.isSupported =
      typeof Worker !== "undefined" && typeof window !== "undefined";

    if (this.isSupported) {
      this.initWorker();
    } else {
      console.warn("Web Workers are not supported in this environment.");
    }
  }

  /**
   * Initialize the web worker
   */
  private initWorker() {
    try {
      // Create a new worker using dynamic import
      if (typeof window !== "undefined") {
        // Use a more compatible approach for creating workers
        const workerUrl = "/workers/ring-worker.js";
        console.log("Initializing worker with URL:", workerUrl);

        try {
          // Check if the worker file exists before creating it
          fetch(workerUrl)
            .then((response) => {
              if (!response.ok) {
                console.error(
                  `Worker file not found or not accessible: ${workerUrl}, status: ${response.status}`
                );
                this.isSupported = false;
                return;
              }

              // Create worker only if the file exists
              try {
                this.worker = new Worker(workerUrl);

                // Set up message handler
                this.worker.onmessage = this.handleWorkerMessage.bind(this);

                // Set up error handler with more detailed logging
                this.worker.onerror = (error) => {
                  console.error("Worker error:", {
                    message: error.message || "Unknown error",
                    filename: error.filename,
                    lineno: error.lineno,
                    colno: error.colno,
                    error: JSON.stringify(error),
                  });

                  // If there's an error with the worker, mark it as not supported
                  this.isSupported = false;

                  // Attempt to reinitialize the worker after a delay
                  if (this.worker) {
                    try {
                      this.worker.terminate();
                    } catch (e) {
                      console.warn("Error terminating worker:", e);
                    }
                    this.worker = null;

                    // Try to reinitialize after a delay
                    setTimeout(() => {
                      console.log(
                        "Attempting to reinitialize worker after error"
                      );
                      this.initWorker();
                    }, 2000);
                  }
                };

                console.log("Ring worker initialized successfully");
              } catch (workerCreationError) {
                console.error("Error creating worker:", workerCreationError);
                this.isSupported = false;
              }
            })
            .catch((fetchError) => {
              console.error("Error fetching worker file:", fetchError);
              this.isSupported = false;
            });
        } catch (workerError) {
          console.error("Error setting up worker:", workerError);
          this.isSupported = false;
          this.worker = null;
        }
      }
    } catch (error) {
      console.error("Failed to initialize worker:", error);
      this.isSupported = false;
      this.worker = null;
    }
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
    const { type, data } = event.data;

    switch (type) {
      case "positionsCalculated":
        if (this.positionsCallback) {
          this.positionsCallback(data as PositionsResponseData);
        }
        break;
      case "ringsUpdateCalculated":
        if (this.ringsUpdateCallback) {
          this.ringsUpdateCallback(data as RingsUpdateResponseData);
        }
        break;
      default:
        console.warn("Unknown message type from worker:", type);
    }
  }

  /**
   * Calculate ring positions using the worker
   */
  public calculatePositions(
    baseIndex: number,
    visibleRings: number,
    verticalOffset: number,
    currentRingIndex: number,
    callback: PositionsCallback
  ) {
    // Store the callback
    this.positionsCallback = callback;

    if (this.isSupported && this.worker) {
      try {
        // Send message to worker
        this.worker.postMessage({
          type: "calculatePositions",
          data: {
            baseIndex,
            visibleRings,
            verticalOffset,
            currentRingIndex,
          },
        });
      } catch (error) {
        console.error("Error sending message to worker:", error);
        // Fall back to synchronous calculation
        this.calculatePositionsFallback(
          baseIndex,
          visibleRings,
          currentRingIndex,
          callback
        );
      }
    } else {
      // Fallback to synchronous calculation
      this.calculatePositionsFallback(
        baseIndex,
        visibleRings,
        currentRingIndex,
        callback
      );
    }
  }

  /**
   * Fallback method for calculating positions synchronously
   */
  private calculatePositionsFallback(
    baseIndex: number,
    visibleRings: number,
    currentRingIndex: number,
    callback: PositionsCallback
  ) {
    console.log("Using fallback synchronous calculation for positions");
    const startIndex = baseIndex - visibleRings / 2;
    const endIndex = baseIndex + visibleRings / 2;
    const safeStartIndex = Math.max(startIndex, -1000);
    const safeEndIndex = Math.min(endIndex, 1000);
    const needsUpdate =
      Math.abs(baseIndex - currentRingIndex) > visibleRings / 4;

    // Call the callback directly
    callback({
      startIndex: safeStartIndex,
      endIndex: safeEndIndex,
      needsUpdate,
      baseIndex,
    });
  }

  /**
   * Calculate ring updates using the worker
   */
  public updateRings(
    cameraY: number,
    verticalOffset: number,
    visibleRings: number,
    currentRingIndex: number,
    callback: RingsUpdateCallback
  ) {
    // Store the callback
    this.ringsUpdateCallback = callback;

    if (this.isSupported && this.worker) {
      try {
        // Send message to worker
        this.worker.postMessage({
          type: "updateRings",
          data: {
            cameraY,
            verticalOffset,
            visibleRings,
            currentRingIndex,
          },
        });
      } catch (error) {
        console.error("Error sending message to worker:", error);
        // Fall back to synchronous calculation
        this.updateRingsFallback(
          cameraY,
          verticalOffset,
          visibleRings,
          currentRingIndex,
          callback
        );
      }
    } else {
      // Fallback to synchronous calculation
      this.updateRingsFallback(
        cameraY,
        verticalOffset,
        visibleRings,
        currentRingIndex,
        callback
      );
    }
  }

  /**
   * Fallback method for calculating ring updates synchronously
   */
  private updateRingsFallback(
    cameraY: number,
    verticalOffset: number,
    visibleRings: number,
    currentRingIndex: number,
    callback: RingsUpdateCallback
  ) {
    console.log("Using fallback synchronous calculation for ring updates");
    const baseIndex = Math.floor(cameraY / verticalOffset);
    const needsUpdate =
      Math.abs(baseIndex - currentRingIndex) > visibleRings / 4;

    if (needsUpdate) {
      const startIndex = baseIndex - visibleRings / 2;
      const endIndex = baseIndex + visibleRings / 2;
      const safeStartIndex = Math.max(startIndex, -1000);
      const safeEndIndex = Math.min(endIndex, 1000);

      // Call the callback directly
      callback({
        startIndex: safeStartIndex,
        endIndex: safeEndIndex,
        needsUpdate,
        baseIndex,
      });
    } else {
      // No update needed
      callback({
        needsUpdate: false,
      });
    }
  }

  /**
   * Terminate the worker
   */
  public terminate() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (error) {
        console.warn("Error terminating worker:", error);
      } finally {
        this.worker = null;
        console.log("Ring worker terminated");
      }
    }
  }
}
