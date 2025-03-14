import * as THREE from "three";

interface MusicPlaneConfig {
  x?: number;
  y?: number;
  z?: number;
}

// Static music player that persists across component lifecycles
let globalPlayerElement: HTMLDivElement | null = null;
let globalCurrentTrack = 1;
const MAX_TRACKS = 6;

// Function to create the global player if it doesn't exist
function ensureGlobalPlayer() {
  if (!globalPlayerElement) {
    globalPlayerElement = document.createElement("div");
    globalPlayerElement.id = "global-music-player";
    globalPlayerElement.style.position = "fixed";
    globalPlayerElement.style.left = "-9999px";
    globalPlayerElement.style.top = "-9999px";
    globalPlayerElement.style.width = "350px";
    globalPlayerElement.style.height = "40px";
    globalPlayerElement.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    globalPlayerElement.style.backdropFilter = "blur(10px)";
    globalPlayerElement.style.borderRadius = "8px";
    globalPlayerElement.style.overflow = "hidden";
    globalPlayerElement.style.border = "1px solid rgba(255, 255, 255, 0.2)";
    globalPlayerElement.style.zIndex = "1000";
    globalPlayerElement.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    globalPlayerElement.style.transition = "opacity 0.3s ease";
    document.body.appendChild(globalPlayerElement);

    // Load the initial track
    loadGlobalTrack();

    // Listen for messages from the iframe
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "trackEnd") {
        playNextGlobalTrack();
      }
    });
  }
  return globalPlayerElement;
}

// Function to load a track in the global player
function loadGlobalTrack() {
  if (!globalPlayerElement) return;

  const baseTrackUrl = "https://futuretape.xyz/search/songcamp";
  const trackUrl = `${baseTrackUrl}?start=${globalCurrentTrack}&autoplay=1`;

  globalPlayerElement.innerHTML = `
    <iframe
      id="global-music-player-iframe"
      src="${trackUrl}"
      width="100%"
      height="300"
      frameBorder="0"
      allow="autoplay; clipboard-write;"
      loading="lazy"
      style="position: relative; top: -260px;"
    ></iframe>
  `;
}

// Function to play the next track
function playNextGlobalTrack() {
  globalCurrentTrack = (globalCurrentTrack % MAX_TRACKS) + 1;
  loadGlobalTrack();
}

export class MusicPlane {
  private mesh: THREE.Mesh;
  private playerElement: HTMLDivElement;

  constructor({ x = 0, y = 0, z = 0 }: MusicPlaneConfig) {
    // Create a plane geometry for the player
    const geometry = new THREE.PlaneGeometry(8, 2);

    // Create a canvas element for the player background
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, 400, 0);
      gradient.addColorStop(0, "#1a1a1a");
      gradient.addColorStop(1, "#2a2a2a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 400, 120);

      // Add a border
      ctx.strokeStyle = "#4caf50";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 396, 116);
    }

    // Create material with the canvas texture
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, z);

    // Use the global player element
    this.playerElement = ensureGlobalPlayer();
  }

  // Get current track information
  getCurrentTrack(): number {
    return globalCurrentTrack;
  }

  // Set to a specific track
  setTrack(trackNumber: number) {
    if (trackNumber >= 1 && trackNumber <= MAX_TRACKS) {
      globalCurrentTrack = trackNumber;
      loadGlobalTrack();
    }
  }

  // These methods don't need to do anything since the player persists
  pause() {
    // No need to pause, the player persists
  }

  resume() {
    // No need to resume, the player persists
  }

  reloadTrack() {
    // Only reload if needed
    loadGlobalTrack();
  }

  update(camera: THREE.Camera) {
    // Update player position to follow the 3D mesh
    const vector = new THREE.Vector3();
    this.mesh.getWorldPosition(vector);
    vector.project(camera);

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    const x = vector.x * widthHalf + widthHalf - 175;
    const y = -(vector.y * heightHalf) + heightHalf - 40;

    // Check if the music player is in front of the camera
    const isFront = vector.z < 1;
    // Check if the player is within reasonable screen bounds
    const isOnScreen =
      x > -200 &&
      x < window.innerWidth - 150 &&
      y > -100 &&
      y < window.innerHeight - 60;

    if (isFront && isOnScreen) {
      this.playerElement.style.display = "block";
      this.playerElement.style.left = `${x}px`;
      this.playerElement.style.top = `${y}px`;
      this.playerElement.style.opacity = "1";
    } else {
      this.playerElement.style.opacity = "0";
      // Only hide after transition
      setTimeout(() => {
        if (this.playerElement.style.opacity === "0") {
          this.playerElement.style.display = "none";
        }
      }, 300);
    }
  }

  getMesh() {
    return this.mesh;
  }

  dispose() {
    if (this.mesh.material) {
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }

    // We don't remove the global player element
    // It will persist across component lifecycles
  }
}
