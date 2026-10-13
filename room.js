import * as THREE from 'three';
import { material, box, cylinder, rod, canvasTexture, labelTexture, plant, woodTexture } from './scene-utils.js';

export function buildRoom(scene, textures) {
  const room = new THREE.Group(); room.name = 'Damians studio'; scene.add(room);
  const woodMap = woodTexture();
  // Charcoal timber, warm white surfaces and gold fittings keep the accents deliberate.
  const oak = new THREE.MeshStandardMaterial({ color: '#68616b', map: woodMap, roughness: .61 });
  const walnut = new THREE.MeshStandardMaterial({ color: '#514650', map: woodMap, roughness: .43 });
  const cream = material('#e8e4e4'), wall = material('#d7d3dc'), dark = material('#25212d', .47);
  const steel = material('#302b38', .36, .55), brass = material('#d7b56d', .32, .65);
  const ivory = material('#eee9e5'), black = material('#17151d', .47), leather = material('#9f233b', .7);
  const warmGlow = new THREE.MeshStandardMaterial({ color: '#ffe9b9', emissive: '#eabd69', emissiveIntensity: 2 });
  const coolGlow = new THREE.MeshStandardMaterial({ color: '#bc98f0', emissive: '#9263cf', emissiveIntensity: 1.1 });

  // The room is a real cutaway, including the window opening and a thick timber foundation.
  box(room, [8.15, .24, 6.35], [0, -.18, 0], walnut, .09);
  box(room, [8.03, .10, 6.23], [0, -.01, 0], oak, .025);
  for (let z = -3; z < 3.15; z += .39) {
    for (let x = -4; x < 4; x += 2.0) {
      const length = Math.min(1.989, 4 - x);
      const plank = box(room, [length, .022, .379], [x + length / 2, .047, z], oak, .006);
      plank.material = oak.clone(); plank.material.color.offsetHSL(0, 0, .025 * Math.sin(x * 7 + z * 33));
    }
  }
  box(room, [8.14, 3.75, .16], [0, 1.9, -3.15], wall, .025);
  box(room, [.16, 1.2, 6.3], [-4.02, .63, 0], cream, .025);
  box(room, [.16, .48, 6.3], [-4.02, 3.52, 0], cream, .025);
  box(room, [.16, 2.15, .6], [-4.02, 2.26, -2.87], cream, .02);
  box(room, [.16, 2.15, 2.1], [-4.02, 2.26, 2.09], cream, .02);
  box(room, [8.0, .13, .05], [0, .13, -3.044], walnut, .01);
  box(room, [.05, .13, 6.15], [-3.91, .13, 0], walnut, .01);
  box(room, [8.19, .075, .22], [0, 3.8, -3.15], oak, .02);
  box(room, [.22, .075, 6.34], [-4.02, 3.8, 0], oak, .02);

  // Deep window jambs and slim mullions frame Damian's original coast-to-night scene.
  const windowArt = new THREE.Mesh(new THREE.PlaneGeometry(3.64, 2.04), new THREE.MeshBasicMaterial({ map: textures.coast, color: '#ffffff' }));
  windowArt.position.set(-4.095, 2.25, -.77); windowArt.rotation.y = Math.PI / 2; room.add(windowArt);
  const windowFrame = material('#28242f', .5);
  for (const y of [1.21, 3.29]) box(room, [.27, .09, 3.75], [-3.98, y, -.77], windowFrame, .012);
  for (const z of [-2.61, -1.38, -.15, 1.07]) box(room, [.22, 2.14, .055], [-3.95, 2.25, z], windowFrame, .008);
  box(room, [.46, .08, 3.88], [-3.88, 1.2, -.77], oak, .015);
  box(room, [.10, .04, 3.68], [-3.81, 2.61, -.77], windowFrame, .008);
  // Open slatted blind, pull cord, and small windowsill objects.
  for (let i = 0; i < 5; i++) box(room, [.18, .035, 3.7], [-3.82, 3.18 - i * .058, -.77], walnut, .005);
  rod(room, [-3.78, 3.25, .94], [-3.78, 2.18, .94], .007, ivory);
  cylinder(room, .016, .016, .07, [-3.78, 2.15, .94], walnut, 12);
  plant(room, [-3.82, 1.24, -.1], .42);
  cylinder(room, .075, .067, .16, [-3.79, 1.32, .51], ivory);

  // Stained timber work desk, metal trestles, joinery, drawer and cable routing.
  const desk = new THREE.Group(); room.add(desk);
  box(desk, [3.62, .14, 1.25], [-.75, 1.43, -1.89], walnut, .055);
  box(desk, [3.44, .05, 1.11], [-.75, 1.335, -1.89], black, .025);
  box(desk, [2.88, .012, .018], [-.75, 1.32, -1.327], coolGlow, .003);
  for (const x of [-2.25, .75]) {
    for (const z of [-2.28, -1.47]) {
      rod(desk, [x, .08, z + (z > -2 ? .09 : -.09)], [x, 1.34, z], .045, steel);
      cylinder(desk, .048, .05, .025, [x, .07, z + (z > -2 ? .09 : -.09)], black);
    }
    rod(desk, [x, .3, -2.3], [x, .3, -1.43], .029, steel);
  }
  box(desk, [.91, .33, .83], [-1.9, 1.15, -1.94], walnut, .025);
  box(desk, [.82, .025, .03], [-1.9, 1.22, -1.508], brass, .008);
  const cableCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.75,1.8,-2.42),new THREE.Vector3(-.75,1.31,-2.57),new THREE.Vector3(-.3,.7,-2.57),new THREE.Vector3(-.2,.12,-2.82),new THREE.Vector3(.35,.09,-2.83)]);
  room.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 28, .017, 6, false), black));
  // Leather desk mat and individually molded keyboard keys.
  box(desk, [2.18, .018, .68], [-.57, 1.513, -1.65], material('#302936'), .08);
  box(desk, [1.18, .048, .4], [-.78, 1.552, -1.66], ivory, .035);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 15; col++) {
    const keyMat = (col === 0 && row === 0) || (col === 14 && row === 2) ? leather : cream;
    box(desk, [.061, .024, .062], [-1.31 + col * .076, 1.585, -1.8 + row * .081], keyMat, .006);
  }
  box(desk, [.39, .025, .057], [-.78, 1.586, -1.477], cream, .007);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), ivory);
  mouse.position.set(.17, 1.57, -1.64); mouse.scale.set(.093, .047, .15); mouse.castShadow = true; desk.add(mouse);
  box(desk, [.008, .015, .055], [.17, 1.616, -1.685], steel, .002);
  // Computer stand and a slim but solid physical screen housing.
  box(desk, [.62, .045, .32], [-.72, 1.535, -2.12], steel, .026);
  box(desk, [.13, .43, .085], [-.72, 1.76, -2.25], steel, .028);
  const screenCenter = new THREE.Vector3(-.72, 2.28, -2.105);
  box(desk, [2.19, 1.365, .11], [-.72, 2.28, -2.17], black, .06);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.075, 1.257), new THREE.MeshBasicMaterial({ map: textures.screen, toneMapped: false }));
  screen.position.copy(screenCenter); screen.userData.action = 'desk'; desk.add(screen);
  box(desk, [.09, .007, .012], [-.72, 1.647, -2.107], coolGlow, .003);
  cylinder(desk, .022, .022, .012, [-.72, 2.938, -2.16], black);
  // Speakers with two recessed drivers, a volume knob, and status lights.
  for (const x of [-2.07, .64]) {
    box(desk, [.26, .39, .24], [x, 1.69, -2.18], black, .045);
    for (const [y, r] of [[1.64, .075], [1.785, .038]]) {
      const driver = cylinder(desk, r, r, .016, [x, y, -2.05], steel); driver.rotation.x = Math.PI / 2;
      const cone = new THREE.Mesh(new THREE.SphereGeometry(r * .58, 16, 12), black); cone.scale.z = .2; cone.position.set(x,y,-2.032); desk.add(cone);
    }
    const led = new THREE.Mesh(new THREE.SphereGeometry(.007, 8, 6), warmGlow); led.position.set(x + .075,1.525,-2.045); desk.add(led);
  }
  // Coffee, notebook, pencil, and a machined computer tower.
  const mugMat = material('#eee9e5', .3);
  cylinder(desk, .095, .085, .18, [-1.9, 1.6, -1.45], mugMat);
  cylinder(desk, .082, .082, .008, [-1.9, 1.687, -1.45], material('#352820'));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.065,.018,10,24), mugMat); handle.position.set(-1.8,1.6,-1.45); desk.add(handle);
  const notebook = box(desk, [.4,.035,.57],[.68,1.53,-1.65],leather,.013); notebook.rotation.y = -.14;
  rod(desk,[.55,1.56,-1.85],[.78,1.56,-1.46],.008,brass);
  box(room,[.53,.93,.71],[.73,.535,-2.04],black,.065);
  box(room,[.4,.64,.018],[.73,.57,-1.675],steel,.018);
  for(let i=0;i<18;i++)box(room,[.32,.012,.01],[.73,.32+i*.028,-1.66],black,.003);
  box(room,[.26,.013,.012],[.73,.96,-1.674],warmGlow,.004);

  // Adjustable brass task light, with a warm pool of light on the timber.
  cylinder(desk,.14,.17,.035,[-2.38,1.52,-2.25],steel);
  rod(desk,[-2.38,1.54,-2.25],[-2.35,2.25,-2.24],.023,brass);
  rod(desk,[-2.35,2.25,-2.24],[-1.91,2.41,-2.15],.021,brass);
  const shade = cylinder(desk,.09,.19,.16,[-1.9,2.35,-2.15],dark); shade.rotation.z = -.22;
  cylinder(desk,.16,.16,.008,[-1.88,2.278,-2.15],warmGlow);
  const lamp = new THREE.PointLight('#ffc27b', 13, 3.5, 2); lamp.position.set(-1.88,2.23,-2.12); room.add(lamp);

  // Upholstered office chair: sculpted shell, piping, armrests, five-star base and casters.
  const chair = new THREE.Group(); chair.position.set(-.75,0,-.18); chair.rotation.y = -.2; room.add(chair);
  cylinder(chair,.032,.04,.57,[0,.38,0],steel);
  const fabric = material('#b72840',.91);
  box(chair,[.85,.16,.81],[0,.78,0],black,.16);
  box(chair,[.87,.17,.8],[0,.88,0],fabric,.18);
  const back = box(chair,[.86,.83,.16],[0,1.26,.38],fabric,.17); back.rotation.x = -.1;
  box(chair,[.77,.065,.021],[0,1.58,.478],leather,.02);
  for (const x of [-.54,.54]) {
    rod(chair,[x,.76,.22],[x,1.11,.2],.025,steel);
    rod(chair,[x,.75,-.22],[x,1.11,-.15],.025,steel);
    box(chair,[.115,.062,.52],[x,1.13,.02],walnut,.04);
  }
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5, x=Math.cos(a)*.52,z=Math.sin(a)*.52;
    rod(chair,[0,.25,0],[x,.135,z],.035,steel);
    const wheel=cylinder(chair,.068,.068,.062,[x,.12,z],black,16); wheel.rotation.z=Math.PI/2;
  }

  // A woven rug grounds the furniture and keeps the cutaway from feeling like a floating set.
  const rugTex = canvasTexture(512,512,(c,w,h)=>{
    c.fillStyle='#d8d2d5';c.fillRect(0,0,w,h);
    for(let i=0;i<512;i+=3){c.strokeStyle=i%2?'#d8d2d5':'#e5dfe1';c.lineWidth=1;c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke();}
    for(let i=0;i<512;i+=3){c.strokeStyle='rgba(46,35,49,.10)';c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke();}
    c.strokeStyle='#4e344f';c.lineWidth=6;c.strokeRect(22,22,468,468);c.strokeStyle='#b99d64';c.lineWidth=2;c.strokeRect(32,32,448,448);
  });
  box(room,[3.85,.025,2.8],[-.13,.075,.62],new THREE.MeshStandardMaterial({map:rugTex,roughness:1}),.045);
  for(let i=0;i<60;i++)for(const z of[-.83,2.07])rod(room,[-1.98+i*.064,.084,z],[-1.98+i*.064,.084,z+(z<0?-.055:.055)],.006,cream);

  // Display cabinet for the Midway model, with drawers and brushed brass pulls.
  const cabinet = new THREE.Group(); cabinet.position.set(-2.81,0,1.8); room.add(cabinet);
  box(cabinet,[1.94,.09,.8],[0,.96,0],walnut,.035);
  box(cabinet,[1.84,.69,.72],[0,.56,0],walnut,.025);
  for(const y of[.35,.65]){
    box(cabinet,[1.73,.27,.035],[0,y,.372],oak,.014);
    box(cabinet,[.3,.02,.04],[0,y+.025,.407],brass,.009);
  }
  for(const x of[-.79,.79])for(const z of[-.25,.25])cylinder(cabinet,.032,.024,.2,[x,.13,z],steel);

  // A low display at the front center balances the Midway cabinet on the left.
  const rigDisplay = new THREE.Group(); rigDisplay.name = 'Land rig display'; rigDisplay.position.set(.55,0,2.1); room.add(rigDisplay);
  for(const y of[.42,1.08])box(rigDisplay,[1.81,.09,.75],[0,y,0],walnut,.026);
  for(const x of[-.84,.84])box(rigDisplay,[.07,.98,.67],[x,.59,0],steel,.013);
  box(rigDisplay,[1.62,.025,.035],[0,1.03,.27],warmGlow,.006);
  for(let i=0;i<9;i++){
    const heights=[.31,.4,.37,.45,.36,.41,.43,.35,.32], colors=['#5e4280','#9f233b','#e8e4e4','#28232f'];
    const b=box(rigDisplay,[.1,heights[i],.36],[-.69+i*.117,.47+heights[i]/2,.06],material(colors[i%4]),.009);
    if(i===8)b.rotation.z=.12;
    box(rigDisplay,[.065,.014,.008],[-.69+i*.117,.60,.246],brass,.002);
  }
  const rigBase = new THREE.Vector3(.55,1.127,2.1);
  const shelfLight = new THREE.PointLight('#ffc086',4,2.1,2);shelfLight.position.set(.55,.96,2.4);room.add(shelfLight);
  // Long upper shelf gives the wall an architectural horizontal line.
  box(room,[3.6,.08,.32],[-.73,3.26,-2.86],walnut,.015);
  for(const x of[-2.1,.64])rod(room,[x,3.22,-2.69],[x,3.06,-3.06],.014,brass);
  plant(room,[-2.1,3.3,-2.87],.31);
  for(let i=0;i<6;i++)box(room,[.15,.17+i%3*.05,.22],[-1.65+i*.16,3.38+i%3*.025,-2.86],material(['#9f233b','#e8e4e4','#624581'][i%3]),.005);
  const shelfLabel=new THREE.Mesh(new THREE.PlaneGeometry(.73,.26),new THREE.MeshStandardMaterial({map:labelTexture('DAMIAN','EST. MY OWN WORLD.')}));shelfLabel.position.set(.21,3.465,-2.65);room.add(shelfLabel);
  box(room,[.8,.32,.07],[.21,3.46,-2.71],walnut,.01);

  // Low greenery marks the front corners.
  plant(room,[-3.37,.06,2.73],1.14);
  plant(room,[3.35,.06,2.66],.69);
  // Details around the base: power outlet, trim fasteners, and a wall clock.
  box(room,[.15,.18,.022],[.32,.32,-3.045],cream,.013);
  for(const x of[.29,.35])box(room,[.009,.033,.006],[x,.33,-3.03],black,.002);
  const clockGroup = new THREE.Group();clockGroup.position.set(-3.12,3.0,-3.01);room.add(clockGroup);
  const clockBody=cylinder(clockGroup,.235,.235,.05,[0,0,0],brass,48);clockBody.rotation.x=Math.PI/2;
  const clockFace=new THREE.Mesh(new THREE.CircleGeometry(.211,48),new THREE.MeshStandardMaterial({color:'#eee9e5'}));clockFace.position.z=.031;clockGroup.add(clockFace);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const tick=box(clockGroup,[.009,.028,.008],[Math.sin(a)*.18,Math.cos(a)*.18,.04],dark,.001);tick.rotation.z=-a;}
  const hour=box(clockGroup,[.017,.12,.01],[0,.047,.046],dark,.003),minute=box(clockGroup,[.01,.17,.009],[0,.071,.057],dark,.002);
  const hourPivot=new THREE.Group(),minutePivot=new THREE.Group();hourPivot.add(hour);minutePivot.add(minute);clockGroup.add(hourPivot,minutePivot);
  return { room, screen, screenCenter, lamp, shelfLight, warmGlow, coolGlow, windowArt, clock: {hour:hourPivot,minute:minutePivot}, chair, cabinet, rigDisplay, rigBase, materials:{wall,cream,dark} };
}
