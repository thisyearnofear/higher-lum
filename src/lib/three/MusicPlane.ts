import * as THREE from "three";

interface MusicPlaneConfig {
  x?: number;
  y?: number;
  z?: number;
}

export class MusicPlane {
  private mesh: THREE.Mesh;
  private playerElement: HTMLDivElement;
  private currentTrack: number = 1;
  private readonly MAX_TRACKS = 6;

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

    // Create the player element
    this.playerElement = document.createElement("div");
    this.playerElement.style.position = "fixed";
    this.playerElement.style.left = "-9999px";
    this.playerElement.style.top = "-9999px";
    this.playerElement.style.width = "350px";
    this.playerElement.style.height = "40px";
    this.playerElement.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    this.playerElement.style.backdropFilter = "blur(10px)";
    this.playerElement.style.borderRadius = "8px";
    this.playerElement.style.overflow = "hidden";
    this.playerElement.style.border = "1px solid rgba(255, 255, 255, 0.2)";
    this.playerElement.style.zIndex = "1000";
    this.playerElement.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    this.playerElement.style.transition = "opacity 0.3s ease";
    document.body.appendChild(this.playerElement);

    // Start playing
    this.loadTrack();

    // Listen for messages from the iframe
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "trackEnd") {
        this.playNextTrack();
      }
    });
  }

  private loadTrack() {
    const baseTrackUrl = "https://futuretape.xyz/search/songcamp";
    const trackUrl = `${baseTrackUrl}?start=${this.currentTrack}&autoplay=1`;

    this.playerElement.innerHTML = `
      <iframe
        src="${trackUrl}"
        width="100%"
        height="300"
        frameBorder="0"
        allow="autoplay; clipboard-write;"
        loading="lazy"
        style="position: relative; top: -220px;"
      ></iframe>
    `;
  }

  private playNextTrack() {
    this.currentTrack = (this.currentTrack % this.MAX_TRACKS) + 1;
    this.loadTrack();
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
    if (this.playerElement && this.playerElement.parentNode) {
      this.playerElement.remove();
    }
    if (this.mesh.material) {
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
  }
}
