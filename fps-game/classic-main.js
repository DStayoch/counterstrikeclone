const weaponCatalog = {
  pistol: {
    name: "Pistol",
    type: "pistol",
    price: 0,
    damage: 25,
    fireRate: 400,
    ammo: 12,
    maxAmmo: 12,
    reloadTime: 900,
    range: 60,
    spread: 0.02,
    automatic: false,
  },
  smg: {
    name: "SMG",
    type: "submachine gun",
    price: 1200,
    damage: 18,
    fireRate: 90,
    ammo: 30,
    maxAmmo: 30,
    reloadTime: 1200,
    range: 45,
    spread: 0.08,
    automatic: true,
  },
  rifle: {
    name: "Rifle",
    type: "rifle",
    price: 2700,
    damage: 35,
    fireRate: 140,
    ammo: 30,
    maxAmmo: 30,
    reloadTime: 1450,
    range: 90,
    spread: 0.03,
    automatic: true,
  },
  sniper: {
    name: "Sniper Rifle",
    type: "sniper rifle",
    price: 4750,
    damage: 90,
    fireRate: 1200,
    ammo: 5,
    maxAmmo: 5,
    reloadTime: 1800,
    range: 200,
    spread: 0.005,
    automatic: false,
  },
};

function createWeapon(key) {
  return { key, ...weaponCatalog[key], lastShotAt: 0, isReloading: false };
}

const player = {
  health: 100,
  money: 5000,
  score: 0,
  kills: 0,
  headshots: 0,
  grenades: 3,
  speed: 7,
  velocity: new THREE.Vector3(),
  verticalVelocity: 0,
  grounded: true,
  moveIntensity: 0,
  bobPhase: 0,
  spreadHeat: 0,
  inventory: [createWeapon("pistol")],
  weapon: null,
  activeSlot: 1,
  hasBomb: true,
  isPlanting: false,
  plantStartedAt: 0,
  alive: true,
};
player.inventory = [createWeapon("rifle")];
player.weapon = player.inventory[0];

const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = createSkyTexture();
scene.fog = new THREE.Fog(0x9fb8c9, 42, 115);

const defaultFov = 75;
const scopedFov = 28;
const camera = new THREE.PerspectiveCamera(defaultFov, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(0, 1.65, 36);
scene.add(camera);

const weaponRig = new THREE.Group();
weaponRig.position.set(0.48, -0.42, -0.82);
camera.add(weaponRig);

scene.add(new THREE.HemisphereLight(0xdde8ff, 0x273024, 1.5));
const sun = new THREE.DirectionalLight(0xfff2d0, 2.2);
sun.position.set(18, 26, 12);
sun.castShadow = true;
scene.add(sun);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const keys = {};
const colliders = [];
const botColliders = [];
const shootables = [];
const walkableStairs = [];
const walkableSurfaces = [];
const solidObstacles = [];
const enemies = [];
const bulletTracers = [];
const activeGrenades = [];
const explosionEffects = [];
const cloudLayers = [];
const weaponParts = {};
let enemyHitParts = [];
let gameStarted = false;
let messageTimer = 0;
let fireHeld = false;
let fireHeldAt = 0;
let burstShots = 0;
let scoped = false;
let weaponRecoil = 0;
let weaponKickSide = 0;
let grenadeThrowAnimation = null;
let respawnTimer = null;
let roundTimer = null;
let reloadAnimation = null;
let boltAnimation = null;

const TEAM_SIZE = 5;
const MAX_ROUNDS = 10;
const playerTeamSpawns = [
  [-36, 0, 36],
  [-32, 0, 34],
  [-38, 0, 30],
  [-28, 0, 38],
  [-40, 0, 24],
];
const enemyTeamSpawns = [
  [36, 0, -36],
  [32, 0, -34],
  [38, 0, -30],
  [28, 0, -38],
  [40, 0, -24],
];
const roundState = {
  round: 1,
  terroristWins: 0,
  counterTerroristWins: 0,
  active: true,
  matchOver: false,
  bomb: {
    state: "carried",
    plantedAt: 0,
    pendingMesh: null,
    sitePosition: new THREE.Vector3(34, 0.05, -28),
    mesh: null,
    siteMesh: null,
  },
};

const bulletTexture = createBulletTexture();
const enemySpawnPoints = [
  [-38, 0, -38],
  [-22, 0, -25],
  [18, 0, -22],
  [25, 0, 18],
  [-24, 0, 18],
  [0, 0, 28],
  [-34, 0, 2],
  [34, 0, -34],
  [-8, 0, -34],
  [30, 0, 30],
  [-33, 0, 30],
  [10, 0, 6],
  [-12, 0, 20],
  [39, 0, 6],
  [-40, 0, 12],
  [6, 0, -40],
  [21, 0, 38],
  [-18, 0, 36],
];
const hud = {
  health: document.querySelector("#health"),
  money: document.querySelector("#money"),
  weaponName: document.querySelector("#weaponName"),
  ammo: document.querySelector("#ammo"),
  slot: document.querySelector("#slot"),
  enemiesLeft: document.querySelector("#enemiesLeft"),
  score: document.querySelector("#score"),
  boardScore: document.querySelector("#boardScore"),
  kills: document.querySelector("#kills"),
  headshots: document.querySelector("#headshots"),
  grenades: document.querySelector("#grenades"),
  teamScore: document.querySelector("#teamScore"),
  bombStatus: document.querySelector("#bombStatus"),
  alliesLeft: document.querySelector("#alliesLeft"),
  opponentsLeft: document.querySelector("#opponentsLeft"),
};
const prompt = document.querySelector("#prompt");
const promptTitle = prompt.querySelector("h1");
const promptText = prompt.querySelector("p");
const startButton = document.querySelector("#startButton");
const message = document.querySelector("#message");
const damageOverlay = document.querySelector("#damageOverlay");
const buyMenu = document.querySelector("#buyMenu");
const weaponList = document.querySelector("#weaponList");
const scopeOverlay = document.querySelector("#scopeOverlay");

function setPromptTitle(text, branded = false) {
  promptTitle.textContent = text;
  promptTitle.classList.toggle("game-title", branded);
  if (branded) {
    promptTitle.dataset.text = text;
  } else {
    delete promptTitle.dataset.text;
  }
}

buildSky();
buildMap();
spawnWave();
buildWeaponModel(player.weapon.key);
renderBuyMenu();
wireInput();
updateUI();
animate();

function buildSky() {
  const cloudTexture = createCloudTexture();
  const cloudMaterial = new THREE.MeshBasicMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  [
    { position: [-34, 38, -18], scale: [28, 12], speed: 0.9 },
    { position: [6, 43, -38], scale: [34, 15], speed: 0.65 },
    { position: [34, 36, 4], scale: [26, 11], speed: 0.72 },
    { position: [-4, 48, 30], scale: [42, 17], speed: 0.5 },
    { position: [-42, 45, 34], scale: [30, 13], speed: 0.58 },
  ].forEach(({ position, scale, speed }, index) => {
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(scale[0], scale[1]), cloudMaterial.clone());
    cloud.position.set(...position);
    cloud.rotation.x = -Math.PI / 2;
    cloud.rotation.z = (index % 2 ? -0.16 : 0.12) + index * 0.03;
    cloud.userData.speed = speed;
    cloud.userData.startX = position[0];
    scene.add(cloud);
    cloudLayers.push(cloud);
  });

  const haze = new THREE.Mesh(
    new THREE.CylinderGeometry(82, 82, 32, 64, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xb9c9d1,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  haze.position.y = 18;
  scene.add(haze);
}

function buildMap() {
  const groundTexture = createGroundTexture();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ map: groundTexture, color: 0xe6e8d8, roughness: 0.98 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x5f6358, roughness: 0.92 });
  const coverMat = new THREE.MeshStandardMaterial({ color: 0x7d786b, roughness: 0.88 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x918f86, roughness: 0.94 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x596166, roughness: 0.62, metalness: 0.28 });
  const coverTrimMat = new THREE.MeshStandardMaterial({ color: 0x3d4c3d, roughness: 0.84 });
  const coverStripeMat = new THREE.MeshStandardMaterial({ color: 0xb6a458, roughness: 0.72 });
  const coverDarkMat = new THREE.MeshStandardMaterial({ color: 0x343631, roughness: 0.9 });
  const bombSiteMat = new THREE.MeshBasicMaterial({ color: 0xc9b24a, transparent: true, opacity: 0.28 });
  const tSpawnMat = new THREE.MeshBasicMaterial({ color: 0xc79a42, transparent: true, opacity: 0.18 });
  const ctSpawnMat = new THREE.MeshBasicMaterial({ color: 0x4f92c9, transparent: true, opacity: 0.18 });

  addBox([0, 2, -45], [90, 4, 1], wallMat);
  addBox([0, 2, 45], [90, 4, 1], wallMat);
  addBox([-45, 2, 0], [1, 4, 90], wallMat);
  addBox([45, 2, 0], [1, 4, 90], wallMat);

  [
    [[-23, 1.25, -24], [9, 2.5, 3]],
    [[20, 1.25, -18], [3, 2.5, 11]],
    [[-15, 1.25, 18], [14, 2.5, 3]],
    [[28, 1.25, 25], [10, 2.5, 3]],
    [[-24, 1.25, 29], [3, 2.5, 10]],
    [[4, 1.1, 10], [4, 2.2, 8]],
    [[-35, 0.9, -14], [7, 1.8, 2.2]],
    [[35, 0.9, -5], [2.2, 1.8, 8]],
    [[-9, 0.75, -34], [10, 1.5, 2]],
    [[36, 0.75, 35], [9, 1.5, 2]],
    [[-15, 2.4, 37], [10, 4.8, 2.4]],
    [[18, 2.1, 36], [2.4, 4.2, 9]],
    [[-39, 2.2, -36], [7, 4.4, 7]],
    [[39, 2.8, 17], [5, 5.6, 5]],
    [[-39, 1.05, 17], [12, 2.1, 2.4]],
    [[39, 1.05, -17], [12, 2.1, 2.4]],
    [[-18, 1.2, -2], [3, 2.4, 12]],
    [[18, 1.2, 2], [3, 2.4, 12]],
    [[-3, 1.35, -13], [9, 2.7, 2.2]],
    [[3, 1.35, 13], [9, 2.7, 2.2]],
  ].forEach(([position, size], index) => addCoverBox(position, size, index));

  [
    [[-18, 3.2, 0], [9, 0.45, 7]],
    [[18, 3.4, -31], [10, 0.45, 6]],
    [[-2, 4.8, 32], [7, 0.45, 7]],
    [[-39, 1.48, 9.2], [7, 0.42, 5]],
    [[39, 1.48, -28.4], [7, 0.42, 5]],
    [[-24, 1.48, -1.6], [7, 0.42, 5]],
    [[24, 1.48, -33.6], [7, 0.42, 5]],
    [[-40, 2.4, 20], [9, 0.45, 6]],
    [[40, 2.4, -20], [9, 0.45, 6]],
    [[0, 2.9, 4], [11, 0.45, 8]],
    [[-19, 4.15, 31], [12, 0.5, 9]],
    [[19, 4.15, -31], [12, 0.5, 9]],
    [[0, 4.05, 22], [21, 0.45, 5]],
    [[0, 5.25, -21], [18, 0.45, 5]],
    [[-20, 5.25, -28], [10, 0.45, 8]],
    [[20, 5.25, 28], [10, 0.45, 8]],
  ].forEach(([position, size]) => addBox(position, size, steelMat, false, true));

  [
    [[-24, 1.7, 2.9], [0.3, 3.4, 0.3]],
    [[-28.2, 1.7, -2.9], [0.3, 3.4, 0.3]],
    [[24, 1.8, -28], [0.3, 3.6, 0.3]],
    [[28.6, 1.8, -34], [0.3, 3.6, 0.3]],
    [[-5, 2.5, 35], [0.3, 5, 0.3]],
    [[1.3, 2.5, 29], [0.3, 5, 0.3]],
    [[-24, 2.1, 27], [0.42, 4.2, 0.42]],
    [[-14, 2.1, 35], [0.42, 4.2, 0.42]],
    [[14, 2.1, -35], [0.42, 4.2, 0.42]],
    [[24, 2.1, -27], [0.42, 4.2, 0.42]],
    [[-9.5, 2.05, 19.8], [0.38, 4.1, 0.38]],
    [[9.5, 2.05, 24.2], [0.38, 4.1, 0.38]],
    [[-8, 2.65, -23.2], [0.38, 5.3, 0.38]],
    [[8, 2.65, -18.8], [0.38, 5.3, 0.38]],
  ].forEach(([position, size]) => addBox(position, size, steelMat));

  [
    [[-19, 4.85, 27.2], [7, 1.0, 0.55]],
    [[-24.5, 4.85, 31], [0.55, 1.0, 6]],
    [[19, 4.85, -27.2], [7, 1.0, 0.55]],
    [[24.5, 4.85, -31], [0.55, 1.0, 6]],
    [[0, 4.72, 19.4], [8, 0.9, 0.5]],
    [[-8.4, 4.72, 22], [0.5, 0.9, 4]],
    [[0, 5.92, -18.4], [7, 0.9, 0.5]],
    [[8.4, 5.92, -21], [0.5, 0.9, 4]],
    [[-20, 5.92, -24.2], [5, 0.9, 0.5]],
    [[20, 5.92, 24.2], [5, 0.9, 0.5]],
  ].forEach(([position, size], index) => addCoverBox(position, size, index + 40));

  addStairs([-39, 0.18, 5], 1);
  addStairs([39, 0.18, -24], -1);
  addStairs([-24, 0.18, -6], 1);
  addStairs([24, 0.18, -38], 1);
  addStairs([-40, 0.18, 12], 1);
  addStairs([40, 0.18, -12], -1);
  addStairs([0, 0.18, -11], 1);
  addStairs([-19, 0.18, 15.34], 1, 16, 5.5, 0.269, 0.72);
  addStairs([19, 0.18, -15.34], -1, 16, 5.5, 0.269, 0.72);

  addSpawnPad([-35, 0.045, 33], [18, 0.08, 18], tSpawnMat);
  addSpawnPad([35, 0.045, -33], [18, 0.08, 18], ctSpawnMat);
  addStairs([-9, 0.18, 9.64], 1, 15, 4.4, 0.28, 0.68);
  addStairs([9, 0.18, -10.68], -1, 12, 4.4, 0.465, 0.68);
  addStairs([-20, 0.18, -15.72], -1, 12, 4.2, 0.465, 0.72);
  addStairs([20, 0.18, 15.72], 1, 12, 4.2, 0.465, 0.72);

  const site = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.08, 48), bombSiteMat);
  site.position.copy(roundState.bomb.sitePosition);
  site.name = "Counter-Terrorist Bomb Site";
  scene.add(site);
  roundState.bomb.siteMesh = site;

  function addStairs(origin, direction, steps = 6, width = 6, stepHeight = 0.18, stepDepth = 0.72) {
    const firstStepHeight = 0.36;
    const firstStepTop = origin[1] + firstStepHeight / 2;
    walkableStairs.push({
      xMin: origin[0] - width / 2,
      xMax: origin[0] + width / 2,
      zMin: Math.min(origin[2], origin[2] + direction * (steps - 1) * stepDepth) - 0.5,
      zMax: Math.max(origin[2], origin[2] + direction * (steps - 1) * stepDepth) + 0.5,
      originZ: origin[2],
      baseHeight: firstStepTop,
      direction,
      stepHeight,
      stepDepth,
      maxHeight: firstStepTop + (steps - 1) * stepHeight,
    });

    for (let i = 0; i < steps; i++) {
      addBox(
        [origin[0], origin[1] + i * stepHeight, origin[2] + direction * i * stepDepth],
        [width, firstStepHeight, stepDepth],
        concreteMat,
        true,
        true,
        false,
      );
    }
  }

  function addSpawnPad(position, size, material) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    pad.position.set(...position);
    pad.receiveShadow = false;
    scene.add(pad);
  }

  function addCoverBox(position, size, index) {
    addBox(position, size, coverMat, true, true);
    addCoverDetails(position, size, index);
  }

  function addCoverDetails(position, size, index) {
    const [x, y, z] = position;
    const [w, h, d] = size;
    const topY = y + h / 2 + 0.012;
    const bandY = y + Math.min(h * 0.26, 0.55);
    const longOnX = w >= d;
    const stripeLength = Math.max(0.9, (longOnX ? w : d) * 0.45);
    const stripeWidth = 0.045;

    addBox([x, topY, z], [Math.max(0.25, w - 0.2), 0.035, Math.max(0.25, d - 0.2)], coverTrimMat, false, false);

    if (longOnX) {
      addBox([x, bandY, z - d / 2 - 0.014], [stripeLength, 0.08, stripeWidth], index % 2 ? coverStripeMat : coverDarkMat, false, false);
      addBox([x, bandY + 0.22, z + d / 2 + 0.014], [stripeLength * 0.65, 0.06, stripeWidth], index % 2 ? coverDarkMat : coverStripeMat, false, false);
    } else {
      addBox([x - w / 2 - 0.014, bandY, z], [stripeWidth, 0.08, stripeLength], index % 2 ? coverStripeMat : coverDarkMat, false, false);
      addBox([x + w / 2 + 0.014, bandY + 0.22, z], [stripeWidth, 0.06, stripeLength * 0.65], index % 2 ? coverDarkMat : coverStripeMat, false, false);
    }

    if (h > 2.4) {
      addBox([x, y + h / 2 - 0.42, z], [Math.min(w, 0.5), 0.16, Math.min(d, 0.5)], coverDarkMat, false, false);
    }
  }
}

