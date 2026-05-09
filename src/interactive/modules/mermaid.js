/**
 * Mermaid module — renders diagrams from text definitions.
 *
 * Supports: flowcharts, sequence diagrams, state diagrams, etc.
 * Theme automatically matches site palette.
 *
 * Config:
 *   height: number (optional)
 *
 * Data: diagram source in data-code attribute
 */

import { getTheme } from '../theme.js';

const CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
let mermaidModule = null;

async function loadMermaid(theme) {
  if (mermaidModule) return mermaidModule;
  const { default: mermaid } = await import(/* webpackIgnore: true */ CDN);

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: theme.accentSoft,
      primaryTextColor: theme.ink,
      primaryBorderColor: theme.border,
      secondaryColor: theme.surface,
      secondaryTextColor: theme.inkSecondary,
      tertiaryColor: theme.card,
      lineColor: theme.inkMuted,
      textColor: theme.ink,
      mainBkg: theme.accentSoft,
      nodeBorder: theme.accent,
      clusterBkg: theme.surface,
      clusterBorder: theme.border,
      titleColor: theme.ink,
      edgeLabelBackground: theme.bg,
      fontSize: '13px',
      fontFamily: theme.fontSans,
      stateFontSize: '12px',
      stateLabelFontSize: '11px',
    },
  });

  mermaidModule = mermaid;
  return mermaid;
}

export async function mount(el, config, theme) {
  const mermaid = await loadMermaid(theme);
  const canvas = el.querySelector('.interactive__canvas');
  // Semicolons in data-code serve as line separators (HTML attributes can't
  // contain newlines). For graph/flowchart types, semicolons are native Mermaid
  // syntax. For other diagram types (stateDiagram, sequence, etc.) we need
  // to convert them to actual newlines.
  const rawCode = el.dataset.code || '';
  const isGraph = /^(graph|flowchart)\s/i.test(rawCode.trim());
  const code = isGraph ? rawCode : rawCode.replace(/;\s*/g, '\n');

  if (!code.trim()) {
    canvas.innerHTML = '<p class="text-ink-muted">No diagram source provided.</p>';
    return null;
  }

  // Mermaid needs a unique ID
  const id = 'mermaid-' + Math.random().toString(36).slice(2, 9);
  const { svg } = await mermaid.render(id, code);
  canvas.innerHTML = svg;

  // Make SVG responsive
  const svgEl = canvas.querySelector('svg');
  if (svgEl) {
    svgEl.removeAttribute('height');
    svgEl.style.width = '100%';
    svgEl.style.maxWidth = '100%';
    svgEl.style.height = 'auto';
  }

  return { id, code };
}

export async function onThemeChange(el, instance, config, newTheme) {
  // Re-initialize mermaid with new theme and re-render
  mermaidModule = null;
  await mount(el, config, newTheme);
}
