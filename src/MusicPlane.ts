import * as THREE from "three";

export class MusicPlane {
  private mesh: THREE.Mesh;
  private playerElement: HTMLDivElement;

  constructor({ x = 0, y = 0, z = 0 }) {
    // Create a plane geometry for the player
    const geometry = new THREE.PlaneGeometry(8, 2); // Larger size

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
      side: THREE.DoubleSide, // Make visible from both sides
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, z);

    // Create the player element
    this.playerElement = document.createElement("div");
    this.playerElement.style.position = "fixed";
    this.playerElement.style.left = "-9999px"; // Hide initially
    this.playerElement.style.top = "-9999px";
    this.playerElement.style.width = "350px";
    this.playerElement.style.height = "40px";
    this.playerElement.style.backgroundColor = "rgba(0,0,0,0.7)";
    this.playerElement.style.borderRadius = "8px";
    this.playerElement.style.overflow = "hidden";
    this.playerElement.style.border = "2px solid #4caf50";
    this.playerElement.style.zIndex = "1000"; // Ensure it's above other elements
    document.body.appendChild(this.playerElement);

    this.loadRandomTrack();
  }

  private loadRandomTrack() {
    const baseTrackUrl = "https://futuretape.xyz/search/songcamp";
    const randomTrack = Math.floor(Math.random() * 6) + 1;
    const trackUrl = `${baseTrackUrl}?start=${randomTrack}&autoplay=1`;

    this.playerElement.innerHTML = `
      <iframe
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

  update(camera: THREE.Camera) {
    // Update player position to follow the 3D mesh
    const vector = new THREE.Vector3();
    this.mesh.getWorldPosition(vector);
    vector.project(camera);

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    const x = vector.x * widthHalf + widthHalf - 175;
    const y = -(vector.y * heightHalf) + heightHalf - 20;

    // Only show player when in front of camera
    if (vector.z < 1) {
      this.playerElement.style.display = "block";
      this.playerElement.style.left = x + "px";
      this.playerElement.style.top = y + "px";
    } else {
      this.playerElement.style.display = "none";
    }
  }

  getMesh() {
    return this.mesh;
  }

  dispose() {
    this.playerElement.remove();
  }
}
