import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildRoom } from './room.js';
import { createPersonalObjects } from './personal-objects.js';
import { box, cylinder, material, canvasTexture } from './scene-utils.js';
import { initGallery, closeGallery } from './gallery.js';
import { rigCyclePose, RIG_CYCLE_DURATION } from './rig-operation.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const experience = $('#experience'), desktop = $('#desktop'), loaderEl = $('#loading');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let renderer, scene, camera, controls, composer, cssRenderer, screenObject, room;
let currentView = 'room', transition = null, sceneReady = false;
let usingFallback = false;
let hasEntered = false, entranceRequested = false;
let animationFrame = 0, notesDraft, notesStorageAvailable = true;
let renderRequested = true, lastViewport = null, orbiting = false, lastHoverTime = 0, cameraAdjusted = false;
let immersive = false, homeBlend = 1, sceneVisible = true;
const screenFraming={x:0,y:0},rigFraming={x:0,y:0},midwayFraming={x:0,y:0};
let midwayBounds;
let manualFraming=null;
let returnHash = '#home', entryControl = null;
const websiteSections = ['home', 'my-world', 'gallery'];
const viewport = () => ({width:Math.max(1,experience.clientWidth),height:Math.max(1,experience.clientHeight)});
let fill, hemisphere, monitorLight, props, rocketBase, launchStarted = 0, launchActive = false;
const rigState = { elapsed: 0, running: false, lights: false, staticTravel: null };
const saluteState = { elapsed: 0, active: false, reduced: false };
let lastTime = performance.now(), lastClock = 0, lastFrame = 0;
const screenWidth = 2.075, screenHeight = 1.257;
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const interactive = [];
const clickStart = { x: 0, y: 0 }, nightColor = new THREE.Color('#0b0a10');
const anchors = {
  midway: { target: [-2.82, 1.23, 1.8], offset: [2.05, 1.53, 2.9], title: 'USS Midway', number: '01 / THE COAST', description: 'Fire the deck guns together.', action: 'Fire together' },
  rig: { target: [.55, 1.84, 2.1], offset: [1.3, .65, 3.3], title: 'The land rig.', number: '02 / THE LAND', description: 'Bring the rig to life.', action: 'Start drilling ↻' },
  rocket: { target: [.87, 3.61, -2.88], offset: [1.05, .4, 2.75], title: 'The rocket.', number: '03 / BEYOND', description: 'Ready for launch.', action: 'Launch it ↗' },
};

function createScreenTexture(image) {
  return canvasTexture(1120,678,(ctx,w,h)=>{
    ctx.drawImage(image,0,0,w,h);
    const gradient=ctx.createLinearGradient(0,0,w,0);gradient.addColorStop(0,'#1b0b32c0');gradient.addColorStop(1,'#29134616');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#17141eed';ctx.fillRect(0,0,w,40);ctx.fillStyle='#f7f4f8';ctx.font='bold 13px Arial';ctx.fillText('dl.   Damian’s computer',23,26);
    ctx.fillStyle='#f7f4f8';ctx.font='100px Georgia';ctx.fillText('Damian',65,287);ctx.fillText('Lujan.',65,385);
    ['My world','The view','Notebook'].forEach((t,i)=>{
      const y=92+i*108;ctx.fillStyle=['#d7b56d','#9263cf','#f7f4f8'][i];ctx.beginPath();ctx.roundRect(1019,y,43,37,4);ctx.fill();ctx.font='12px Arial';ctx.textAlign='center';ctx.fillStyle='#f7f4f8';ctx.fillText(t,1040,y+56);ctx.textAlign='left';
    });
    ctx.fillStyle='#17141ee6';ctx.beginPath();ctx.roundRect(426,602,268,61,14);ctx.fill();
    for(let i=0;i<4;i++){ctx.fillStyle=['#d7b56d','#7242a6','#f7f4f8','#b72840'][i];ctx.beginPath();ctx.roundRect(438+i*62,611,43,43,10);ctx.fill();}
  });
}

// Merge static objects by material, preserving moving pieces and interactive surfaces.
function batchRoom(root) {
  root.updateMatrixWorld(true);
  const batches = new Map(), remove = [];
  root.traverse(object=>{
    if(!object.isMesh || object===room.screen || object===room.windowArt || object.parent===room.clock.hour || object.parent===room.clock.minute || Array.isArray(object.material))return;
    const key=object.material.uuid+object.castShadow+object.receiveShadow;
    if(!batches.has(key))batches.set(key,{geometries:[],material:object.material,cast:object.castShadow,receive:object.receiveShadow});
    const geom=object.geometry.clone().applyMatrix4(object.matrixWorld);
    if(geom.index) {const non=geom.toNonIndexed();geom.dispose();batches.get(key).geometries.push(non);}else batches.get(key).geometries.push(geom);
    remove.push(object);
  });
  for(const batch of batches.values()){
    if(batch.geometries.length===0)continue;
    const common=['position','normal','uv'];
    batch.geometries.forEach(g=>Object.keys(g.attributes).filter(k=>!common.includes(k)).forEach(k=>g.deleteAttribute(k)));
    const merged=mergeGeometries(batch.geometries,false);
    if(merged){const mesh=new THREE.Mesh(merged,batch.material);mesh.castShadow=batch.cast;mesh.receiveShadow=batch.receive;scene.add(mesh);}
    batch.geometries.forEach(g=>g.dispose());
  }
  remove.forEach(o=>o.removeFromParent());
}

