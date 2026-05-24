/**
 * Plotly module — renders interactive 2D/3D charts.
 *
 * Supports:
 *   - Line, scatter, bar, heatmap, surface, 3D scatter
 *   - Custom color palettes from site theme
 *   - Dark mode auto-switching
 *   - Responsive sizing
 *
 * Config (via data-config):
 *   height: number (default 400)
 *   type: string (default "scatter") — plotly trace type
 *
 * Data source (via data-src):
 *   JSON file with { data: [...traces], layout: {...} } format
 *   OR inline data via data-code attribute
 */

import { getTheme } from "../theme.js";

const CDN = "https://cdn.plot.ly/plotly-2.35.0.min.js";
let Plotly = null;

async function loadPlotly() {
  if (Plotly) return Plotly;
  // Load from CDN as a global (Plotly doesn't export ESM)
  if (!window.Plotly) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CDN;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  Plotly = window.Plotly;
  return Plotly;
}

function applyTheme(layout, theme) {
  return {
    ...layout,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
      family: theme.fontSans,
      color: theme.ink,
      size: 13,
    },
    xaxis: {
      ...layout.xaxis,
      gridcolor: theme.gridColor,
      linecolor: theme.axisColor,
      zerolinecolor: theme.axisColor,
      tickfont: { color: theme.inkMuted },
      title: { ...layout.xaxis?.title, font: { color: theme.inkSecondary } },
    },
    yaxis: {
      ...layout.yaxis,
      gridcolor: theme.gridColor,
      linecolor: theme.axisColor,
      zerolinecolor: theme.axisColor,
      tickfont: { color: theme.inkMuted },
      title: { ...layout.yaxis?.title, font: { color: theme.inkSecondary } },
    },
    legend: {
      ...layout.legend,
      font: { color: theme.inkSecondary },
      bgcolor: "rgba(0,0,0,0)",
    },
    colorway: theme.palette,
  };
}

export async function mount(el, config, theme) {
  const plotly = await loadPlotly();
  const canvas = el.querySelector(".interactive__canvas");
  const height = config.height || 400;

  let plotData;
  const src = el.dataset.src;
  const code = el.dataset.code;

  if (src) {
    const res = await fetch(src);
    plotData = await res.json();
  } else if (code) {
    plotData = JSON.parse(decodeURIComponent(code));
  } else {
    plotData = { data: [], layout: {} };
  }

  // Apply theme colors to traces that don't have explicit colors
  const data = (plotData.data || []).map((trace, i) => {
    if (!trace.marker?.color && !trace.line?.color) {
      const color = theme.palette[i % theme.palette.length];
      return {
        ...trace,
        marker: { ...trace.marker, color },
        line: { ...trace.line, color },
      };
    }
    return trace;
  });

  const layout = applyTheme(
    {
      ...plotData.layout,
      height,
      margin: { t: 30, r: 20, b: 50, l: 60, ...plotData.layout?.margin },
    },
    theme
  );

  const plotConfig = {
    responsive: true,
    displayModeBar: false,
    scrollZoom: false,
  };

  await plotly.newPlot(canvas, data, layout, plotConfig);

  return { canvas, plotData };
}

export function onThemeChange(el, instance, config, newTheme) {
  if (!Plotly || !instance) return;
  const layout = applyTheme(
    { height: config.height || 400, margin: { t: 30, r: 20, b: 50, l: 60 } },
    newTheme
  );
  Plotly.relayout(instance.canvas, layout);
}
