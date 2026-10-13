import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function material(color, roughness = .65, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
export function box(parent, size, position, mat, radius = .025) {
  const g = radius ? new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(n => n / 2))) : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
export function cylinder(parent, top, bottom, height, position, mat, segments = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), mat);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
export function rod(parent, a, b, radius, mat) {
  const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
  const mesh = cylinder(parent, radius, radius, av.distanceTo(bv), av.clone().add(bv).multiplyScalar(.5).toArray(), mat, 12);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.sub(av).normalize());
  return mesh;
}
export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; return texture;
}
export function labelTexture(text, subtext = '', bg = '#e8e4e4', fg = '#28232f') {
  return canvasTexture(768, 512, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg; ctx.font = 'bold 68px Arial'; ctx.textAlign = 'center';
    text.split('\n').forEach((line, i, lines) => ctx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 80));
    ctx.font = '18px monospace'; ctx.fillText(subtext, w / 2, h - 62);
  });
}
export function plant(parent, position, scale = 1) {
  const group = new THREE.Group(); group.position.set(...position); group.scale.setScalar(scale); parent.add(group);
  const pot = material('#35303b'), soil = material('#30291e'), stem = material('#445739');
  cylinder(group, .23, .18, .42, [0, .21, 0], pot);
  cylinder(group, .218, .218, .025, [0, .417, 0], soil);
  const greens = ['#47604d', '#5e7452', '#78915e', '#3f5846'].map(c => material(c));
  for (let i = 0; i < 13; i++) {
    const angle = i * 2.39996, h = .63 + (i % 5) * .16, r = .24 + (i % 3) * .08;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    rod(group, [0, .38, 0], [x, h, z], .009, stem);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), greens[i % 4]);
    leaf.scale.set(.13, .27, .025); leaf.position.set(x, h + .07, z);
    leaf.rotation.set(.4 * Math.sin(angle), -angle, -.45 * Math.cos(angle)); leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}
export function woodTexture() {
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#d0cdce'; ctx.fillRect(0, 0, w, h);
    let seed = 53;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 1800; i++) {
      const y = random() * h;
      ctx.strokeStyle = `rgba(${random() > .5 ? '55,48,57' : '242,238,242'},${random() * .12})`;
      ctx.lineWidth = random() * 1.1 + .2; ctx.beginPath(); ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + random() * 3, 370, y - random() * 4, w, y); ctx.stroke();
    }
  }); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return tex;
}
