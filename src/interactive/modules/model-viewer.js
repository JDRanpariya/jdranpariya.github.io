/**
 * Model Viewer module — zero-config 3D model display.
 *
 * Uses Google's <model-viewer> web component for simple .glb/.gltf viewing.
 * Simpler than Three.js for cases where you just want to show a model
 * with orbit controls, no custom scene setup needed.
 *
 * Config:
 *   height: number (default 400)
 *   autoRotate: boolean (default true)
 *   ar: boolean (default false) — enable AR on supported devices
 *   poster: string — poster image while loading
 *
 * Data: model URL in data-src (.glb or .gltf)
 */

const CDN = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3/dist/model-viewer.min.js';

export async function mount(el, config, theme) {
  // Load the web component
  if (!customElements.get('model-viewer')) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = CDN;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const canvas = el.querySelector('.interactive__canvas');
  const src = el.dataset.src;
  const height = config.height || 400;

  if (!src) {
    canvas.innerHTML = '<p class="text-ink-muted italic">No model source provided.</p>';
    return null;
  }

  // Create <model-viewer> element
  const viewer = document.createElement('model-viewer');
  viewer.setAttribute('src', src);
  viewer.setAttribute('camera-controls', '');
  viewer.setAttribute('touch-action', 'pan-y');
  viewer.style.width = '100%';
  viewer.style.height = height + 'px';
  viewer.style.borderRadius = '6px';
  viewer.style.backgroundColor = theme.isDark ? theme.surface : theme.card;

  if (config.autoRotate !== false) {
    viewer.setAttribute('auto-rotate', '');
  }
  if (config.ar) {
    viewer.setAttribute('ar', '');
  }
  if (config.poster) {
    viewer.setAttribute('poster', config.poster);
  }

  // Interaction prompt
  viewer.setAttribute('interaction-prompt', 'auto');

  canvas.appendChild(viewer);
  return { viewer };
}

export function onThemeChange(el, instance, config, newTheme) {
  if (!instance?.viewer) return;
  instance.viewer.style.backgroundColor = newTheme.isDark ? newTheme.surface : newTheme.card;
}
