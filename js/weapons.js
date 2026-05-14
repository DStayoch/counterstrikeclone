export const weaponCatalog = {
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
  },
};

export function createWeapon(key) {
  return {
    key,
    ...weaponCatalog[key],
    lastShotAt: 0,
    isReloading: false,
  };
}

export function canShoot(weapon, now) {
  return (
    weapon &&
    !weapon.isReloading &&
    weapon.ammo > 0 &&
    now - weapon.lastShotAt >= weapon.fireRate
  );
}

export function reloadWeapon(weapon, onComplete) {
  if (!weapon || weapon.isReloading || weapon.ammo === weapon.maxAmmo) return false;

  weapon.isReloading = true;
  window.setTimeout(() => {
    weapon.ammo = weapon.maxAmmo;
    weapon.isReloading = false;
    onComplete?.();
  }, weapon.reloadTime);

  return true;
}