async function init() {
  const size=viewport();
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(size.width, size.height);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  $('#world').append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Drag to rotate Damian’s room; use the navigation buttons to explore the desk and collection.');
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#live-status').textContent='The 3D view was interrupted. Please reload to restore the room.';showFallback();});
  scene = new THREE.Scene();scene.background=nightColor.clone();
  scene.fog=new THREE.Fog(nightColor,28,65);
  camera = new THREE.PerspectiveCamera(36,size.width/size.height,.05,130);
  controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;controls.enableZoom=true;
  controls.minDistance=4;controls.maxDistance=60;controls.minPolarAngle=.45;controls.maxPolarAngle=1.5;
  controls.minAzimuthAngle=-.12;controls.maxAzimuthAngle=Math.PI*.56;
  controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
  controls.addEventListener('start',()=>{
    orbiting=true;
    if(transition&&currentView!=='desk'){
      // Keep the displayed pose when a drag interrupts travel to a closer view.
      const offset=camera.position.clone().sub(controls.target),distance=offset.length();
      const polar=Math.acos(THREE.MathUtils.clamp(offset.y/distance,-1,1));
      controls.minDistance=Math.min(controls.minDistance,distance);
      controls.maxDistance=Math.max(controls.maxDistance,distance);
      controls.minPolarAngle=Math.min(controls.minPolarAngle,polar);
      controls.maxPolarAngle=Math.max(controls.maxPolarAngle,polar);
      manualFraming={...screenFraming};
      transition=null;cameraAdjusted=true;renderRequested=true;
    }
    $('#hover-label').classList.remove('visible');
  });
  controls.addEventListener('end',()=>{orbiting=false;});
  controls.addEventListener('change',()=>{renderRequested=true;if(orbiting)cameraAdjusted=true;});
  const env = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(env,.04).texture;scene.environmentIntensity=.16;env.dispose();pmrem.dispose();
  hemisphere=new THREE.HemisphereLight('#9a89bb','#14101a',.32);scene.add(hemisphere);
  // A single warm spotlight keeps the room lit inside the dark nighttime stage.
  const spotlight=new THREE.SpotLight('#ffe8c5',380,35,.65,.72,2);
  spotlight.position.set(-1,10,4);spotlight.target.position.set(0,.1,-.3);spotlight.castShadow=true;
  spotlight.shadow.mapSize.set(2048,2048);spotlight.shadow.camera.near=.5;spotlight.shadow.camera.far=35;
  spotlight.shadow.normalBias=.025;spotlight.shadow.bias=-.0001;
  scene.add(spotlight,spotlight.target);
  fill=new THREE.DirectionalLight('#9d87c6',.6);fill.position.set(4,6,-2);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#18151e',roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.335;floor.receiveShadow=true;scene.add(floor);floor.name='Stage floor';
  const loader=new THREE.TextureLoader();const coast=await loader.loadAsync('/assets/coast-desktop.webp');if(usingFallback)return;coast.colorSpace=THREE.SRGBColorSpace;coast.anisotropy=8;
  $('#loading-progress').style.width='35%';
  const screenTexture=createScreenTexture(coast.image);
  room=buildRoom(scene,{coast,screen:screenTexture});
  batchRoom(room.room);
  props=createPersonalObjects();
  props.midway.position.set(-2.81,1.006,1.8);props.midway.scale.setScalar(1.07);
  // Cache the resting model once, reserving space for the outboard flare/smoke.
  // The camera must not move as the salute's transient geometry expands.
  midwayBounds=new THREE.Box3().setFromObject(props.midway).expandByVector(new THREE.Vector3(.02,.02,.21).multiplyScalar(1.07));
  props.rig.position.set(.55,1.127,2.1);props.rig.scale.setScalar(.89);
  props.rocket.position.set(.87,3.301,-2.88);props.rocket.scale.setScalar(.49);rocketBase=props.rocket.position.clone();
  scene.add(props.midway,props.rig,props.rocket);
  // Brass nameplates anchor the miniatures as personal display pieces.
  const brass=material('#d7b56d',.35,.55);
  box(scene,[.37,.008,.10],[-2.8,1.013,2.10],brass,.005);
  const plaqueTexture=canvasTexture(512,128,(c,w,h)=>{c.fillStyle='#d7b56d';c.fillRect(0,0,w,h);c.fillStyle='#17141e';c.font='28px monospace';c.textAlign='center';c.fillText('USS MIDWAY',w/2,78);});
  const plaque=new THREE.Mesh(new THREE.PlaneGeometry(.35,.0875),new THREE.MeshStandardMaterial({map:plaqueTexture,roughness:.55}));plaque.rotation.x=-Math.PI/2;plaque.position.set(-2.8,1.018,2.10);scene.add(plaque);
  for(const key of['midway','rig','rocket']){props[key].traverse(o=>{if(o.isMesh){o.userData.action=key;interactive.push(o);}});}
  interactive.push(room.screen);
  room.lamp.intensity=23;room.shelfLight.intensity=10;room.windowArt.material.color.set('#625c80');
  monitorLight=new THREE.PointLight('#b184ff',10,3.4,2);monitorLight.position.set(-.72,2.08,-1.75);scene.add(monitorLight);
  cssRenderer=new CSS3DRenderer();cssRenderer.setSize(size.width,size.height);$('#css-world').append(cssRenderer.domElement);
  screenObject=new CSS3DObject(desktop);screenObject.position.copy(room.screenCenter);screenObject.position.z+=.006;
  screenObject.scale.set(screenWidth/1120,screenHeight/678,1);const cssScene=new THREE.Scene();cssScene.add(screenObject);
  cssRenderer.userData={scene:cssScene};
  composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const ao=new SSAOPass(scene,camera,size.width,size.height,16);ao.kernelRadius=.24;ao.minDistance=.0005;ao.maxDistance=.045;
  composer.addPass(ao);
  composer.addPass(new OutputPass());composer.addPass(new SMAAPass());
  composer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  $('#loading-progress').style.width='85%';
  goTo('room',true);bindSceneEvents();lastViewport=null;resize();updateClock();
  await renderer.compileAsync(scene,camera);
  if(usingFallback)return;
  // Compile the post-processing shaders behind the entrance, before the first interaction.
  composer.render();renderer.shadowMap.autoUpdate=false;
  $('#loading-progress').style.width='100%';sceneReady=true;document.body.dataset.sceneReady='true';
  applyRoute(false);
  animate(performance.now());
  requestAnimationFrame(()=>loaderEl.classList.add('loaded'));
}

