// Register ScrollTrigger plugin for GSAP
gsap.registerPlugin(ScrollTrigger);

// Core Three.js setup
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 75, 160);

// WebGL Renderer with Shadows and Advanced Tone Mapping
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ultra smooth shadows

// Lighting system (AAA Cinematic Setup)
// Faint galactic ambient fill light (deep indigo)
const ambientLight = new THREE.AmbientLight(0x0b0e1a, 0.35); 
scene.add(ambientLight);

// Hemisphere Light to simulate diffuse starlight bounce (deep space blue to dark violet)
const spaceLight = new THREE.HemisphereLight(0x0e172a, 0x050308, 0.25);
scene.add(spaceLight);

// Intense Central Point Light (The Sun) with high-res shadow casting
const sunLight = new THREE.PointLight(0xffffff, 2.5, 500, 0.85); 
sunLight.position.set(0, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048; // High resolution shadow maps
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 5;
sunLight.shadow.camera.far = 350;
sunLight.shadow.bias = -0.0005; // Prevent shadow acne
scene.add(sunLight);

// Deterministic 2D Perlin Noise Utility for procedural textures
const Perlin = {
  p: new Uint8Array(256),
  init() {
    // Ken Perlin reference permutation table
    const perm = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,
      23,190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,
      87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,
      60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54, 65,25,63,161, 1,216,80,73,209,76,
      132,187,208, 89,18,169,200,196,135,130,116,188,189,141,1,2,63,30,81,180,181,242,124,24,84,
      128,112,223,142,67,110,83,56,8,229,26,33,180,156,220,172,144,120,201,31,69,82,68,95,116,36,
      58,121,98,90,150,112,88,144,4,161,224,124,96,252,233,126,80,60,152,225,23,55,108,125,244,
      250,50,220,120,158,11,87,174,18,89,169,122,175,74,165,71,134,139,48,27,166,77,146,158,231,
      83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,
      80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,189,141,1,2,63,30,81,180,181,
      242,124,24,84,128,112,223,142,67,110,83,56,8,229,26,33,180,156,220,172,144,120,201,31,69,82,
      68,95,116,36,58,121,98,90,150,112,88,144,4,161,224,124,96,252,233,126,80,60,152,225,23,55,
      108,125,244,250,50,220,120,158,11,87,174,18,89,169,122,175,74,165,71,134,139,48,27,166,77,
      146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,
      63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,189,141
    ];
    for (let i = 0; i < 256; i++) {
      this.p[i] = perm[i];
    }
  },
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); },
  lerp(t, a, b) { return a + t * (b - a); },
  grad2d(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  },
  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = (this.p[X] + Y) & 255;
    const B = (this.p[X + 1] + Y) & 255;
    return this.lerp(v,
      this.lerp(u, this.grad2d(this.p[A], x, y), this.grad2d(this.p[B], x - 1, y)),
      this.lerp(u, this.grad2d(this.p[A + 1], x, y - 1), this.grad2d(this.p[B + 1], x - 1, y - 1))
    );
  },
  fbm(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
    let total = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return (total / maxValue + 1.0) / 2.0; // Normalised to [0, 1]
  }
};
Perlin.init();

// GLSL Custom Shaders for AAA visual fidelity
// 1. Sun Shader Material (Dynamic plasma & corona)
const sunVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragmentShader = `
  uniform float time;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  // High performance GPU sine-based 3D value noise
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    
    float a = sin(dot(i + vec3(0.0,0.0,0.0), vec3(127.1,311.7, 74.7))) * 43758.5453123;
    float b = sin(dot(i + vec3(1.0,0.0,0.0), vec3(127.1,311.7, 74.7))) * 43758.5453123;
    float c = sin(dot(i + vec3(0.0,1.0,0.0), vec3(127.1,311.7, 74.7))) * 43758.5453123;
    float d = sin(dot(i + vec3(1.0,1.0,0.0), vec3(127.1,311.7, 74.7))) * 43758.5453123;
    float e = sin(dot(i + vec3(0.0,0.0,1.0), vec3(127.1,311.7, 74.7))) * 43758.5453123;
    float g = sin(dot(i + vec3(1.0,0.0,1.0), vec3(127.1,311.7, 74.7))) * 43758.5453123;
    float h = sin(dot(i + vec3(0.0,1.0,1.0), vec3(127.1,311.7, 74.7))) * 43758.5453123;
    float j = sin(dot(i + vec3(1.0,1.0,1.0), vec3(127.1,311.7, 74.7))) * 43758.5453123;
    
    return mix(mix(mix(fract(a), fract(b), u.x),
                   mix(fract(c), fract(d), u.x), u.y),
               mix(mix(fract(e), fract(g), u.x),
                   mix(fract(h), fract(j), u.x), u.y), u.z);
  }
  
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 4; ++i) {
      v += a * noise(p);
      p = p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }
  
  void main() {
    // Plasma drift vectors
    vec3 coord1 = vPosition * 0.08 - vec3(0.0, time * 0.12, 0.0);
    vec3 coord2 = vPosition * 0.16 + vec3(time * 0.06, time * 0.08, 0.0);
    
    float n1 = fbm(coord1);
    float n2 = fbm(coord2 + n1 * 0.4);
    
    float finalNoise = (n1 + n2) * 0.55;
    
    // Core thermal grading (glowing orange to white-hot highlights)
    vec3 colorDeepRed = vec3(0.72, 0.05, 0.0);
    vec3 colorOrange = vec3(1.0, 0.45, 0.02);
    vec3 colorYellow = vec3(1.0, 0.88, 0.1);
    vec3 colorWhite = vec3(1.0, 1.0, 0.75);
    
    vec3 color = mix(colorDeepRed, colorOrange, finalNoise * 1.5);
    color = mix(color, colorYellow, clamp((finalNoise - 0.35) * 3.0, 0.0, 1.0));
    color = mix(color, colorWhite, clamp((finalNoise - 0.58) * 4.0, 0.0, 1.0));
    
    // Fresnel corona edge glow
    float viewDot = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float fresnel = pow(1.0 - viewDot, 2.8);
    color += colorYellow * fresnel * 0.95;
    color += colorWhite * pow(fresnel, 5.0) * 1.4;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// 2. Atmospheric Scattering Shader (Fresnel back-lit rim glow)
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 glowColor;
  uniform float power;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vViewPosition);
    
    float dotProduct = dot(viewDir, normal);
    float d = max(0.0, dotProduct);
    
    // Smooth peak intensity that fades to exactly 0 at the geometric edge
    // 12.2 scales the peak of d * (1-d)^4 to exactly 1.0
    float intensity = 12.2 * d * pow(1.0 - d, power);
    gl_FragColor = vec4(glowColor, intensity);
  }
`;

