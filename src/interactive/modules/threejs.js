/**
 * Three.js module — renders 3D scenes, models, and physics simulations.
 *
 * Supports:
 *   - GLTF/GLB model loading
 *   - Orbit controls (drag to rotate, scroll to zoom)
 *   - Auto-rotation
 *   - Custom lighting matched to site theme
 *   - 3D physics via Cannon-es (optional)
 *
 * Config:
 *   height: number (default 500)
 *   camera: "orbit" | "static" (default "orbit")
 *   autoRotate: boolean (default false)
 *   background: "transparent" | "surface" | "card" (default "transparent")
 *   ground: boolean (default false) — show ground plane
 *   physics: boolean (default false) — enable Cannon-es physics
 */

import { getTheme } from "../theme.js";

const THREE_CDN = "https://esm.sh/three@0.169.0";
const ORBIT_CDN = "https://esm.sh/three@0.169.0/examples/jsm/controls/OrbitControls.js";
const GLTF_CDN = "https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js";

export async function mount(el, config, theme) {
  const [THREE, { OrbitControls }, { GLTFLoader }] = await Promise.all([
    import(/* webpackIgnore: true */ THREE_CDN),
    import(/* webpackIgnore: true */ ORBIT_CDN),
    import(/* webpackIgnore: true */ GLTF_CDN),
  ]);

  const canvas = el.querySelector(".interactive__canvas");
  const height = config.height || 500;
  const width = canvas.clientWidth || el.clientWidth || 800;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  canvas.appendChild(renderer.domElement);

  // Scene
  const scene = new THREE.Scene();
  if (config.background === "surface") {
    scene.background = new THREE.Color(theme.surface);
  } else if (config.background === "card") {
    scene.background = new THREE.Color(theme.card);
  }
  // else transparent

  // Camera
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(3, 2, 4);

  // Lighting — warm, matches the golden peachy theme
  const ambient = new THREE.AmbientLight(theme.isDark ? 0xd4a070 : 0xfdfbf5, 0.6);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(5, 8, 4);
  key.castShadow = true;
  scene.add(key);

  const fill = new THREE.DirectionalLight(theme.isDark ? 0x8bb4d9 : 0x9b4230, 0.3);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  // Optional ground plane
  if (config.ground) {
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: theme.isDark ? 0x2d261c : 0xf4efe4,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // Controls
  let controls = null;
  if (config.camera !== "static") {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = config.autoRotate || false;
    controls.autoRotateSpeed = 1.5;
    controls.maxPolarAngle = Math.PI * 0.85;
  }

  // Load model or custom scene module
  const src = el.dataset.src;
  let userSetup = null;
  if (src && src.endsWith(".js")) {
    // Custom scene module — exports setup({ scene, THREE, camera, controls, theme })
    try {
      const module = await import(/* webpackIgnore: true */ src);
      if (module.setup) {
        userSetup = await module.setup({ scene, THREE, camera, controls, theme, config, el });
      }
    } catch (e) {
      console.warn("[threejs] Failed to load scene module:", e);
    }
  } else if (src) {
    // GLB/GLTF model
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(src, resolve, undefined, reject);
    });
    scene.add(gltf.scene);

    // Auto-center and scale
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    gltf.scene.scale.multiplyScalar(scale);
    gltf.scene.position.sub(center.multiplyScalar(scale));
    camera.position.set(0, 1, 3);
    if (controls) controls.target.set(0, 0, 0);
  }

  // Animation loop
  let animationId;
  let lastTime = performance.now();
  function animate() {
    animationId = requestAnimationFrame(animate);
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    if (userSetup?.update) userSetup.update(dt);
    if (controls) controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Responsive
  const resizeObserver = new ResizeObserver(() => {
    const w = canvas.clientWidth;
    const h = config.height || 500;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(canvas);

  return { renderer, scene, camera, controls, animationId, resizeObserver };
}

export async function onThemeChange(el, instance, config, newTheme) {
  if (!instance) return;
  const { scene } = instance;
  // Update lighting
  scene.traverse((child) => {
    if (child.isAmbientLight) {
      child.color.set(newTheme.isDark ? 0xd4a070 : 0xfdfbf5);
    }
  });
  // Update background
  if (config.background === "surface") {
    const THREE = await import(/* webpackIgnore: true */ THREE_CDN);
    scene.background = new THREE.Color(newTheme.surface);
  } else if (config.background === "card") {
    const THREE = await import(/* webpackIgnore: true */ THREE_CDN);
    scene.background = new THREE.Color(newTheme.card);
  }
}
