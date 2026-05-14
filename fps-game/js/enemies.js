import * as THREE from "three";

const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xb84735, roughness: 0.6 });
const deadMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2d2c, roughness: 0.9 });

export class EnemyManager {
  constructor(scene, player, camera, onPlayerHit, onEnemyKilled) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;
    this.onPlayerHit = onPlayerHit;
    this.onEnemyKilled = onEnemyKilled;
    this.enemies = [];
    this.enemyMeshes = [];
  }

  spawnWave() {
    [
      [-22, 0.9, -25],
      [18, 0.9, -22],
      [25, 0.9, 18],
      [-24, 0.9, 18],
      [0, 0.9, 28],
    ].forEach((position, index) => this.spawn(position, index));
  }

  spawn(position, index) {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 4, 8), enemyMaterial.clone());
    mesh.position.set(...position);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const enemy = {
      id: index,
      mesh,
      health: 100,
      speed: 2.15,
      detectionRange: 42,
      attackRange: 22,
      damage: 8,
      fireRate: 900,
      lastShotAt: 0,
      state: "patrolling",
      patrolAngle: Math.random() * Math.PI * 2,
    };

    mesh.userData.enemy = enemy;
    this.enemies.push(enemy);
    this.enemyMeshes.push(mesh);
  }

  update(deltaTime, now) {
    const playerPosition = this.camera.position;

    for (const enemy of this.enemies) {
      if (enemy.state === "dead") continue;

      const distance = enemy.mesh.position.distanceTo(playerPosition);
      enemy.mesh.lookAt(playerPosition.x, enemy.mesh.position.y, playerPosition.z);

      if (distance < enemy.attackRange) {
        enemy.state = "attacking";
        this.enemyShoot(enemy, now);
      } else if (distance < enemy.detectionRange) {
        enemy.state = "chasing";
        this.moveTowardPlayer(enemy, deltaTime, playerPosition);
      } else {
        enemy.state = "patrolling";
        this.patrol(enemy, deltaTime);
      }
    }
  }

  damage(enemy, amount) {
    if (!enemy || enemy.state === "dead") return false;

    enemy.health -= amount;
    enemy.mesh.material.emissive = new THREE.Color(0x5e160c);
    window.setTimeout(() => {
      if (enemy.state !== "dead") enemy.mesh.material.emissive = new THREE.Color(0x000000);
    }, 70);

    if (enemy.health <= 0) {
      enemy.state = "dead";
      enemy.mesh.material = deadMaterial;
      enemy.mesh.rotation.z = Math.PI / 2;
      enemy.mesh.position.y = 0.35;
      this.enemyMeshes = this.enemyMeshes.filter((mesh) => mesh !== enemy.mesh);
      this.onEnemyKilled(enemy);
      return true;
    }

    return false;
  }

  aliveCount() {
    return this.enemies.filter((enemy) => enemy.state !== "dead").length;
  }

  moveTowardPlayer(enemy, deltaTime, playerPosition) {
    const direction = playerPosition.clone().sub(enemy.mesh.position);
    direction.y = 0;
    direction.normalize();
    enemy.mesh.position.addScaledVector(direction, enemy.speed * deltaTime);
  }

  patrol(enemy, deltaTime) {
    enemy.patrolAngle += deltaTime * 0.75;
    enemy.mesh.position.x += Math.cos(enemy.patrolAngle) * deltaTime * 0.75;
    enemy.mesh.position.z += Math.sin(enemy.patrolAngle) * deltaTime * 0.75;
  }

  enemyShoot(enemy, now) {
    if (now - enemy.lastShotAt < enemy.fireRate || !this.player.alive) return;
    enemy.lastShotAt = now;
    this.onPlayerHit(enemy.damage);
  }
}
