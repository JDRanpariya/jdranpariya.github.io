/**
 * Ncase-style explorable: "What matters most in robotics?"
 * A simple choice-driven interactive that reveals tradeoffs.
 */
export async function setup({ container, theme, utils }) {
  const { createChoice, createEmoji, animate } = utils;

  container.style.fontFamily = "inherit";
  container.style.padding = "1.5rem";

  const title = document.createElement("h3");
  title.textContent = "The Robot Design Tradeoff";
  title.style.cssText = "margin: 0 0 1rem; font-size: 1.2rem; font-weight: 600;";
  container.appendChild(title);

  const intro = document.createElement("p");
  intro.textContent =
    "You're designing a robot for household tasks. You can optimize for one thing. What do you choose?";
  intro.style.cssText = "margin: 0 0 1.5rem; line-height: 1.6;";
  container.appendChild(intro);

  const resultArea = document.createElement("div");
  resultArea.style.cssText = "margin-top: 1.5rem; min-height: 120px;";

  const results = {
    speed: {
      emoji: "\u26A1",
      text: "Fast robots break things. Speed without compliance means shattered dishes and dented walls. You'll need to solve the force control problem — which brings you back to needing better actuators anyway.",
    },
    precision: {
      emoji: "\uD83C\uDFAF",
      text: 'Precision is expensive. Sub-millimeter accuracy requires stiff, heavy joints and expensive sensors. Your robot now costs $200k and can\'t handle novel objects. The real world is messy — maybe "good enough" precision + adaptation is the way.',
    },
    safety: {
      emoji: "\uD83D\uDEE1\uFE0F",
      text: "Safe robots are slow robots... or are they? Compliant actuators (like series elastic) give you safety AND force sensing. This is why differentiable simulation matters — you can optimize the whole control stack for safe-yet-capable behavior.",
    },
    cost: {
      emoji: "\uD83D\uDCB0",
      text: "Cheap robots need to be smart. If you can't afford precision hardware, your software must compensate. This is exactly the bet behind learned policies — replace expensive mechanics with learned dexterity.",
    },
  };

  createChoice(container, {
    prompt: "",
    choices: [
      { label: "\u26A1 Speed", value: "speed" },
      { label: "\uD83C\uDFAF Precision", value: "precision" },
      { label: "\uD83D\uDEE1\uFE0F Safety", value: "safety" },
      { label: "\uD83D\uDCB0 Low Cost", value: "cost" },
    ],
    onChoice(value) {
      const r = results[value];
      resultArea.innerHTML = "";
      const emoji = document.createElement("div");
      emoji.textContent = r.emoji;
      emoji.style.cssText = "font-size: 48px; text-align: center; margin-bottom: 0.75rem;";
      const text = document.createElement("p");
      text.textContent = r.text;
      text.style.cssText = "line-height: 1.7; max-width: 500px; margin: 0 auto;";
      resultArea.appendChild(emoji);
      resultArea.appendChild(text);
      animate(resultArea, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
    },
  });

  container.appendChild(resultArea);

  return {
    destroy() {
      container.innerHTML = "";
    },
    onThemeChange(newTheme) {
      /* colors come from CSS */
    },
  };
}
