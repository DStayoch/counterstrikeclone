import * as THREE from "three";

const keys = {};
const euler = new THREE.Euler(0, 0, 0, "YXZ");
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

export function initControls({ camera, domElement, onBuyToggle, onReload }) {
  document.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;

    if (event.key.toLowerCase() === "b") onBuyToggle();
    if (event.key.toLowerCase() === "r") onReload();
  });

  document.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== domElement) return;

    euler.setFromQuaternion(camera.quaternion);
    euler.y -= event.movementX * 0.002;
    euler.x -= event.movementY * 0.002;
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
    camera.quaternion.setFromEuler(euler);
  });
}

export function lockPointer(domElement) {
  domElement.requestPointerLock();
}

export function updateMovement(camera, deltaTime, colliders) {
  const move = new THREE.Vector3();

  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, camera.up).normalize();

  if (keys.w) move.add(forward);
  if (keys.s) move.sub(forward);
  if (keys.d) move.add(right);
  if (keys.a) move.sub(right);

  if (move.lengthSq() === 0) return;

  move.normalize().multiplyScalar(7 * deltaTime);
  const nextPosition = camera.position.clone().add(move);
  nextPosition.y = camera.position.y;

  if (!collides(nextPosition, colliders)) {
    camera.position.copy(nextPosition);
  }
}

function collides(position, colliders) {
  return colliders.some((box) => box.distanceToPoint(position) < 0.85);
}
