import * as THREE from 'three';

// A shelf-scale land rig inspired by Damian's photographs. +Z is the viewing
// side, the white driller's cabin is +X, and the open mast stays fixed.
export function makeLandRig(ModelBuilder, palette) {
  const metal = (name, color, metalness = .42, roughness = .5) => {
    const material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    material.name = name;
    return material;
  };
  const steel = metal('Rig painted steel', '#c8cec9', .36, .48);
  const frame = metal('Rig structural steel', '#6e7c7b', .6, .46);
  const dark = metal('Rig blackened steel', '#263137', .55, .42);
  const red = metal('Rig equipment red', '#9e4038', .25, .56);
  const white = metal('Rig cabin ivory', '#d8d8c9', .2, .62);
  const safety = metal('Rig handrail ochre', '#b3a071', .42, .48);
  const window = metal('Rig cabin glazing', '#244852', .55, .23);
  const workLamp = metal('Rig work lamps', '#e9ead9', .12, .3);
  workLamp.emissive.set('#ffedc8');
  workLamp.emissiveIntensity = .15;
  const b = new ModelBuilder('Land drilling rig');
  const cx = -.075, cz = -.005, floorY = .375;
  const rod = (a, c, r = .003, m = steel) => b.rod(a, c, r, m, 6);
  const rail = (a, c, height = .061, m = safety, spacing = .075) => {
    const count = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[2] - a[2]) / spacing));
    for (let i = 0; i <= count; i++) {
      const x = THREE.MathUtils.lerp(a[0], c[0], i / count);
      const y = THREE.MathUtils.lerp(a[1], c[1], i / count);
      const z = THREE.MathUtils.lerp(a[2], c[2], i / count);
      rod([x, y, z], [x, y + height, z], .0023, m);
    }
    for (const dy of [height * .46, height]) rod([a[0], a[1] + dy, a[2]], [c[0], c[1] + dy, c[2]], .0021, m);
  };

  // Thin presentation plinth; the structure itself stands on separate skids.
  b.box([1.28, .023, .65], palette.graphite, [0, .0115, 0], [0, 0, 0], .009);
  b.box([1.258, .005, .628], frame, [0, .025, 0], [0, 0, 0], .004);
  for (const x of [-.237, .116]) {
    b.box([.096, .026, .343], dark, [x, .044, .0]);
    for (const z of [-.121, .121]) b.box([.092, .014, .067], steel, [x, .064, z]);
  }
  // Open high substructure, with broad diagonal struts and cross ties.
  for (const x of [-.232, .11]) for (const z of [-.13, .13]) {
    b.box([.022, .283, .028], frame, [x, .205, z]);
    b.box([.04, .015, .048], steel, [x, .337, z]);
  }
  for (const z of [-.135, .135]) {
    b.box([.405, .03, .022], dark, [-.06, .325, z]);
    rod([-.238, .077, z], [.103, .32, z], .010, frame);
    rod([.11, .077, z], [-.23, .32, z], .010, frame);
  }
  for (const x of [-.237, .116]) {
    rod([x, .082, -.123], [x, .32, .123], .008, frame);
    rod([x, .082, .123], [x, .32, -.123], .008, frame);
  }
  b.box([.76, .035, .35], frame, [.065, .35, 0]);
  b.box([.778, .011, .367], dark, [.065, floorY - .006, 0]);
  for (const x of [-.307, .431]) b.box([.015, .044, .358], steel, [x, .351, 0]);
  // Wellhead and BOP underneath the rotary floor.
  b.cylinder(.021, .021, .15, dark, [cx, .149, cz], 12);
  for (const y of [.103, .151, .242, .29]) b.cylinder(.035, .035, .018, frame, [cx, y, cz], 16);
  b.box([.086, .055, .067], dark, [cx, .21, cz], [0, 0, 0], .005);
  for (const x of [-.14, -.011]) b.cylinder(.025, .025, .05, frame, [x, .209, cz], 12, [0, 0, Math.PI / 2]);

  // Mast proportions follow the photographed land rigs: a narrow, largely
  // parallel lower section and a short tapered crown, not a pyramid derrick.
  const mastBase = floorY + .014, crownY = 1.498;
  const halfWidth = y => y < 1.31 ? .09 : THREE.MathUtils.lerp(.09, .063, (y - 1.31) / (crownY - 1.31));
  const halfDepth = y => y < 1.31 ? .074 : THREE.MathUtils.lerp(.074, .055, (y - 1.31) / (crownY - 1.31));
  const levels = [mastBase, .53, .67, .81, .95, 1.09, 1.23, 1.365, crownY];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (let i = 0; i < levels.length - 1; i++) {
      const y = levels[i], nextY = levels[i + 1];
      rod([cx + sx * halfWidth(y), y, cz + sz * halfDepth(y)], [cx + sx * halfWidth(nextY), nextY, cz + sz * halfDepth(nextY)], .0065, steel);
    }
  }
  for (let i = 0; i < levels.length; i++) {
    const y = levels[i], w = halfWidth(y), d = halfDepth(y);
    for (const sz of [-1, 1]) rod([cx - w, y, cz + sz * d], [cx + w, y, cz + sz * d], .0037, steel);
    for (const sx of [-1, 1]) rod([cx + sx * w, y, cz - d], [cx + sx * w, y, cz + d], .0037, steel);
    if (i === levels.length - 1) continue;
    const ny = levels[i + 1], nw = halfWidth(ny), nd = halfDepth(ny);
    // X bracing on the rear and sides; alternating front braces keep the
    // traveling assembly visible through the lattice at the viewing angle.
    for (const sx of [-1, 1]) {
      rod([cx + sx * w, y, cz - d], [cx + sx * nw, ny, cz + nd], .0028, steel);
      rod([cx + sx * w, y, cz + d], [cx + sx * nw, ny, cz - nd], .0028, steel);
    }
    rod([cx - w, y, cz - d], [cx + nw, ny, cz - nd], .0028, steel);
    rod([cx + w, y, cz - d], [cx - nw, ny, cz - nd], .0028, steel);
    const side = i % 2 ? 1 : -1;
    rod([cx + side * w, y, cz + d], [cx - side * nw, ny, cz + nd], .0028, steel);
  }
  // Paired guide tracks hold the top-drive housing straight as it travels.
  for (const x of [cx - .034, cx + .034]) b.box([.008, 1.07, .012], frame, [x, .944, cz - .049]);
  for (const y of [.48, .75, 1.02, 1.29]) b.box([.098, .014, .008], dark, [cx, y, cz - .054]);

  // Crown block, platform, guard rail, floodlight housings and cable sheaves.
  b.box([.181, .021, .163], frame, [cx, 1.508, cz]);
  for (let i = 0; i < 5; i++) b.cylinder(.022, .022, .007, dark, [cx - .03 + i * .015, 1.535, cz], 12, [0, 0, Math.PI / 2]);
  for (const z of [cz - .08, cz + .08]) rail([cx - .09, 1.52, z], [cx + .09, 1.52, z], .048, frame);
  for (const x of [cx - .09, cx + .09]) rail([x, 1.52, cz - .08], [x, 1.52, cz + .08], .048, frame);
  for (const x of [cx - .086, cx + .086]) for (const z of [cz - .073, cz + .073]) {
    rod([x, 1.529, z], [x, 1.579, z], .0025, frame);
    b.box([.03, .018, .018], dark, [x, 1.583, z], [-.24, 0, 0], .002);
    b.box([.025, .013, .002], workLamp, [x, 1.583, z + .010], [-.24, 0, 0], .001);
  }
  // Visible standpipe and small ladder run along the outside of the mast.
  rod([cx - .115, .402, -.058], [cx - .115, 1.214, -.058], .0045, red);
  for (const x of [cx - .107, cx - .071]) rod([x, .405, cz - .096], [x, 1.50, cz - .096], .0018, frame);
  for (let i = 0; i < 38; i++) {
    const y = .42 + i * .028;
    rod([cx - .107, y, cz - .096], [cx - .071, y, cz - .096], .00165, steel);
  }

  // Monkeyboard projects to the cabin side, with separate finger rails and
  // stored pipe stands visible behind it, as in the photographs.
  b.box([.222, .012, .19], frame, [.111, .974, .01]);
  for (const z of [-.083, .102]) rail([.015, .98, z], [.224, .98, z], .068, frame);
  rail([.224, .98, -.083], [.224, .98, .102], .068, frame);
  rod([.21, .967, -.066], [.015, .858, -.067], .0035, steel);
  rod([.21, .967, .077], [.015, .858, .077], .0035, steel);
  for (let i = 0; i < 6; i++) b.box([.003, .004, .109], frame, [.046 + i * .026, .983, -.006]);
  for (let i = 0; i < 6; i++) {
    const x = -.13 + i * .014;
    rod([x, .4, -.105], [x + .016, 1.002, -.091], .0032, dark);
  }

  // Raised cabin: corrugated ivory skin, glazed front windows, door and roof.
  b.box([.319, .144, .231], white, [.274, .452, -.029], [0, 0, 0], .004);
  b.box([.347, .011, .248], steel, [.278, .53, -.029]);
  b.box([.092, .07, .003], window, [.21, .465, .088]);
  b.box([.057, .07, .003], window, [.326, .465, .088]);
  for (const x of [.169, .21, .251, .3, .35]) b.box([.003, .071, .005], steel, [x, .465, .09]);
  b.box([.003, .092, .058], frame, [.435, .433, -.044]);
  b.box([.004, .041, .045], window, [.438, .456, -.044]);
  b.box([.006, .003, .012], safety, [.44, .412, -.021]);
  for (let i = 0; i < 18; i++) b.box([.002, .037, .003], steel, [.121 + i * .017, .405, .089]);
  b.box([.035, .046, .035], frame, [.286, .418, -.159], [0, 0, 0], .003);
  for (let i = 0; i < 5; i++) b.box([.027, .002, .002], dark, [.286, .404 + i * .006, -.178]);
  b.box([.053, .023, .039], dark, [.378, .548, -.036], [0, 0, 0], .003);
  rod([.399, .533, -.107], [.399, .614, -.107], .0012, dark);
  // Cabin support legs remain visible, instead of a solid platform block.
  for (const x of [.197, .392]) for (const z of [-.126, .068]) b.box([.014, .302, .014], frame, [x, .195, z]);
  rod([.197, .067, -.126], [.392, .337, -.126], .0055, frame);
  rail([-.303, floorY, -.178], [.435, floorY, -.178]);
  rail([-.303, floorY, .178], [.102, floorY, .178]);
  rail([-.303, floorY, -.178], [-.303, floorY, .03]);

  const stairs = (start, end, width) => {
    const dx = end[0] - start[0], dz = end[2] - start[2];
    const length = Math.hypot(dx, dz), across = [-dz / length, dx / length];
    const rotationY = Math.atan2(-across[1], across[0]);
    const count = 14;
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count;
      const position = start.map((v, axis) => THREE.MathUtils.lerp(v, end[axis], t));
      b.box([width, .008, length / count + .008], frame, position, [0, rotationY, 0]);
    }
    for (const s of [-1, 1]) {
      const a = [start[0] + across[0] * width * .48 * s, start[1], start[2] + across[1] * width * .48 * s];
      const c = [end[0] + across[0] * width * .48 * s, end[1], end[2] + across[1] * width * .48 * s];
      rod(a, c, .006, frame);
      rail(a, c, .06, safety, .065);
    }
  };
  stairs([-.305, .366, .102], [-.571, .055, .25], .084);
  b.box([.076, .009, .1], frame, [.472, .375, -.045]);
  stairs([.476, .371, .006], [.584, .055, .265], .077);
  rail([.442, .378, -.09], [.508, .378, -.09]);
  rail([.508, .378, -.09], [.508, .378, .016]);

  // Red pump/power skids and horizontal pipe storage ground the silhouette.
  for (let i = 0; i < 3; i++) {
    const x = -.501 + i * .122;
    b.box([.107, .09, .135], red, [x, .081, -.203], [0, 0, 0], .006);
    b.box([.114, .009, .145], dark, [x, .036, -.203]);
    b.box([.086, .009, .123], frame, [x, .13, -.203]);
    for (let j = 0; j < 4; j++) b.box([.06, .003, .002], dark, [x, .062 + j * .011, -.134]);
    rod([x, .135, -.225], [x, .165, -.225], .003, dark);
    b.cylinder(.006, .006, .007, steel, [x, .168, -.225], 8);
  }
  rod([-.543, .055, -.12], [-.18, .055, -.12], .009, dark);
  rod([-.18, .055, -.12], [-.18, .20, -.12], .009, dark);
  for (const x of [-.384, .095]) b.box([.027, .028, .074], frame, [x, .052, .247]);
  for (let i = 0; i < 6; i++) {
    const z = .217 + i * .012;
    b.cylinder(.0045, .0045, .579, dark, [-.145, .073, z], 8, [0, 0, Math.PI / 2]);
    b.cylinder(.0055, .0055, .023, steel, [.128, .073, z], 8, [0, 0, Math.PI / 2]);
  }
  b.box([.115, .108, .104], dark, [.30, .09, .213], [0, 0, 0], .004);
  b.cylinder(.036, .036, .095, red, [.30, .103, .216], 16, [0, 0, Math.PI / 2]);
  b.box([.076, .004, .095], frame, [.30, .148, .213]);
  for (const [x, y, z] of [[-.27, .474, .145], [.427, .589, .069]]) {
    rod([x, y - .083, z], [x, y, z], .002, frame);
    b.box([.031, .02, .023], dark, [x, y, z]);
    b.box([.026, .015, .002], workLamp, [x, y, z + .013]);
  }

  const rig = b.finish();
  rig.userData.displayName = 'Land rig';

  // Dynamic pieces are separate material batches: guide-aligned top drive,
  // extensible hoist lines, rotating drill string and the drawworks drum.
  const driveBuilder = new ModelBuilder('Rig top drive');
  driveBuilder.box([.063, .069, .058], frame, [0, .042, 0], [0, 0, 0], .006);
  for (const x of [-.036, .036]) driveBuilder.box([.008, .08, .065], steel, [x, .043, 0]);
  for (let i = 0; i < 3; i++) driveBuilder.cylinder(.022, .022, .012, dark, [-.019 + i * .019, .065, 0], 12, [0, 0, Math.PI / 2]);
  driveBuilder.box([.063, .095, .069], dark, [0, -.04, .006], [0, 0, 0], .006);
  driveBuilder.box([.045, .054, .006], red, [0, -.033, .044], [0, 0, 0], .003);
  for (const x of [-.022, .022]) driveBuilder.box([.009, .094, .014], steel, [x, -.04, .043]);
  for (const x of [-.03, .03]) driveBuilder.box([.009, .124, .021], frame, [x, -.003, -.029]);
  driveBuilder.cylinder(.018, .024, .025, steel, [0, -.1, .006], 12);
  const drive = driveBuilder.finish();
  rig.add(drive);

  const lineBuilder = new ModelBuilder('Rig reeved hoist lines');
  for (const x of [-.027, -.009, .009, .027]) lineBuilder.rod([x, 0, 0], [x, 1, 0], .00135, dark, 5);
  const hoist = lineBuilder.finish();
  rig.add(hoist);
  const shaftBuilder = new ModelBuilder('Rig rotating drill string');
  shaftBuilder.cylinder(.009, .009, 1, steel, [0, .5, 0], 12);
  shaftBuilder.box([.004, .985, .002], dark, [0, .5, .009]);
  const shaft = shaftBuilder.finish();
  rig.add(shaft);

  const rotaryBuilder = new ModelBuilder('Rig rotary table');
  rotaryBuilder.cylinder(.041, .042, .016, dark, [0, 0, 0], 24);
  rotaryBuilder.cylinder(.028, .032, .012, steel, [0, .012, 0], 16);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    rotaryBuilder.box([.012, .003, .016], safety, [Math.sin(angle) * .03, .01, Math.cos(angle) * .03], [0, angle, 0]);
  }
  const rotary = rotaryBuilder.finish();
  rotary.position.set(cx, floorY + .016, cz + .006);
  rig.add(rotary);

  const drumBuilder = new ModelBuilder('Rig drawworks drum');
  drumBuilder.cylinder(.024, .024, .075, frame, [0, 0, 0], 16, [0, 0, Math.PI / 2]);
  for (const x of [-.042, .042]) drumBuilder.cylinder(.033, .033, .01, dark, [x, 0, 0], 16, [0, 0, Math.PI / 2]);
  drumBuilder.box([.082, .003, .005], safety, [0, .025, 0]);
  const drum = drumBuilder.finish();
  drum.position.set(.031, .426, -.136);
  rig.add(drum);

  // Flexible service loop follows the carriage. Instancing keeps its 22 small
  // links to one draw call and avoids allocating geometry during animation.
  const hose = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0053, .0053, 1, 6), dark, 22);
  hose.name = 'Rig flexible top-drive service loop';
  hose.castShadow = true;
  hose.receiveShadow = true;
  hose.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // Instances change length and position; the whole rig is tiny enough to
  // keep the loop in the draw without stale per-instance frustum bounds.
  hose.frustumCulled = false;
  rig.add(hose);
  const crownLight = new THREE.PointLight('#fff0cd', 0, .95, 2);
  crownLight.position.set(cx, 1.47, .1);
  const floorLight = new THREE.PointLight('#ffe5b5', 0, .78, 2);
  floorLight.position.set(.12, .57, .145);
  rig.add(crownLight, floorLight);
  const transform = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  const start = new THREE.Vector3(), end = new THREE.Vector3(), direction = new THREE.Vector3();
  const curve = new THREE.CubicBezierCurve3();
  let previousTravel = -1;

  const rigMechanism = {
    // travel = 0..1 (upper to lower), rotation = radians, lights = 0..1.
    // All coordinates below are local, before the room's .89 scale.
    setPose({ travel = 0, rotation = 0, lights = 0 } = {}) {
      travel = THREE.MathUtils.clamp(Number.isFinite(travel) ? travel : 0, 0, 1);
      rotation = Number.isFinite(rotation) ? rotation : 0;
      lights = THREE.MathUtils.clamp(Number.isFinite(lights) ? lights : 0, 0, 1);
      if (travel !== previousTravel) {
        const driveY = THREE.MathUtils.lerp(1.183, .586, travel);
        drive.position.set(cx, driveY, cz);
        hoist.position.set(cx, driveY + .079, cz);
        hoist.scale.y = 1.514 - (driveY + .079);
        shaft.position.set(cx, floorY + .032, cz + .006);
        shaft.scale.y = driveY - .113 - (floorY + .032);
        // Feed hose hangs in a U below the fixed standpipe and follows drive.
        curve.v0.set(cx - .115, 1.214, -.058);
        curve.v1.set(cx - .172, driveY - .235, .061);
        curve.v2.set(cx - .028, driveY - .24, .074);
        curve.v3.set(cx - .027, driveY - .012, .049);
        for (let i = 0; i < hose.count; i++) {
          curve.getPoint(i / hose.count, start);
          curve.getPoint((i + 1) / hose.count, end);
          direction.subVectors(end, start);
          transform.position.copy(start).add(end).multiplyScalar(.5);
          transform.scale.set(1, direction.length(), 1);
          transform.quaternion.setFromUnitVectors(up, direction.normalize());
          transform.updateMatrix();
          hose.setMatrixAt(i, transform.matrix);
        }
        hose.instanceMatrix.needsUpdate = true;
        drum.rotation.x = travel * Math.PI * 12;
        previousTravel = travel;
      }
      shaft.rotation.y = rotation;
      rotary.rotation.y = rotation;
      workLamp.emissiveIntensity = .15 + lights * 5;
      crownLight.intensity = lights * .19;
      floorLight.intensity = lights * .16;
    },
  };
  rigMechanism.setPose();
  rig.updateMatrixWorld(true);
  rig.userData.localBounds = new THREE.Box3().setFromObject(rig);
  return { rig, rigMechanism };
}
