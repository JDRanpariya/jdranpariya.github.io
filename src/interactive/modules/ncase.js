/**
 * Ncase module — gamified explorable explanations.
 *
 * Inspired by Nicky Case's interactive storytelling.
 * Creates choice-driven narratives and interactive simulations
 * where readers learn by playing.
 *
 * Supports:
 *   - Choice-based branching ("choose your own adventure")
 *   - Slider/toggle controls that change simulation state
 *   - Animated character/emoji reactions
 *   - State machines with visual feedback
 *
 * Config:
 *   height: number (default 500)
 *   type: "choices" | "sliders" | "simulation" | "custom"
 *
 * Data: module in data-src that exports setup({ container, theme })
 *   The module should return an object with:
 *   - destroy(): cleanup function
 *   - onThemeChange(theme): update colors
 *
 * The module has full control over its container and can create
 * any DOM structure needed for the interactive experience.
 */

import { getTheme } from '../theme.js';

export async function mount(el, config, theme) {
  const canvas = el.querySelector('.interactive__canvas');
  const src = el.dataset.src;

  if (!src) {
    canvas.innerHTML = createPlaceholder('No source module specified for this explorable.');
    return null;
  }

  try {
    const module = await import(/* webpackIgnore: true */ src);

    // Apply base styling to the canvas
    canvas.classList.add('interactive--ncase');
    canvas.style.minHeight = (config.height || 500) + 'px';

    // Mount the explorable
    const instance = await module.setup({
      container: canvas,
      theme,
      config,
      el,
      // Helper utilities the explorable can use
      utils: {
        createChoice,
        createSlider,
        createEmoji,
        animate,
        waitForClick,
      },
    });

    return instance;
  } catch (e) {
    console.warn('[ncase] Failed to load explorable:', e);
    canvas.innerHTML = createPlaceholder('Failed to load interactive.');
    return null;
  }
}

export function onThemeChange(el, instance, config, newTheme) {
  if (instance?.onThemeChange) {
    instance.onThemeChange(newTheme);
  }
}

// --- Helper utilities for explorable authors ---

function createChoice(container, { prompt, choices, onChoice }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ncase-choices';
  wrapper.innerHTML = '<p class="ncase-prompt">' + prompt + '</p>';

  const btnGroup = document.createElement('div');
  btnGroup.className = 'ncase-btn-group';

  choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'ncase-btn';
    btn.textContent = choice.label;
    btn.addEventListener('click', () => {
      // Disable all buttons after choice
      btnGroup.querySelectorAll('button').forEach((b) => {
        b.disabled = true;
        b.classList.remove('ncase-btn--active');
      });
      btn.classList.add('ncase-btn--active');
      if (onChoice) onChoice(choice.value, i);
    });
    btnGroup.appendChild(btn);
  });

  wrapper.appendChild(btnGroup);
  container.appendChild(wrapper);
  return wrapper;
}

function createSlider(container, { label, min, max, step, value, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ncase-slider';

  const labelEl = document.createElement('label');
  labelEl.className = 'ncase-slider__label';
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.step = step || 1;
  input.value = value;
  input.className = 'ncase-slider__input';

  const valueEl = document.createElement('span');
  valueEl.className = 'ncase-slider__value';
  valueEl.textContent = value;

  input.addEventListener('input', () => {
    valueEl.textContent = input.value;
    if (onChange) onChange(Number(input.value));
  });

  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);
  wrapper.appendChild(valueEl);
  container.appendChild(wrapper);
  return { wrapper, input, valueEl };
}

function createEmoji(container, { emoji, size, x, y }) {
  const span = document.createElement('span');
  span.className = 'ncase-emoji';
  span.textContent = emoji;
  span.style.fontSize = (size || 48) + 'px';
  if (x !== undefined) span.style.left = x + 'px';
  if (y !== undefined) span.style.top = y + 'px';
  container.appendChild(span);
  return span;
}

function animate(el, keyframes, options) {
  return el.animate(keyframes, { duration: 300, easing: 'ease-out', fill: 'forwards', ...options });
}

function waitForClick(el) {
  return new Promise((resolve) => {
    el.addEventListener('click', resolve, { once: true });
  });
}

function createPlaceholder(text) {
  return '<p class="text-ink-muted italic text-center py-8">' + text + '</p>';
}
