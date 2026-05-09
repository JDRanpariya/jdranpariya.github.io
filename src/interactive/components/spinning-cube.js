/**
 * Simple spinning cube demo for Three.js.
 * No external model needed — procedural geometry.
 */
export async function setup({ scene, THREE, camera, controls, theme }) {
  // Cube with golden peachy material
  const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const material = new THREE.MeshStandardMaterial({
    color: theme.isDark ? 0xd4a070 : 0x9b4230,
    roughness: 0.4,
    metalness: 0.3,
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  scene.add(cube);

  // Wireframe overlay
  const wireGeo = new THREE.BoxGeometry(1.52, 1.52, 1.52);
  const wireMat = new THREE.MeshBasicMaterial({
    color: theme.isDark ? 0xfdfbf5 : 0x1a1410,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  scene.add(wire);

  camera.position.set(2.5, 2, 3);
  if (controls) controls.target.set(0, 0, 0);

  return {
    update(dt) {
      cube.rotation.x += 0.005;
      cube.rotation.y += 0.008;
      wire.rotation.copy(cube.rotation);
    },
  };
}