function addBox(position, size, material, blocksMovement = true, walkable = false, blocksBots = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  mesh.updateMatrixWorld();
  const box = new THREE.Box3().setFromObject(mesh);
  const bottom = position[1] - size[1] / 2;
  const top = position[1] + size[1] / 2;
  if (blocksMovement) {
    colliders.push(box);
    if (blocksBots) botColliders.push(box);
    solidObstacles.push({ box, bottom, top });
  }
  if (walkable || top <= 1.8) {
    walkableSurfaces.push({
      xMin: position[0] - size[0] / 2,
      xMax: position[0] + size[0] / 2,
      zMin: position[2] - size[2] / 2,
      zMax: position[2] + size[2] / 2,
      top,
    });
  }
  shootables.push(mesh);
}

function spawnWave() {
  startRound(1);
}

function spawnHumanoid(position, index, team = "enemy") {
  const group = new THREE.Group();
  group.position.set(...position);
  scene.add(group);
  const visual = new THREE.Group();
  visual.rotation.y = Math.PI;
  group.add(visual);

  const uniform = new THREE.MeshStandardMaterial({ color: team === "terrorist" ? 0x5b4932 : 0x233c52, roughness: 0.72 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98b62, roughness: 0.68 });
  const vest = new THREE.MeshStandardMaterial({ color: team === "terrorist" ? 0x65412d : 0x1f4e7a, roughness: 0.74 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111615, roughness: 0.7 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x0d1416, roughness: 0.25, metalness: 0.25 });

  const body = partBox(visual, [0, 1.2, 0], [0.82, 1.1, 0.42], vest, "torso", 1);
  const chestPlate = partBox(visual, [0, 1.36, -0.24], [0.58, 0.46, 0.08], dark, "torso", 1);
  const head = partSphere(visual, [0, 2.05, 0], 0.32, skin, "head", 3);
  const helmet = partSphere(visual, [0, 2.16, 0], 0.35, dark, "head", 3);
  helmet.scale.y = 0.58;
  const face = partBox(visual, [0, 2.06, -0.3], [0.42, 0.14, 0.05], visor, "head", 3);
  const leftEye = partBox(visual, [-0.11, 2.08, -0.337], [0.06, 0.045, 0.025], dark, "head", 3);
  const rightEye = partBox(visual, [0.11, 2.08, -0.337], [0.06, 0.045, 0.025], dark, "head", 3);
  const nose = partBox(visual, [0, 2.01, -0.35], [0.045, 0.09, 0.04], skin, "head", 3);
  const mouth = partBox(visual, [0, 1.93, -0.342], [0.18, 0.035, 0.026], dark, "head", 3);
  const leftArm = partBox(visual, [-0.24, 1.48, -0.76], [0.22, 0.2, 1.18], uniform, "arm", 0.75);
  const rightArm = partBox(visual, [0.28, 1.45, -0.72], [0.22, 0.2, 1.12], uniform, "arm", 0.75);
  const leftLeg = partBox(visual, [-0.24, 0.42, 0], [0.26, 0.84, 0.28], uniform, "leg", 0.65);
  const rightLeg = partBox(visual, [0.24, 0.42, 0], [0.26, 0.84, 0.28], uniform, "leg", 0.65);
  leftArm.rotation.x = -0.28;
  leftArm.rotation.z = -0.12;
  rightArm.rotation.x = -0.32;
  rightArm.rotation.z = 0.12;
  const enemyGun = partBox(visual, [0.06, 1.48, -1.02], [0.22, 0.18, 1.32], dark, "arm", 0.75);
  const enemyBarrel = partCylinder(visual, [0.06, 1.48, -1.74], 0.045, 0.54, dark, "arm", 0.75);

  const parts = [
    body,
    chestPlate,
    head,
    helmet,
    face,
    leftEye,
    rightEye,
    nose,
    mouth,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    enemyGun,
    enemyBarrel,
  ];
  const enemy = {
    id: index,
    team,
    group,
    visual,
    parts,
    health: 100,
    speed: 3.45,
    detectionRange: 42,
    attackRange: 22,
    damage: 8,
    fireRate: 900,
    lastShotAt: 0,
    state: "roaming",
    patrolAngle: Math.random() * Math.PI * 2,
    roamTarget: randomMapPoint(),
    stride: Math.random() * Math.PI * 2,
    limbs: { leftArm, rightArm, leftLeg, rightLeg, enemyGun, enemyBarrel },
    ragdollParts: {
      body,
      chestPlate,
      head,
      helmet,
      face,
      leftEye,
      rightEye,
      nose,
      mouth,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      enemyGun,
      enemyBarrel,
    },
    baseY: 0,
    lastRetargetAt: 0,
    avoidUntil: 0,
    avoidDirection: new THREE.Vector3(),
    avoidObstacle: null,
    lastMovePosition: group.position.clone(),
    stuckTime: 0,
    originalMaterials: new Map(),
    ragdoll: null,
    respawnTimer: null,
  };

  parts.forEach((part) => {
    part.userData.enemy = enemy;
    enemy.originalMaterials.set(part, part.material);
  });
  enemies.push(enemy);
  enemyHitParts.push(...parts);
}

function startRound(roundNumber = roundState.round) {
  clearBots();
  clearRoundProjectiles();
  roundState.round = roundNumber;
  roundState.active = true;
  roundState.matchOver = false;
  roundState.bomb.state = "carried";
  roundState.bomb.plantedAt = 0;
  player.isPlanting = false;
  player.plantStartedAt = 0;
  if (roundState.bomb.mesh) {
    scene.remove(roundState.bomb.mesh);
    roundState.bomb.mesh = null;
  }
  if (roundState.bomb.pendingMesh) {
    scene.remove(roundState.bomb.pendingMesh);
    roundState.bomb.pendingMesh = null;
  }

  resetPlayerForRound();
  for (let i = 1; i < TEAM_SIZE; i++) {
    spawnHumanoid(playerTeamSpawns[i], i, "terrorist");
  }
  for (let i = 0; i < TEAM_SIZE; i++) {
    spawnHumanoid(enemyTeamSpawns[i], i, "counter");
  }

  showMessage(`Round ${roundState.round} / ${MAX_ROUNDS}`);
  updateUI();
}

function clearBots() {
  enemies.splice(0).forEach((bot) => {
    window.clearTimeout(bot.respawnTimer);
    scene.remove(bot.group);
  });
  enemyHitParts = [];
}

function clearRoundProjectiles() {
  activeGrenades.splice(0).forEach((grenade) => {
    scene.remove(grenade.mesh);
  });
  bulletTracers.splice(0).forEach((tracer) => {
    scene.remove(tracer.mesh);
    scene.remove(tracer.slug);
  });
  explosionEffects.splice(0).forEach((explosion) => {
    scene.remove(explosion.mesh);
  });
}

function resetPlayerForRound() {
  player.health = 100;
  player.grenades = 3;
  player.hasBomb = true;
  player.activeSlot = 1;
  player.isPlanting = false;
  player.plantStartedAt = 0;
  player.alive = true;
  player.velocity.set(0, 0, 0);
  player.verticalVelocity = 0;
  player.grounded = true;
  player.moveIntensity = 0;
  player.spreadHeat = 0;
  camera.position.set(playerTeamSpawns[0][0], 1.65, playerTeamSpawns[0][2]);
  camera.rotation.set(0, -Math.PI / 4, 0);
  buildWeaponModel(player.weapon.key);
  if (gameStarted) prompt.classList.add("hidden");
  startButton.style.display = "";
}

