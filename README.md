<div align="center">
  <br/>
  <h1>⚡ NanoBench</h1>
  <p><strong>Precision hardware intelligence, in your browser.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 16"/>
    <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19"/>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/WebGPU-005A9C?style=flat-square&logo=webgpu&logoColor=white" alt="WebGPU"/>
    <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4"/>
    <img src="https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white" alt="Netlify"/>
  </p>
  <br/>
</div>

---

## Overview

NanoBench is a fully client-side hardware benchmarking suite that measures your machine's **CPU** and **GPU** performance directly in the browser — no downloads, no installations, no API keys.

- **CPU Test** — Multi-threaded matrix multiplication via Web Workers
- **GPU Test** — Trigonometric compute shader dispatched through WebGPU
- **AI Analysis** — Get a clinical-grade breakdown of your hardware balance via Pollinations.ai
- **Global Leaderboard** — Compare your scores with others, backed by Netlify Blobs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| UI Library | [React 19](https://react.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) + CSS-in-JS |
| GPU Compute | [WebGPU](https://www.w3.org/TR/webgpu/) + [WGSL](https://www.w3.org/TR/WGSL/) shaders |
| CPU Compute | Web Workers |
| AI | [Pollinations.ai](https://pollinations.ai/) (keyless, serverless) |
| Storage | [Netlify Blobs](https://docs.netlify.com/blobs/overview/) |
| Animation | [Framer Motion](https://motion.dev/) |

---

## Getting Started

```bash
git clone https://github.com/praku0407/nanobench.git
cd nanobench
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and hit **Start Benchmark**.

---

## How It Works

```
   IDLE          CPU_TEST          GPU_TEST         RESULTS
   ┌────┐   ⚡   ┌──────────┐  🔺  ┌──────────┐  📊  ┌─────────┐
   │    │ ───→   │ 400×400  │ ──→  │ WebGPU   │ ──→ │  Score  │
   │    │        │ Matrix × │      │ Shader   │     │  + AI   │
   │    │        │ 25 iters │      │ 15 iters │     │  Upload │
   └────┘        └──────────┘      └──────────┘     └─────────┘
```

1. **CPU** — A Web Worker runs 25 iterations of 400×400 matrix multiplication (O(n³), ~1.6B operations). Score is derived from effective GFLOPS.
2. **GPU** — A WebGPU compute shader processes 5 million floats through 250 iterations of heavy trigonometric math (sin, cos, tan, sqrt). Score is based on total compute time.
3. **AI Analysis** — Scores are sent to Pollinations.ai (via llama-3.1-8b-instant) for a calm, clinical breakdown of your system's balance.
4. **Leaderboard** — Submit your results with a username to store them in Netlify Blobs and see global rankings.

---

## Deploy on Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/praku0407/nanobench)

The project includes a `netlify.toml` with build config and API redirects.  
**No environment variables are required.**

1. Push to GitHub
2. Connect repo in Netlify
3. Netlify auto-detects the config → `npm run build` → deploys

---

## Credits

**Created by [Kushal H](https://github.com/praku0407)** — original concept, architecture, and development.

**Fine-tuned by [Pranav S](https://github.com/anomalyco)** — optimization, Netlify migration, keyless AI integration, and production polish.

---

## License

[MIT](LICENSE.txt)
