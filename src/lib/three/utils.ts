import * as THREE from "three";

/**
 * Load a texture with proper configuration to prevent WebGL errors
 * @param url The URL of the texture to load
 * @param onLoad Callback when texture is loaded
 * @param onProgress Callback for loading progress
 * @param onError Callback if there's an error loading the texture
 * @returns The texture loader instance
 */
export function loadTexture(
  url: string,
  onLoad?: (texture: THREE.Texture) => void,
  onProgress?: (event: ProgressEvent) => void,
  onError?: (err: unknown) => void
): THREE.TextureLoader {
  const loader = new THREE.TextureLoader();

  // Set cross-origin to anonymous to handle cross-origin requests
  loader.crossOrigin = "anonymous";

  // Set the loader's path
  loader.setPath("");

  // Load the texture
  loader.load(
    url,
    (texture) => {
      // Configure the texture to prevent WebGL errors
      texture.flipY = false;
      texture.premultiplyAlpha = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      // Call the onLoad callback if provided
      if (onLoad) onLoad(texture);
    },
    onProgress,
    onError
  );

  return loader;
}

/**
 * Dispose of a Three.js object and all its children
 * @param obj The object to dispose
 */
export function disposeObject(obj: THREE.Object3D): void {
  if (!obj) return;

  // Dispose of geometries and materials
  if (obj instanceof THREE.Mesh) {
    if (obj.geometry) obj.geometry.dispose();

    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((material) => disposeMaterial(material));
      } else {
        disposeMaterial(obj.material);
      }
    }
  }

  // Recursively dispose of children
  while (obj.children.length > 0) {
    disposeObject(obj.children[0]);
    obj.remove(obj.children[0]);
  }
}

/**
 * Dispose of a Three.js material and its textures
 * @param material The material to dispose
 */
function disposeMaterial(material: THREE.Material): void {
  if (!material) return;

  // Dispose of textures
  if (material instanceof THREE.MeshBasicMaterial && material.map) {
    material.map.dispose();
  }

  // Dispose of the material itself
  material.dispose();
}