function overviewCamera(){
  const size=viewport(),aspect=size.width/size.height;const factor=Math.max(1,.99/aspect)*(immersive||innerWidth<=760?1:1.28);
  const target=new THREE.Vector3(-.1,1.48,-.1);
  return {target,position:target.clone().add(new THREE.Vector3(10.7,7.3,12.5).multiplyScalar(factor))};
}
function rigCamera(){
  const size=viewport(),note=$('#object-note').getBoundingClientRect();
  const portrait=size.width<=760&&size.height>500;
  const left=portrait?18:note.right+28,right=size.width-18;
  const top=portrait?115:Math.min(104,size.height*.23);
  const bottom=portrait?note.top-18:size.height-88;
  const availableWidth=Math.max(120,right-left),availableHeight=Math.max(120,bottom-top);
  rigFraming.x=size.width/2-(left+right)/2;
  rigFraming.y=size.height/2-(top+bottom)/2;
  const bounds=new THREE.Box3().setFromObject(props.rig),target=bounds.getCenter(new THREE.Vector3());
  const direction=new THREE.Vector3(...anchors.rig.offset).normalize();
  const rightAxis=new THREE.Vector3().crossVectors(camera.up,direction).normalize();
  const upAxis=new THREE.Vector3().crossVectors(direction,rightAxis).normalize();
  const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const fitX=tanY*camera.aspect*availableWidth/size.width,fitY=tanY*availableHeight/size.height;
  let distance=2;
  for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z]){
    const corner=new THREE.Vector3(x,y,z).sub(target),depth=corner.dot(direction);
    distance=Math.max(distance,depth+Math.abs(corner.dot(rightAxis))*1.12/fitX,depth+Math.abs(corner.dot(upAxis))*1.12/fitY);
  }
  return {target,position:target.clone().addScaledVector(direction,distance)};
}
function midwayCamera(){
  const size=viewport(),note=$('#object-note').getBoundingClientRect();
  const portrait=size.width<=760&&size.height>500;
  const left=portrait?18:note.right+28,right=size.width-18;
  const top=portrait?125:Math.max(84,Math.min(104,size.height*.23));
  const bottom=portrait?note.top-18:size.height-88;
  const availableWidth=Math.max(40,right-left),availableHeight=Math.max(40,bottom-top);
  midwayFraming.x=size.width/2-(left+right)/2;
  midwayFraming.y=size.height/2-(top+bottom)/2;
  const target=midwayBounds.getCenter(new THREE.Vector3());
  const direction=new THREE.Vector3(...anchors.midway.offset).normalize();
  const rightAxis=new THREE.Vector3().crossVectors(camera.up,direction).normalize();
  const upAxis=new THREE.Vector3().crossVectors(direction,rightAxis).normalize();
  const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const fitX=tanY*camera.aspect*availableWidth/size.width,fitY=tanY*availableHeight/size.height;
  let distance=2;
  for(const x of[midwayBounds.min.x,midwayBounds.max.x])for(const y of[midwayBounds.min.y,midwayBounds.max.y])for(const z of[midwayBounds.min.z,midwayBounds.max.z]){
    const corner=new THREE.Vector3(x,y,z).sub(target),depth=corner.dot(direction);
    distance=Math.max(distance,depth+Math.abs(corner.dot(rightAxis))*1.12/fitX,depth+Math.abs(corner.dot(upAxis))*1.12/fitY);
  }
  return {target,position:target.clone().addScaledVector(direction,distance)};
}
function viewCamera(view){
  if(view==='room')return overviewCamera();
  if(view==='rig')return rigCamera();
  if(view==='midway')return midwayCamera();
  if(view==='desk'){
    const target=room.screenCenter.clone();
    const distance=Math.max(2.45,screenWidth/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)*1.2);
    return {target,position:target.clone().add(new THREE.Vector3(0,.015,distance))};
  }
  if(view==='collection')return {target:new THREE.Vector3(1.0,2.0,-1.75),position:new THREE.Vector3(5.8,4.5,5.6)};
  const a=anchors[view],target=new THREE.Vector3(...a.target),offset=new THREE.Vector3(...a.offset);
  offset.multiplyScalar(Math.max(1,.65/camera.aspect));return {target,position:target.clone().add(offset)};
}
function goTo(view,instant=false){
  if(view!=='rig')rigState.running=false;
  if(view!=='midway'&&saluteState.active)stopSalute();
  if(usingFallback){
    currentView=view;experience.dataset.view=view;
    const isDesk=immersive&&view==='desk';
    desktop.classList.toggle('ready',isDesk);desktop.classList.toggle('mobile-desktop',isDesk);desktop.inert=!isDesk;
    if(isDesk)experience.append(desktop);
    $('#fallback').hidden=!immersive||isDesk;
    $('#back-button').hidden=true;$('#object-note').hidden=true;$('#collection-picker').hidden=true;
    $('#live-status').textContent=isDesk?'Computer ready. The 3D room is unavailable.':'The 3D room is unavailable. You can open the desktop or return to the website.';
    if(immersive)requestAnimationFrame(()=>{if(usingFallback&&immersive)(isDesk?desktop.querySelector('[data-app=world]'):$('#fallback-desktop')).focus({preventScroll:true});});
    return;
  }
  if(!room)return;
  cameraAdjusted=false;manualFraming=null;
  if(view!=='desk')$('#os-window').hidden=true;
  // Clear residual orbit damping without moving the currently displayed camera.
  const positionBefore=camera.position.clone(),targetBefore=controls.target.clone();
  controls.enableDamping=false;controls.update();controls.enableDamping=true;
  camera.position.copy(positionBefore);controls.target.copy(targetBefore);camera.lookAt(targetBefore);
  if(view!=='desk' && desktop.contains(document.activeElement))$('.room-nav [data-view=room]').focus({preventScroll:true});
  desktop.classList.remove('ready');desktop.inert=true;
  if(desktop.classList.contains('mobile-desktop')){desktop.classList.remove('mobile-desktop');cssRenderer.render(cssRenderer.userData.scene,camera);}
  currentView=view;experience.dataset.view=view;
  $('.site-footer').inert=view==='desk';
  $('.room-caption').setAttribute('aria-hidden',String(view!=='room'));
  $$('.room-nav button').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-current',String(active));});
  $('#back-button').hidden=view!=='desk';
  $('#collection-picker').hidden=view!=='collection';
  $('#object-note').hidden=!anchors[view];
  $('#rig-controls').hidden=view!=='rig';$('#rig-reset').hidden=view!=='rig';
  if(anchors[view]){const a=anchors[view];$('#object-number').textContent=a.number;$('#object-title').textContent=a.title;$('#object-description').textContent=a.description;$('#object-action').hidden=!a.action;if(view==='rig')syncRigControls();else if(view==='midway')syncMidwayAction();else if(a.action)syncRocketAction();}
  controls.enabled=immersive&&view!=='desk';$('#hover-label').classList.remove('visible');
  const to=viewCamera(view);
  controls.minDistance=view==='room'?4:1.5;
  controls.minPolarAngle=.45;controls.maxPolarAngle=1.5;
  controls.maxDistance=Math.max(view==='room'?37:10,to.position.distanceTo(to.target)*1.5);
  renderRequested=true;renderer.shadowMap.needsUpdate=true;
  $('#live-status').textContent=view==='desk'?'Approaching your computer.':view==='room'?'Back in the room.':anchors[view]?.title||'Exploring the collection.';
  if(instant||reduceMotion.matches){
    camera.position.copy(to.position);controls.target.copy(to.target);camera.lookAt(to.target);finishMove();
  }
  else transition={start:performance.now(),duration:view==='desk'?650:550,from:camera.position.clone(),fromTarget:controls.target.clone(),...to};
}
function finishMove(){
  transition=null;controls.enabled=immersive&&currentView!=='desk';
  if(currentView==='desk'){
    if(innerWidth<=760){desktop.classList.add('mobile-desktop');experience.append(desktop);}
    desktop.classList.add('ready');desktop.inert=false;
    if(!desktop.classList.contains('mobile-desktop'))cssRenderer.render(cssRenderer.userData.scene,camera);
    desktop.querySelector('[data-app=world]').focus({preventScroll:true});
    $('#live-status').textContent='Computer ready. Open My world, The view, or Notebook.';
  }
}
function bindSceneEvents(){
  renderer.domElement.addEventListener('pointerdown',e=>{clickStart.x=e.clientX;clickStart.y=e.clientY;});
  renderer.domElement.addEventListener('pointermove',e=>{
    if(!immersive||transition||orbiting||currentView==='desk'||e.pointerType==='touch')return;
    const now=performance.now();if(now-lastHoverTime<70)return;lastHoverTime=now;
    const hit=getHit(e);const tooltip=$('#hover-label');
    renderer.domElement.style.cursor=hit?'pointer':'grab';
    tooltip.classList.toggle('visible',!!hit);
    if(hit){tooltip.textContent=hit==='desk'?'Take a seat ↗':anchors[hit].title+' ↗';tooltip.style.left=Math.min(e.clientX+17,innerWidth-170)+'px';tooltip.style.top=Math.max(80,e.clientY-40)+'px';}
  });
  renderer.domElement.addEventListener('pointerleave',()=>$('#hover-label').classList.remove('visible'));
  renderer.domElement.addEventListener('pointerup',e=>{if(!immersive||Math.hypot(e.clientX-clickStart.x,e.clientY-clickStart.y)>7||transition)return;const hit=getHit(e);if(hit)navigateRoom(hit);});
  renderer.domElement.addEventListener('wheel',()=>{$('#hover-label').classList.remove('visible');},{passive:true});
}
function getHit(e){
  const rect=experience.getBoundingClientRect();
  pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);
  // Intersect the full scene so an object behind a wall or another furnishing cannot be clicked through it.
  const intersections=raycaster.intersectObjects(scene.children,true).filter(hit=>{
    let object=hit.object;
    while(object){if(!object.visible)return false;object=object.parent;}
    return hit.object.material?.visible!==false;
  });
  return intersections[0]?.object.userData.action||null;
}
function resize(reframe=true){
  if(usingFallback||!renderer||!camera)return;
  const size=viewport();
  const widthChanged=!lastViewport||size.width!==lastViewport.width;
  if(lastViewport&&size.width===lastViewport.width&&size.height===lastViewport.height)return;
  lastViewport={...size};renderRequested=true;
  camera.aspect=size.width/size.height;camera.updateProjectionMatrix();renderer.setSize(size.width,size.height);composer?.setSize(size.width,size.height);cssRenderer?.setSize(size.width,size.height);
  const objectFit=sceneReady?(currentView==='rig'?rigCamera():currentView==='midway'?midwayCamera():null):null;
  if(sceneReady&&reframe!==false&&(widthChanged||(objectFit&&!cameraAdjusted&&!transition))){
    manualFraming=null;
    const to=objectFit||viewCamera(currentView);camera.position.copy(to.position);controls.target.copy(to.target);camera.lookAt(to.target);transition=null;
    controls.maxDistance=Math.max(currentView==='room'?37:10,to.position.distanceTo(to.target)*1.5);
    if(immersive&&currentView==='desk'&&!desktop.classList.contains('ready'))finishMove();
    if(immersive&&currentView!=='desk')controls.enabled=true;
    if(currentView==='desk'&&desktop.classList.contains('ready')){
      const mobile=innerWidth<=760;
      if(mobile!==desktop.classList.contains('mobile-desktop')){
        desktop.classList.toggle('mobile-desktop',mobile);
        if(mobile)experience.append(desktop);else cssRenderer.render(cssRenderer.userData.scene,camera);
      }
    }
  }
}
function updateClock(){
  renderRequested=true;if(renderer)renderer.shadowMap.needsUpdate=true;
  const d=new Date();$('#local-time').textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}).toUpperCase()+' / YOUR TIME';
  $('#os-date').textContent=d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})+'   '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  if(room){room.clock.hour.rotation.z=-(d.getHours()%12+d.getMinutes()/60)*Math.PI/6;room.clock.minute.rotation.z=-d.getMinutes()*Math.PI/30;}
}
function animate(time){
  if(usingFallback)return;
  animationFrame=requestAnimationFrame(animate);
  if(!hasEntered)return;
  if(document.hidden||(!sceneVisible&&!immersive))return;
  // Render only while something changes; keep motion smooth at display refresh rate.
  const minFrame=1000/60;if(time-lastFrame<minFrame-1)return;lastFrame=time;
  const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;
  const previousBlend=homeBlend;
  homeBlend=reduceMotion.matches?(immersive?0:1):THREE.MathUtils.damp(homeBlend,immersive?0:1,4,dt);
  if(homeBlend<.001)homeBlend=0;else if(homeBlend>.999)homeBlend=1;
  if(homeBlend!==previousBlend)renderRequested=true;
  const size=viewport(),mobile=innerWidth<=760;
  const objectFraming=immersive?(currentView==='rig'?rigFraming:currentView==='midway'?midwayFraming:null):null;
  const framingX=manualFraming?.x??(objectFraming?objectFraming.x:mobile?0:-size.width*.17*homeBlend);
  const framingY=manualFraming?.y??(objectFraming?objectFraming.y:-size.height*(mobile?.19:.015)*homeBlend);
  for(const [axis,target] of[['x',framingX],['y',framingY]]){
    const before=screenFraming[axis];
    screenFraming[axis]=reduceMotion.matches?target:THREE.MathUtils.damp(before,target,10,dt);
    if(Math.abs(screenFraming[axis]-target)<.1)screenFraming[axis]=target;
    if(screenFraming[axis]!==before)renderRequested=true;
  }
  if(renderRequested){if(screenFraming.x||screenFraming.y)camera.setViewOffset(size.width,size.height,screenFraming.x,screenFraming.y,size.width,size.height);else camera.clearViewOffset();}
  if(transition){
    renderRequested=true;
    const t=Math.min((time-transition.start)/transition.duration,1);const ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    camera.position.lerpVectors(transition.from,transition.position,ease);controls.target.lerpVectors(transition.fromTarget,transition.target,ease);camera.lookAt(controls.target);
    if(t===1)finishMove();
  }else if(controls.enabled)controls.update();
  const roomDistance=camera.position.distanceTo(controls.target);scene.fog.near=roomDistance+16;scene.fog.far=roomDistance+48;
  if(launchActive){
    renderRequested=true;renderer.shadowMap.needsUpdate=true;
    const elapsed=(time-launchStarted)/1000;
    if(elapsed<1.2){props.launchFlame.visible=true;props.launchFlame.scale.y=.6+Math.sin(time*.07)*.08;props.rocket.position.y=rocketBase.y+(reduceMotion.matches?0:elapsed*.16);}
    else if(elapsed<3.6){const progress=(elapsed-1.2)/2.4;props.rocket.position.y=rocketBase.y+.2+progress*progress*9;props.launchFlame.scale.y=1+Math.sin(time*.07)*.08;}
    else if(elapsed>4.6){props.rocket.position.copy(rocketBase);props.launchFlame.visible=false;launchActive=false;syncRocketAction();}
  }
  if(rigState.running&&immersive&&currentView==='rig'){
    rigState.elapsed=Math.min(RIG_CYCLE_DURATION,rigState.elapsed+dt);
    if(rigState.elapsed===RIG_CYCLE_DURATION)rigState.running=false;
    applyRigPose();
  }
  if(saluteState.active){
    saluteState.elapsed+=dt;
    const duration=saluteState.reduced?.3:props.midwaySalute.duration;
    if(saluteState.elapsed>=duration)stopSalute();
    else{
      props.midwaySalute.setProgress(saluteState.reduced?.08:saluteState.elapsed,{reducedMotion:saluteState.reduced});
      renderRequested=true;renderer.shadowMap.needsUpdate=true;
    }
  }
  if(time-lastClock>30000){updateClock();lastClock=time;}
  if(!renderRequested)return;
  renderRequested=false;
  composer.render();if(cssRenderer&&desktop.classList.contains('ready')&&!desktop.classList.contains('mobile-desktop'))cssRenderer.render(cssRenderer.userData.scene,camera);
}

