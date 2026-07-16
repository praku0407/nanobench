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
  <p>
    <a href="https://nanobench.netlify.app/" style="display: inline-block; padding: 14px 36px; border-radius: 40px; background: #76b900; color: #080808; font-size: 18px; font-weight: 700; text-decoration: none; letter-spacing: -0.02em;">
      🚀 Try NanoBench Live →
    </a>
  </p>
  <br/>
</div>

---

## Overview

NanoBench is a fully client-side hardware benchmarking suite that measures your machine's **CPU** and **GPU** performance directly in the browser — no downloads, no installations, no signups, no API keys.

Run a single benchmark and get:
- **CPU Score** — Multi-threaded matrix multiplication via Web Workers, measured in effective GFLOPS
- **GPU Score** — Heavy trigonometric compute shader dispatched through WebGPU, timed across 15 iterations
- **Overall Score** — Weighted combination (50/50) of CPU and GPU performance
- **AI Analysis** — A clinical-grade breakdown of your hardware balance, powered by Pollinations.ai's keyless LLM
- **Global Leaderboard** — Submit your score with a username and compare against machines worldwide, stored in Netlify Blobs

---

## Try It Now

**👉 [https://nanobench.netlify.app/](https://nanobench.netlify.app/)**

No install, no account, no API key. Open the link in Chrome or Edge (for WebGPU support) and hit **Start Benchmark**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| UI Library | [React 19](https://react.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) + CSS-in-JS |
| GPU Compute | [WebGPU](https://www.w3.org/TR/webgpu/) + [WGSL](https://www.w3.org/TR/WGSL/) shaders |
| CPU Compute | Web Workers (dedicated thread pool) |
| Serverless Functions | [Netlify Functions](https://docs.netlify.com/functions/overview/) v2 |
| Animation | [Framer Motion](https://motion.dev/) |

---

## Getting Started (Development)

```bash
git clone https://github.com/praku0407/nanobench.git
cd nanobench
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and hit **Start Benchmark**.

> **Note:** In development mode, the Leaderboard (Submit/View) requires the Netlify Function runtime which only works in production. Run a full build with `npm run build && npm run start` to test the full flow locally, or deploy to Netlify.

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

### 1. CPU Benchmark (`cpu.worker.ts`)
A **Web Worker** runs 25 iterations of 400×400 matrix multiplication — an O(n³) algorithm processing ~64 million multiply-adds per iteration (~1.6 billion total operations). The worker reports progress back to the UI after each iteration and calculates the final score from effective GFLOPS.

### 2. GPU Benchmark (`gpu.ts`)
A **WebGPU compute shader** allocates 5 million floats (~20 MB VRAM) and dispatches them across GPU cores in workgroups of 64 threads. Each thread runs 250 iterations of heavy trigonometric math (`sin`, `cos`, `tan`, `sqrt`). The score is derived from total compute time across 15 iterations.

### 3. AI Analysis (`page.tsx`)
Both scores are sent to **Pollinations.ai** (via a zero-config fetch — no SDK, no API key, no backend) with a prompt asking the model to act as "NANO-OS", a clinical telemetry analyst. The model returns a 3-sentence breakdown of system balance, bottleneck identification, and upgrade suggestions.

### 4. Global Leaderboard
Users can enter a username and submit their scores via **Netlify Functions** (serverless), which stores the record in **Netlify Blobs**. The leaderboard view fetches and displays the top 10 scores sorted by overall performance.

---

## Project Structure

```
nanobench/
├── netlify/
│   ├── functions/
│   │   └── leaderboard.ts    # Netlify Function: GET (list) + POST (insert)
│   └── toml                  # Build config + API redirects
├── public/
│   └── shaders/
│       └── stress.wgsl       # WebGPU compute shader
├── src/
│   ├── app/
│   │   ├── workers/
│   │   │   └── cpu.worker.ts # Web Worker: CPU benchmark
│   │   ├── globals.css       # Tailwind CSS 4 entry
│   │   ├── layout.tsx        # Root layout + metadata
│   │   └── page.tsx          # Main UI (client component)
│   └── benchmark/
│       └── gpu.ts            # WebGPU benchmark runner
├── next.config.ts
├── netlify.toml
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── eslint.config.mjs
```

---

## Browser Support

| Feature | Required Browser |
|---|---|
| Web Workers | All modern browsers |
| WebGPU | Chrome 113+, Edge 113+, Opera 99+ |
| Pollinations.ai fetch | All modern browsers |
| Netlify Blobs (API) | All modern browsers |

The GPU benchmark requires **WebGPU** support. Chrome and Edge have it enabled by default. Firefox and Safari have it behind experimental flags.

---

## Credits

**Created by [Kushal H](https://github.com/praku0407)** — original concept, architecture, and development.

**Fine-tuned by [Pranav S](https://github.com/anomalyco)** — optimization, Netlify migration, removal of third-party dependencies, keyless AI integration, and production polish.

---

## License

[MIT](LICENSE.txt)
