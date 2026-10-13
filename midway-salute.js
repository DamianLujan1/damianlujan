import * as THREE from 'three';

const DURATION = 2.2;
const BARREL_LENGTH = .079;

// A collectible-scale salute, inspired by Midway's outboard single gun mounts.
// The effect is decorative: one shared pulse, no projectiles or targeting.
export function buildMidwaySalute(builder, palette) {
  const gold = new THREE.MeshStandardMaterial({ color: '#b99951', metalness: .7, roughness: .38 });
  gold.name = 'Midway brass hardware';
  const mounts = [
    [-.52, .235, 1], [.075, .177, 1], [.49, .159, 1],
    [-.52, -.197, -1], [.23, -.18, -1], [.52, -.158, -1],
  ];
  const pivots = mounts.map(([x, z, side]) => {
    builder.cylinder(.039, .031, .012, palette.hull, [x, .137, z], 12);
    builder.cylinder(.024, .028, .016, gold, [x, .149, z], 12);
    builder.box([.051, .029, .045], palette.hull, [x, .172, z], [0, 0, 0], .007);
    builder.box([.022, .002, .023], gold, [x, .1875, z]);
    const direction = new THREE.Vector3(0, .19, side).normalize();
    const origin = new THREE.Vector3(x, .177, z + side * .012);
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    return { origin, direction, rotation };
  });

  return function attach(midway) {
    const group = new THREE.Group();
    group.name = 'Midway synchronized salute';
    group.userData.animate = true;
    const barrelGeometry = new THREE.CylinderGeometry(.0037, .0054, BARREL_LENGTH, 8);
    barrelGeometry.rotateX(Math.PI / 2);
    barrelGeometry.translate(0, 0, BARREL_LENGTH / 2);
    const barrels = new THREE.InstancedMesh(barrelGeometry, palette.graphite, mounts.length);
    barrels.name = 'Six recoiling outboard barrels';
    barrels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    barrels.castShadow = true;
    barrels.receiveShadow = true;
    group.add(barrels);

    function flashMesh(name, radius, length, color, opacity) {
      const geometry = new THREE.ConeGeometry(radius, length, 7);
      // Cone tip faces outboard, with its wide base at the muzzle.
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, 0, length / 2);
      const material = new THREE.MeshBasicMaterial({
        color, opacity, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, toneMapped: false,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, mounts.length);
      mesh.name = name;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(mesh);
      return mesh;
    }
    const flare = flashMesh('Shared gold muzzle flare', .027, .13, '#ffc154', .65);
    const core = flashMesh('Shared white muzzle core', .012, .086, '#fff4d6', .95);
    const smoke = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: '#b7b4ae', transparent: true, opacity: .16, depthWrite: false }),
      mounts.length * 2,
    );
    smoke.name = 'Dissipating salute smoke';
    smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(smoke);
    // Tiny transient effects can move beyond their initial bounds; never cache a
    // stale instancing sphere and accidentally cull one side of the salute.
    for (const mesh of [barrels, flare, core, smoke]) mesh.frustumCulled = false;
    // Transparent visual effects must not steal clicks from solid objects.
    for (const mesh of [flare, core, smoke]) mesh.raycast = () => {};
    midway.add(group);

    const transform = new THREE.Object3D();
    function poseBarrels(recoil) {
      pivots.forEach((pivot, index) => {
        transform.position.copy(pivot.origin).addScaledVector(pivot.direction, -recoil);
        transform.quaternion.copy(pivot.rotation);
        transform.scale.setScalar(1);
        transform.updateMatrix();
        barrels.setMatrixAt(index, transform.matrix);
      });
      barrels.instanceMatrix.needsUpdate = true;
    }
    function reset() {
      poseBarrels(0);
      flare.visible = core.visible = smoke.visible = false;
      transform.scale.setScalar(0);
      transform.quaternion.identity();
      for (const mesh of [flare, core, smoke]) {
        for (let i = 0; i < mesh.count; i++) {
          transform.position.copy(pivots[i % pivots.length].origin);
          transform.updateMatrix();
          mesh.setMatrixAt(i, transform.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    function setProgress(elapsed, { reducedMotion = false } = {}) {
      if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= DURATION) {
        reset();
        return false;
      }
      const t = elapsed;
      // The entire broadside shares one envelope. No stagger and no flicker.
      const flash = reducedMotion ? .55 : Math.max(0, 1 - t / .22);
      const recoil = reducedMotion ? 0 : .013 * (t < .07 ? t / .07 : Math.max(0, 1 - (t - .07) / .36) ** 2);
      poseBarrels(recoil);
      flare.visible = core.visible = flash > 0;
      flare.material.opacity = flash * .7;
      core.material.opacity = flash * .95;
      const smokeAge = Math.max(0, (t - .07) / (DURATION - .07));
      smoke.visible = !reducedMotion && t > .07;
      smoke.material.opacity = .18 * (1 - smokeAge) ** 1.5;

      pivots.forEach((pivot, index) => {
        const muzzle = pivot.origin.clone().addScaledVector(pivot.direction, BARREL_LENGTH - recoil);
        transform.position.copy(muzzle);
        transform.quaternion.copy(pivot.rotation);
        transform.scale.setScalar(reducedMotion ? .65 : .65 + flash * .35);
        transform.updateMatrix();
        flare.setMatrixAt(index, transform.matrix);
        core.setMatrixAt(index, transform.matrix);
        for (let puff = 0; puff < 2; puff++) {
          const expansion = .013 + smokeAge * .055;
          transform.position.copy(muzzle).addScaledVector(pivot.direction, .018 + smokeAge * (.085 + puff * .025));
          transform.position.y += smokeAge * (.072 + puff * .018);
          transform.position.x += (puff ? 1 : -1) * smokeAge * .017;
          transform.quaternion.identity();
          transform.scale.set(expansion * (1 + puff * .2), expansion * .8, expansion);
          transform.updateMatrix();
          smoke.setMatrixAt(index * 2 + puff, transform.matrix);
        }
      });
      for (const mesh of [flare, core, smoke]) mesh.instanceMatrix.needsUpdate = true;
      return true;
    }
    reset();
    return { duration: DURATION, setProgress, reset };
  };
}