$$('.room-nav button').forEach(button=>button.addEventListener('click',()=>navigateRoom(button.dataset.view)));
$$('#collection-picker button').forEach(button=>button.addEventListener('click',()=>navigateRoom(button.dataset.object)));
$('.identity').addEventListener('click',e=>{e.preventDefault();navigateRoom('room');});
$('#back-button').addEventListener('click',()=>navigateRoom('room'));
$('#leave-desktop').addEventListener('click',()=>navigateRoom('room'));
window.addEventListener('resize',resize);
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'&&immersive){e.preventDefault();if(currentView==='desk'&&!$('#os-window').hidden){closeWindow();}else if(currentView!=='room')navigateRoom('room');else leaveRoom();}});
$('#fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#live-status').textContent='Fullscreen is unavailable in this browser.';}
});
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
function syncRocketAction(){
  if(currentView!=='rocket')return;
  const action=$('#object-action');
  action.disabled=launchActive;
  action.textContent=launchActive?'See you out there.':reduceMotion.matches?(props.launchFlame.visible?'Engines off':'Light the engines ↗'):'Launch it ↗';
}
function syncMidwayAction(){
  if(currentView!=='midway')return;
  $('#object-action').disabled=saluteState.active;
  $('#object-action').textContent=saluteState.active?'Firing together…':'Fire together';
}
function stopSalute(){
  saluteState.active=false;saluteState.elapsed=0;
  props?.midwaySalute?.reset();renderRequested=true;
  if(renderer)renderer.shadowMap.needsUpdate=true;
  syncMidwayAction();
}
function fireSalute(){
  if(!props?.midwaySalute||saluteState.active)return;
  saluteState.active=true;saluteState.elapsed=0;saluteState.reduced=reduceMotion.matches;
  props.midwaySalute.setProgress(saluteState.reduced?.08:0,{reducedMotion:saluteState.reduced});
  renderRequested=true;renderer.shadowMap.needsUpdate=true;syncMidwayAction();
  $('#live-status').textContent='Midway’s deck guns fire together.';
}
function syncRigControls(){
  if(currentView!=='rig')return;
  const pose=rigCyclePose(rigState.elapsed),action=$('#object-action');
  action.disabled=false;
  const label=reduceMotion.matches?(rigState.staticTravel>0?'Raise drill ↑':'Lower drill ↓'):rigState.running?'Pause drilling Ⅱ':rigState.elapsed>=RIG_CYCLE_DURATION?'Run again ↻':rigState.elapsed>0?'Resume drilling ▷':'Start drilling ↻';
  if(action.textContent!==label)action.textContent=label;
  const status=reduceMotion.matches?(rigState.staticTravel>0?'Drill lowered':'Ready to drill'):rigState.running||rigState.elapsed>=RIG_CYCLE_DURATION?pose.phase:rigState.elapsed>0?'Paused':'Ready to drill';
  if($('#rig-status').textContent!==status)$('#rig-status').textContent=status;
  if($('#rig-controls').dataset.running!==String(rigState.running))$('#rig-controls').dataset.running=String(rigState.running);
  if($('#rig-lights').getAttribute('aria-pressed')!==String(rigState.lights))$('#rig-lights').setAttribute('aria-pressed',String(rigState.lights));
  const lightLabel=rigState.lights?'On':'Off';
  if($('#rig-lights span').textContent!==lightLabel)$('#rig-lights span').textContent=lightLabel;
  $('#rig-progress-fill').style.transform=`scaleX(${reduceMotion.matches?(rigState.staticTravel||0):pose.progress})`;
}
function applyRigPose(){
  const pose=rigCyclePose(rigState.elapsed);
  props?.rigMechanism?.setPose({travel:rigState.staticTravel??pose.travel,rotation:pose.rotation,lights:rigState.lights?1:0});
  renderRequested=true;if(renderer)renderer.shadowMap.needsUpdate=true;
  syncRigControls();
}
function toggleRig(){
  if(!props?.rigMechanism)return;
  if(reduceMotion.matches){
    rigState.running=false;rigState.elapsed=0;rigState.staticTravel=rigState.staticTravel>0?0:1;rigState.lights=true;
  }else{
    if(rigState.elapsed>=RIG_CYCLE_DURATION||rigState.staticTravel!==null)rigState.elapsed=0;
    rigState.staticTravel=null;rigState.running=!rigState.running;
    if(rigState.running)rigState.lights=true;
  }
  applyRigPose();
}
$('#rig-lights').addEventListener('click',()=>{rigState.lights=!rigState.lights;applyRigPose();});
$('#rig-reset').addEventListener('click',()=>{rigState.running=false;rigState.elapsed=0;rigState.staticTravel=null;applyRigPose();});
reduceMotion.addEventListener('change',()=>{
  if(saluteState.active)stopSalute();
  rigState.running=false;
  if(reduceMotion.matches)rigState.staticTravel=rigCyclePose(rigState.elapsed).travel;
  else if(rigState.elapsed>0)rigState.staticTravel=null;
  applyRigPose();
});
$('#object-action').addEventListener('click',()=>{
  if(currentView==='midway'){fireSalute();return;}
  if(currentView==='rig'){toggleRig();return;}
  if(currentView!=='rocket'||launchActive)return;
  if(reduceMotion.matches){props.launchFlame.visible=!props.launchFlame.visible;renderRequested=true;renderer.shadowMap.needsUpdate=true;syncRocketAction();return;}
  launchActive=true;launchStarted=performance.now();syncRocketAction();
});

