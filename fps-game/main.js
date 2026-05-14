import * as THREE from "three";
import { player, resetPlayer, damagePlayer, awardMoney } from "./js/player.js";
import { initControls, lockPointer, updateMovement } from "./js/controls.js";
import { canShoot, reloadWeapon } from "./js/weapons.js";
import { EnemyManager } from "./js/enemies.js";
import { BulletImpacts } from "./js/bullets.js";
import { BuyMenu } from "./js/buyMenu.js";
import { buildMap } from "./js/map.js";

const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101814);
scene.fog = new THREE.Fog(0x101814, 35, 95);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(0, 1.65, 36);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const aim = new THREE.Vector2(0, 0);

const hud = {
  health: document.querySelector("#health"),
  money: document.querySelector("#money"),
  weaponName: document.querySelector("#weaponName"),
  ammo: document.querySelector("#ammo"),
  enemiesLeft: document.querySelector("#enemiesLeft"),
};
const prompt = document.querySelector("#prompt");
const startButton = document.querySelector("#startButton");
const message = document.querySelector("#message");

let messageTimer = 0;
let map;
let enemies;
let impacts;
let buyMenu;
let gameStarted = false;

resetPlayer();
setupWorld();
setupInput();
updateUI();
animate();

function setupWorld() {
  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x273024, 1.5));

  const sun = new THREE.DirectionalLight(0xfff2d0, 2.2);
  sun.position.set(18, 26, 12);
  sun.castShadow = true;
  scene.add(sun);

  map = buildMap(scene);
  impacts = new BulletImpacts(scene);
  enemies = new EnemyManager(scene, player, camera, damagePlayerAndReport, handleEnemyKilled);
  enemies.spawnWave();
}

function setupInput() {
  initControls({
    camera,
    domElement: document.body,
    onBuyToggle: () => buyMenu.toggle(),
    onReload: reloadCurrentWeapon,
  });

  buyMenu = new BuyMenu(
    player,
    {
      menu: document.querySelector("#buyMenu"),
      weaponList: document.querySelector("#weaponList"),
      closeButton: document.querySelector("#closeBuy"),
    },
    updateUI,
    showMessage,
  );

  startButton.addEventListener("click", startGame);
  document.body.addEventListener("click", (event) => {
    if (!gameStarted || event.target.closest("#buyMenu")) return;
    lockPointer(document.body);
  });

  window.addEventListener("mousedown", (event) => {
    if (event.button === 0 && document.pointerLockElement === document.body) {
      shoot();
    }
  });

  window.addEventListener("resize", onResize);
}

function startGame() {
  gameStarted = true;
  prompt.classList.add("hidden");
  lockPointer(document.body);
}

function shoot() {
  if (!player.alive) return;

  const weapon = player.weapon;
  const now = performance.now();

  if (!weapon) {
    showMessage("No weapon equipped");
    return;
  }

  if (weapon.ammo <= 0) {
    showMessage("Reload");
    return;
  }

  if (!canShoot(weapon, now)) return;

  weapon.lastShotAt = now;
  weapon.ammo--;

  const spreadX = (Math.random() - 0.5) * weapon.spread;
  const spreadY = (Math.random() - 0.5) * weapon.spread;
  raycaster.setFromCamera({ x: aim.x + spreadX, y: aim.y + spreadY }, camera);
  raycaster.far = weapon.range;

  const hits = raycaster.intersectObjects([...enemies.enemyMeshes, ...map.shootables], false);
  if (hits.length > 0) {
    const hit = hits[0];
    const enemy = hit.object.userData.enemy;
    if (enemy) {
      enemies.damage(enemy, weapon.damage);
      impacts.add(hit.point, "enemy");
    } else {
      impacts.add(hit.point, "wall");
    }
  }

  updateUI();
}

function reloadCurrentWeapon() {
  if (reloadWeapon(player.weapon, updateUI)) {
    showMessage("Reloading");
    updateUI();
  }
}

function damagePlayerAndReport(amount) {
  damagePlayer(amount);
  showMessage(player.alive ? "Hit" : "You are down");
  updateUI();

  if (!player.alive) {
    document.exitPointerLock?.();
    prompt.querySelector("h1").textContent = "Round Lost";
    prompt.querySelector("p").textContent = "Refresh to restart, or edit the code and make the next round nastier.";
    prompt.classList.remove("hidden");
  }
}

function handleEnemyKilled() {
  awardMoney(500);
  showMessage("+$500");
  updateUI();

  if (enemies.aliveCount() === 0) {
    showMessage("Area clear");
  }
}

function updateUI() {
  const weapon = player.weapon;
  hud.health.textContent = String(player.health);
  hud.money.textContent = `$${player.money}`;
  hud.weaponName.textContent = weapon ? weapon.name : "Unarmed";
  hud.ammo.textContent = weapon
    ? `${weapon.isReloading ? "..." : weapon.ammo} / ${weapon.maxAmmo}`
    : "0 / 0";
  hud.enemiesLeft.textContent = String(enemies?.aliveCount() ?? 0);
}

function showMessage(text) {
  message.textContent = text;
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    message.textContent = "";
  }, 1100);
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = Math.min(clock.getDelta(), 0.04);
  const now = performance.now();

  if (gameStarted && player.alive) {
    updateMovement(camera, deltaTime, map.colliders);
    enemies.update(deltaTime, now);
  }

  impacts.update(deltaTime);
  updateUI();
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