function buildWeaponModel(key) {
  Object.keys(weaponParts).forEach((partKey) => delete weaponParts[partKey]);
  reloadAnimation = null;
  boltAnimation = null;
  grenadeThrowAnimation = null;
  while (weaponRig.children.length) {
    const child = weaponRig.children.pop();
    disposeObject(child);
  }

  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2325, roughness: 0.65 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x4c5658, roughness: 0.48, metalness: 0.35 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x141716, roughness: 0.8 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xb98a45, roughness: 0.52, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x14242a, roughness: 0.18, metalness: 0.2 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98b62, roughness: 0.68 });
  const matte = new THREE.MeshStandardMaterial({ color: 0x090c0d, roughness: 0.92, metalness: 0.08 });
  const lightMetal = new THREE.MeshStandardMaterial({ color: 0x7d8788, roughness: 0.36, metalness: 0.55 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x080908, roughness: 0.96 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x3c3325, roughness: 0.8 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x111312, roughness: 0.86 });
  const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x28332e, roughness: 0.72, metalness: 0.25 });
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xb7aa78, roughness: 0.35, metalness: 0.65 });

  if (key === "pistol") {
    gunBox([0, 0, 0], [0.18, 0.16, 0.56], metal);
    gunBox([0, 0.08, -0.02], [0.2, 0.07, 0.62], lightMetal);
    gunBox([0, 0.145, -0.08], [0.15, 0.03, 0.4], matte);
    gunBox([0, -0.18, 0.14], [0.12, 0.36, 0.14], grip);
    weaponParts.mag = gunBox([0, -0.38, 0.14], [0.09, 0.24, 0.105], dark);
    gunBox([0, 0.1, -0.08], [0.145, 0.07, 0.28], dark);
    gunCylinder([0, 0.03, -0.39], 0.045, 0.34, dark);
    gunCylinder([0, 0.032, -0.42], 0.027, 0.4, lightMetal);
    gunBox([0, -0.03, -0.12], [0.08, 0.07, 0.18], accent);
    gunBox([0, 0.17, 0.12], [0.135, 0.03, 0.08], dark);
    gunBox([0, 0.17, -0.22], [0.13, 0.03, 0.06], dark);
    gunBox([-0.098, -0.02, -0.02], [0.024, 0.075, 0.34], dark);
    gunBox([0, -0.26, -0.02], [0.15, 0.038, 0.22], matte);
    gunBox([0, -0.29, 0.02], [0.1, 0.03, 0.12], lightMetal);
    gunBox([0, -0.5, 0.14], [0.125, 0.048, 0.16], matte);
    gunBox([0.081, -0.18, 0.14], [0.012, 0.3, 0.11], matte);
    gunBox([-0.081, -0.18, 0.14], [0.012, 0.3, 0.11], matte);
    gunBox([0.109, 0.02, 0.11], [0.018, 0.06, 0.08], lightMetal);
    gunBox([-0.109, 0.02, 0.11], [0.018, 0.06, 0.08], lightMetal);
    addGunScrews([
      [-0.106, -0.08, 0.2],
      [-0.106, -0.22, 0.07],
      [0.106, -0.08, 0.2],
      [0.106, -0.22, 0.07],
    ], 0.012, lightMetal);
    addGunRail(0, -0.46, 0.05, 0.11, 4, matte, 0.15);
  } else if (key === "bomb") {
    gunBox([0, -0.02, -0.08], [0.44, 0.28, 0.34], dark);
    gunBox([0, 0.15, -0.08], [0.36, 0.1, 0.26], glass);
    gunBox([-0.16, -0.18, -0.08], [0.08, 0.18, 0.28], accent);
    gunBox([0.16, -0.18, -0.08], [0.08, 0.18, 0.28], accent);
    gunCylinder([0, 0.0, -0.36], 0.025, 0.36, accent);
  } else if (key === "smg") {
    gunBox([0, 0.0, -0.02], [0.18, 0.18, 0.68], metal);
    gunBox([0, 0.095, -0.08], [0.205, 0.07, 0.62], matte);
    gunCylinder([0, 0.065, -0.56], 0.05, 0.5, matte);
    gunCylinder([0, 0.015, -0.78], 0.04, 0.36, dark);
    gunCylinder([0, 0.015, -1.0], 0.052, 0.11, matte);
    gunCylinder([0, 0.015, -1.08], 0.03, 0.1, lightMetal);
    gunBox([0, -0.21, 0.05], [0.12, 0.42, 0.16], grip);
    gunBox([0, -0.08, 0.36], [0.16, 0.1, 0.28], dark);
    gunBox([0, -0.17, -0.34], [0.17, 0.13, 0.34], rubber);
    gunBox([0, -0.17, -0.55], [0.15, 0.11, 0.16], rubber);
    gunBox([0.13, -0.08, -0.08], [0.04, 0.26, 0.12], accent);
    weaponParts.mag = gunBox([0, -0.38, -0.12], [0.105, 0.48, 0.13], dark);
    gunBox([0, -0.48, -0.16], [0.11, 0.24, 0.13], dark);
    gunBox([0, -0.62, -0.2], [0.12, 0.05, 0.14], matte);
    gunBox([0.068, -0.39, -0.12], [0.012, 0.4, 0.09], lightMetal);
    gunBox([-0.068, -0.39, -0.12], [0.012, 0.4, 0.09], lightMetal);
    gunBox([0, 0.165, 0.36], [0.14, 0.055, 0.4], dark);
    gunBox([0, 0.205, -0.33], [0.09, 0.055, 0.05], matte);
    gunBox([0, 0.205, 0.16], [0.08, 0.07, 0.04], matte);
    gunBox([0.13, 0.13, -0.42], [0.04, 0.055, 0.2], lightMetal);
    gunBox([0.16, 0.09, -0.56], [0.07, 0.045, 0.06], lightMetal);
    gunBox([-0.13, 0.02, 0.1], [0.035, 0.055, 0.22], lightMetal);
    gunBox([0.13, 0.02, 0.1], [0.035, 0.055, 0.22], lightMetal);
    gunBox([0, -0.21, -0.25], [0.16, 0.065, 0.18], matte);
    gunBox([0, -0.255, -0.25], [0.075, 0.035, 0.09], lightMetal);
    addGunRail(0, 0.205, -0.1, 0.08, 5, matte, 0.135);
    addGunScrews([
      [-0.112, 0.04, 0.12],
      [-0.112, 0.04, -0.26],
      [0.112, 0.04, 0.12],
      [0.112, 0.04, -0.26],
    ], 0.013, lightMetal);
  } else if (key === "rifle") {
    gunBox([0, 0, -0.14], [0.28, 0.2, 1.08], metal);
    gunBox([0, 0.12, -0.22], [0.34, 0.09, 0.95], matte);
    gunBox([0, 0.22, -0.42], [0.2, 0.08, 0.62], lightMetal);
    gunBox([0, -0.24, 0.16], [0.2, 0.42, 0.2], grip);
    gunCylinder([0, 0.02, -1.0], 0.045, 0.8, dark);
    gunCylinder([0, 0.02, -1.44], 0.072, 0.18, matte);
    gunCylinder([0, 0.02, -1.56], 0.036, 0.14, lightMetal);
    gunBox([0, -0.04, 0.5], [0.24, 0.18, 0.38], accent);
    gunBox([0, 0.18, -0.2], [0.2, 0.055, 0.5], matte);
    gunBox([0, -0.02, 0.82], [0.34, 0.16, 0.32], dark);
    gunBox([0, -0.03, 1.08], [0.28, 0.14, 0.42], rubber);
    gunBox([0, -0.04, 1.32], [0.38, 0.2, 0.08], rubber);
    weaponParts.mag = gunBox([0, -0.34, -0.22], [0.18, 0.56, 0.18], dark);
    gunBox([0.11, -0.34, -0.22], [0.018, 0.48, 0.13], lightMetal);
    gunBox([-0.11, -0.34, -0.22], [0.018, 0.48, 0.13], lightMetal);
    gunBox([0, -0.63, -0.22], [0.21, 0.055, 0.19], matte);
    gunBox([0, 0.16, 0.52], [0.24, 0.08, 0.62], dark);
    gunCylinder([0.16, 0.02, -1.0], 0.022, 0.74, accent);
    gunCylinder([-0.16, 0.02, -1.0], 0.022, 0.74, accent);
    gunBox([0, -0.25, -0.5], [0.26, 0.08, 0.2], matte);
    gunBox([0, -0.3, -0.5], [0.12, 0.045, 0.12], lightMetal);
    gunBox([0.21, 0.02, -0.1], [0.06, 0.07, 0.34], lightMetal);
    gunBox([-0.21, 0.02, -0.1], [0.06, 0.07, 0.34], lightMetal);
    gunBox([0, 0.31, -0.52], [0.12, 0.09, 0.06], matte);
    gunBox([0, 0.31, 0.12], [0.11, 0.11, 0.055], matte);
    addGunRail(0, 0.28, -0.45, 0.09, 9, matte);
    addGunRail(0, -0.08, -0.72, 0.09, 6, matte);
    addGunScrews([
      [-0.2, 0.06, 0.16],
      [-0.2, 0.06, -0.42],
      [0.2, 0.06, 0.16],
      [0.2, 0.06, -0.42],
    ], 0.019, lightMetal);
  } else {
    gunBox([0, 0, -0.18], [0.24, 0.18, 1.26], metal);
    gunBox([0, -0.22, 0.34], [0.18, 0.42, 0.18], grip);
    gunBox([0, 0.11, -0.24], [0.3, 0.075, 1.0], matte);
    gunCylinder([0, 0.18, -0.18], 0.14, 0.42, glass);
    gunCylinder([0, 0.18, -0.18], 0.105, 0.5, matte);
    gunCylinder([0, 0.18, -0.18], 0.082, 0.54, glass);
    gunBox([0, 0.18, 0.12], [0.1, 0.18, 0.12], matte);
    gunBox([0, 0.18, -0.48], [0.1, 0.18, 0.12], matte);
    gunCylinder([0, 0.04, -1.16], 0.038, 1.08, accent);
    gunCylinder([0, 0.04, -1.74], 0.07, 0.22, matte);
    gunCylinder([0, 0.04, -1.88], 0.035, 0.12, lightMetal);
    gunBox([0, -0.02, 0.78], [0.34, 0.16, 0.38], dark);
    gunBox([0, -0.04, 1.1], [0.3, 0.15, 0.48], rubber);
    gunBox([0, -0.04, 1.38], [0.42, 0.22, 0.08], rubber);
    gunBox([0, 0.18, -0.52], [0.12, 0.09, 0.42], dark);
    gunBox([0, 0.18, -0.18], [0.48, 0.08, 0.08], dark);
    gunBox([0, 0.18, -0.02], [0.08, 0.36, 0.08], dark);
    weaponParts.bolt = gunBox([0.26, 0.12, -0.24], [0.1, 0.08, 0.36], accent);
    gunBox([0.34, 0.12, -0.43], [0.05, 0.12, 0.08], lightMetal);
    weaponParts.mag = gunBox([0, -0.34, 0.02], [0.18, 0.5, 0.18], grip);
    gunBox([0.11, -0.34, 0.02], [0.018, 0.42, 0.13], lightMetal);
    gunBox([-0.11, -0.34, 0.02], [0.018, 0.42, 0.13], lightMetal);
    gunCylinder([0, 0.06, -1.72], 0.055, 0.18, dark);
    gunBox([0, -0.25, -0.34], [0.23, 0.08, 0.18], matte);
    gunBox([0, -0.3, -0.34], [0.1, 0.045, 0.1], lightMetal);
    gunBox([0, 0.32, -0.86], [0.14, 0.08, 0.1], matte);
    gunBox([0, 0.32, 0.32], [0.14, 0.08, 0.1], matte);
    addGunRail(0, 0.28, -0.58, 0.09, 8, matte);
    addGunScrews([
      [-0.18, 0.05, 0.2],
      [-0.18, 0.05, -0.56],
      [0.18, 0.05, 0.2],
      [0.18, 0.05, -0.56],
    ], 0.018, lightMetal);
  }

  if (key !== "bomb") {
    weaponParts.reloadHand = gunBox([-0.32, -0.72, 0.1], [0.22, 0.14, 0.24], skin);
    weaponParts.reloadHand.visible = false;
    weaponParts.freshMag = gunBox([-0.38, -1.0, 0.2], [0.16, key === "pistol" ? 0.24 : 0.48, 0.14], dark);
    weaponParts.freshMag.visible = false;
    weaponParts.magHome = weaponParts.mag?.position.clone();
    weaponParts.boltHome = weaponParts.bolt?.position.clone();
  }

  addFirstPersonArms(key, skin, sleeve, glove, grenadeMat, pinMat);
}

function addFirstPersonArms(key, skin, sleeve, glove, grenadeMat, pinMat) {
  const compact = key === "pistol";
  const supportZ = compact ? -0.1 : -0.38;
  const supportY = compact ? -0.32 : -0.22;

  weaponParts.rightSleeve = gunBox([0.52, -0.54, 0.36], [0.28, 0.22, 0.82], sleeve);
  weaponParts.rightSleeve.rotation.x = 0.66;
  weaponParts.rightSleeve.rotation.z = -0.12;
  weaponParts.rightHand = gunBox([0.25, -0.2, compact ? 0.08 : 0.04], [0.25, 0.18, 0.29], glove);
  weaponParts.rightHand.rotation.x = 0.16;
  weaponParts.rightThumb = gunBox([0.12, -0.18, compact ? -0.02 : -0.08], [0.09, 0.07, 0.23], skin);
  weaponParts.rightThumb.rotation.z = -0.18;

  weaponParts.leftSleeve = gunBox([-0.72, supportY - 0.2, supportZ + 0.28], [0.28, 0.22, compact ? 0.76 : 1.02], sleeve);
  weaponParts.leftSleeve.rotation.x = compact ? 0.5 : 0.72;
  weaponParts.leftSleeve.rotation.z = 0.48;
  weaponParts.leftHand = gunBox([compact ? -0.12 : -0.06, supportY + 0.08, supportZ - 0.08], [0.27, 0.18, 0.3], glove);
  weaponParts.leftHand.rotation.x = compact ? 0.02 : 0.08;
  weaponParts.leftHand.rotation.y = compact ? 0.1 : 0.18;
  weaponParts.leftHand.rotation.z = compact ? 0.18 : 0.08;

  weaponParts.heldGrenade = createViewGrenade(grenadeMat, pinMat);
  weaponParts.heldGrenade.visible = false;
}

function createViewGrenade(grenadeMat, pinMat) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), grenadeMat);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.08), pinMat);
  const pin = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 18), pinMat);
  band.position.y = 0.08;
  pin.position.set(0.02, 0.17, 0.01);
  pin.rotation.x = Math.PI / 2;
  group.add(body, band, pin);
  group.position.set(-0.24, -0.38, -0.4);
  weaponRig.add(group);
  return group;
}

function setFirstPersonArmPose(key = player.weapon?.key) {
  const compact = key === "pistol";
  const supportZ = compact ? -0.1 : -0.38;
  const supportY = compact ? -0.32 : -0.22;

  if (weaponParts.rightSleeve) {
    weaponParts.rightSleeve.position.set(0.52, -0.54, 0.36);
    weaponParts.rightSleeve.rotation.set(0.66, 0, -0.12);
  }
  if (weaponParts.rightHand) {
    weaponParts.rightHand.position.set(0.25, -0.2, compact ? 0.08 : 0.04);
    weaponParts.rightHand.rotation.set(0.16, 0, 0);
  }
  if (weaponParts.rightThumb) {
    weaponParts.rightThumb.position.set(0.12, -0.18, compact ? -0.02 : -0.08);
    weaponParts.rightThumb.rotation.set(0, 0, -0.18);
  }
  if (weaponParts.leftSleeve) {
    weaponParts.leftSleeve.position.set(compact ? -0.62 : -0.56, supportY - 0.16, supportZ + 0.24);
    weaponParts.leftSleeve.rotation.set(compact ? 0.48 : 0.64, compact ? 0.04 : 0.1, compact ? 0.4 : 0.28);
  }
  if (weaponParts.leftHand) {
    weaponParts.leftHand.position.set(compact ? -0.12 : -0.06, supportY + 0.08, supportZ - 0.08);
    weaponParts.leftHand.rotation.set(compact ? 0.02 : 0.08, compact ? 0.1 : 0.18, compact ? 0.18 : 0.08);
    weaponParts.leftHand.visible = true;
  }
  if (weaponParts.heldGrenade) {
    weaponParts.heldGrenade.visible = false;
    weaponParts.heldGrenade.position.set(-0.24, -0.38, -0.4);
    weaponParts.heldGrenade.rotation.set(0, 0, 0);
  }
}

function addGunRail(x, y, zStart, spacing, count, material, width = 0.24) {
  for (let i = 0; i < count; i++) {
    gunBox([x, y, zStart - i * spacing], [width, 0.035, 0.035], material);
  }
}

function addGunScrews(points, radius, material) {
  points.forEach((point) => {
    gunCylinder(point, radius, 0.018, material);
  });
}

function gunBox(position, size, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = false;
  weaponRig.add(mesh);
  return mesh;
}