function openApp(app){
  const content=$('#window-content');$('#os-window').hidden=false;
  if(app==='world'){
    $('#window-title').textContent='My world';content.innerHTML='<div class="world-content"><h3>Damian Lujan.</h3><div class="world-links"><button data-destination="room"><span>01</span><strong>The room ↗</strong><small>Look around.</small></button><button data-destination="gallery"><span>02</span><strong>The view ↗</strong><small>Open the gallery.</small></button><button data-destination="home"><span>03</span><strong>The website ↗</strong><small>Back to the homepage.</small></button></div></div>';
    content.querySelectorAll('[data-destination]').forEach(button=>button.addEventListener('click',()=>{const destination=button.dataset.destination;closeWindow();if(destination==='room')navigateRoom('room');else location.hash=destination;}));
  }else if(app==='gallery'){
    $('#window-title').textContent='The view';content.innerHTML='<div class="gallery-content"><img src="/assets/coast-desktop.webp" alt="Damian’s coastal world: USS Midway and a city in daylight, land transitioning to a drilling rig under stars, a full moon and a launching rocket."/><p>The world outside my window. From the coast into the night.</p></div>';
  }else if(app==='notes'){
    $('#window-title').textContent='Notebook';content.innerHTML='<div class="notes-content"><label for="personal-notes">Room for a thought.</label><textarea id="personal-notes" placeholder="Something on your mind…" spellcheck="true"></textarea><small id="save-status">Saved only in this browser.</small></div>';
    const notes=$('#personal-notes');
    if(notesDraft===undefined){try{notesDraft=localStorage.getItem('damian-room-notes')||'';}catch{notesDraft='';notesStorageAvailable=false;}}
    notes.value=notesDraft;
    if(!notesStorageAvailable)$('#save-status').textContent='Browser storage unavailable. Notes last for this visit.';
    notes.addEventListener('input',()=>{notesDraft=notes.value;try{localStorage.setItem('damian-room-notes',notesDraft);notesStorageAvailable=true;$('#save-status').textContent='Saved only in this browser.';}catch{notesStorageAvailable=false;$('#save-status').textContent='Browser storage unavailable. Notes last for this visit.';}});
  }
  $('#close-window').focus();
}
function closeWindow(){$('#os-window').hidden=true;desktop.querySelector('[data-app=world]').focus();}
$$('[data-app]').forEach(button=>button.addEventListener('click',()=>openApp(button.dataset.app)));
$('#close-window').addEventListener('click',closeWindow);

