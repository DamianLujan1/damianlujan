import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeLandRig } from './rig-model.js';
import { buildMidwaySalute } from './midway-salute.js';

// Small, original museum-style objects. Each material is batched into one mesh.
const UP = new THREE.Vector3(0, 1, 0);

class ModelBuilder {
  constructor(name) {
    this.group = new THREE.Group();
    this.group.name = name;
    this.group.userData.collectible = name;
    this.batches = new Map();
  }

  add(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const transform = new THREE.Object3D();
    transform.position.fromArray(position);
    transform.rotation.fromArray(rotation);
    transform.scale.fromArray(scale);
    transform.updateMatrix();
    let shape = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    shape.applyMatrix4(transform.matrix);
    if (!shape.getAttribute('uv')) {
      shape.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(shape.getAttribute('position').count * 2), 2));
    }
    if (!shape.getAttribute('normal')) shape.computeVertexNormals();
    for (const attribute of Object.keys(shape.attributes)) {
      if (!['position', 'normal', 'uv'].includes(attribute)) shape.deleteAttribute(attribute);
    }
    if (!this.batches.has(material)) this.batches.set(material, []);
    this.batches.get(material).push(shape);
    geometry.dispose();
  }

  box(size, material, position, rotation = [0, 0, 0], radius = 0) {
    const geometry = radius
      ? new RoundedBoxGeometry(...size, 2, Math.min(radius, Math.min(...size) * 0.48))
      : new THREE.BoxGeometry(...size);
    this.add(geometry, material, position, rotation);
  }

  cylinder(radiusTop, radiusBottom, height, material, position, segments = 16, rotation = [0, 0, 0]) {
    this.add(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, position, rotation);
  }

  rod(from, to, radius, material, segments = 6) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), segments);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
    this.add(geometry, material, a.add(b).multiplyScalar(0.5).toArray());
  }

  finish() {
    for (const [material, shapes] of this.batches) {
      const geometry = mergeGeometries(shapes, false);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${this.group.name} / ${material.name}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      shapes.forEach(shape => shape.dispose());
    }
    this.group.userData.localBounds = new THREE.Box3().setFromObject(this.group);
    return this.group;
  }
}

function material(name, color, metalness = 0.1, roughness = 0.6) {
  const value = new THREE.MeshStandardMaterial({ color, metalness, roughness });
  value.name = name;
  return value;
}