function gunCylinder(position, radius, length, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...position);
  mesh.castShadow = false;
  weaponRig.add(mesh);
  return mesh;
}

function partBox(group, position, size, material, hitZone, multiplier) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material.clone());
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.userData.hitZone = hitZone;
  mesh.userData.multiplier = multiplier;
  group.add(mesh);
  return mesh;
}

function partSphere(group, position, radius, material, hitZone, multiplier) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), material.clone());
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.userData.hitZone = hitZone;
  mesh.userData.multiplier = multiplier;
  group.add(mesh);
  return mesh;
}

function partCylinder(group, position, radius, length, material, hitZone, multiplier) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material.clone());
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.userData.hitZone = hitZone;
  mesh.userData.multiplier = multiplier;
  group.add(mesh);
  return mesh;
}

function wireInput() {
  const closeBuy = document.querySelector("#closeBuy");
  const euler = new THREE.Euler(0, 0, 0, "YXZ");

  startButton.addEventListener("click", () => {
    gameStarted = true;
    prompt.classList.add("hidden");
    document.body.requestPointerLock();
  });

  closeBuy.addEventListener("click", closeBuyMenu);

  document.body.addEventListener("click", (event) => {
    if (!gameStarted || event.target.closest("#buyMenu")) return;
    document.body.requestPointerLock();
  });

  document.addEventListener("contextmenu", (event) => event.preventDefault());

  document.addEventListener("keydown", (event) => {
    keys[event.code === "Space" ? "space" : event.key.toLowerCase()] = true;
    if (event.key === "1") equipSlot(1);
    if (event.key === "2") equipSlot(2);
    if (event.key.toLowerCase() === "b") toggleBuyMenu();
    if (event.key.toLowerCase() === "r") reloadWeapon();
    if (event.key.toLowerCase() === "g") throwGrenade();
    if (event.code === "Space") event.preventDefault();
  });

  document.addEventListener("keyup", (event) => {
    keys[event.code === "Space" ? "space" : event.key.toLowerCase()] = false;
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== document.body) return;
    const lookSpeed = scoped ? 0.0009 : 0.002;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= event.movementX * lookSpeed;
    euler.x -= event.movementY * lookSpeed;
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
    camera.quaternion.setFromEuler(euler);
  });

  window.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      fireHeld = true;
      fireHeldAt = performance.now();
      burstShots = 0;
      if (document.pointerLockElement === document.body) shoot();
    }

    if (event.button === 2 && player.weapon?.key === "sniper" && document.pointerLockElement === document.body) {
      setScoped(true);
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      fireHeld = false;
      fireHeldAt = 0;
      burstShots = 0;
    }
    if (event.button === 2) setScoped(false);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function toggleBuyMenu() {
  if (buyMenu.classList.contains("hidden")) {
    buyMenu.classList.remove("hidden");
    renderBuyMenu();
    document.exitPointerLock?.();
    setScoped(false);
  } else {
    closeBuyMenu();
  }
}

function closeBuyMenu() {
  buyMenu.classList.add("hidden");
  if (gameStarted && player.alive) document.body.requestPointerLock();
}

function equipSlot(slot) {
  if (player.isPlanting) return;
  if (slot === 2 && !player.hasBomb) return;
  player.activeSlot = slot;
  fireHeld = false;
  setScoped(false);
  buildWeaponModel(slot === 2 ? "bomb" : player.weapon.key);
  showMessage(slot === 2 ? "Bomb equipped" : `${player.weapon.name} equipped`);
  updateUI();
}

function setScoped(value) {
  scoped = value && player.activeSlot === 1 && player.weapon?.key === "sniper";
  camera.fov = scoped ? scopedFov : defaultFov;
  camera.updateProjectionMatrix();
  scopeOverlay.classList.toggle("hidden", !scoped);
  document.body.classList.toggle("scoped", scoped);
  weaponRig.visible = !scoped;
}

function renderBuyMenu() {
  weaponList.innerHTML = "";
  Object.entries(weaponCatalog).forEach(([key, weapon]) => {
    const button = document.createElement("button");
    button.className = "weapon-option";
    button.type = "button";
    const owned = player.inventory.some((item) => item.key === key);
    button.innerHTML = `
      <strong>${weapon.name}</strong>
      <small>${owned ? "Owned" : `$${weapon.price}`}</small>
      <span>${weapon.type} | damage ${weapon.damage} | ammo ${weapon.maxAmmo}</span>
    `;
    button.addEventListener("click", () => buyWeapon(key));
    weaponList.append(button);
  });
}

function buyWeapon(key) {
  const owned = player.inventory.find((item) => item.key === key);
  if (owned) {
    player.weapon = owned;
    showMessage(`Equipped ${owned.name}`);
    if (player.activeSlot === 1) buildWeaponModel(owned.key);
    setScoped(false);
    updateUI();
    return;
  }

  const weapon = weaponCatalog[key];
  if (player.money < weapon.price) {
    showMessage("Not enough money");
    return;
  }

  player.money -= weapon.price;
  player.weapon = createWeapon(key);
  player.inventory.push(player.weapon);
  player.activeSlot = 1;
  buildWeaponModel(key);
  showMessage(`Bought ${player.weapon.name}`);
  renderBuyMenu();
  updateUI();
}

function isAutomatic(weapon) {
  return Boolean(weapon?.automatic);
}

function shoot() {
  const weapon = player.weapon;
  const now = performance.now();
  if (!roundState.active || !player.alive || !weapon || weapon.isReloading || !buyMenu.classList.contains("hidden")) return;
  if (player.activeSlot === 2) {
    startPlantBomb();
    return;
  }
  if (weapon.ammo <= 0) {
    showMessage("Reload");
    return;
  }
  if (now - weapon.lastShotAt < weapon.fireRate) return;

  weapon.lastShotAt = now;
  weapon.ammo--;
  if (weapon.key === "sniper") startBoltAnimation();
  const currentSpread = getCurrentSpread(weapon, now);
  burstShots += 1;
  player.spreadHeat = Math.min(1, player.spreadHeat + (weapon.automatic ? 0.12 : 0.18));
  raycaster.setFromCamera(
    {
      x: (Math.random() - 0.5) * currentSpread,
      y: (Math.random() - 0.5) * currentSpread,
    },
    camera,
  );
  raycaster.far = weapon.range;

  const hits = raycaster.intersectObjects([...enemyHitParts, ...shootables], false);
  const endPoint = hits.length
    ? hits[0].point
    : camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(weapon.range));
  const startPoint = getMuzzlePosition(raycaster.ray.direction);
  weaponRecoil = Math.min(1.25, weaponRecoil + (weapon.key === "sniper" ? 1.15 : 0.72));
  weaponKickSide = THREE.MathUtils.clamp(weaponKickSide + (Math.random() - 0.5) * 0.45, -0.45, 0.45);

  let onBulletImpact = null;
  if (hits.length > 0) {
    const hit = hits[0];
    const enemy = hit.object.userData.enemy;
    if (enemy) {
      const multiplier = hit.object.userData.multiplier || 1;
      onBulletImpact = () => {
        if (enemy.state === "dead") return;
        addImpact(hit.point, true);
        damageEnemy(enemy, weapon.damage * multiplier, hit.object.userData.hitZone);
        if (enemy.team === "terrorist") showMessage("Friendly hit");
      };
    } else {
      onBulletImpact = () => addImpact(hit.point, false);
    }
  }
  addBulletTracer(startPoint, endPoint, 0xffe6a3, 118, onBulletImpact);

  updateUI();
}

function startPlantBomb() {
  if (player.isPlanting || !player.hasBomb || roundState.bomb.state !== "carried") return;
  const flatPlayer = new THREE.Vector3(camera.position.x, 0.05, camera.position.z);
  const distance = flatPlayer.distanceTo(roundState.bomb.sitePosition);
  if (distance > 5.2) {
    showMessage("Move to bomb site");
    return;
  }

  player.isPlanting = true;
  player.plantStartedAt = performance.now();
  player.velocity.set(0, 0, 0);
  fireHeld = false;
  roundState.bomb.pendingMesh = createPlantingBombView();
  showMessage("Planting bomb...");
}

function finishPlantBomb() {
  if (!player.isPlanting) return;
  player.isPlanting = false;
  player.hasBomb = false;
  roundState.bomb.state = "planted";
  roundState.bomb.plantedAt = performance.now();
  if (roundState.bomb.pendingMesh) {
    weaponRig.remove(roundState.bomb.pendingMesh);
    disposeObject(roundState.bomb.pendingMesh);
    roundState.bomb.pendingMesh = null;
  }
  roundState.bomb.mesh = createPlantedBomb(roundState.bomb.sitePosition);
  buildWeaponModel(player.weapon.key);
  player.activeSlot = 1;
  showMessage("Bomb planted");
  endRound("terrorist", "Bomb planted");
}

function cancelPlantBomb() {
  if (!player.isPlanting) return;
  player.isPlanting = false;
  player.plantStartedAt = 0;
  if (roundState.bomb.pendingMesh) {
    weaponRig.remove(roundState.bomb.pendingMesh);
    disposeObject(roundState.bomb.pendingMesh);
    roundState.bomb.pendingMesh = null;
  }
  buildWeaponModel("bomb");
}

function createPlantingBombView() {
  while (weaponRig.children.length) {
    const child = weaponRig.children.pop();
    disposeObject(child);
  }

  const group = new THREE.Group();
  group.name = "plantingBombView";
  const bombBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.28, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x171b18, roughness: 0.82 }),
  );
  const keypad = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.06, 0.28),
    new THREE.MeshBasicMaterial({ color: 0x2ee06d }),
  );
  keypad.position.y = 0.18;
  const hand = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.13, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xb98b62, roughness: 0.65 }),
  );
  hand.name = "plantHand";
  hand.position.set(0.18, 0.48, -0.05);
  group.add(bombBody, keypad, hand);
  group.position.set(0, 0, 0);
  weaponRig.add(group);
  return group;
}

function createPlantedBomb(position) {
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.3, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x171b18, roughness: 0.8 }),
  );
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xff4433 }),
  );
  screen.position.y = 0.2;
  mesh.add(body, screen);
  mesh.position.set(position.x, 0.25, position.z);
  scene.add(mesh);
  return mesh;
}

function getCurrentSpread(weapon, now) {
  if (burstShots === 0) return 0;

  const heldSeconds = fireHeldAt ? Math.max(0, (now - fireHeldAt) / 1000) : 0;
  const bloom = Math.min(1, burstShots / 9 + heldSeconds * 0.65);
  const movementPenalty = player.moveIntensity * 0.35 + (player.grounded ? 0 : 0.45);
  const scopedModifier = scoped ? 0.2 : 1;
  return weapon.spread * scopedModifier * Math.min(1.45, bloom + player.spreadHeat * 0.35 + movementPenalty);
}

function reloadWeapon() {
  const weapon = player.weapon;
  if (!weapon || player.activeSlot !== 1 || weapon.isReloading || weapon.ammo === weapon.maxAmmo) return;
  weapon.isReloading = true;
  reloadAnimation = {
    startedAt: performance.now(),
    duration: weapon.reloadTime,
    weaponKey: weapon.key,
    ammoFilled: false,
  };
  boltAnimation = null;
  showMessage("Reloading");
  updateUI();
  window.setTimeout(() => {
    weapon.ammo = weapon.maxAmmo;
    weapon.isReloading = false;
    reloadAnimation = null;
    resetReloadParts();
    updateUI();
  }, weapon.reloadTime);
}

function startBoltAnimation() {
  boltAnimation = {
    startedAt: performance.now(),
    duration: 430,
  };
}

function throwGrenade() {
  if (
    player.isPlanting ||
    grenadeThrowAnimation ||
    player.weapon?.isReloading ||
    !roundState.active ||
    !player.alive ||
    player.grenades <= 0 ||
    !buyMenu.classList.contains("hidden")
  ) return;

  player.grenades -= 1;
  fireHeld = false;
  setScoped(false);
  grenadeThrowAnimation = {
    startedAt: performance.now(),
    duration: 720,
    released: false,
  };
  showMessage("Grenade out");
  updateUI();
}

function releaseGrenadeProjectile() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const start = camera.position
    .clone()
    .add(direction.clone().multiplyScalar(0.85))
    .add(new THREE.Vector3(0, -0.16, 0));
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x28332e, roughness: 0.72, metalness: 0.25 }),
  );
  const pin = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.012, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0xb7aa78, roughness: 0.35, metalness: 0.65 }),
  );
  pin.position.set(0, 0.15, 0);
  pin.rotation.x = Math.PI / 2;
  mesh.add(pin);
  mesh.position.copy(start);
  scene.add(mesh);

  activeGrenades.push({
    mesh,
    velocity: direction.multiplyScalar(16).add(new THREE.Vector3(0, 4.8, 0)),
    fuse: 2.1,
    bounces: 0,
  });
}

function damageEnemy(enemy, amount, hitZone) {
  if (enemy.state === "dead") return;
  enemy.health -= amount;
  enemy.parts.forEach((part) => {
    part.material.emissive = new THREE.Color(hitZone === "head" ? 0xffd36c : 0x5e160c);
  });
  window.setTimeout(() => {
    if (enemy.state !== "dead") {
      enemy.parts.forEach((part) => {
        part.material.emissive = new THREE.Color(0x000000);
      });
    }
  }, 70);

  if (enemy.health > 0) return;
  enemy.state = "dead";
  startBotRagdoll(enemy, hitZone);
  enemy.parts.forEach((part) => {
    part.material = new THREE.MeshStandardMaterial({ color: 0x2a2d2c, roughness: 0.9 });
  });
  enemyHitParts = enemyHitParts.filter((part) => part.userData.enemy !== enemy);

  const killScore = hitZone === "head" ? 250 : 100;
  if (enemy.team === "counter") {
    player.money += 500;
    player.score += killScore;
    player.kills += 1;
    if (hitZone === "head") player.headshots += 1;
    showMessage(hitZone === "head" ? "Headshot +250" : "Kill +100");
  }
  checkRoundEnd();
}