function navigateRoom(view){
  if(immersive&&view===currentView){if(cameraAdjusted&&!transition&&view!=='desk')goTo(view);return;}
  if(!immersive){entryControl=document.activeElement;returnHash=websiteSections.includes(location.hash.slice(1))?location.hash:'#home';}
  const next=`#room/${view}`;
  if(location.hash===next)applyRoute();else location.hash=next;
}
function leaveRoom(){
  if(location.hash===returnHash)applyRoute();else location.hash=returnHash;
}
function applyRoute(scroll=true){
  if(!hasEntered)return;
  if(scroll)closeGallery();
  const route=location.hash.slice(1);
  const isRoom=route==='room'||route.startsWith('room/');
  const previous=immersive;
  immersive=isRoom;
  document.body.classList.toggle('website-immersive',isRoom);
  experience.inert=!isRoom;
  $('#exit-world').hidden=!isRoom;
  $$('#website-header,.hero-copy,.scene-preview-button,.home-bottom,#my-world,#gallery,.website-footer').forEach(element=>element.inert=isRoom);
  if(isRoom){
    const requested=route.split('/')[1]||'room';
    const view=['room','desk','collection','midway','rig','rocket'].includes(requested)?requested:'room';
    document.title=`${view==='desk'?'The desk':anchors[view]?.title||'The room'} — Damian Lujan`;
    if(usingFallback)goTo(view,true);
    else if(sceneReady){resize(false);goTo(view);}
  }else{
    document.title='Damian Lujan';
    if(previous){
      $('#os-window').hidden=true;desktop.classList.remove('ready');desktop.inert=true;
      if(sceneReady){resize(false);goTo('room',true);}
      if(entryControl?.isConnected)entryControl.focus({preventScroll:true});
    }
    if(usingFallback){desktop.classList.remove('ready','mobile-desktop');desktop.inert=true;$('#fallback').hidden=true;}
    const section=websiteSections.includes(route)?route:'home';
    $$('.website-header nav a').forEach(a=>a.classList.toggle('selected',a.hash===`#${section}`));
    if(scroll&&websiteSections.includes(route))requestAnimationFrame(()=>document.getElementById(section).scrollIntoView({behavior:reduceMotion.matches?'instant':'smooth',block:'start'}));
  }
}
$$('[data-room-view]').forEach(button=>button.addEventListener('click',()=>navigateRoom(button.dataset.roomView)));
$('#exit-world').addEventListener('click',leaveRoom);
window.addEventListener('hashchange',()=>applyRoute());
window.addEventListener('scroll',()=>document.body.classList.toggle('page-scrolled',scrollY>50),{passive:true});
new IntersectionObserver(entries=>{sceneVisible=entries[0].isIntersecting;},{threshold:0}).observe(experience);
experience.inert=true;
initGallery();
applyRoute(false);

