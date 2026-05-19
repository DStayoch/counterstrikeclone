import * as THREE from "three";

const impactMaterials = {
  enemy: new THREE.MeshBasicMaterial({ color: 0xfff2a6 }),
  wall: new THREE.MeshBasicMaterial({ color: 0xd6e8ff }),
};

export class BulletImpacts {
  constructor(scene) {
    this.scene = scene;
    this.impacts = [];
  }

  add(position, type = "wall") {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(type === "enemy" ? 0.12 : 0.07, 8, 8),
      impactMaterials[type],
    );
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.impacts.push({ mesh, life: 0.18 });
  }

  update(deltaTime) {
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const impact = this.impacts[i];
      impact.life -= deltaTime;
      impact.mesh.scale.multiplyScalar(0.94);

      if (impact.life <= 0) {
        this.scene.remove(impact.mesh);
        impact.mesh.geometry.dispose();
        this.impacts.splice(i, 1);
      }
    }
  }
}