function startBotRagdoll(enemy, hitZone) {
  const fallSide = Math.random() > 0.5 ? 1 : -1;
  const headshotSnap = hitZone === "head" ? 1.35 : 1;
  enemy.ragdoll = {
    startedAt: performance.now(),
    duration: 760,
    basePosition: enemy.group.position.clone(),
    baseRotation: enemy.group.rotation.clone(),
    fallPitch: -THREE.MathUtils.randFloat(1.12, 1.38) * headshotSnap,
    fallRoll: fallSide * THREE.MathUtils.randFloat(0.08, 0.22),
    slide: new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(0.34),
      0,
      THREE.MathUtils.randFloatSpread(0.34),
    ),
    settled: false,
  };
}

function selectHiddenSpawn(offset = 0) {
  const playerPosition = camera.position.clone();
  const sorted = [...enemySpawnPoints]
    .map((point, index) => ({ point, index }))
    .sort((a, b) => {
      const aDistance = new THREE.Vector3(...a.point).distanceTo(playerPosition);
      const bDistance = new THREE.Vector3(...b.point).distanceTo(playerPosition);
      return bDistance - aDistance;
    });

  for (let i = 0; i < sorted.length; i++) {
    const candidate = sorted[(i + offset) % sorted.length].point;
    const enemyEye = new THREE.Vector3(candidate[0], candidate[1] + 1.4, candidate[2]);
    if (!hasLineOfSight(enemyEye, playerPosition)) return candidate;
  }

  return sorted[offset % sorted.length].point;
}

function addImpact(position, enemyHit) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(enemyHit ? 0.12 : 0.07, 8, 8),
    new THREE.MeshBasicMaterial({ color: enemyHit ? 0xfff2a6 : 0xd6e8ff }),
  );
  mesh.position.copy(position);
  scene.add(mesh);
  window.setTimeout(() => {
    scene.remove(mesh);
    mesh.geometry.dispose();
  }, 180);
}

function getMuzzlePosition(direction) {
  const right = new THREE.Vector3();
  right.crossVectors(direction, camera.up).normalize();
  return camera.position
    .clone()
    .add(direction.clone().multiplyScalar(0.75))
    .add(right.multiplyScalar(0.28))
    .add(new THREE.Vector3(0, -0.22, 0));
}

function addBulletTracer(start, endPoint, color, speed, onImpact = null) {
  const direction = endPoint.clone().sub(start);
  const distance = direction.length();
  if (distance <= 0.1) return;

  const tracerLength = Math.min(2.2, Math.max(0.8, distance * 0.18));
  const geometry = new THREE.CylinderGeometry(0.025, 0.012, tracerLength, 8, 1, true);
  const material = new THREE.MeshBasicMaterial({
    color,
    map: bulletTexture,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const tracer = new THREE.Mesh(geometry, material);
  const slug = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8b26b, roughness: 0.34, metalness: 0.75 }),
  );
  const normalized = direction.normalize();
  tracer.position.copy(start);
  slug.position.copy(start);
  tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalized);
  scene.add(tracer);
  scene.add(slug);
  bulletTracers.push({
    mesh: tracer,
    slug,
    start: start.clone(),
    end: endPoint.clone(),
    direction: normalized,
    traveled: 0,
    distance,
    speed,
    life: distance / speed + 0.18,
    onImpact,
    impacted: false,
  });
}

function updateBulletTracers(deltaTime) {
  for (let i = bulletTracers.length - 1; i >= 0; i--) {
    const tracer = bulletTracers[i];
    tracer.life -= deltaTime;
    tracer.traveled += tracer.speed * deltaTime;
    const visibleTravel = Math.min(tracer.traveled, tracer.distance);
    tracer.mesh.position.copy(tracer.start).addScaledVector(tracer.direction, visibleTravel);
    tracer.slug.position.copy(tracer.mesh.position).addScaledVector(tracer.direction, 0.45);
    tracer.mesh.material.opacity = Math.max(0, Math.min(0.9, tracer.life / 0.18));
    if (!tracer.impacted && tracer.traveled >= tracer.distance) {
      tracer.impacted = true;
      tracer.onImpact?.();
    }
    if (tracer.life <= 0 || tracer.traveled >= tracer.distance) {
      scene.remove(tracer.mesh);
      scene.remove(tracer.slug);
      tracer.mesh.geometry.dispose();
      tracer.mesh.material.dispose();
      tracer.slug.geometry.dispose();
      tracer.slug.material.dispose();
      bulletTracers.splice(i, 1);
    }
  }
}

function updateGrenades(deltaTime) {
  for (let i = activeGrenades.length - 1; i >= 0; i--) {
    const grenade = activeGrenades[i];
    grenade.fuse -= deltaTime;
    grenade.velocity.y -= 13 * deltaTime;
    grenade.mesh.position.addScaledVector(grenade.velocity, deltaTime);
    grenade.mesh.rotation.x += deltaTime * 8;
    grenade.mesh.rotation.z += deltaTime * 5;

    if (grenade.mesh.position.y <= 0.2) {
      grenade.mesh.position.y = 0.2;
      grenade.velocity.y = Math.abs(grenade.velocity.y) * 0.42;
      grenade.velocity.x *= 0.7;
      grenade.velocity.z *= 0.7;
      grenade.bounces += 1;
    }

    const hitCover = colliders.some((box) => box.distanceToPoint(grenade.mesh.position) < 0.2);
    if (hitCover && grenade.bounces < 4) {
      grenade.velocity.multiplyScalar(-0.35);
      grenade.velocity.y = Math.abs(grenade.velocity.y) + 1.6;
      grenade.bounces += 1;
    }

    if (grenade.fuse <= 0) {
      explodeGrenade(grenade);
      activeGrenades.splice(i, 1);
    }
  }

  updateExplosions(deltaTime);
}

function explodeGrenade(grenade) {
  const position = grenade.mesh.position.clone();
  scene.remove(grenade.mesh);
  grenade.mesh.traverse((child) => {
    child.geometry?.dispose();
    child.material?.dispose();
  });

  const blast = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff8b33,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  blast.position.copy(position);
  scene.add(blast);
  explosionEffects.push({ mesh: blast, life: 0.35, maxLife: 0.35 });

  enemies.forEach((enemy) => {
    if (enemy.state === "dead") return;
    const enemyCenter = enemy.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    const distance = enemyCenter.distanceTo(position);
    if (distance > 8) return;
    if (!hasLineOfSight(position.clone().add(new THREE.Vector3(0, 0.3, 0)), enemyCenter)) return;

    const damage = THREE.MathUtils.clamp(145 * (1 - distance / 8), 35, 145);
    damageEnemy(enemy, damage, "explosion");
  });

  if (camera.position.distanceTo(position) < 6 && hasLineOfSight(position.clone().add(new THREE.Vector3(0, 0.3, 0)), camera.position)) {
    damagePlayer(35);
  }

  showMessage("Boom");
}

function updateExplosions(deltaTime) {
  for (let i = explosionEffects.length - 1; i >= 0; i--) {
    const explosion = explosionEffects[i];
    explosion.life -= deltaTime;
    const progress = 1 - explosion.life / explosion.maxLife;
    explosion.mesh.scale.setScalar(1 + progress * 7);
    explosion.mesh.material.opacity = Math.max(0, 0.75 * (1 - progress));

    if (explosion.life <= 0) {
      scene.remove(explosion.mesh);
      explosion.mesh.geometry.dispose();
      explosion.mesh.material.dispose();
      explosionEffects.splice(i, 1);
    }
  }
}

function updateWeaponView(deltaTime) {
  if (player.isPlanting) {
    updatePlantAnimation();
    return;
  }

  weaponRecoil = Math.max(0, weaponRecoil - deltaTime * 7.5);
  weaponKickSide = THREE.MathUtils.lerp(weaponKickSide, 0, 1 - Math.exp(-deltaTime * 10));
  player.spreadHeat = Math.max(0, player.spreadHeat - deltaTime * (fireHeld ? 0.55 : 1.8));

  const bob = player.grounded ? Math.sin(player.bobPhase) * 0.018 * player.moveIntensity : 0;
  const sway = player.grounded ? Math.cos(player.bobPhase * 0.5) * 0.025 * player.moveIntensity : 0;
  weaponRig.position.set(
    0.48 + sway + weaponKickSide * 0.035,
    -0.42 - weaponRecoil * 0.026 + bob,
    -0.82 + weaponRecoil * 0.13,
  );
  weaponRig.rotation.x = -weaponRecoil * 0.16 + bob * 1.4;
  weaponRig.rotation.z = weaponKickSide * 0.08 + sway * 0.35;
  setFirstPersonArmPose(player.activeSlot === 2 ? "bomb" : player.weapon?.key);
  updateReloadAnimation();
  updateBoltAnimation();
  updateGrenadeThrowAnimation();
}

function updateReloadAnimation() {
  if (!reloadAnimation) {
    resetReloadParts();
    return;
  }

  const progress = THREE.MathUtils.clamp((performance.now() - reloadAnimation.startedAt) / reloadAnimation.duration, 0, 1);
  const drop = smoothRange(progress, 0.08, 0.34);
  const grab = smoothRange(progress, 0.28, 0.55);
  const insert = smoothRange(progress, 0.58, 0.86);
  const settle = smoothRange(progress, 0.86, 1);
  const magHome = weaponParts.magHome || new THREE.Vector3();
  const magDropAmount = reloadAnimation.weaponKey === "pistol" ? 0.44 : 0.72;

  weaponRig.position.x -= Math.sin(progress * Math.PI) * 0.1;
  weaponRig.position.y -= Math.sin(progress * Math.PI) * 0.12;
  weaponRig.rotation.x += Math.sin(progress * Math.PI) * 0.28;
  weaponRig.rotation.z -= Math.sin(progress * Math.PI) * 0.18;

  if (weaponParts.mag) {
    if (progress < 0.54) {
      weaponParts.mag.visible = true;
      weaponParts.mag.position.copy(magHome).add(new THREE.Vector3(0, -magDropAmount * drop, 0.05 * drop));
      weaponParts.mag.rotation.x = -0.25 * drop;
    } else if (progress < 0.84) {
      weaponParts.mag.visible = false;
    } else {
      weaponParts.mag.visible = true;
      weaponParts.mag.position.copy(magHome).add(new THREE.Vector3(0, -0.18 * (1 - settle), 0.02 * (1 - settle)));
      weaponParts.mag.rotation.x = -0.16 * (1 - settle);
    }
  }

  if (weaponParts.freshMag) {
    weaponParts.freshMag.visible = progress >= 0.28 && progress < 0.88;
    const belt = new THREE.Vector3(-0.36, -1.02, 0.2);
    const ready = magHome.clone().add(new THREE.Vector3(-0.12, -0.32, 0.08));
    const inserted = magHome.clone().add(new THREE.Vector3(0, -0.06, 0.02));
    const firstLeg = belt.clone().lerp(ready, grab);
    const secondLeg = ready.clone().lerp(inserted, insert);
    weaponParts.freshMag.position.copy(progress < 0.58 ? firstLeg : secondLeg);
    weaponParts.freshMag.rotation.x = -0.55 + insert * 0.45;
    weaponParts.freshMag.rotation.z = -0.18 + insert * 0.18;
  }

  if (weaponParts.reloadHand) {
    weaponParts.reloadHand.visible = progress >= 0.12 && progress < 0.96;
    const beltHand = new THREE.Vector3(-0.44, -0.96, 0.28);
    const magHand = magHome.clone().add(new THREE.Vector3(-0.18, -0.32, 0.12));
    const seatHand = magHome.clone().add(new THREE.Vector3(-0.12, -0.02, 0.04));
    weaponParts.reloadHand.position.copy(progress < 0.58 ? beltHand.clone().lerp(magHand, grab) : magHand.clone().lerp(seatHand, insert));
    weaponParts.reloadHand.rotation.x = -0.4 + Math.sin(progress * Math.PI) * 0.5;
    weaponParts.reloadHand.rotation.z = -0.3;
  }

  if (!reloadAnimation.ammoFilled && progress >= 0.82) {
    reloadAnimation.ammoFilled = true;
    player.weapon.ammo = player.weapon.maxAmmo;
    updateUI();
  }
}

function updateBoltAnimation() {
  if (!boltAnimation || !weaponParts.bolt) return;

  const progress = THREE.MathUtils.clamp((performance.now() - boltAnimation.startedAt) / boltAnimation.duration, 0, 1);
  const pullBack = smoothRange(progress, 0.06, 0.42);
  const pushForward = smoothRange(progress, 0.48, 0.86);
  const boltTravel = 0.42 * (pullBack - pushForward);
  weaponParts.bolt.position.copy(weaponParts.boltHome).add(new THREE.Vector3(0.1 * Math.sin(progress * Math.PI), 0.02, boltTravel));
  weaponParts.bolt.rotation.y = -0.28 * Math.sin(progress * Math.PI);
  weaponRig.position.z += Math.sin(progress * Math.PI) * 0.08;
  weaponRig.rotation.z += Math.sin(progress * Math.PI) * 0.08;

  if (progress >= 1) {
    weaponParts.bolt.position.copy(weaponParts.boltHome);
    weaponParts.bolt.rotation.set(0, 0, 0);
    boltAnimation = null;
  }
}

