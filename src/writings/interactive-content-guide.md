---
title: a guide to interactive content on this site
published: 2026-05-09
status: "draft"
tags: ["tech", "writing"]
section: "writings"
layout: layouts/post.njk
description: "A living reference for the interactive content system — charts, 3D models, physics sims, gamified explorables, and more."
hasInteractive: true
hasCode: true
readNext: "/writings/everything-worked-that-was-the-problem/"
---

This post documents the full suite of interactive capabilities available for my technical writing. Every interactive below is lazy-loaded (only fetched when you scroll to it), theme-aware (switches with dark mode), and progressive (falls back gracefully without JavaScript).

---

## Charts & Data Visualization

### Plotly: Research-Grade Plots

For training curves, performance comparisons, and any quantitative storytelling. The colors automatically match the site's warm palette.

::: interactive plotly
src: /data/cartpole-training.json
height: 420
caption: "Training convergence for differentiable simulation of a cart-pole. Hover for values, drag to zoom."
:::

The chart above shows how a differentiable simulator converges during gradient-based optimization. Unlike reinforcement learning (which needs millions of rollouts), gradients through the physics engine give us direct supervision — hence the smooth, monotonic descent.

### The Actuator Landscape

Log-scale scatter plots for comparing physical systems across dimensions:

::: interactive plotly
src: /data/actuator-landscape.json
height: 450
caption: "Force density vs bandwidth across actuator technologies. The tradeoff between power and speed defines what robots can do."
:::

### Sim-to-Real Transfer

Filled area charts to show gaps and convergence over time:

::: interactive plotly
src: /data/sim2real-gap.json
height: 420
caption: "As domain randomization increases, simulation performance drops but real hardware improves — the gap closes around iteration 5."
:::

---

## Diagrams

### Mermaid: System Architecture

For control loops, data pipelines, and system design. No images needed — just text:

::: interactive mermaid
code: graph LR; Env-->|obs|Policy; Policy-->|action|Env; Env-->|reward|Loss; Loss-->|grad|Policy
caption: "Differentiable simulation training loop — gradients flow end-to-end through the physics engine."
:::

---

## 3D Content

### Three.js: Custom 3D Scene

For rendering mechanisms, robots, and physical systems. Orbit controls let readers inspect from any angle:

::: interactive threejs
src: /interactive/components/spinning-cube.js
height: 400
autoRotate: true
camera: orbit
ground: true
caption: "A procedural spinning cube with wireframe overlay. Drag to rotate, scroll to zoom."
:::

---

## Physics Simulations

### Matter.js: 2D Physics

For simpler demonstrations — pendulums, particles, springs, collisions:

::: interactive matter
src: /interactive/components/pendulum-demo.js
height: 400
gravity: 1
interactive: true
caption: "A double pendulum showing chaotic motion. Drag the bobs to disturb them."
:::

---

## Custom D3 Visualizations

For research-grade custom charts, network graphs, force-directed layouts:

::: interactive d3
src: /interactive/components/knowledge-graph.js
height: 500
caption: "My concept network for physical AI — drag nodes to rearrange. Each color is a topic cluster."
:::

---

## How It Works

### Architecture

1. Add                        to frontmatter
2. Use                          blocks in markdown
3. The loader script hydrates blocks when scrolled into view
4. Each module lazy-loads its library from CDN on first use
5. All modules pull colors from                            which reads CSS variables

### Color Philosophy

Inspired by Physical Intelligence's warm, archival data colors. The palette is:
- **Earthy and warm** — burnt sienna, forest green, amber/ochre, steel blue
- **Calibrated for both modes** — each color has a light and dark variant
- **Accessible** — all pass WCAG contrast against the chart background
- **Sequential** — ordered so adjacent series are always distinguishable

### Performance

- **Zero JS** on pages without                       
- **Lazy loading** via IntersectionObserver (200px rootMargin for pre-fetch)
- **Per-module bundles** — a page with only Mermaid never loads Three.js
- **CDN-hosted libraries** — no bundle bloat in the site's own assets

### Available Modules

| Module | Use Case | Library |
|--------|----------|--------|
| plotly | 2D/3D charts, heatmaps, surfaces | Plotly.js |
| d3 | Custom visualizations, networks | D3.js v7 |
| threejs | 3D models, custom scenes | Three.js |
| cannon | 3D physics (robotics, joints) | Cannon-es + Three.js |
| matter | 2D physics (pendulums, springs) | Matter.js |
| mermaid | Diagrams from text | Mermaid 11 |
| model-viewer | Zero-config 3D model display | Google model-viewer |
| ncase | Gamified explorables | Custom |
| scrollama | Scroll-driven storytelling | Scrollama |

---

*This post is a living document. As I build more interactives for real posts, I'll add working examples here.*
