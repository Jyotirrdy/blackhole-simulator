# blackhole-simulator

A lightweight, working 3D black hole simulator you can run locally in any modern browser.

## Run

Because the simulator uses ES modules, serve the folder with a static server:

```bash
python3 -m http.server 8080
```

Then open: `http://localhost:8080`

## Features

- Real-time 3D black hole visualization using **Three.js**.
- Animated accretion disk using a custom GLSL shader.
- Background starfield with a simple gravitational lensing approximation.
- Interactive controls for:
  - black hole mass (in solar masses),
  - spin,
  - disk turbulence.
- Live Schwarzschild radius calculation in kilometers.

## Tech

- `three` (via CDN)
- `OrbitControls` from the Three.js examples package