function updateGrenadeThrowAnimation() {
  if (!grenadeThrowAnimation) return;

  const progress = THREE.MathUtils.clamp((performance.now() - grenadeThrowAnimation.startedAt) / grenadeThrowAnimation.duration, 0, 1);
  const draw = smoothRange(progress, 0.02, 0.24);
  const throwForward = smoothRange(progress, 0.25, 0.52);
  const recover = smoothRange(progress, 0.58, 1);
  const swing = draw - throwForward;
  const followThrough = Math.sin(Math.min(1, progress) * Math.PI);
  const heldKey = player.activeSlot === 2 ? "bomb" : player.weapon?.key;
  const compact = heldKey === "pistol";
  const supportZ = compact ? -0.1 : -0.38;
  const supportY = compact ? -0.32 : -0.22;

  weaponRig.position.x += 0.08 * swing;
  weaponRig.position.y -= 0.07 * draw - 0.03 * throwForward;
  weaponRig.rotation.x += 0.14 * draw - 0.22 * throwForward;
  weaponRig.rotation.z += 0.12 * draw - 0.18 * throwForward;

  if (weaponParts.leftSleeve) {
    const sleeveHome = new THREE.Vector3(compact ? -0.62 : -0.56, supportY - 0.16, supportZ + 0.24);
    const sleeveDraw = new THREE.Vector3(-0.7, -0.92, 0.38);
    const sleeveThrow = new THREE.Vector3(-0.36, -0.08, -0.94);
    const drawnSleeve = sleeveHome.clone().lerp(sleeveDraw, draw);
    const thrownSleeve = sleeveDraw.clone().lerp(sleeveThrow, throwForward);
    weaponParts.leftSleeve.position.copy((progress < 0.25 ? drawnSleeve : thrownSleeve).lerp(sleeveHome, recover));
    const sleeveHomeRot = { x: compact ? 0.48 : 0.64, y: compact ? 0.04 : 0.1, z: compact ? 0.4 : 0.28 };
    const sleeveDrawRot = { x: 1.35, y: -0.38, z: -0.7 };
    const sleeveThrowRot = { x: -1.08, y: 0.22, z: 0.46 };
    const sleeveFrom = progress < 0.25 ? sleeveHomeRot : sleeveDrawRot;
    const sleeveTo = progress < 0.25 ? sleeveDrawRot : sleeveThrowRot;
    const sleeveT = progress < 0.25 ? draw : throwForward;
    weaponParts.leftSleeve.rotation.x = THREE.MathUtils.lerp(THREE.MathUtils.lerp(sleeveFrom.x, sleeveTo.x, sleeveT), sleeveHomeRot.x, recover);
    weaponParts.leftSleeve.rotation.y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(sleeveFrom.y, sleeveTo.y, sleeveT), sleeveHomeRot.y, recover);
    weaponParts.leftSleeve.rotation.z = THREE.MathUtils.lerp(THREE.MathUtils.lerp(sleeveFrom.z, sleeveTo.z, sleeveT), sleeveHomeRot.z, recover);
  }

  if (weaponParts.leftHand) {
    const handHome = new THREE.Vector3(compact ? -0.12 : -0.06, supportY + 0.08, supportZ - 0.08);
    const handDraw = new THREE.Vector3(-0.5, -0.78, 0.28);
    const handThrow = new THREE.Vector3(-0.16, -0.02, -1.08);
    const drawnHand = handHome.clone().lerp(handDraw, draw);
    const thrownHand = handDraw.clone().lerp(handThrow, throwForward);
    weaponParts.leftHand.position.copy((progress < 0.25 ? drawnHand : thrownHand).lerp(handHome, recover));
    const handHomeRot = { x: compact ? 0.02 : 0.08, y: compact ? 0.1 : 0.18, z: compact ? 0.18 : 0.08 };
    const handDrawRot = { x: 1.08, y: -0.48, z: -0.58 };
    const handThrowRot = { x: -1.22, y: 0.3, z: 0.76 };
    const handFrom = progress < 0.25 ? handHomeRot : handDrawRot;
    const handTo = progress < 0.25 ? handDrawRot : handThrowRot;
    const handT = progress < 0.25 ? draw : throwForward;
    weaponParts.leftHand.rotation.x = THREE.MathUtils.lerp(THREE.MathUtils.lerp(handFrom.x, handTo.x, handT), handHomeRot.x, recover);
    weaponParts.leftHand.rotation.y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(handFrom.y, handTo.y, handT), handHomeRot.y, recover);
    weaponParts.leftHand.rotation.z = THREE.MathUtils.lerp(THREE.MathUtils.lerp(handFrom.z, handTo.z, handT), handHomeRot.z, recover);
  }

  if (weaponParts.heldGrenade) {
    weaponParts.heldGrenade.visible = !grenadeThrowAnimation.released;
    if (!grenadeThrowAnimation.released) {
      weaponParts.heldGrenade.position.copy(weaponParts.leftHand?.position || new THREE.Vector3(-0.24, -0.38, -0.4));
      weaponParts.heldGrenade.position.add(new THREE.Vector3(-0.02, 0.08, -0.12));
      weaponParts.heldGrenade.rotation.set(progress * 3.2, -0.3 + progress * 0.9, followThrough * 0.7);
    }
  }

  if (!grenadeThrowAnimation.released && progress >= 0.43) {
    grenadeThrowAnimation.released = true;
    if (weaponParts.heldGrenade) weaponParts.heldGrenade.visible = false;
    releaseGrenadeProjectile();
  }

  if (progress >= 1) {
    grenadeThrowAnimation = null;
    setFirstPersonArmPose(player.activeSlot === 2 ? "bomb" : player.weapon?.key);
  }
}

function resetReloadParts() {
  if (weaponParts.mag && weaponParts.magHome) {
    weaponParts.mag.visible = true;
    weaponParts.mag.position.copy(weaponParts.magHome);
    weaponParts.mag.rotation.set(0, 0, 0);
  }
  if (weaponParts.freshMag) weaponParts.freshMag.visible = false;
  if (weaponParts.reloadHand) weaponParts.reloadHand.visible = false;
}

function smoothRange(value, start, end) {
  const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function updatePlantAnimation() {
  const elapsed = (performance.now() - player.plantStartedAt) / 1000;
  const progress = Math.min(1, elapsed / 4);
  const pound = Math.abs(Math.sin(elapsed * 18));
  const hand = roundState.bomb.pendingMesh?.getObjectByName("plantHand");
  if (hand) {
    hand.position.y = 0.28 + pound * 0.27;
    hand.rotation.x = -0.8 + pound * 0.65;
    hand.position.x = 0.18 + Math.sin(elapsed * 31) * 0.035;
  }
  weaponRig.position.set(0.45, -0.54 + Math.sin(elapsed * 10) * 0.02, -0.72);
  weaponRig.rotation.x = -0.32 + pound * 0.05;
  weaponRig.rotation.z = Math.sin(elapsed * 22) * 0.02;
  showMessage(`Planting ${Math.ceil((1 - progress) * 4)}s`);

  if (progress >= 1) finishPlantBomb();
}

function disposeObject(object) {
  object.traverse?.((child) => {
    child.geometry?.dispose();
    child.material?.dispose();
  });
}

function createGroundTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const ctx = textureCanvas.getContext("2d");

  ctx.fillStyle = "#596647";
  ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * textureCanvas.width;
    const y = Math.random() * textureCanvas.height;
    const radius = Math.random() * 2.2 + 0.4;
    const grassTone = Math.random() > 0.5 ? "rgba(91,116,60,0.55)" : "rgba(52,73,45,0.45)";
    ctx.fillStyle = grassTone;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.65, radius, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 95; i++) {
    const x = Math.random() * textureCanvas.width;
    const y = Math.random() * textureCanvas.height;
    const radius = Math.random() * 13 + 5;
    const gradient = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    gradient.addColorStop(0, "rgba(128,124,105,0.75)");
    gradient.addColorStop(0.55, "rgba(103,101,88,0.42)");
    gradient.addColorStop(1, "rgba(78,91,58,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.45, radius, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 38; i++) {
    ctx.strokeStyle = "rgba(45,62,39,0.18)";
    ctx.lineWidth = Math.random() * 2 + 0.7;
    ctx.beginPath();
    const startX = Math.random() * textureCanvas.width;
    const startY = Math.random() * textureCanvas.height;
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + Math.random() * 90 - 45,
      startY + Math.random() * 90 - 45,
      startX + Math.random() * 150 - 75,
      startY + Math.random() * 150 - 75,
      startX + Math.random() * 220 - 110,
      startY + Math.random() * 220 - 110,
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  return texture;
}

function createSkyTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 16;
  textureCanvas.height = 256;
  const ctx = textureCanvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#6f9fca");
  gradient.addColorStop(0.42, "#9fc2d9");
  gradient.addColorStop(0.78, "#d5dde0");
  gradient.addColorStop(1, "#8f9a93");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 256);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function createCloudTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 192;
  const ctx = textureCanvas.getContext("2d");
  ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);

  const blobs = [
    [96, 104, 82],
    [170, 78, 104],
    [252, 96, 118],
    [338, 82, 96],
    [412, 108, 76],
    [232, 122, 142],
  ];

  blobs.forEach(([x, y, radius]) => {
    const gradient = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.88)");
    gradient.addColorStop(0.52, "rgba(255,255,255,0.54)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function createBulletTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 4;
  textureCanvas.height = 64;
  const ctx = textureCanvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.45, "rgba(255,229,150,1)");
  gradient.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 64);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function updateMovement(deltaTime) {
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const wishDir = new THREE.Vector3();

  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, camera.up).normalize();

  if (keys.w) wishDir.add(forward);
  if (keys.s) wishDir.sub(forward);
  if (keys.d) wishDir.add(right);
  if (keys.a) wishDir.sub(right);

  const hasInput = wishDir.lengthSq() > 0;
  if (hasInput) wishDir.normalize();

  const sprinting = keys.shift && keys.w && player.grounded && !scoped;
  const bombMoveBoost = player.activeSlot === 2 && !player.isPlanting ? 1.12 : 1;
  const targetSpeed = player.speed * bombMoveBoost * (sprinting ? 1.34 : 1) * (scoped ? 0.72 : 1);
  const acceleration = player.grounded ? 18 : 5.5;
  const friction = player.grounded ? 13 : 1.6;
  const targetVelocity = hasInput ? wishDir.multiplyScalar(targetSpeed) : new THREE.Vector3();

  if (hasInput) {
    player.velocity.lerp(targetVelocity, 1 - Math.exp(-acceleration * deltaTime));
  } else {
    player.velocity.lerp(targetVelocity, 1 - Math.exp(-friction * deltaTime));
  }

  const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
  player.moveIntensity = THREE.MathUtils.lerp(
    player.moveIntensity,
    Math.min(1, horizontalSpeed / (player.speed * 1.15)),
    1 - Math.exp(-deltaTime * 10),
  );

  if (player.grounded && horizontalSpeed > 0.2) {
    player.bobPhase += deltaTime * (sprinting ? 13.5 : 10.5) * player.moveIntensity;
  }

  const move = player.velocity.clone().multiplyScalar(deltaTime);
  if (move.lengthSq() > 0.000001) {
    const before = camera.position.clone();
    const next = camera.position.clone().add(move);
    next.y = camera.position.y;
    moveWithSlide(move, next);
    const applied = camera.position.clone().sub(before);
    if (Math.abs(applied.x) < Math.abs(move.x) * 0.35) player.velocity.x *= 0.25;
    if (Math.abs(applied.z) < Math.abs(move.z) * 0.35) player.velocity.z *= 0.25;
  }

  if (keys.space && player.grounded) {
    player.verticalVelocity = 7.6;
    player.grounded = false;
  }

  player.verticalVelocity -= (player.verticalVelocity > 0 ? 28 : 34) * deltaTime;
  camera.position.y += player.verticalVelocity * deltaTime;
  const floorY = 1.65 + getGroundHeight(camera.position);
  if (camera.position.y <= floorY) {
    camera.position.y = floorY;
    player.verticalVelocity = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }
}

function moveWithSlide(move, next) {
  if (!isPlayerBlocked(next)) {
    camera.position.copy(next);
    return;
  }

  const xOnly = camera.position.clone().add(new THREE.Vector3(move.x, 0, 0));
  const zOnly = camera.position.clone().add(new THREE.Vector3(0, 0, move.z));
  xOnly.y = camera.position.y;
  zOnly.y = camera.position.y;

  const canMoveX = Math.abs(move.x) > 0.0001 && !isPlayerBlocked(xOnly);
  const canMoveZ = Math.abs(move.z) > 0.0001 && !isPlayerBlocked(zOnly);

  if (canMoveX && canMoveZ) {
    const preferX = Math.abs(move.x) > Math.abs(move.z);
    camera.position.copy(preferX ? xOnly : zOnly);
  } else if (canMoveX) {
    camera.position.copy(xOnly);
  } else if (canMoveZ) {
    camera.position.copy(zOnly);
  }
}

function isPlayerBlocked(position) {
  const currentGroundTop = Math.max(0, getGroundHeight(camera.position));
  const currentFeet = camera.position.y - 1.65;
  const nextFeet = position.y - 1.65;
  const bodyBottom = nextFeet + 0.12;
  const bodyTop = nextFeet + 1.48;
  return solidObstacles.some(({ box, bottom, top }) => {
    const verticallyOverlaps = bodyTop > bottom + 0.08 && bodyBottom < top - 0.08;
    const leavingTop = currentFeet >= top - 0.18 && nextFeet >= top - 0.62;
    const canStepOnto = top <= currentGroundTop + 1.45 && position.y >= top + 0.78;
    if (!verticallyOverlaps || leavingTop || canStepOnto) return false;

    const sideBuffer = currentFeet >= top - 0.35 ? 0.28 : 0.72;
    const insideXz =
      position.x > box.min.x - sideBuffer &&
      position.x < box.max.x + sideBuffer &&
      position.z > box.min.z - sideBuffer &&
      position.z < box.max.z + sideBuffer;
    if (!insideXz) return false;

    const currentDistance = distanceToBox2D(camera.position, box);
    const nextDistance = distanceToBox2D(position, box);
    if (currentFeet >= top - 0.7 && nextDistance > currentDistance + 0.02) return false;

    return true;
  });
}

function distanceToBox2D(position, box) {
  const closestX = THREE.MathUtils.clamp(position.x, box.min.x, box.max.x);
  const closestZ = THREE.MathUtils.clamp(position.z, box.min.z, box.max.z);
  return Math.hypot(position.x - closestX, position.z - closestZ);
}

