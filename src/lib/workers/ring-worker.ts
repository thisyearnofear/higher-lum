/**
 * Web Worker for handling heavy calculations related to ring positioning
 */

// Define the worker context type
declare const self: Worker;

// Define message types
type WorkerMessage = {
  type: "calculatePositions" | "updateRings";
  data: PositionData | RingUpdateData;
};

type PositionData = {
  baseIndex: number;
  visibleRings: number;
  verticalOffset: number;
  currentRingIndex: number;
};

type RingUpdateData = {
  cameraY: number;
  verticalOffset: number;
  visibleRings: number;
  currentRingIndex: number;
};

// Response types
type PositionsResponse = {
  startIndex: number;
  endIndex: number;
  needsUpdate: boolean;
  baseIndex: number;
};

type RingsUpdateResponse = {
  startIndex?: number;
  endIndex?: number;
  needsUpdate: boolean;
  baseIndex?: number;
};

// Handle messages from the main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  switch (type) {
    case "calculatePositions":
      handleCalculatePositions(data as PositionData);
      break;
    case "updateRings":
      handleUpdateRings(data as RingUpdateData);
      break;
    default:
      console.error("Unknown message type:", type);
  }
};

/**
 * Calculate ring positions based on camera position
 */
function handleCalculatePositions(data: PositionData) {
  const { baseIndex, visibleRings, currentRingIndex } = data;

  // Calculate which rings need to be created or updated
  const startIndex = baseIndex - visibleRings / 2;
  const endIndex = baseIndex + visibleRings / 2;

  // Limit the range to prevent excessive ring creation
  const safeStartIndex = Math.max(startIndex, -1000);
  const safeEndIndex = Math.min(endIndex, 1000);

  // Calculate which rings need to be created, updated, or removed
  const needsUpdate = Math.abs(baseIndex - currentRingIndex) > visibleRings / 4;

  // Return the calculated positions
  self.postMessage({
    type: "positionsCalculated",
    data: {
      startIndex: safeStartIndex,
      endIndex: safeEndIndex,
      needsUpdate,
      baseIndex,
    } as PositionsResponse,
  });
}

/**
 * Calculate ring updates based on camera movement
 */
function handleUpdateRings(data: RingUpdateData) {
  const { cameraY, verticalOffset, visibleRings, currentRingIndex } = data;

  // Calculate the base index from camera position
  const baseIndex = Math.floor(cameraY / verticalOffset);

  // Determine if rings need to be updated
  const needsUpdate = Math.abs(baseIndex - currentRingIndex) > visibleRings / 4;

  if (needsUpdate) {
    // Calculate which rings need to be created or updated
    const startIndex = baseIndex - visibleRings / 2;
    const endIndex = baseIndex + visibleRings / 2;

    // Limit the range to prevent excessive ring creation
    const safeStartIndex = Math.max(startIndex, -1000);
    const safeEndIndex = Math.min(endIndex, 1000);

    // Return the calculated updates
    self.postMessage({
      type: "ringsUpdateCalculated",
      data: {
        startIndex: safeStartIndex,
        endIndex: safeEndIndex,
        needsUpdate,
        baseIndex,
      } as PositionsResponse,
    });
  } else {
    // No update needed
    self.postMessage({
      type: "ringsUpdateCalculated",
      data: {
        needsUpdate: false,
      } as RingsUpdateResponse,
    });
  }
}

// This is required for TypeScript to recognize this as a module
const moduleExport = null;
export default moduleExport;
