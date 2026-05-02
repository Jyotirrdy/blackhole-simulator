import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

const G = 6.67430e-11;
const C = 299_792_458;
const M_SUN = 1.98847e30;

const app = document.getElementById('app');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020209, 0.015);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 15, 42);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 10;
controls.maxDistance = 180;

scene.add(new THREE.AmbientLight(0x5577aa, 0.22));
const rim = new THREE.PointLight(0x88bbff, 35, 500);
rim.position.set(-20, 24, 20);
scene.add(rim);

const blackHoleGeo = new THREE.SphereGeometry(4, 96, 96);
const blackHoleMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const blackHole = new THREE.Mesh(blackHoleGeo, blackHoleMat);
scene.add(blackHole);

const diskUniforms = {
  time: { value: 0 },
  spin: { value: 0.7 },
  turbulence: { value: 0.65 },
};
const diskMat = new THREE.ShaderMaterial({
  uniforms: diskUniforms,
  transparent: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPos;
    void main() {
      vUv = uv;
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPos;
    uniform float time;
    uniform float spin;
    uniform float turbulence;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i), b = hash(i + vec2(1,0));
      float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
      vec2 u = f * f * (3.0 - 2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }

    void main(){
      vec2 centered = vUv - 0.5;
      float r = length(centered) * 2.0;
      float angle = atan(centered.y, centered.x);
      float swirl = angle + time * (0.7 + spin * 1.6) / (r + 0.18);
      float n = noise(vec2(swirl * 2.2, r * 8.0 - time * 0.9));
      float n2 = noise(vec2(swirl * 5.3 + 8.0, r * 13.0 + time));
      float band = smoothstep(1.0, 0.24, r) * smoothstep(0.08, 0.16, r);
      float glow = band * (0.48 + 1.2 * mix(n, n2, turbulence));
      vec3 color = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.92, 0.65), clamp(r, 0.0, 1.0));
      color *= glow;
      gl_FragColor = vec4(color, glow * 0.95);
    }
  `,
});

const disk = new THREE.Mesh(new THREE.RingGeometry(5.4, 18, 256), diskMat);
disk.rotation.x = Math.PI * 0.49;
scene.add(disk);

const starCount = 7000;
const starGeo = new THREE.BufferGeometry();
const positions = new Float32Array(starCount * 3);
const colors = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const i3 = i * 3;
  const r = 180 + Math.random() * 720;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  positions[i3] = r * Math.sin(phi) * Math.cos(theta);
  positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i3 + 2] = r * Math.cos(phi);

  const tint = 0.7 + Math.random() * 0.3;
  colors[i3] = tint;
  colors[i3 + 1] = tint * (0.92 + Math.random() * 0.08);
  colors[i3 + 2] = 1;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: 0.9 })
);
scene.add(stars);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(4.1, 4.8, 128),
  new THREE.MeshBasicMaterial({ color: 0x112244, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
);
ring.rotation.x = Math.PI * 0.5;
scene.add(ring);

const massInput = document.getElementById('mass');
const spinInput = document.getElementById('spin');
const diskInput = document.getElementById('disk');
const massVal = document.getElementById('massVal');
const spinVal = document.getElementById('spinVal');
const diskVal = document.getElementById('diskVal');
const radiusKm = document.getElementById('radiusKm');

let massSolar = Number(massInput.value);
function schwarzschildRadiusKm(mSolar) {
  return (2 * G * mSolar * M_SUN) / (C * C) / 1000;
}
function updateLabels() {
  const rs = schwarzschildRadiusKm(massSolar);
  massVal.textContent = massSolar.toExponential(2);
  spinVal.textContent = Number(spinInput.value).toFixed(2);
  diskVal.textContent = Number(diskInput.value).toFixed(2);
  radiusKm.textContent = `${Math.round(rs).toLocaleString()} km`;
}
updateLabels();

massInput.addEventListener('input', () => {
  massSolar = Number(massInput.value);
  const scale = THREE.MathUtils.clamp(2.2 + Math.log10(massSolar / 1e4), 2.2, 8.5);
  blackHole.scale.setScalar(scale / 4);
  ring.scale.setScalar(scale / 4);
  updateLabels();
});

spinInput.addEventListener('input', () => {
  diskUniforms.spin.value = Number(spinInput.value);
  updateLabels();
});

diskInput.addEventListener('input', () => {
  diskUniforms.turbulence.value = Number(diskInput.value);
  updateLabels();
});

function lensStars() {
  const pos = starGeo.attributes.position.array;
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const x = pos[i3], y = pos[i3 + 1], z = pos[i3 + 2];
    const dist = Math.sqrt(x * x + y * y + z * z);
    const bend = 1 + 22 / (dist + 120);
    pos[i3] = x * bend;
    pos[i3 + 1] = y * bend;
    pos[i3 + 2] = z;
  }
  starGeo.attributes.position.needsUpdate = true;
}
lensStars();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  diskUniforms.time.value = t;
  disk.rotation.z += 0.0008 + diskUniforms.spin.value * 0.003;
  ring.rotation.z -= 0.0012;
  stars.rotation.y = t * 0.006;
  controls.update();
  renderer.render(scene, camera);
});
