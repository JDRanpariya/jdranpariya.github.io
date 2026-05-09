/**
 * Cannon-es module — 3D physics simulations rendered with Three.js.
 *
 * For robotics/physical AI posts: simulate rigid bodies, joints,
 * actuators, and control systems in 3D.
 *
 * Config:
 *   height: number (default 500)
 *   gravity: [x, y, z] (default [0, -9.82, 0])
 *   camera: "orbit" | "static" (default "orbit")
 *   autoRotate: boolean (default false)
 *   ground: boolean (default true)
 *
 * Data: scene module in data-src that exports setup({ world, scene, THREE, CANNON, theme })
 */

import { getTheme } from '../theme.js';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
const ORBIT_CDN = 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js';
const CANNON_CDN = 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

export async function mount(el, config, theme) {
  const [THREE, { OrbitControls }, CANNON] = await Promise.all([
    import(/* webpackIgnore: true */ THREE_CDN),
    import(/* webpackIgnore: true */ ORBIT_CDN),
    import(/* webpackIgnore: true */ CANNON_CDN),
  ]);

  const canvas = el.querySelector('.interactive__canvas');
  const height = config.height || 500;
  const width = canvas.clientWidth || el.clientWidth || 800;

  // Three.js setup
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(4, 3, 6);

  // Lighting
  const ambient = new THREE.AmbientLight(theme.isDark ? 0xd4a070 : 0xfdfbf5, 0.5);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(5, 10, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  // Controls
  let controls = null;
  if (config.camera !== 'static') {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = config.autoRotate || false;
    controls.target.set(0, 1, 0);
  }

  // Cannon physics world
  const world = new CANNON.World();
  const gravity = config.gravity || [0, -9.82, 0];
  world.gravity.set(gravity[0], gravity[1], gravity[2]);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;

  // Ground
  if (config.ground !== false) {
    // Physics ground
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEulerAngles(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // Visual ground
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: theme.isDark ? 0x2d261c : 0xf4efe4,
      roughness: 0.95,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
  }

  // Load custom scene setup
  const src = el.dataset.src;
  let userSetup = null;
  if (src) {
    try {
      const module = await import(/* webpackIgnore: true */ src);
      if (module.setup) {
        userSetup = await module.setup({ world, scene, camera, THREE, CANNON, theme, config, el });
      }
    } catch (e) {
      console.warn('[cannon] Failed to load scene:', e);
    }
  }

  // Sync physics → visuals mapping
  const bodies = userSetup?.bodies || [];

  // Animation loop
  const timeStep = 1 / 60;
  let animationId;
  function animate() {
    animationId = requestAnimationFrame(animate);
    world.step(timeStep);

    // Sync Three.js meshes with Cannon bodies
    for (const { mesh, body } of bodies) {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }

    // Call user update if provided
    if (userSetup?.update) userSetup.update();

    if (controls) controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Responsive
  const resizeObserver = new ResizeObserver(() => {
    const w = canvas.clientWidth;
    camera.aspect = w / height;
    camera.updateProjectionMatrix();
    renderer.setSize(w, height);
  });
  resizeObserver.observe(canvas);

  return { renderer, scene, camera, controls, world, animationId, resizeObserver, bodies };
}

export function onThemeChange(el, instance, config, newTheme) {
  // Update lighting and ground color on theme switch
  if (!instance) return;
  instance.scene.traverse((child) => {
    if (child.isAmbientLight) {
      child.color.set(newTheme.isDark ? 0xd4a070 : 0xfdfbf5);
    }
    if (child.isMesh && child.geometry.type === 'PlaneGeometry') {
      child.material.color.set(newTheme.isDark ? 0x2d261c : 0xf4efe4);
    }
  });
}
