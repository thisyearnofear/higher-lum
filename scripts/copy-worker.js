const fs = require("fs");
const path = require("path");

// Paths
const srcWorkerPath = path.resolve(
  __dirname,
  "../src/lib/workers/ring-worker.ts"
);
const publicWorkerDir = path.resolve(__dirname, "../public/workers");

// Create the public/workers directory if it doesn't exist
if (!fs.existsSync(publicWorkerDir)) {
  fs.mkdirSync(publicWorkerDir, { recursive: true });
  console.log("Created public/workers directory");
}

// Compile the TypeScript worker file to JavaScript
try {
  console.log("Compiling worker file...");

  // Read the TypeScript file
  const tsContent = fs.readFileSync(srcWorkerPath, "utf8");

  // Create a clean JavaScript version
  const jsContent = `// Web Worker for handling heavy calculations related to ring positioning

// Handle messages from the main thread
self.onmessage = function(event) {
  const { type, data } = event.data;

  switch (type) {
    case "calculatePositions":
      handleCalculatePositions(data);
      break;
    case "updateRings":
      handleUpdateRings(data);
      break;
    default:
      console.error("Unknown message type:", type);
  }
};

/**
 * Calculate ring positions based on camera position
 */
function handleCalculatePositions(data) {
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
    },
  });
}

/**
 * Calculate ring updates based on camera movement
 */
function handleUpdateRings(data) {
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
      },
    });
  } else {
    // No update needed
    self.postMessage({
      type: "ringsUpdateCalculated",
      data: {
        needsUpdate: false,
      },
    });
  }
}`;

  // Write the JavaScript content to the public directory
  const publicWorkerPath = path.join(publicWorkerDir, "ring-worker.js");
  fs.writeFileSync(publicWorkerPath, jsContent);

  console.log(`Successfully compiled and copied worker to ${publicWorkerPath}`);
} catch (error) {
  console.error("Error compiling worker file:", error);
  process.exit(1);
}