function revealEntrance(){
  if(!entranceRequested||hasEntered||(!sceneReady&&!usingFallback))return;
  hasEntered=true;
  const entrance=$('#entrance');
  entrance.inert=true;
  document.body.classList.remove('entrance-pending');
  $('#website-main').inert=false;$('#website-header').inert=false;
  const route=location.hash.slice(1);
  const destination=route==='room'||route.startsWith('room/')||['my-world','gallery'].includes(route)?location.hash:'#room/room';
  history.replaceState(null,'',location.pathname+location.search+destination);
  homeBlend=destination.startsWith('#room')?0:1;
  if(destination.startsWith('#room'))entryControl=$('.primary-link');
  applyRoute(true);
  if(immersive){window.scrollTo({top:0,behavior:'instant'});if(currentView!=='desk'||!desktop.classList.contains('ready'))$('#exit-world').focus({preventScroll:true});}
  else $('.website-header nav a.selected')?.focus({preventScroll:true});
  entrance.classList.add('is-leaving');
  if(reduceMotion.matches)entrance.hidden=true;
  else setTimeout(()=>{entrance.hidden=true;},700);
}
$('#enter-world').addEventListener('click',()=>{
  if(entranceRequested)return;
  entranceRequested=true;$('#enter-world').disabled=true;
  if(!sceneReady&&!usingFallback)$('#entrance-status').textContent='Opening…';
  revealEntrance();
});
window.addEventListener('keydown',event=>{
  if(!hasEntered&&!entranceRequested&&event.key==='Enter'&&!event.repeat){event.preventDefault();$('#enter-world').click();}
});

