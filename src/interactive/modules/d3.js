/**
 * D3 module — custom data visualizations.
 *
 * For research-grade charts, custom graph layouts, force-directed networks,
 * and pi.ai-style warm data presentations.
 *
 * Config:
 *   height: number (default 400)
 *   type: "line" | "bar" | "scatter" | "network" | "custom"
 *
 * Data: JSON from data-src or inline module from data-code
 *
 * For custom visualizations, provide a module via data-src that exports:
 *   setup({ container, d3, theme, config, data })
 */

import { getTheme } from '../theme.js';

const CDN = 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

export async function mount(el, config, theme) {
  const d3 = await import(/* webpackIgnore: true */ CDN);
  const canvas = el.querySelector('.interactive__canvas');
  const height = config.height || 400;
  const width = canvas.clientWidth || el.clientWidth || 800;

  // Load data
  let data = null;
  const src = el.dataset.src;
  if (src && src.endsWith('.json')) {
    const res = await fetch(src);
    data = await res.json();
  } else if (src) {
    // Custom module
    try {
      const module = await import(/* webpackIgnore: true */ src);
      if (module.setup) {
        const instance = await module.setup({ container: canvas, d3, theme, config, el });
        return { d3, instance, canvas };
      }
    } catch (e) {
      console.warn('[d3] Failed to load custom module:', e);
    }
  }

  // Default: create an SVG with theme-aware styling
  const svg = d3
    .select(canvas)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // If data is provided and type is specified, render a basic chart
  if (data && config.type) {
    renderChart(svg, data, config, theme, { width, height, d3 });
  }

  return { d3, svg, canvas, data };
}

function renderChart(svg, data, config, theme, { width, height, d3 }) {
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  if (config.type === 'line' || config.type === 'scatter') {
    const xScale = d3.scaleLinear().domain(d3.extent(data, (d) => d.x)).range([0, innerW]);
    const yScale = d3.scaleLinear().domain(d3.extent(data, (d) => d.y)).nice().range([innerH, 0]);

    // Axes
    g.append('g')
      .attr('transform', 'translate(0,' + innerH + ')')
      .call(d3.axisBottom(xScale).ticks(6))
      .selectAll('text')
      .attr('fill', theme.inkMuted);

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', theme.inkMuted);

    // Style axes
    g.selectAll('.domain').attr('stroke', theme.axisColor);
    g.selectAll('.tick line').attr('stroke', theme.gridColor);

    if (config.type === 'line') {
      const line = d3
        .line()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', theme.palette[0])
        .attr('stroke-width', 2.5)
        .attr('d', line);
    } else {
      g.selectAll('circle')
        .data(data)
        .join('circle')
        .attr('cx', (d) => xScale(d.x))
        .attr('cy', (d) => yScale(d.y))
        .attr('r', 4)
        .attr('fill', theme.palette[0])
        .attr('opacity', 0.8);
    }
  }
}

export function onThemeChange(el, instance, config, newTheme) {
  if (!instance) return;
  // For custom modules
  if (instance.instance?.onThemeChange) {
    instance.instance.onThemeChange(newTheme);
    return;
  }
  // For default charts: simplest to re-render
  const canvas = instance.canvas;
  canvas.innerHTML = '';
  mount(el, config, newTheme);
}