function deckShape(points, thickness, bevel = 0.003) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => index ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 1,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function hullGeometry() {
  const outline = [[-.66, -.064], [-.54, -.113], [.42, -.111], [.59, -.076], [.715, -.006], [.715, .006], [.59, .076], [.42, .111], [-.54, .113], [-.66, .064]];
  const rings = [{ y: .018, sx: .84, sz: .54 }, { y: .041, sx: .98, sz: .83 }, { y: .105, sx: 1, sz: 1 }, { y: .137, sx: 1, sz: 1.12 }];
  const vertices = [];
  const indices = [];
  rings.forEach(ring => outline.forEach(([x, z]) => vertices.push(x * ring.sx, ring.y, z * ring.sz)));
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let index = 0; index < outline.length; index++) {
      const a = ring * outline.length + index;
      const b = ring * outline.length + (index + 1) % outline.length;
      const c = a + outline.length;
      const d = b + outline.length;
      indices.push(a, c, b, b, c, d);
    }
  }
  for (let index = 1; index < outline.length - 1; index++) {
    indices.push(0, index, index + 1);
    const offset = (rings.length - 1) * outline.length;
    indices.push(offset, offset + index + 1, offset + index);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeMidway(palette) {
  const b = new ModelBuilder('USS Midway');
  const { graphite, hull, deck, ivory, orange, metal, glass, red } = palette;
  // A narrow museum cradle gives the hull a grounded, intentional presentation.
  b.box([1.53, .018, .405], graphite, [0, .009, 0], [0, 0, 0], .006);
  for (const x of [-.4, .4]) b.box([.036, .033, .18], metal, [x, .03, 0], [0, 0, 0], .003);
  b.add(hullGeometry(), hull, [0, .01, 0]);
  b.box([1.13, .013, .2], red, [-.012, .056, 0], [0, 0, 0], .006);

  const outline = [[-.725, -.135], [-.64, -.185], [-.365, -.185], [-.33, -.163], [.49, -.157], [.685, -.105], [.745, -.039], [.745, .073], [.635, .134], [.075, .15], [-.34, .222], [-.66, .208], [-.725, .15]];
  b.add(deckShape(outline, .026), hull, [0, .131, 0]);
  b.add(deckShape(outline.map(([x, z]) => [x * .985, z * .965]), .002, .001), deck, [0, .16, 0]);
  // Aft hangar opening, elevator outlines and small side galleries.
  b.box([.006, .042, .122], graphite, [-.661, .101, 0]);
  for (const x of [-.58, -.3, .07, .36]) {
    b.box([.105, .027, .022], hull, [x, .122, .14], [0, 0, 0], .002);
    b.box([.103, .002, .019], metal, [x, .138, .145]);
  }
  for (const [x, z] of [[-.38, -.139], [.21, -.125], [.53, .108]]) {
    b.box([.12, .0015, .068], metal, [x, .166, z]);
    b.box([.111, .002, .059], deck, [x, .167, z]);
  }
  // The broad angled landing area is painted onto the real deck geometry.
  const angle = .10;
  for (const offset of [-.039, .039]) {
    b.box([1.12, .0015, .004], ivory, [-.103, .1665, .051 + offset], [0, angle, 0]);
  }
  for (let i = 0; i < 18; i++) {
    const x = -.65 + i * .057;
    b.box([.028, .0017, .0026], ivory, [x, .168, .051 - (x + .103) * .10], [0, angle, 0]);
  }
  for (const z of [-.083, -.017]) {
    b.box([.545, .0017, .002], ivory, [.404, .168, z]);
    b.box([.545, .0017, .0018], orange, [.404, .169, z + .009]);
  }
  for (let i = 0; i < 8; i++) {
    b.box([.003, .0018, .046], ivory, [-.57 + i * .013, .168, .053], [0, angle, 0]);
  }
  for (const x of [-.52, -.42, -.32, -.22]) {
    b.rod([x, .169, -.011], [x + .006, .169, .13], .0009, metal, 4);
  }
  // Deck tie-down points are deliberately restrained at collectible scale.
  for (let i = 0; i < 22; i++) {
    for (const z of [-.104, .105]) b.box([.002, .0008, .002], metal, [-.58 + i * .057, .168, z]);
  }

  // Starboard island: stepped volumes, bridge glazing and open radar structures.
  b.box([.29, .041, .069], hull, [-.055, .186, -.126], [0, 0, 0], .003);
  b.box([.185, .05, .063], ivory, [-.04, .227, -.13], [0, 0, 0], .003);
  b.box([.205, .009, .079], hull, [-.025, .253, -.129], [0, 0, 0], .002);
  b.box([.14, .025, .061], ivory, [.005, .27, -.13], [0, 0, 0], .003);
  b.box([.135, .013, .064], glass, [.009, .276, -.13], [0, 0, 0], .002);
  b.box([.159, .008, .079], hull, [.007, .286, -.13], [0, 0, 0], .002);
  for (let i = 0; i < 7; i++) b.box([.004, .016, .067], ivory, [-.052 + i * .019, .276, -.13]);
  b.box([.064, .044, .048], graphite, [-.115, .259, -.132], [0, 0, -.06], .003);
  b.box([.068, .008, .052], hull, [-.116, .282, -.132], [0, 0, 0], .002);
  for (const x of [-.066, .031]) {
    b.rod([x, .285, -.13], [x, .369, -.13], .003, metal);
    b.rod([x - .031, .319, -.13], [x + .031, .319, -.13], .002, metal);
    b.rod([x - .021, .291, -.13], [x, .354, -.13], .0016, metal);
    b.rod([x + .021, .291, -.13], [x, .354, -.13], .0016, metal);
  }
  b.box([.071, .026, .004], graphite, [-.066, .344, -.13], [0, 0, .09]);
  for (let i = 0; i < 5; i++) b.box([.0018, .026, .006], metal, [-.095 + i * .0145, .344, -.13], [0, 0, .09]);
  b.cylinder(.023, .023, .007, ivory, [.032, .354, -.13], 20, [Math.PI / 2, 0, .25]);
  b.rod([-.05, .359, -.13], [-.05, .392, -.13], .0011, metal);
  b.rod([.095, .287, -.129], [.095, .337, -.129], .0013, metal);

  for (let i = 0; i < 20; i++) {
    const x = -.59 + i * .061;
    b.rod([x, .164, -.175], [x, .177, -.175], .0011, metal, 4);
    if (i < 19) b.rod([x, .177, -.175], [x + .061, .177, -.175], .0007, metal, 4);
  }
  // Orange life-raft canisters tucked below the gallery read at closer camera distances.
  for (const x of [-.49, -.28, .16, .38]) {
    b.cylinder(.007, .007, .028, ivory, [x, .135, -.17], 8, [0, 0, Math.PI / 2]);
  }
  const attachSalute = buildMidwaySalute(b, palette);
  const midway = b.finish();
  const midwaySalute = attachSalute(midway);
  return { midway, midwaySalute };
}

function finGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(.095, .045);
  shape.lineTo(.219, .018);
  shape.lineTo(.202, .08);
  shape.lineTo(.105, .272);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .012, bevelEnabled: true, bevelSize: .0018, bevelThickness: .0018, bevelSegments: 1, steps: 1 });
  geometry.translate(0, 0, -.006);
  return geometry;
}