let audioContext, audioGain, soundOn=false;
$('#sound').addEventListener('click',async()=>{
  try{
    if(!audioContext){
      audioContext=new AudioContext();audioGain=audioContext.createGain();audioGain.gain.value=0;audioGain.connect(audioContext.destination);
      const length=audioContext.sampleRate*5,buffer=audioContext.createBuffer(2,length,audioContext.sampleRate);
      for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);let smooth=0;for(let i=0;i<length;i++){smooth=(smooth+(Math.random()*2-1)*.015)/1.015;data[i]=smooth;}}
      const noise=audioContext.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=480;noise.connect(filter);filter.connect(audioGain);noise.start();
      for(const freq of[130.81,196,261.63]){const oscillator=audioContext.createOscillator();oscillator.type='sine';oscillator.frequency.value=freq;const gain=audioContext.createGain();gain.gain.value=.009;oscillator.connect(gain);gain.connect(audioGain);oscillator.start();}
    }
    await audioContext.resume();soundOn=!soundOn;audioGain.gain.setTargetAtTime(soundOn?.4:0,audioContext.currentTime,.8);document.body.dataset.sound=String(soundOn);$('#sound').setAttribute('aria-label',soundOn?'Turn ambient sound off':'Turn ambient sound on');
  }catch{$('#live-status').textContent='Ambient sound is unavailable in this browser.';}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&saluteState.active)stopSalute();if(audioContext){if(document.hidden)audioContext.suspend();else if(soundOn)audioContext.resume().catch(()=>{});}});
function showFallback(){
  if(saluteState.active)stopSalute();
  usingFallback=true;sceneReady=false;transition=null;launchActive=false;rigState.running=false;
  cancelAnimationFrame(animationFrame);if(controls)controls.enabled=false;
  document.body.classList.add('scene-unavailable');document.body.dataset.sceneReady='false';
  loaderEl.classList.add('loaded');$('.site-footer').inert=true;$('.site-header').inert=true;
  applyRoute(false);
}
$('#fallback-desktop').addEventListener('click',()=>navigateRoom('desk'));
init().then(revealEntrance).catch(error=>{console.error('Unable to start the room:',error);showFallback();revealEntrance();});