function getGroundHeight(position) {
  let height = 0;
  const feetHeight = position.y - 1.65;

  for (const stair of walkableStairs) {
    if (
      position.x >= stair.xMin &&
      position.x <= stair.xMax &&
      position.z >= stair.zMin &&
      position.z <= stair.zMax
    ) {
      const progress = Math.abs(position.z - stair.originZ) / stair.stepDepth;
      const stairHeight = stair.baseHeight + progress * stair.stepHeight;
      const clampedStairHeight = Math.min(stair.maxHeight, Math.max(stair.baseHeight, stairHeight));
      if (clampedStairHeight <= feetHeight + 0.56) {
        height = Math.max(height, clampedStairHeight);
      }
    }
  }

  for (const surface of walkableSurfaces) {
    if (
      position.x >= surface.xMin - 0.35 &&
      position.x <= surface.xMax + 0.35 &&
      position.z >= surface.zMin - 0.35 &&
      position.z <= surface.zMax + 0.35 &&
      position.y >= surface.top + 0.35
    ) {
      height = Math.max(height, surface.top);
    }
  }

  return height;
}

function updateEnemies(deltaTime, now) {
  enemies.forEach((enemy) => {
    if (enemy.state === "dead" || !roundState.active) return;
    resolveBotFromCover(enemy, 0.62);

    const enemyWorldPosition = enemy.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const target = getTargetForBot(enemy, enemyWorldPosition);
    const targetPosition = target?.position;
    const distance = targetPosition ? enemyWorldPosition.distanceTo(targetPosition) : Infinity;
    const canSeeTarget =
      Boolean(targetPosition) &&
      distance < enemy.detectionRange &&
      hasLineOfSight(enemyWorldPosition, targetPosition);

    if (distance < enemy.attackRange && canSeeTarget) {
      enemy.state = "attacking";
      faceBotToward(enemy, targetPosition);
      if (now - enemy.lastShotAt >= enemy.fireRate) {
        enemy.lastShotAt = now;
        enemyShoot(enemy, target);
      }
    } else if (canSeeTarget) {
      enemy.state = "chasing";
      const direction = targetPosition.clone().sub(enemy.group.position);
      direction.y = 0;
      direction.normalize();
      faceBotToward(enemy, targetPosition);
      moveEnemy(enemy, direction, enemy.speed * deltaTime, deltaTime, targetPosition);
    } else {
      enemy.state = "roaming";
      roamEnemy(enemy, deltaTime);
    }
  });
}

function getTargetForBot(bot, origin) {
  const possibleTargets = [];
  if (bot.team === "counter" && player.alive) {
    possibleTargets.push({ type: "player", position: camera.position.clone() });
  }

  enemies.forEach((other) => {
    if (other === bot || other.state === "dead" || other.team === bot.team) return;
    possibleTargets.push({
      type: "bot",
      bot: other,
      position: other.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
    });
  });

  possibleTargets.sort((a, b) => a.position.distanceTo(bot.group.position) - b.position.distanceTo(bot.group.position));
  const visibleTarget = possibleTargets.find((target) => {
    const distance = target.position.distanceTo(origin);
    return distance < bot.detectionRange && hasLineOfSight(origin, target.position);
  });
  if (visibleTarget) return visibleTarget;
  return possibleTargets[0] || null;
}

function enemyShoot(enemy, target) {
  if (!target) return;
  const origin = enemy.group.localToWorld(new THREE.Vector3(-0.06, 1.5, 1.82));
  const targetPosition = target.position.clone().add(new THREE.Vector3(
    (Math.random() - 0.5) * 1.1,
    (Math.random() - 0.5) * 0.55,
    (Math.random() - 0.5) * 1.1,
  ));
  const direction = targetPosition.clone().sub(origin);
  const distance = direction.length();
  direction.normalize();

  raycaster.set(origin, direction);
  raycaster.far = distance;
  const coverHits = raycaster.intersectObjects(shootables, false);
  if (coverHits.length > 0 && coverHits[0].distance < distance) {
    addBulletTracer(origin, coverHits[0].point, 0xff5f46, 78);
    addImpact(coverHits[0].point, false);
    return;
  }

  addBulletTracer(origin, targetPosition, enemy.team === "counter" ? 0xff5f46 : 0x78d9ff, 78);
  if (target.type === "player") damagePlayer(enemy.damage);
  else damageEnemy(target.bot, enemy.damage, "torso");
}

function hasLineOfSight(origin, target) {
  const direction = target.clone().sub(origin);
  const distance = direction.length();
  direction.normalize();
  raycaster.set(origin, direction);
  raycaster.far = distance;
  const coverHits = raycaster.intersectObjects(shootables, false);
  return coverHits.length === 0 || coverHits[0].distance >= distance;
}

function roamEnemy(enemy, deltaTime) {
  const target = enemy.roamTarget || randomMapPoint();
  const toTarget = target.clone().sub(enemy.group.position);
  toTarget.y = 0;

  if (toTarget.length() < 1.4) {
    enemy.roamTarget = randomMapPoint();
    return;
  }

  toTarget.normalize();
  moveEnemy(enemy, toTarget, enemy.speed * 0.78 * deltaTime, deltaTime, enemy.roamTarget);
}

function faceBotToward(bot, targetPosition) {
  bot.group.lookAt(targetPosition.x, bot.group.position.y, targetPosition.z);
}

function moveEnemy(enemy, direction, distance, deltaTime, destination = null) {
  const now = performance.now();
  resolveBotFromCover(enemy, 0.62);

  let travelDirection = getAvoidanceDirection(enemy, direction, distance, destination, now);
  const chosenStep = getBestBotStep(enemy, travelDirection, direction, distance, destination);
  if (!chosenStep) {
    updateBotStuckState(enemy, deltaTime, direction, distance, destination, now);
    if (!enemy.lastRetargetAt || now - enemy.lastRetargetAt > 550) {
      enemy.roamTarget = randomMapPoint();
      enemy.lastRetargetAt = now;
    }
    animateEnemy(enemy, deltaTime, 0);
    return;
  }

  travelDirection = chosenStep.direction;
  const lookPoint = enemy.group.position.clone().addScaledVector(travelDirection, 2);
  faceBotToward(enemy, lookPoint);
  enemy.avoidObstacle = null;
  enemy.group.position.copy(chosenStep.position);
  resolveBotFromCover(enemy, 0.62);
  updateBotStuckState(enemy, deltaTime, direction, distance, destination, now);
  animateEnemy(enemy, deltaTime, chosenStep.distance);
}

function getBestBotStep(enemy, desiredDirection, originalDirection, distance, destination) {
  const position = enemy.group.position;
  const nearbyObstacle = getNearestBotObstacle(position, 3.1);
  const candidates = [];

  addBotStepCandidate(candidates, desiredDirection, 1, 3);

  if (enemy.avoidDirection.lengthSq() > 0.001) {
    addBotStepCandidate(candidates, enemy.avoidDirection, 0.92, 1.7);
  }

  if (nearbyObstacle) {
    const away = getBotEscapeDirection(position, nearbyObstacle.box);
    const tangentA = new THREE.Vector3(-away.z, 0, away.x).normalize();
    const tangentB = tangentA.clone().multiplyScalar(-1);
    const tangent = tangentA.dot(originalDirection) >= tangentB.dot(originalDirection) ? tangentA : tangentB;

    addBotStepCandidate(candidates, away, 0.9, 2.2);
    addBotStepCandidate(candidates, tangent, 0.88, 2.05);
    addBotStepCandidate(candidates, tangent.clone().add(away).normalize(), 0.82, 2);
    addBotStepCandidate(candidates, tangent.clone().multiplyScalar(-1), 0.72, 0.75);
  }

  [-70, 70, -115, 115, 150, -150].forEach((degrees, index) => {
    addBotStepCandidate(candidates, rotateFlatVector(originalDirection, THREE.MathUtils.degToRad(degrees)), 0.78, 1.15 - index * 0.05);
  });

  let best = null;
  candidates.forEach((candidate) => {
    if (candidate.direction.lengthSq() < 0.001) return;

    const stepPosition = position.clone().addScaledVector(candidate.direction, distance * candidate.scale);
    stepPosition.y = 0;
    const probePosition = position.clone().addScaledVector(candidate.direction, Math.max(0.95, distance * 5.5));
    probePosition.y = 0;
    const stepClear = isBotPositionClear(stepPosition, 0.66);
    const probeClear = isBotPositionClear(probePosition, 0.66);
    if (!stepClear || !probeClear) return;

    const destinationScore = destination ? -stepPosition.distanceTo(destination) * 0.025 : 0;
    const forwardScore = candidate.direction.dot(originalDirection) * 1.45;
    const clearanceScore = getBotClearanceScore(stepPosition, 2.4);
    const score = candidate.bias + destinationScore + forwardScore + clearanceScore;

    if (!best || score > best.score) {
      best = {
        score,
        direction: candidate.direction.clone(),
        position: stepPosition,
        distance: distance * candidate.scale,
      };
    }
  });

  if (best && best.direction.dot(originalDirection) < 0.4) {
    enemy.avoidDirection.copy(best.direction);
    enemy.avoidUntil = performance.now() + 900;
  }

  return best;
}

function addBotStepCandidate(candidates, direction, scale, bias) {
  const flat = direction.clone();
  flat.y = 0;
  if (flat.lengthSq() < 0.001) return;
  candidates.push({ direction: flat.normalize(), scale, bias });
}

function rotateFlatVector(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new THREE.Vector3(
    vector.x * cos - vector.z * sin,
    0,
    vector.x * sin + vector.z * cos,
  ).normalize();
}

function updateBotStuckState(enemy, deltaTime, direction, distance, destination, now) {
  const moved = enemy.group.position.distanceTo(enemy.lastMovePosition);
  enemy.lastMovePosition.copy(enemy.group.position);

  if (moved > Math.max(0.015, distance * 0.22)) {
    enemy.stuckTime = Math.max(0, enemy.stuckTime - deltaTime * 1.8);
    return;
  }

  enemy.stuckTime += deltaTime;
  if (enemy.stuckTime < 0.45) return;

  const obstacle = getBotBlockingObstacle(enemy.group.position, 0.86);
  if (obstacle) {
    const escape = getBotEscapeDirection(enemy.group.position, obstacle);
    enemy.avoidDirection.copy(escape.lengthSq() > 0.001 ? escape : chooseAvoidDirection(enemy, direction, obstacle, destination, distance));
    enemy.avoidUntil = now + 950;
    enemy.avoidObstacle = obstacle;
    enemy.group.position.addScaledVector(enemy.avoidDirection, 0.28);
    resolveBotFromCover(enemy, 0.62);
  } else if (!enemy.lastRetargetAt || now - enemy.lastRetargetAt > 650) {
    enemy.roamTarget = randomMapPoint();
    enemy.lastRetargetAt = now;
  }

  enemy.stuckTime = 0;
}

function getAvoidanceDirection(enemy, direction, distance, destination, now) {
  let desiredDirection = direction.clone().normalize();
  const coverSteer = getNearbyCoverSteer(enemy.group.position, 2.7);
  if (coverSteer.lengthSq() > 0.001) {
    desiredDirection.addScaledVector(coverSteer, 1.45).normalize();
  }

  const forwardProbe = enemy.group.position.clone().addScaledVector(desiredDirection, Math.max(1.35, distance * 7));
  forwardProbe.y = 0;
  const obstacleAhead = getBotBlockingObstacle(forwardProbe, 0.95);

  if (obstacleAhead && (!enemy.avoidUntil || now >= enemy.avoidUntil || enemy.avoidObstacle !== obstacleAhead)) {
    enemy.avoidDirection.copy(chooseAvoidDirection(enemy, desiredDirection, obstacleAhead, destination, distance));
    enemy.avoidUntil = now + 780;
    enemy.avoidObstacle = obstacleAhead;
  }

  if (enemy.avoidUntil && now < enemy.avoidUntil && enemy.avoidDirection.lengthSq() > 0.001) {
    const blended = desiredDirection.clone().lerp(enemy.avoidDirection, 0.78);
    if (blended.lengthSq() > 0.001) return blended.normalize();
  }

  return desiredDirection;
}

function getNearbyCoverSteer(position, steerRadius) {
  const steer = new THREE.Vector3();

  botColliders.forEach((box) => {
    const closestX = THREE.MathUtils.clamp(position.x, box.min.x, box.max.x);
    const closestZ = THREE.MathUtils.clamp(position.z, box.min.z, box.max.z);
    const away = new THREE.Vector3(position.x - closestX, 0, position.z - closestZ);
    const distance = away.length();

    if (distance > 0.001 && distance < steerRadius) {
      const strength = Math.pow((steerRadius - distance) / steerRadius, 1.65);
      steer.addScaledVector(away.normalize(), strength);
      return;
    }

    if (distance <= 0.001) {
      const correction = getBotPenetrationCorrection(position, 0.68);
      if (correction && correction.lengthSq() > 0.001) {
        steer.addScaledVector(correction.normalize(), 1.8);
      }
    }
  });

  if (steer.lengthSq() > 0.001) steer.normalize();
  return steer;
}

function chooseAvoidDirection(enemy, direction, obstacle, destination, distance) {
  const obstacleCenter = obstacle.getCenter(new THREE.Vector3());
  const away = enemy.group.position.clone().sub(obstacleCenter);
  away.y = 0;
  if (away.lengthSq() < 0.0001) away.set(1, 0, 0);
  away.normalize();

  const tangentA = new THREE.Vector3(-away.z, 0, away.x).normalize();
  const tangentB = tangentA.clone().multiplyScalar(-1);
  const options = [tangentA, tangentB].map((tangent) => {
    const testStep = enemy.group.position.clone().addScaledVector(tangent, Math.max(1.1, distance * 8));
    testStep.y = 0;
    const blocked = getBotBlockingObstacle(testStep, 0.76);
    const targetScore = destination ? testStep.distanceTo(destination) * -0.035 : 0;
    return {
      tangent,
      score: tangent.dot(direction) + targetScore + (blocked ? -4 : 0),
    };
  });

  options.sort((a, b) => b.score - a.score);
  return options[0].tangent.clone();
}

function getBotBlockingObstacle(position, radius = 0.72) {
  const sample = position.clone().add(new THREE.Vector3(0, 1, 0));
  return botColliders.find((box) => box.distanceToPoint(sample) < radius);
}

function isBotPositionClear(position, radius = 0.66) {
  return !getBotPenetrationCorrection(position, radius);
}

