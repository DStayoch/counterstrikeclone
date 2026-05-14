import * as THREE from "three";

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x334239, roughness: 0.88 });
const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x725b3a, roughness: 0.82 });

export function buildMap(scene) {
  const colliders = [];
  const shootables = [];

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: 0x26342b, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  addBox(scene, colliders, shootables, new THREE.Vector3(0, 2, -45), [90, 4, 1], wallMaterial);
  addBox(scene, colliders, shootables, new THREE.Vector3(0, 2, 45), [90, 4, 1], wallMaterial);
  addBox(scene, colliders, shootables, new THREE.Vector3(-45, 2, 0), [1, 4, 90], wallMaterial);
  addBox(scene, colliders, shootables, new THREE.Vector3(45, 2, 0), [1, 4, 90], wallMaterial);

  [
    [-18, 1.25, -18, 9, 2.5, 3],
    [14, 1.25, -13, 3, 2.5, 11],
    [-8, 1.25, 13, 14, 2.5, 3],
    [22, 1.25, 20, 10, 2.5, 3],
    [-28, 1.25, 23, 3, 2.5, 10],
  ].forEach(([x, y, z, w, h, d]) => {
    addBox(scene, colliders, shootables, new THREE.Vector3(x, y, z), [w, h, d], coverMaterial);
  });

  return { colliders, shootables };
}

function addBox(scene, colliders, shootables, position, size, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  mesh.updateMatrixWorld();
  colliders.push(new THREE.Box3().setFromObject(mesh));
  shootables.push(mesh);
  return mesh;
}
