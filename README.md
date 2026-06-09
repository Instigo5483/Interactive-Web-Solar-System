# 🌌 Interactive 3D/2D Web Solar System Experience

A minimalist, highly interactive, full-screen 3D solar system exploration showcase. By stripping away traditional web clutter like headers, footers, and navigation bars, this project focuses entirely on cinematic visual storytelling. The camera path and planetary animations are completely driven by user scroll interactions.

🚀 **Live Demo:** [View Live Project](https://instigo5483.github.io/Interactive-Web-Solar-System/)

---

## ✨ Features

- **Scroll-Driven Exploration:** Driven by GSAP ScrollTrigger, the camera dynamically journeys from a global solar system view down into custom, close-up frames of the Sun and all 8 planets.
- **High-Fidelity WebGL Presentation:** Leverages Three.js with advanced anti-aliasing configurations, high-resolution (UHD) planetary textures, and realistic surface materials.
- **Optimized Asteroid Belt:** Features thousands of procedurally scattered, irregularly shaped space rocks using `THREE.InstancedMesh` for maximum GPU performance.
- **Cinematic Ring Systems:** Custom geometry and precise alpha blending filter setups eliminate blocky pixelation artifacts on Saturn and Uranus's rings.
- **Immersive Ambient Audio:** Seamlessly looping deep-space background audio with a calibrated, balanced volume toggle integrated directly into a clean UI control.
- **Responsive Dynamic UI Overlay:** Content cards that intelligently adapt typographic contrast against bright planetary backdrops, featuring sleek layout aesthetics.

---

## 🛠️ Tech Stack

* **Core Engine:** HTML5, CSS3, JavaScript (ES6+)
* **3D Graphics:** [Three.js](https://threejs.org/) (WebGL)
* **Animation & Scroll Control:** [GSAP](https://greensock.com/gsap/) (GreenSock Animation Platform) + **ScrollTrigger**
* **Styling Framework:** [Tailwind CSS](https://tailwindcss.com/)

---

## ⚙️ Core Technical Optimizations Implemented

### 1. Eliminating Pixelation & Aliasing
To guarantee crisp visuals across high-density displays (such as Mac Retina screens), the WebGL renderer explicitly enforces hardware anti-aliasing alongside dynamic pixel-ratio clamping:
```javascript
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

### 2. High-Performance Instanced Geometry
Rendering thousands of individual rocks within the Asteroid Belt would traditionally choke draw-calls. This project implements instancing, shifting the mathematical processing overhead directly to the GPU:
```javascript
// Using InstancedMesh to draw thousands of unique rocks in a single draw call
const asteroidMesh = new THREE.InstancedMesh(asteroidGeometry, asteroidMaterial, count);
```

### 3. Smooth Texture Filtering & Anisotropy
To stop planar ring systems and planetary horizons from blurring out or generating jagged artifacts when viewed at flat, oblique camera angles, maximum anisotropic filtering is explicitly configured:
```javascript
ringTexture.minFilter = THREE.LinearMipmapLinearFilter;
ringTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
```

## 📂 Getting Started & Installation
To run this project locally, simply clone the repository and open it using any local web development server (like Live Server in VS Code).

### 1. Clone the repository:
```bash
git clone https://github.com/instigo5483/Interactive-Web-Solar-System.git
```

### 2. Navigate into the directory:
```bash
cd Interactive-Web-Solar-System
```

### 3. Launch with a local server:
   :If using VS Code, right-click ``index.html`` and select "Open with Live Server".
   :Alternatively, using Python in your terminal:
```bash
python -m http.server 8000
```

## 📜 License
This project is open-source and available under the ``MIT License``.