// Atmosphere helper factory
function createAtmosphere(planetMesh, radius, colorHex, powerValue) {
  const atmosphereGeo = new THREE.SphereGeometry(radius * 1.05, 128, 128);
  const atmosphereMat = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      glowColor: { value: new THREE.Color(colorHex) },
      power: { value: powerValue }
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
  const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
  planetMesh.add(atmosphereMesh);
  return atmosphereMesh;
}

// Generate star background system
function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.2, 'rgba(220, 240, 255, 0.8)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(canvas);
}

// Helper to create a single star field layer
function createStarFieldLayer(count, minRadius, maxRadius, size, opacity) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const r = minRadius + Math.random() * (maxRadius - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.PointsMaterial({
    size: size,
    sizeAttenuation: true,
    transparent: true,
    opacity: opacity,
    map: createStarTexture(),
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  return new THREE.Points(geometry, material);
}

// 3 layers of stars for deep parallax space vibe
const starLayerFar = createStarFieldLayer(8000, 700, 1200, 0.6, 0.45);
const starLayerMid = createStarFieldLayer(4000, 400, 800, 1.1, 0.75);
const starLayerNear = createStarFieldLayer(1000, 250, 500, 1.8, 0.90);

scene.add(starLayerFar);
scene.add(starLayerMid);
scene.add(starLayerNear);

// UHD Procedural Texture Generation Functions
// 1. Mercury (1024x512 cratered rock)
function createMercuryTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const imgData = ctx.createImageData(1024, 512);
  const d = imgData.data;
  
  for (let y = 0; y < 512; y++) {
    const ny = (y / 512) * Math.PI - Math.PI/2;
    const cosLat = Math.cos(ny);
    for (let x = 0; x < 1024; x++) {
      const nx = (x / 1024) * Math.PI * 2;
      const sx = cosLat * Math.cos(nx);
      const sy = cosLat * Math.sin(nx);
      const sz = Math.sin(ny);
      
      const n = Perlin.fbm(sx * 4.5, sy * 4.5 + sz * 4.5, 5, 2.1, 0.48);
      const colorVal = Math.floor(88 + n * 72);
      
      const idx = (y * 1024 + x) * 4;
      d[idx] = colorVal;
      d[idx+1] = colorVal - 3;
      d[idx+2] = colorVal - 6;
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  
  // Overlay detailed crater rings
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 280; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = Math.random() * 7 + 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 0.8, y + 0.8, r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  
  return new THREE.CanvasTexture(canvas);
}

// 2. Venus (1024x512 swirling greenhouse clouds)
function createVenusTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const imgData = ctx.createImageData(1024, 512);
  const d = imgData.data;
  
  for (let y = 0; y < 512; y++) {
    const ny = (y / 512) * Math.PI - Math.PI/2;
    const cosLat = Math.cos(ny);
    for (let x = 0; x < 1024; x++) {
      const nx = (x / 1024) * Math.PI * 2;
      const sx = cosLat * Math.cos(nx);
      const sy = cosLat * Math.sin(nx);
      const sz = Math.sin(ny);
      
      const n = Perlin.fbm(sx * 3.5 + Math.sin(sy * 1.8), sy * 3.5, 5, 2.0, 0.48);
      
      const idx = (y * 1024 + x) * 4;
      d[idx] = Math.floor(222 + n * 33);     // R
      d[idx+1] = Math.floor(158 + n * 42);   // G
      d[idx+2] = Math.floor(102 + n * 38);   // B
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// 3. Earth (2048x1024 Multi-Biome & Specular/Roughness Maps)
function createEarthMaps() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 2048;
  textureCanvas.height = 1024;
  const texCtx = textureCanvas.getContext('2d');
  
  const specCanvas = document.createElement('canvas');
  specCanvas.width = 2048;
  specCanvas.height = 1024;
  const specCtx = specCanvas.getContext('2d');
  
  const texImg = texCtx.createImageData(2048, 1024);
  const specImg = specCtx.createImageData(2048, 1024);
  
  const td = texImg.data;
  const sd = specImg.data;
  
  for (let y = 0; y < 1024; y++) {
    const ny = (y / 1024) * Math.PI - Math.PI/2;
    const cosLat = Math.cos(ny);
    for (let x = 0; x < 2048; x++) {
      const nx = (x / 2048) * Math.PI * 2;
      const sx = cosLat * Math.cos(nx);
      const sy = cosLat * Math.sin(nx);
      const sz = Math.sin(ny);
      
      const n = Perlin.fbm(sx * 3.8, sy * 3.8 + sz * 3.8, 6, 2.15, 0.46);
      const idx = (y * 2048 + x) * 4;
      
      if (n > 0.46) {
        // Land mass
        const landFactor = (n - 0.46) / 0.54;
        
        let r = 38, g = 118, b = 45; // Fertile land (Forest green)
        if (landFactor > 0.38) {
          // Rocky mountains
          r = Math.floor(95 + (landFactor - 0.38) * 80);
          g = Math.floor(82 + (landFactor - 0.38) * 40);
          b = Math.floor(70 + (landFactor - 0.38) * 20);
        } else if (Math.abs(ny) < 0.25 && landFactor < 0.22) {
          // Deserts near the equator
          r = 198; g = 168; b = 112;
        } else if (Math.abs(ny) > 1.25) {
          // Polar glaciated land
          r = 250; g = 250; b = 255;
        }
        
        td[idx] = r;
        td[idx+1] = g;
        td[idx+2] = b;
        td[idx+3] = 255;
        
        // Land is matte (roughness = 0.82)
        // Ice caps are slightly glossy (roughness = 0.2)
        const roughnessVal = Math.abs(ny) > 1.25 ? 50 : 210;
        sd[idx] = roughnessVal;
        sd[idx+1] = roughnessVal;
        sd[idx+2] = roughnessVal;
        sd[idx+3] = 255;
      } else {
        // Oceans
        if (Math.abs(ny) > 1.35) {
          // Polar sea ice
          td[idx] = 250;
          td[idx+1] = 250;
          td[idx+2] = 255;
          td[idx+3] = 255;
          
          sd[idx] = 40; // Glacial reflection
          sd[idx+1] = 40;
          sd[idx+2] = 40;
          sd[idx+3] = 255;
        } else {
          // Graduated ocean depth
          const depth = n / 0.46;
          td[idx] = Math.floor(8 + depth * 14);
          td[idx+1] = Math.floor(22 + depth * 32);
          td[idx+2] = Math.floor(70 + depth * 30);
          td[idx+3] = 255;
          
          // Oceans are highly specular (very low roughness)
          sd[idx] = 16;
          sd[idx+1] = 16;
          sd[idx+2] = 16;
          sd[idx+3] = 255;
        }
      }
    }
  }
  
  texCtx.putImageData(texImg, 0, 0);
  specCtx.putImageData(specImg, 0, 0);
  
  return {
    map: new THREE.CanvasTexture(textureCanvas),
    roughnessMap: new THREE.CanvasTexture(specCanvas)
  };
}

// 4. Earth Clouds (2048x1024 fractal cloud sheets)
function createEarthCloudsTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 2048, 1024);
  
  const imgData = ctx.createImageData(2048, 1024);
  const d = imgData.data;
  
  for (let y = 0; y < 1024; y++) {
    const ny = (y / 1024) * Math.PI - Math.PI/2;
    const cosLat = Math.cos(ny);
    for (let x = 0; x < 2048; x++) {
      const nx = (x / 2048) * Math.PI * 2;
      const sx = cosLat * Math.cos(nx);
      const sy = cosLat * Math.sin(nx);
      const sz = Math.sin(ny);
      
      const n = Perlin.fbm(sx * 4.6, sy * 4.6, 5, 2.05, 0.52);
      if (n > 0.45) {
        const idx = (y * 2048 + x) * 4;
        const alpha = Math.floor(Math.min((n - 0.45) * 420, 210));
        d[idx] = 255;
        d[idx+1] = 255;
        d[idx+2] = 255;
        d[idx+3] = alpha;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// 5. Mars (1024x512 rusty terrain & polar ice specmaps)
function createMarsMaps() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 1024;
  textureCanvas.height = 512;
  const texCtx = textureCanvas.getContext('2d');
  
  const specCanvas = document.createElement('canvas');
  specCanvas.width = 1024;
  specCanvas.height = 512;
  const specCtx = specCanvas.getContext('2d');
  
  const texImg = texCtx.createImageData(1024, 512);
  const specImg = specCtx.createImageData(1024, 512);
  
  const td = texImg.data;
  const sd = specImg.data;
  
  for (let y = 0; y < 512; y++) {
    const ny = (y / 512) * Math.PI - Math.PI/2;
    const cosLat = Math.cos(ny);
    for (let x = 0; x < 1024; x++) {
      const nx = (x / 1024) * Math.PI * 2;
      const sx = cosLat * Math.cos(nx);
      const sy = cosLat * Math.sin(nx);
      const sz = Math.sin(ny);
      
      const n = Perlin.fbm(sx * 4.0, sy * 4.0 + sz * 4.0, 5, 2.0, 0.48);
      const idx = (y * 1024 + x) * 4;
      
      // Glaciated polar caps
      if (y < 35 || y > 475) {
        const border = y < 35 ? (35 - y)/35 : (y - 475)/35;
        if (Math.random() < border * 0.85 + 0.15) {
          td[idx] = 245;
          td[idx+1] = 245;
          td[idx+2] = 255;
          td[idx+3] = 255;
          
          sd[idx] = 55; // Semi-reflective ice
          sd[idx+1] = 55;
          sd[idx+2] = 55;
          sd[idx+3] = 255;
          continue;
        }
      }
      
      // Red sand channels
      td[idx] = Math.floor(182 - n * 52);
      td[idx+1] = Math.floor(78 - n * 32);
      td[idx+2] = Math.floor(46 - n * 22);
      td[idx+3] = 255;
      
      // Sandy desert is rough
      sd[idx] = 235;
      sd[idx+1] = 235;
      sd[idx+2] = 235;
      sd[idx+3] = 255;
    }
  }
  
  texCtx.putImageData(texImg, 0, 0);
  specCtx.putImageData(specImg, 0, 0);
  
  return {
    map: new THREE.CanvasTexture(textureCanvas),
    roughnessMap: new THREE.CanvasTexture(specCanvas)
  };
}

// 6. Jupiter (1024x512 complex fluid bands & spot)
function createJupiterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Bands
  for (let y = 0; y < 512; y++) {
    const wave = Perlin.noise(y * 0.1, 0) * 15;
    let color = '#a67232';
    if ((y >= 40 && y < 90) || (y >= 170 && y < 210) || (y >= 290 && y < 350) || (y >= 430 && y < 470)) {
      color = '#d4a26e';
    } else if ((y >= 90 && y < 170) || (y >= 230 && y < 290) || (y >= 350 && y < 430)) {
      color = '#874218';
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, y, 1024, 1);
  }
  
  // Multi-frequency pixel distortion to simulate gas storms
  const img = ctx.getImageData(0, 0, 1024, 512);
  const d = img.data;
  const temp = new Uint8ClampedArray(d);
  
  for (let y = 0; y < 512; y++) {
    const ny = (y / 512) * Math.PI - Math.PI/2;
    for (let x = 0; x < 1024; x++) {
      const nx = (x / 1024) * Math.PI * 2;
      
      const dx = Math.floor(Perlin.noise(nx * 12.0, ny * 12.0) * 24 - 12);
      const dy = Math.floor(Perlin.noise(nx * 8.0, ny * 8.0) * 8 - 4);
      
      const srcX = (x + dx + 1024) % 1024;
      const srcY = Math.max(0, Math.min(511, y + dy));
      
      const destIdx = (y * 1024 + x) * 4;
      const srcIdx = (srcY * 1024 + srcX) * 4;
      
      d[destIdx] = temp[srcIdx];
      d[destIdx+1] = temp[srcIdx+1];
      d[destIdx+2] = temp[srcIdx+2];
    }
  }
  ctx.putImageData(img, 0, 0);
  
  // Great Red Spot
  const spotCtx = canvas.getContext('2d');
  const rGrd = spotCtx.createRadialGradient(750, 350, 2, 750, 350, 40);
  rGrd.addColorStop(0, '#a82c16');
  rGrd.addColorStop(0.5, '#bd321a');
  rGrd.addColorStop(1, 'rgba(135, 66, 24, 0)');
  spotCtx.fillStyle = rGrd;
  spotCtx.beginPath();
  spotCtx.ellipse(750, 350, 48, 28, -0.05, 0, Math.PI * 2);
  spotCtx.fill();
  
  return new THREE.CanvasTexture(canvas);
}

// 7. Saturn (1024x512 golden bands)
function createSaturnTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  for (let y = 0; y < 512; y++) {
    let color = '#c7ab71';
    if ((y >= 30 && y < 70) || (y >= 130 && y < 165) || (y >= 200 && y < 240) || (y >= 330 && y < 380)) {
      color = '#ebd5ad';
    } else if ((y >= 70 && y < 130) || (y >= 165 && y < 200) || (y >= 240 && y < 330)) {
      color = '#ad9058';
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, y, 1024, 1);
  }
  
  // Fine noise grain for textured gas layers
  const img = ctx.getImageData(0, 0, 1024, 512);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = Math.random() * 8 - 4;
    d[i] = Math.max(0, Math.min(255, d[i] + grain));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + grain));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + grain));
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// Saturn Rings — UHD 2048×512 radial alpha map (rings drawn left→right = inner→outer)
function createSaturnRingsTexture() {
  const W = 2048, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // Each column x maps to a normalised ring radius t ∈ [0,1]
  const imgData = ctx.createImageData(W, H);
  const d = imgData.data;

  for (let x = 0; x < W; x++) {
    const t = x / (W - 1); // 0 = inner edge, 1 = outer edge

    // -- Ring band definition (inner→outer) ----------------------------
    // C ring  0.00–0.20  : faint dusty grey
    // B ring  0.20–0.50  : brightest, golden-white, dense
    // Cassini 0.50–0.55  : near-empty gap
    // A ring  0.55–0.85  : moderately bright, beige-gold
    // Encke   0.76–0.78  : narrow dark gap inside A
    // F ring  0.88–0.92  : thin bright strand
    let r = 0, g = 0, b = 0, a = 0;

    if (t < 0.20) {
      // C ring — translucent dusty grey
      const f = t / 0.20;
      a = 0.08 + f * 0.12;
      r = 190; g = 175; b = 155;
    } else if (t < 0.50) {
      // B ring — dense golden
      const f = (t - 0.20) / 0.30;
      const wave = Math.sin(f * Math.PI * 18) * 0.12 + Math.cos(f * Math.PI * 9) * 0.06;
      a = Math.max(0.55, Math.min(0.90, 0.72 + wave));
      r = 224 + Math.floor(wave * 20); g = 198 + Math.floor(wave * 14); b = 148 + Math.floor(wave * 8);
    } else if (t < 0.55) {
      // Cassini Division — nearly empty
      a = 0.008;
      r = 40; g = 35; b = 28;
    } else if (t >= 0.76 && t < 0.78) {
      // Encke gap
      a = 0.015;
      r = 40; g = 35; b = 28;
    } else if (t >= 0.55 && t < 0.85) {
      // A ring — moderate opacity, fine striations
      const f = (t - 0.55) / 0.30;
      const wave = Math.sin(f * Math.PI * 24) * 0.10 + Math.cos(f * Math.PI * 12) * 0.05;
      a = Math.max(0.25, Math.min(0.65, 0.45 + wave));
      r = 210 + Math.floor(wave * 16); g = 188 + Math.floor(wave * 10); b = 138 + Math.floor(wave * 6);
    } else if (t >= 0.88 && t < 0.92) {
      // F ring — thin bright strand
      const f = (t - 0.88) / 0.04;
      a = Math.sin(f * Math.PI) * 0.40;
      r = 240; g = 228; b = 200;
    } else {
      // Gap between F and outer edge — transparent
      a = 0.0;
    }

    // Write all H rows identically (texture is 1-D radially)
    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 4;
      d[idx]   = Math.min(255, Math.max(0, r));
      d[idx+1] = Math.min(255, Math.max(0, g));
      d[idx+2] = Math.min(255, Math.max(0, b));
      d[idx+3] = Math.floor(Math.min(1, Math.max(0, a)) * 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // Filtering applied after renderer is available — stored on texture object
  tex._needsAnisotropy = true;
  return tex;
}

// 8. Uranus (1024x512 detailed smooth gas atmosphere)
function createUranusTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const imgData = ctx.createImageData(1024, 512);
  const d = imgData.data;
  
  for (let y = 0; y < 512; y++) {
    const ny = (y / 512) * Math.PI - Math.PI/2;
    const cosLat = Math.cos(ny);
    for (let x = 0; x < 1024; x++) {
      const nx = (x / 1024) * Math.PI * 2;
      const sx = cosLat * Math.cos(nx);
      const sy = cosLat * Math.sin(nx);
      const sz = Math.sin(ny);
      
      // Soft organic cloud band noise
      const n = Perlin.fbm(sx * 2.5, sy * 8.5 + sz * 2.0, 4, 1.95, 0.45);
      
      const idx = (y * 1024 + x) * 4;
      // Beautiful, smooth organic Uranus gas colors (cyan-teal base)
      d[idx] = Math.floor(132 + n * 30);     // R
      d[idx+1] = Math.floor(212 + n * 18);   // G
      d[idx+2] = Math.floor(218 + n * 15);   // B
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// Uranus Rings — UHD 1024×256 radial alpha map
function createUranusRingsTexture() {
  const W = 1024, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const imgData = ctx.createImageData(W, H);
  const d = imgData.data;

  // Uranus has 13 known rings. We map them sparsely across t ∈ [0,1].
  // Each entry: [tStart, tEnd, alpha, r, g, b]
  const ringBands = [
    [0.05, 0.07,  0.35, 168, 230, 235],  // 6 ring
    [0.12, 0.14,  0.30, 160, 225, 232],  // 5 ring
    [0.19, 0.21,  0.30, 155, 222, 230],  // 4 ring
    [0.27, 0.30,  0.38, 160, 228, 236],  // Alpha ring
    [0.37, 0.40,  0.32, 155, 222, 232],  // Beta ring
    [0.46, 0.49,  0.28, 150, 218, 230],  // Eta ring
    [0.54, 0.57,  0.30, 155, 222, 232],  // Gamma ring
    [0.62, 0.65,  0.28, 148, 218, 230],  // Delta ring
    [0.71, 0.75,  0.42, 170, 235, 240],  // Epsilon ring (brightest)
  ];

  for (let x = 0; x < W; x++) {
    const t = x / (W - 1);
    let r = 0, g = 0, b = 0, a = 0;

    for (const [ts, te, ba, br, bg, bb] of ringBands) {
      if (t >= ts && t <= te) {
        // Smooth feathering at band edges
        const f = (t - ts) / (te - ts);
        const edge = Math.min(f, 1 - f) * 8; // 0→1 over 1/8th of band width
        a = ba * Math.min(1, edge);
        r = br; g = bg; b = bb;
        break;
      }
    }

    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 4;
      d[idx]   = r;
      d[idx+1] = g;
      d[idx+2] = b;
      d[idx+3] = Math.floor(Math.min(1, Math.max(0, a)) * 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex._needsAnisotropy = true;
  return tex;
}

// 9. Neptune (1024x512 royal gas bands & spot)
function createNeptuneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#214396';
  ctx.fillRect(0, 0, 1024, 512);
  
  const img = ctx.getImageData(0, 0, 1024, 512);
  const d = img.data;
  
  for (let y = 0; y < 512; y++) {
    const ny = (y / 512) * Math.PI - Math.PI/2;
    const cosLat = Math.cos(ny);
    for (let x = 0; x < 1024; x++) {
      const nx = (x / 1024) * Math.PI * 2;
      const sx = cosLat * Math.cos(nx);
      const sy = cosLat * Math.sin(nx);
      
      const n = Perlin.fbm(sx * 4.0, sy * 4.0, 4, 2.0, 0.5);
      const idx = (y * 1024 + x) * 4;
      d[idx] = Math.floor(33 + n * 18);
      d[idx+1] = Math.floor(67 + n * 24);
      d[idx+2] = Math.floor(150 + n * 35);
    }
  }
  ctx.putImageData(img, 0, 0);
  
  // Great Dark Spot
  const spotCtx = canvas.getContext('2d');
  const sGrd = spotCtx.createRadialGradient(700, 320, 2, 700, 320, 30);
  sGrd.addColorStop(0, '#12255c');
  sGrd.addColorStop(0.6, '#182f73');
  sGrd.addColorStop(1, 'rgba(33,67,150,0)');
  spotCtx.fillStyle = sGrd;
  spotCtx.beginPath();
  spotCtx.ellipse(700, 320, 32, 20, 0.1, 0, Math.PI*2);
  spotCtx.fill();
  
  return new THREE.CanvasTexture(canvas);
}

// Build Solar System Structures
const planets = [];

// Orbits configuration structure
// 0: Sun, 1: Mercury, 2: Venus, 3: Earth, 4: Mars, 5: Jupiter, 6: Saturn, 7: Uranus, 8: Neptune
const orbits = [
  { radius: 0, speed: 0, angle: 0 },
  { radius: 24, speed: 0.08, angle: 0.4 },
  { radius: 34, speed: 0.06, angle: 1.1 },
  { radius: 44, speed: 0.046, angle: 1.9 },
  { radius: 54, speed: 0.038, angle: 2.7 },
  { radius: 68, speed: 0.024, angle: 3.4 },
  { radius: 84, speed: 0.018, angle: 4.1 },
  { radius: 98, speed: 0.013, angle: 4.8 },
  { radius: 112, speed: 0.01, angle: 5.5 }
];

function createOrbitLine(radius) {
  const points = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.08,
    depthWrite: false
  });
  return new THREE.LineLoop(geometry, material);
}

// 1. Instantiating Sun (Using Custom GLSL ShaderMaterial)
const sunGeometry = new THREE.SphereGeometry(12, 128, 128); // Smooth high-poly sphere
const sunMaterial = new THREE.ShaderMaterial({
  vertexShader: sunVertexShader,
  fragmentShader: sunFragmentShader,
  uniforms: {
    time: { value: 0 }
  }
});
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh);

// Add Sun Corona Glow
const glowMaterial = new THREE.SpriteMaterial({
  map: createStarTexture(),
  color: 0xffa533,
  transparent: true,
  blending: THREE.AdditiveBlending,
  opacity: 0.92,
  depthWrite: false
});
const sunGlow = new THREE.Sprite(glowMaterial);
sunGlow.scale.set(34, 34, 1);
scene.add(sunGlow);

// 2. Planets configuration definitions with shaders & specular maps
const planetConfigs = [
  { name: 'mercury', radius: 0.8, texture: createMercuryTexture, tilt: 0.03, roughness: 0.82 },
  { name: 'venus', radius: 1.6, texture: createVenusTexture, tilt: 3.39, retrograde: true, hasAtmosphere: true, glowColor: 0xffd59e, roughness: 0.75 },
  { name: 'earth', radius: 1.8, textureMaps: createEarthMaps, tilt: 23.44, hasClouds: true, hasAtmosphere: true, glowColor: 0x6bb5ff, roughness: 0.82 },
  { name: 'mars', radius: 1.2, textureMaps: createMarsMaps, tilt: 25.19, roughness: 0.88 },
  { name: 'jupiter', radius: 4.5, texture: createJupiterTexture, tilt: 3.13, roughness: 0.7 },
  { name: 'saturn', radius: 3.8, texture: createSaturnTexture, tilt: 26.73, hasRings: true, ringInner: 5.2, ringOuter: 9.5, ringTexture: createSaturnRingsTexture, roughness: 0.68 },
  { name: 'uranus', radius: 2.6, texture: createUranusTexture, tilt: 97.77, hasRings: true, ringInner: 3.4, ringOuter: 4.8, ringTexture: createUranusRingsTexture, hasAtmosphere: true, glowColor: 0x8be5eb, roughness: 0.72 },
  { name: 'neptune', radius: 2.5, texture: createNeptuneTexture, tilt: 28.32, hasAtmosphere: true, glowColor: 0x4f7fff, roughness: 0.7 }
];

planetConfigs.forEach((cfg, idx) => {
  const orbitRadius = orbits[idx + 1].radius;
  
  // Draw orbital trail
  const trail = createOrbitLine(orbitRadius);
  scene.add(trail);

  // Mesh group to handle axial tilt and position independently
  const meshGroup = new THREE.Group();
  
  // Sphere geometry (AAA Smooth 128x128 segments)
  const sphereGeo = new THREE.SphereGeometry(cfg.radius, 128, 128);
  
  // Resolve material with custom roughness/specular maps
  let sphereMat;
  if (cfg.textureMaps) {
    const maps = cfg.textureMaps();
    sphereMat = new THREE.MeshStandardMaterial({
      map: maps.map,
      roughnessMap: maps.roughnessMap,
      roughness: cfg.roughness,
      metalness: 0.05
    });
  } else {
    sphereMat = new THREE.MeshStandardMaterial({
      map: cfg.texture(),
      roughness: cfg.roughness,
      metalness: 0.05
    });
  }
  
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  sphereMesh.castShadow = true;
  sphereMesh.receiveShadow = true;
  meshGroup.add(sphereMesh);

  // Optional: Earth cloud layer
  let cloudsMesh = null;
  if (cfg.hasClouds) {
    const cloudsGeo = new THREE.SphereGeometry(cfg.radius + 0.03, 128, 128);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: createEarthCloudsTexture(),
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    cloudsMesh.castShadow = true;
    cloudsMesh.receiveShadow = true;
    meshGroup.add(cloudsMesh);
  }

  // Optional: Planetary rings — UHD textures with full filtering
  if (cfg.hasRings) {
    // 128-segment ring for perfectly smooth silhouette
    const ringGeo = new THREE.RingGeometry(cfg.ringInner, cfg.ringOuter, 128, 1);

    // Fix Three.js RingGeometry UV mapping so the radial texture wraps from inner→outer
    const ringPos = ringGeo.attributes.position;
    const ringUv  = ringGeo.attributes.uv;
    const innerR  = cfg.ringInner;
    const outerR  = cfg.ringOuter;
    const span    = outerR - innerR;
    for (let i = 0; i < ringPos.count; i++) {
      const x = ringPos.getX(i);
      const y = ringPos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      ringUv.setXY(i, (dist - innerR) / span, 0.5);
    }
    ringUv.needsUpdate = true;

    // Build and filter the ring texture
    const rawRingTex = cfg.ringTexture();
    rawRingTex.minFilter = THREE.LinearMipmapLinearFilter;
    rawRingTex.magFilter = THREE.LinearFilter;
    rawRingTex.generateMipmaps = true;
    rawRingTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    rawRingTex.needsUpdate = true;

    const ringMat = new THREE.MeshStandardMaterial({
      map: rawRingTex,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.02,          // Clip fully-transparent pixels — no black-box artifact
      depthWrite: false,        // Allow overlap without z-fighting or opaque borders
      roughness: 0.6,
      metalness: 0.05
    });

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2; // Lie flat on orbital plane

    // Uranus rings: disable shadow cast (too thin; avoids shadow-map pixelation)
    ringMesh.castShadow = cfg.name !== 'uranus';
    ringMesh.receiveShadow = true;
    meshGroup.add(ringMesh);
  }

  // Optional: Soft atmospheric Fresnel glow
  if (cfg.hasAtmosphere) {
    createAtmosphere(meshGroup, cfg.radius, cfg.glowColor, 4.0);
  }

  // Set initial tilt
  const tiltRad = (cfg.tilt * Math.PI) / 180;
  meshGroup.rotation.z = tiltRad;

  scene.add(meshGroup);

  planets.push({
    name: cfg.name,
    radius: cfg.radius,
    meshGroup: meshGroup,
    sphereMesh: sphereMesh,
    cloudsMesh: cloudsMesh,
    orbitIdx: idx + 1,
    retrograde: !!cfg.retrograde
  });
});

// --- ASTEROID BELT SYSTEM (THREE.InstancedMesh) ---

function createAsteroidTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  // Base dark rock color
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, 128, 128);
  
  // Procedural craters & shading noise
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const r = Math.random() * 2.5 + 0.5;
    
    // Some bright spots, mostly dark craters
    ctx.fillStyle = Math.random() > 0.4 ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Generate base rock geometry with irregular displaced vertices
const rockGeo = new THREE.DodecahedronGeometry(0.12, 1);
const rockPos = rockGeo.attributes.position;
for (let i = 0; i < rockPos.count; i++) {
  const x = rockPos.getX(i);
  const y = rockPos.getY(i);
  const z = rockPos.getZ(i);
  
  // Distort vertices randomly to mimic space debris
  const distort = 0.015 + Math.random() * 0.025;
  rockPos.setXYZ(
    i,
    x + (Math.random() - 0.5) * distort,
    y + (Math.random() - 0.5) * distort,
    z + (Math.random() - 0.5) * distort
  );
}
rockGeo.computeVertexNormals();

const asteroidTex = createAsteroidTexture();
const rockMat = new THREE.MeshStandardMaterial({
  map: asteroidTex,
  bumpMap: asteroidTex,
  bumpScale: 0.03,
  roughness: 0.88,
  metalness: 0.12,
  color: 0xa0a0a0
});

// InstancedMesh for 3,500 asteroids
const asteroidCount = 1500;
const asteroidBeltMesh = new THREE.InstancedMesh(rockGeo, rockMat, asteroidCount);
asteroidBeltMesh.castShadow = false;
asteroidBeltMesh.receiveShadow = false;

const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempRotation = new THREE.Euler();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3();

for (let i = 0; i < asteroidCount; i++) {
  // Distribute in a gap between Mars (54) and Jupiter (68) -> Radius 57.5 to 64.5
  const radius = 60 + Math.random() * 2.0;
  const angle = Math.random() * Math.PI * 2;
  
  // Spherical orbital scatter with small vertical thickness
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = (Math.random() - 0.5) * 0.6; // Vertical spread (reduced)
  
  tempPosition.set(x, y, z);
  
  // Irregular rotation
  tempRotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  tempQuaternion.setFromEuler(tempRotation);
  
  // Vary scale to have small and larger asteroids (with non-uniform scaling)
  const scale = 0.15 + Math.random() * 0.25;
  const stretchX = 0.85 + Math.random() * 0.3;
  const stretchY = 0.85 + Math.random() * 0.3;
  const stretchZ = 0.85 + Math.random() * 0.3;
  tempScale.set(scale * stretchX, scale * stretchY, scale * stretchZ);
  
  tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
  asteroidBeltMesh.setMatrixAt(i, tempMatrix);
}

scene.add(asteroidBeltMesh);

// Sound Toggle system
const soundToggle = document.getElementById('sound-toggle');
const ambientMusic = document.getElementById('ambient-music'); // Keep for safety, unused
const iconMute = soundToggle.querySelector('.icon-mute');
const iconAudio = soundToggle.querySelector('.icon-audio');
let isMuted = true;

// Web Audio API Space Ambient Synthesizer system
let audioCtx = null;
let spaceSynthNodes = null;
let volumeTween = null;

function initSpaceAmbient() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function createSpaceSynth() {
  // 1. Root oscillator (deep 55Hz triangle wave)
  const osc1 = audioCtx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.value = 55;
  
  // 2. Fifth oscillator (deep 82.4Hz sine wave)
  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 82.4;
  
  // 3. Ambient solar wind (filtered white noise)
  const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise buffer
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 80;
  noiseFilter.Q.value = 1.0;
  
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.12; // lower volume for noise element
  
  // 4. Main lowpass filter for the mix (keeps the sound deep and warm)
  const mainFilter = audioCtx.createBiquadFilter();
  mainFilter.type = 'lowpass';
  mainFilter.frequency.value = 140;
  mainFilter.Q.value = 1.5;
  
  // 5. Main gain node (start at 0 volume and fade in)
  const mainGain = audioCtx.createGain();
  mainGain.gain.value = 0.0;
  
  // 6. Slow LFO to modulate filter cutoffs for movement
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.03; // ~33 seconds sweep cycle
  
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 45; // sweep range +/- 45Hz
  
  // Connect modulation
  lfo.connect(lfoGain);
  lfoGain.connect(mainFilter.frequency);
  lfoGain.connect(noiseFilter.frequency);
  
  // Connect audio path
  osc1.connect(mainFilter);
  osc2.connect(mainFilter);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(mainGain);
  
  mainFilter.connect(mainGain);
  mainGain.connect(audioCtx.destination);
  
  // Start nodes
  osc1.start(0);
  osc2.start(0);
  noiseSource.start(0);
  lfo.start(0);
  
  spaceSynthNodes = {
    osc1,
    osc2,
    noiseSource,
    noiseFilter,
    noiseGain,
    mainFilter,
    mainGain,
    lfo,
    lfoGain
  };
}

function startSpaceAmbient() {
  initSpaceAmbient();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  if (!spaceSynthNodes) {
    createSpaceSynth();
  }
  
  const gainNode = spaceSynthNodes.mainGain;
  if (volumeTween) volumeTween.kill();
  
  const volumeObj = { val: gainNode.gain.value };
  volumeTween = gsap.to(volumeObj, {
    val: 0.38,
    duration: 1.5,
    ease: "power1.out",
    onUpdate: () => {
      if (spaceSynthNodes) {
        gainNode.gain.value = volumeObj.val;
      }
    }
  });
}

function stopSpaceAmbient() {
  if (!spaceSynthNodes) return;
  
  const gainNode = spaceSynthNodes.mainGain;
  if (volumeTween) volumeTween.kill();
  
  const volumeObj = { val: gainNode.gain.value };
  volumeTween = gsap.to(volumeObj, {
    val: 0.0,
    duration: 1.2,
    ease: "power1.out",
    onUpdate: () => {
      if (spaceSynthNodes) {
        gainNode.gain.value = volumeObj.val;
      }
    }
  });
}

soundToggle.addEventListener('click', () => {
  isMuted = !isMuted;
  if (!isMuted) {
    startSpaceAmbient();
    iconMute.classList.add('hidden');
    iconAudio.classList.remove('hidden');
  } else {
    stopSpaceAmbient();
    iconMute.classList.remove('hidden');
    iconAudio.classList.add('hidden');
  }
});

// GSAP ScrollTrigger timeline state binding
const scrollState = {
  progress: 0 // Float from 0 (Overview) to 9 (Neptune)
};

gsap.to(scrollState, {
  progress: 9,
  ease: "none",
  scrollTrigger: {
    trigger: ".scroll-container",
    start: "top top",
    end: "bottom bottom",
    scrub: 1.2
  }
});

// Sidebar & card activation updates
let currentActiveIndex = 0;
const cards = document.querySelectorAll('.ui-card');
const navDots = document.querySelectorAll('.nav-dot');
const progressIndicator = document.getElementById('progress-indicator');

function updateActiveState(index) {
  if (index === currentActiveIndex) return;
  
  // Fade out old
  cards[currentActiveIndex].classList.remove('active');
  navDots[currentActiveIndex].classList.remove('active');
  
  // Fade in new
  cards[index].classList.add('active');
  navDots[index].classList.add('active');
  
  currentActiveIndex = index;
}

// Click dot handler to scroll smoothly
navDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const index = parseInt(dot.getAttribute('data-index'));
    window.scrollTo({
      top: index * window.innerHeight,
      behavior: 'smooth'
    });
  });
});

