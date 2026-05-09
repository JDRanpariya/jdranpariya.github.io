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
readNext: "/writings/writing-differentiable-simulation-for-cartpole-in-jax/"
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

This is the kind of chart I'd use when writing about physical AI hardware — mapping the design space, showing where biology sits vs engineered systems.

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

### State Machine

Perfect for documenting controller behavior:

::: interactive mermaid
code: stateDiagram-v2; [*]-->Idle; Idle-->Balancing: start; Balancing-->Recovering: disturbance; Recovering-->Balancing: stabilized; Recovering-->Fallen: timeout; Fallen-->[*]
caption: "Cart-pole controller state machine — the system I built for my sim2real project."
:::

---

## 3D Content

### Three.js

For rendering mechanisms, robots, and physical systems. Orbit controls let readers inspect from any angle. To use, reference a .glb model:

    ::: interactive threejs
    src: /models/your-model.glb
    height: 500
    autoRotate: true
    camera: orbit
    caption: "Drag to rotate, scroll to zoom."
    :::

### Model Viewer (Zero Config)

For simple model display without custom scenes, Google's model-viewer web component:

    ::: interactive model-viewer
    src: /models/robot-arm.glb
    height: 400
    autoRotate: true
    caption: "A 6-DOF robot arm."
    :::

---

## Physics Simulations

### Cannon-es: 3D Physics

For robotics posts — simulate rigid bodies, joints, actuators, and control systems in full 3D. Provide a scene module that exports a setup function:

    ::: interactive cannon
    src: /interactive/components/cartpole-3d.js
    height: 500
    gravity: [0, -9.82, 0]
    ground: true
    caption: "3D cart-pole with physics. Drag to rotate view."
    :::

The scene module receives                                          and returns                      for the animation loop.

### Matter.js: 2D Physics

For simpler demonstrations — pendulums, particles, springs, collisions:

    ::: interactive matter
    src: /interactive/components/pendulum.js
    height: 400
    gravity: 1
    interactive: true
    caption: "Drag the pendulum. Watch energy transfer."
    :::

---

## Gamified Explorables (Ncase-style)

Inspired by Nicky Case. For emotional posts, storytelling, or when I want readers to *feel* a concept rather than just read about it.

The ncase module provides helpers for choice-based narratives and interactive controls:

    ::: interactive ncase
    src: /interactive/components/energy-choices.js
    height: 500
    caption: "What would you prioritize? Make your choice."
    :::

The module gets utilities like                 ,                 ,                , and             — everything needed to build a small game inside a post.

---

## Scroll-Driven Stories

Inspired by pudding.cool. Content animates and transforms as the reader scrolls:

    ::: interactive scrollama
    src: /interactive/components/evolution-of-control.js
    height: 600
    offset: 0.5
    caption: "Scroll to see how control theory evolved."
    :::

---

## Custom D3 Visualizations

For research-grade custom charts, network graphs, force-directed layouts:

    ::: interactive d3
    src: /interactive/components/knowledge-graph.js
    height: 500
    caption: "My reading network — books, papers, and concepts connected."
    :::

---

## How It Works

### Architecture

1. Add                        to frontmatter
2. Use                          blocks in markdown
3. The loader script (                        ) hydrates blocks when scrolled into view
4. Each module lazy-loads its library from CDN on first use
5. All modules pull colors from                            which reads CSS variables

### Color Philosophy

Inspired by pi.ai's warm, intentional data colors. The palette is:
- **Earthy and warm** — burnt sienna, forest green, terra cotta, amber
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

*This post is a living document. As I build more interactives for real posts, I'll add them here as working examples.*
