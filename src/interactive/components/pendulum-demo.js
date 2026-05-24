/**
 * Double pendulum demo for Matter.js.
 * Shows sensitive dependence on initial conditions.
 */
export function setup({ engine, render, Matter, theme, config, el }) {
  const { Bodies, Composite, Constraint, Body } = Matter;
  const width = render.options.width;
  const height = render.options.height;
  const cx = width / 2;
  const palette = theme.palette || ["#9b4230", "#4C7E4D", "#C4882D"];

  // Anchor point (fixed)
  const anchor = Bodies.circle(cx, 80, 8, {
    isStatic: true,
    render: { fillStyle: theme.text || "#1a1410" },
  });

  // First pendulum bob
  const bob1 = Bodies.circle(cx, 200, 20, {
    density: 0.004,
    frictionAir: 0.001,
    render: { fillStyle: palette[0] },
  });

  // Second pendulum bob
  const bob2 = Bodies.circle(cx + 30, 320, 16, {
    density: 0.003,
    frictionAir: 0.001,
    render: { fillStyle: palette[1] },
  });

  // Constraints (rods)
  const rod1 = Constraint.create({
    bodyA: anchor,
    bodyB: bob1,
    length: 120,
    stiffness: 1,
    render: { strokeStyle: theme.border || "#d4c8b0", lineWidth: 2 },
  });

  const rod2 = Constraint.create({
    bodyA: bob1,
    bodyB: bob2,
    length: 100,
    stiffness: 1,
    render: { strokeStyle: theme.border || "#d4c8b0", lineWidth: 2 },
  });

  Composite.add(engine.world, [anchor, bob1, bob2, rod1, rod2]);

  // Give initial push
  Body.setVelocity(bob2, { x: 5, y: -2 });
}