// Mouse interact parallax (offset values)
let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
});

// Dynamic camera coordinate solver
function getCameraState(index) {
  const target = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  
  if (index === 0) {
    // Overview (Full system)
    target.set(0, 0, 0);
    camPos.set(0, 75, 160);
  } else if (index === 1) {
    // Sun closeup
    target.set(0, 0, 0);
    camPos.set(0, 3.8, 32);
  } else {
    // Planet closeup (index 2-9 correspond to planet 0-7)
    const pIdx = index - 2;
    const planet = planets[pIdx];
    if (planet) {
      target.copy(planet.meshGroup.position);
      
      const offset = new THREE.Vector3();
      if (planet.name === 'saturn') {
        // Angled view to reveal rings beautiful layout
        offset.set(4.0, 5.0, 16.5);
      } else if (planet.name === 'uranus') {
        // Vertical rings view angle
        offset.set(2.0, 4.0, 12.0);
      } else {
        // General offset scaled by size
        const r = planet.radius;
        offset.set(0, r * 1.5, r * 3.6);
      }
      camPos.copy(target).add(offset);
    }
  }
  return { target, camPos };
}

// Clock for time calculations
const clock = new THREE.Clock();

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  
  // 1. Update orbits of planets
  planets.forEach((planet) => {
    const orbit = orbits[planet.orbitIdx];
    
    // Slow planetary orbital angles update
    orbit.angle += orbit.speed * delta * 0.22; // scaled down to keep orbital path cohesive
    
    // Set planet mesh group coordinates
    const px = Math.cos(orbit.angle) * orbit.radius;
    const pz = Math.sin(orbit.angle) * orbit.radius;
    planet.meshGroup.position.set(px, 0, pz);
    
    // Spin the spheres locally on their axes (Venus rotates retrograde)
    const spinDir = planet.retrograde ? -1 : 1;
    planet.sphereMesh.rotation.y += 0.3 * delta * spinDir;
    
    // Spin clouds slightly faster
    if (planet.cloudsMesh) {
      planet.cloudsMesh.rotation.y += 0.38 * delta;
    }
  });
  
  // Update time uniform for Sun plasma shader
  sunMaterial.uniforms.time.value = elapsedTime;
  
  // Rotate Sun corona glow billboard slightly
  sunGlow.rotation.z += 0.05 * delta;
  
  // Twinkle star particles slightly with parallax rotation speeds
  starLayerFar.rotation.y += 0.001 * delta;
  starLayerFar.rotation.x += 0.0003 * delta;
  
  starLayerMid.rotation.y += 0.003 * delta;
  starLayerMid.rotation.x += 0.001 * delta;
  
  starLayerNear.rotation.y += 0.005 * delta;
  starLayerNear.rotation.x += 0.0018 * delta;

  // Slowly rotate the asteroid belt around the Sun
  asteroidBeltMesh.rotation.y += 0.008 * delta;

  // 2. Camera tracking interpolation
  const progress = scrollState.progress;
  const indexA = Math.floor(progress);
  const indexB = Math.min(9, indexA + 1);
  const t = progress - indexA;
  
  const stateA = getCameraState(indexA);
  const stateB = getCameraState(indexB);
  
  // Lerp camera target
  const currentTarget = new THREE.Vector3().lerpVectors(stateA.target, stateB.target, t);
  
  // Lerp camera base position
  const currentCamPos = new THREE.Vector3().lerpVectors(stateA.camPos, stateB.camPos, t);
  
  // 3. Inject subtle mouse parallax drift
  // Drift scales based on how zoomed in we are (less drift when zoomed out)
  const driftScale = indexA === 0 ? 15.0 : 1.5;
  const parallaxX = mouseX * driftScale;
  const parallaxY = -mouseY * driftScale;
  
  // Add parallax directly to camera position
  camera.position.x = currentCamPos.x + parallaxX;
  camera.position.y = currentCamPos.y + parallaxY;
  camera.position.z = currentCamPos.z;
  
  // Keep camera locked on target
  camera.lookAt(currentTarget);

  // 4. Update HUD states
  const closestIndex = Math.round(progress);
  updateActiveState(closestIndex);
  
  // Update sidebar progress fill bar
  const totalSections = 9;
  const pct = (progress / totalSections) * 100;
  progressIndicator.style.height = `${pct}%`;
  
  // Render
  renderer.render(scene, camera);
}

// Window resize listener
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Start loop
animate();