function getNearestBotObstacle(position, radius) {
  let nearest = null;

  botColliders.forEach((box) => {
    const closestX = THREE.MathUtils.clamp(position.x, box.min.x, box.max.x);
    const closestZ = THREE.MathUtils.clamp(position.z, box.min.z, box.max.z);
    const distance = Math.hypot(position.x - closestX, position.z - closestZ);
    if (distance > radius) return;

    if (!nearest || distance < nearest.distance) {
      nearest = { box, distance };
    }
  });

  return nearest;
}

function getBotClearanceScore(position, radius) {
  let closest = radius;

  botColliders.forEach((box) => {
    const closestX = THREE.MathUtils.clamp(position.x, box.min.x, box.max.x);
    const closestZ = THREE.MathUtils.clamp(position.z, box.min.z, box.max.z);
    closest = Math.min(closest, Math.hypot(position.x - closestX, position.z - closestZ));
  });

  return THREE.MathUtils.clamp(closest / radius, 0, 1) * 1.35;
}

function resolveBotFromCover(enemy, radius = 0.62) {
  for (let i = 0; i < 3; i++) {
    const correction = getBotPenetrationCorrection(enemy.group.position, radius);
    if (!correction) return;
    enemy.group.position.add(correction.multiplyScalar(1.04));
    enemy.group.position.y = 0;
  }
}

function getBotPenetrationCorrection(position, radius) {
  let bestCorrection = null;
  let bestDepth = Infinity;

  botColliders.forEach((box) => {
    const expandedMinX = box.min.x - radius;
    const expandedMaxX = box.max.x + radius;
    const expandedMinZ = box.min.z - radius;
    const expandedMaxZ = box.max.z + radius;

    if (
      position.x <= expandedMinX ||
      position.x >= expandedMaxX ||
      position.z <= expandedMinZ ||
      position.z >= expandedMaxZ
    ) {
      return;
    }

    const pushLeft = position.x - expandedMinX;
    const pushRight = expandedMaxX - position.x;
    const pushBack = position.z - expandedMinZ;
    const pushForward = expandedMaxZ - position.z;
    const depths = [
      { depth: pushLeft, vector: new THREE.Vector3(-pushLeft, 0, 0) },
      { depth: pushRight, vector: new THREE.Vector3(pushRight, 0, 0) },
      { depth: pushBack, vector: new THREE.Vector3(0, 0, -pushBack) },
      { depth: pushForward, vector: new THREE.Vector3(0, 0, pushForward) },
    ];
    depths.sort((a, b) => a.depth - b.depth);

    if (depths[0].depth < bestDepth) {
      bestDepth = depths[0].depth;
      bestCorrection = depths[0].vector;
    }
  });

  return bestCorrection;
}

function getBotEscapeDirection(position, obstacle) {
  const correction = getBotPenetrationCorrection(position, 0.68);
  if (correction && correction.lengthSq() > 0.001) return correction.normalize();

  const obstacleCenter = obstacle.getCenter(new THREE.Vector3());
  const escape = position.clone().sub(obstacleCenter);
  escape.y = 0;
  if (escape.lengthSq() < 0.001) escape.set(1, 0, 0);
  return escape.normalize();
}

function getSlideDirectionAroundObstacle(direction, currentPosition, obstacle) {
  const obstacleCenter = obstacle.getCenter(new THREE.Vector3());
  const away = currentPosition.clone().sub(obstacleCenter);
  away.y = 0;
  if (away.lengthSq() < 0.0001) away.set(1, 0, 0);
  away.normalize();

  const tangentA = new THREE.Vector3(-away.z, 0, away.x).normalize();
  const tangentB = tangentA.clone().multiplyScalar(-1);
  return tangentA.dot(direction) > tangentB.dot(direction) ? tangentA : tangentB;
}

function animateEnemy(enemy, deltaTime, distance) {
  enemy.stride += deltaTime * (enemy.state === "chasing" ? 12 : 8);
  const swing = Math.sin(enemy.stride) * (enemy.state === "chasing" ? 0.52 : 0.34);
  const bob = Math.abs(Math.sin(enemy.stride)) * (enemy.state === "chasing" ? 0.09 : 0.05);
  const aimLift = enemy.state === "attacking" ? 0.16 : 0;

  enemy.group.position.y = enemy.baseY + bob;
  enemy.limbs.leftArm.rotation.x = -0.28 + swing * 0.03 - aimLift;
  enemy.limbs.leftArm.rotation.z = -0.12 + swing * 0.025;
  enemy.limbs.rightArm.rotation.x = -0.32 + swing * 0.03 - aimLift;
  enemy.limbs.rightArm.rotation.z = 0.12 - swing * 0.025;
  enemy.limbs.enemyGun.rotation.x = -0.18 - aimLift;
  enemy.limbs.enemyBarrel.rotation.x = Math.PI / 2 - 0.18 - aimLift;
  enemy.limbs.leftLeg.rotation.x = -swing;
  enemy.limbs.rightLeg.rotation.x = swing;
}

function updateDeadEnemies(now) {
  enemies.forEach((enemy) => {
    if (enemy.state !== "dead" || !enemy.ragdoll || enemy.ragdoll.settled) return;

    const progress = THREE.MathUtils.clamp((now - enemy.ragdoll.startedAt) / enemy.ragdoll.duration, 0, 1);
    const collapse = progress * progress * (3 - 2 * progress);
    const bounce = Math.sin(progress * Math.PI) * 0.16;
    const parts = enemy.ragdollParts;
    const groundHeight = getGroundHeight(enemy.ragdoll.basePosition);
    const settledHeight = groundHeight + 0.78;

    enemy.group.position.copy(enemy.ragdoll.basePosition)
      .addScaledVector(enemy.ragdoll.slide, collapse)
      .setY(settledHeight + bounce * (1 - collapse * 0.35));
    enemy.group.rotation.copy(enemy.ragdoll.baseRotation);
    enemy.group.rotation.x += enemy.ragdoll.fallPitch * collapse;
    enemy.group.rotation.z += enemy.ragdoll.fallRoll * collapse;

    parts.body.rotation.x = 0.25 * collapse;
    parts.chestPlate.rotation.x = 0.35 * collapse;
    parts.head.rotation.x = -0.85 * collapse;
    parts.helmet.rotation.x = parts.head.rotation.x;
    parts.face.rotation.x = parts.head.rotation.x;
    parts.leftEye.rotation.x = parts.head.rotation.x;
    parts.rightEye.rotation.x = parts.head.rotation.x;
    parts.nose.rotation.x = parts.head.rotation.x;
    parts.mouth.rotation.x = parts.head.rotation.x;

    parts.leftArm.rotation.x = THREE.MathUtils.lerp(parts.leftArm.rotation.x, -1.45, collapse);
    parts.leftArm.rotation.z = THREE.MathUtils.lerp(parts.leftArm.rotation.z, -1.15, collapse);
    parts.rightArm.rotation.x = THREE.MathUtils.lerp(parts.rightArm.rotation.x, 0.75, collapse);
    parts.rightArm.rotation.z = THREE.MathUtils.lerp(parts.rightArm.rotation.z, 1.25, collapse);
    parts.leftLeg.rotation.x = THREE.MathUtils.lerp(parts.leftLeg.rotation.x, 0.42, collapse);
    parts.leftLeg.rotation.z = THREE.MathUtils.lerp(parts.leftLeg.rotation.z, -0.45, collapse);
    parts.rightLeg.rotation.x = THREE.MathUtils.lerp(parts.rightLeg.rotation.x, -0.34, collapse);
    parts.rightLeg.rotation.z = THREE.MathUtils.lerp(parts.rightLeg.rotation.z, 0.5, collapse);
    parts.enemyGun.rotation.x = THREE.MathUtils.lerp(parts.enemyGun.rotation.x, -1.1, collapse);
    parts.enemyGun.rotation.z = THREE.MathUtils.lerp(parts.enemyGun.rotation.z, 0.75, collapse);
    parts.enemyBarrel.rotation.x = THREE.MathUtils.lerp(parts.enemyBarrel.rotation.x, Math.PI / 2 - 1.1, collapse);
    parts.enemyBarrel.rotation.z = THREE.MathUtils.lerp(parts.enemyBarrel.rotation.z, 0.75, collapse);

    if (progress >= 1) {
      enemy.group.position.y = settledHeight;
      enemy.ragdoll.settled = true;
    }
  });
}

function randomMapPoint() {
  return new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(68),
    0,
    THREE.MathUtils.randFloatSpread(68),
  );
}

function damagePlayer(amount) {
  if (!player.alive || !roundState.active) return;
  player.health = Math.max(0, player.health - amount);
  showDamageOverlay();
  showMessage(player.health > 0 ? "Hit" : "You are down");
  if (player.health === 0) eliminatePlayer();
}

function showDamageOverlay() {
  damageOverlay.classList.add("active");
  window.setTimeout(() => {
    damageOverlay.classList.remove("active");
  }, 120);
}

function beginRespawn() {
  eliminatePlayer();
}

function eliminatePlayer() {
  player.alive = false;
  cancelPlantBomb();
  fireHeld = false;
  setScoped(false);
  document.exitPointerLock?.();
  startButton.style.display = "none";
  setPromptTitle("Eliminated");
  promptText.textContent = "Waiting for next round.";
  prompt.classList.remove("hidden");
  checkRoundEnd();
}

function checkRoundEnd() {
  if (!roundState.active || roundState.matchOver) return;

  const terroristsAlive = getAliveCount("terrorist") + (player.alive ? 1 : 0);
  const countersAlive = getAliveCount("counter");
  if (terroristsAlive > 0 && countersAlive > 0) return;

  endRound(terroristsAlive > 0 ? "terrorist" : "counter", terroristsAlive > 0 ? "Terrorists win" : "Counter-Terrorists win");
}

function endRound(winningTeam, reason) {
  if (!roundState.active || roundState.matchOver) return;

  roundState.active = false;
  cancelPlantBomb();
  fireHeld = false;
  setScoped(false);
  document.exitPointerLock?.();

  if (winningTeam === "terrorist") roundState.terroristWins += 1;
  else roundState.counterTerroristWins += 1;

  setPromptTitle(`${reason} round ${roundState.round}`);
  promptText.textContent = roundState.round >= MAX_ROUNDS ? "Match complete." : "Next round starting soon.";
  startButton.style.display = "none";
  prompt.classList.remove("hidden");

  if (roundState.round >= MAX_ROUNDS) {
    roundState.matchOver = true;
    setPromptTitle(roundState.terroristWins >= roundState.counterTerroristWins ? "Terrorists Win Match" : "Counter-Terrorists Win Match");
    promptText.textContent = `Final score ${roundState.terroristWins} - ${roundState.counterTerroristWins}`;
    updateUI();
    return;
  }

  window.clearTimeout(roundTimer);
  roundTimer = window.setTimeout(() => {
    startRound(roundState.round + 1);
    if (gameStarted) document.body.requestPointerLock();
  }, 3500);
  updateUI();
}

function getAliveCount(team) {
  return enemies.filter((bot) => bot.team === team && bot.state !== "dead").length;
}

function respawnPlayer() {
  player.health = 100;
  player.velocity.set(0, 0, 0);
  player.verticalVelocity = 0;
  player.grounded = true;
  player.moveIntensity = 0;
  player.spreadHeat = 0;
  player.alive = true;
  camera.position.set(0, 1.65, 36);
  prompt.classList.add("hidden");
  setPromptTitle("Echo Strike", true);
  promptText.textContent =
    "Click to lock pointer. WASD moves, Space jumps, mouse aims, left click fires, R reloads, B buys.";
  startButton.style.display = "";
  showMessage("Respawned");
}

function updateUI() {
  const weapon = player.weapon;
  const alliesAlive = getAliveCount("terrorist") + (player.alive ? 1 : 0);
  const opponentsAlive = getAliveCount("counter");
  hud.health.textContent = String(player.health);
  hud.money.textContent = `$${player.money}`;
  hud.score.textContent = String(player.score);
  hud.grenades.textContent = String(player.grenades);
  hud.teamScore.textContent = `${roundState.terroristWins} - ${roundState.counterTerroristWins}`;
  hud.bombStatus.textContent = player.isPlanting
    ? "Planting"
    : player.activeSlot === 2
      ? "Equipped"
      : roundState.bomb.state === "planted"
        ? "Planted"
        : player.hasBomb
          ? "Carried"
          : "Dropped";
  hud.boardScore.textContent = String(player.score);
  hud.kills.textContent = String(player.kills);
  hud.headshots.textContent = String(player.headshots);
  hud.alliesLeft.textContent = String(alliesAlive);
  hud.opponentsLeft.textContent = String(opponentsAlive);
  hud.slot.textContent = player.activeSlot === 2 ? "2 Bomb" : "1 Rifle";
  hud.weaponName.textContent = player.activeSlot === 2 ? "Bomb" : weapon ? weapon.name : "Unarmed";
  hud.ammo.textContent = player.activeSlot === 2
    ? "Plant"
    : weapon
    ? `${weapon.isReloading ? "..." : weapon.ammo} / ${weapon.maxAmmo}`
    : "0 / 0";
  hud.enemiesLeft.textContent = `${roundState.round} / ${MAX_ROUNDS}`;
}

function showMessage(text) {
  message.textContent = text;
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    message.textContent = "";
  }, 1100);
}

function updateSky(deltaTime) {
  cloudLayers.forEach((cloud) => {
    cloud.position.x += cloud.userData.speed * deltaTime;
    cloud.position.z += Math.sin(performance.now() * 0.00012 + cloud.userData.startX) * deltaTime * 0.15;

    if (cloud.position.x > 58) {
      cloud.position.x = -58;
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = Math.min(clock.getDelta(), 0.04);
  const now = performance.now();

  if (gameStarted && roundState.active) {
    if (player.alive && !player.isPlanting) updateMovement(deltaTime);
    updateEnemies(deltaTime, now);
    if (fireHeld && isAutomatic(player.weapon) && document.pointerLockElement === document.body) {
      shoot();
    }
  }

  updateDeadEnemies(now);
  updateSky(deltaTime);
  updateBulletTracers(deltaTime);
  updateGrenades(deltaTime);
  updateWeaponView(deltaTime);
  updateUI();
  renderer.render(scene, camera);
}
