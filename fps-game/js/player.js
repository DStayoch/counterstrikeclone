import { createWeapon } from "./weapons.js";

export const player = {
  health: 100,
  money: 800,
  speed: 7,
  weapon: null,
  inventory: [],
  alive: true,
};

export function resetPlayer() {
  player.health = 100;
  player.money = 800;
  player.speed = 7;
  player.inventory = [createWeapon("pistol")];
  player.weapon = player.inventory[0];
  player.alive = true;
}

export function damagePlayer(amount) {
  if (!player.alive) return;
  player.health = Math.max(0, player.health - amount);
  if (player.health === 0) {
    player.alive = false;
  }
}

export function awardMoney(amount) {
  player.money += amount;
}