function makeRocket(palette) {
  const b = new ModelBuilder('Beyond rocket');
  const { graphite, ivory, orange, metal, hull } = palette;
  b.cylinder(.09, .107, .075, graphite, [0, .05, 0], 32);
  b.cylinder(.105, .105, .55, ivory, [0, .361, 0], 40);
  b.cylinder(.1055, .1055, .066, graphite, [0, .62, 0], 40);
  b.cylinder(.082, .105, .089, ivory, [0, .697, 0], 40);
  b.cylinder(.0818, .0818, .232, ivory, [0, .857, 0], 36);
  b.cylinder(.082, .082, .026, graphite, [0, .972, 0], 36);
  b.cylinder(.066, .082, .049, metal, [0, 1.009, 0], 36);
  b.cylinder(.065, .065, .06, ivory, [0, 1.063, 0], 32);
  const ogive = [new THREE.Vector2(.065, 1.09), new THREE.Vector2(.063, 1.112), new THREE.Vector2(.056, 1.142), new THREE.Vector2(.044, 1.174), new THREE.Vector2(.029, 1.205), new THREE.Vector2(.009, 1.239), new THREE.Vector2(0, 1.251)];
  b.add(new THREE.LatheGeometry(ogive, 32), ivory);
  for (const y of [.145, .518, .756, .916]) {
    const radius = y > .7 ? .0826 : .1057;
    b.cylinder(radius, radius, .004, metal, [0, y, 0], 40);
  }
  // Alternating stage markings and fine exterior conduits.
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    b.box([.025, .136, .002], graphite, [Math.sin(angle) * .105, .21, Math.cos(angle) * .105], [0, angle, 0]);
    b.rod([Math.sin(angle) * .106, .306, Math.cos(angle) * .106], [Math.sin(angle) * .106, .503, Math.cos(angle) * .106], .0015, hull, 4);
  }
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    b.add(finGeometry(), ivory, [0, 0, 0], [0, angle, 0]);
    const x = Math.sin(angle) * .044;
    const z = Math.cos(angle) * .044;
    b.cylinder(.016, .025, .059, metal, [x, .034, z], 16);
    b.cylinder(.0235, .0235, .003, graphite, [x, .006, z], 16);
  }
  b.cylinder(.018, .027, .064, metal, [0, .035, 0], 20);
  b.cylinder(.0255, .0255, .003, graphite, [0, .0015, 0], 20);
  b.box([.022, .101, .0015], orange, [0, .821, .0824], [0, 0, 0], .0005);
  const rocket = b.finish();
  const launchFlame = new THREE.Group();
  launchFlame.name = 'Rocket launch exhaust';
  launchFlame.visible = false;
  launchFlame.userData.animate = true;
  const flameLayers = [
    { color: 0xff6d2d, radius: .104, length: .68, opacity: .17 },
    { color: 0x918aff, radius: .075, length: .55, opacity: .25 },
    { color: 0xffbc56, radius: .051, length: .43, opacity: .6 },
    { color: 0xd7efff, radius: .031, length: .34, opacity: .95 },
  ];
  for (const [index, layer] of flameLayers.entries()) {
    const points = [new THREE.Vector2(0, -layer.length), new THREE.Vector2(layer.radius * .22, -layer.length * .71), new THREE.Vector2(layer.radius * .75, -layer.length * .25), new THREE.Vector2(layer.radius, -.02), new THREE.Vector2(layer.radius * .63, .008)];
    const geometry = new THREE.LatheGeometry(points, 24);
    const flame = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: layer.color, transparent: true, opacity: layer.opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    flame.name = `Exhaust layer ${index}`;
    launchFlame.add(flame);
  }
  // Small emissive shock diamonds in the blue-white plume.
  const diamondMaterial = new THREE.MeshBasicMaterial({ color: 0xd9f1ff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(.018 - i * .002, 0), diamondMaterial);
    diamond.position.y = -.105 - i * .073;
    diamond.scale.set(1, 1.9, 1);
    launchFlame.add(diamond);
  }
  rocket.add(launchFlame);
  return { rocket, launchFlame };
}

export function createPersonalObjects() {
  const palette = {
    graphite: material('Graphite', '#20272b', .3, .53),
    hull: material('Naval grey', '#747f83', .32, .49),
    deck: material('Flight deck', '#465153', .18, .77),
    ivory: material('Warm ivory', '#e5e0d1', .16, .45),
    orange: material('Signal ochre', '#b96831', .28, .45),
    red: material('Hull antifouling', '#74483e', .18, .72),
    metal: material('Brushed pewter', '#a4a6a0', .68, .36),
    glass: material('Smoked glazing', '#173b49', .55, .19),
  };
  const { midway, midwaySalute } = makeMidway(palette);
  const { rig, rigMechanism } = makeLandRig(ModelBuilder, palette);
  const { rocket, launchFlame } = makeRocket(palette);
  return { midway, midwaySalute, rig, rigMechanism, rocket, launchFlame };
}
