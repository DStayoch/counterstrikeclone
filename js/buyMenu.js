import { weaponCatalog, createWeapon } from "./weapons.js";

export class BuyMenu {
  constructor(player, elements, onChange, showMessage) {
    this.player = player;
    this.menu = elements.menu;
    this.weaponList = elements.weaponList;
    this.closeButton = elements.closeButton;
    this.onChange = onChange;
    this.showMessage = showMessage;

    this.closeButton.addEventListener("click", () => this.hide());
    this.render();
  }

  toggle() {
    this.menu.classList.toggle("hidden");
    this.render();
  }

  hide() {
    this.menu.classList.add("hidden");
  }

  render() {
    this.weaponList.innerHTML = "";

    Object.entries(weaponCatalog).forEach(([key, weapon]) => {
      const button = document.createElement("button");
      button.className = "weapon-option";
      button.type = "button";
      button.innerHTML = `
        <strong>${weapon.name}</strong>
        <small>${weapon.price === 0 ? "Owned" : `$${weapon.price}`}</small>
        <span>${weapon.type} | damage ${weapon.damage} | ammo ${weapon.maxAmmo}</span>
      `;
      button.addEventListener("click", () => this.buyWeapon(key));
      this.weaponList.append(button);
    });
  }

  buyWeapon(key) {
    const weapon = weaponCatalog[key];
    const owned = this.player.inventory.find((item) => item.key === key);

    if (owned) {
      this.player.weapon = owned;
      this.showMessage(`Equipped ${owned.name}`);
      this.onChange();
      return;
    }

    if (this.player.money < weapon.price) {
      this.showMessage("Not enough money");
      return;
    }

    this.player.money -= weapon.price;
    const purchased = createWeapon(key);
    this.player.inventory.push(purchased);
    this.player.weapon = purchased;
    this.showMessage(`Bought ${purchased.name}`);
    this.onChange();
    this.render();
  }
}
