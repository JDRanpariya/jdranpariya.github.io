/**
 * Matter.js module — 2D physics simulations.
 *
 * Perfect for:
 *   - Mechanical intuition demos
 *   - Particle systems
 *   - Constraint/spring visualizations
 *   - Gamified "play with physics" explorations
 *
 * Config:
 *   height: number (default 400)
 *   gravity: number (default 1)
 *   wireframe: boolean (default false)
 *   interactive: boolean (default true) — allow mouse dragging bodies
 *
 * Data: scene definition in data-src (JSON) or data-code (inline JS module path)
 */

import { getTheme } from '../theme.js';

const CDN = 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js';

async function loadMatter() {
  if (window.Matter) return window.Matter;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CDN;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.Matter;
}

export async function mount(el, config, theme) {
  const Matter = await loadMatter();
  const canvas = el.querySelector('.interactive__canvas');
  const height = config.height || 400;
  const width = canvas.clientWidth || el.clientWidth || 800;

  const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;

  // Engine
  const engine = Engine.create();
  engine.gravity.y = config.gravity !== undefined ? config.gravity : 1;

  // Renderer
  const render = Render.create({
    element: canvas,
    engine: engine,
    options: {
      width,
      height,
      wireframes: config.wireframe || false,
      background: 'transparent',
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    },
  });

  // Apply theme colors to the render
  render.options.wireframeBackground = 'transparent';

  // Load scene from src if provided
  const src = el.dataset.src;
  if (src) {
    try {
      const module = await import(/* webpackIgnore: true */ src);
      if (module.setup) {
        await module.setup({ engine, render, Matter, theme, config, el });
      }
    } catch (e) {
      console.warn('[matter] Failed to load scene:', e);
    }
  } else {
    // Default: ground + some objects
    const ground = Bodies.rectangle(width / 2, height - 20, width, 40, {
      isStatic: true,
      render: { fillStyle: theme.border },
    });
    Composite.add(engine.world, [ground]);
  }

  // Mouse interaction
  if (config.interactive !== false) {
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;
  }

  // Run
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  // Responsive
  const resizeObserver = new ResizeObserver(() => {
    const w = canvas.clientWidth;
    render.canvas.width = w;
    render.options.width = w;
    Render.setPixelRatio(render, Math.min(window.devicePixelRatio, 2));
  });
  resizeObserver.observe(canvas);

  return { engine, render, runner, Matter, resizeObserver };
}

export function onThemeChange(el, instance, config, newTheme) {
  // Could update body colors here if needed
}
