---
title: "Ball Balancing on Arc"
fullTitle: "Ball Balancing on Arc"
description: "Nonlinear control of a ball balancing on a curved surface mounted on a linear cart — a deceptively simple system with rich dynamics."
image: "/assets/images/projects/ball_on_arc_cart.png"
tech: ["RL", "Sim2Real", "World Models", "Nonlinear Dynamics", "Control Theory"]
status: "under-review"
published: 2026-04-14
lastUpdated: 2026-05-24
layout: layouts/post
section: "projects"
tags: ["robotics", "simulation"]
---

> **📄 This project/paper is currently under review.** Full details will be available upon publication.

## Brief

A ball rolling on an arc-shaped rail mounted on a linear cart. Sounds simple enough — until you realize everything works, and *that* was the problem.

The system exhibits underactuated nonlinear dynamics where the cart (actuated) must stabilize the ball (unactuated) at an equilibrium atop the arc. The challenge isn't making it work in theory — it's that the linearized model, the energy-based controller, and the feedback linearization all "work" independently, but reconciling their domains of attraction into a single robust controller reveals subtle coupling effects that classical approaches gloss over.

The project explores:
- Euler–Lagrange derived equations of motion for the ball-on-arc-on-cart system
- Reinforcement learning policies trained in simulation and deployed on real hardware
- The sim2real gap: what happens when your simulation succeeds partially, and you can no longer tell whether your model is structurally wrong or just needs more tuning
- Nonlinear stabilization with provable regions of attraction

## Read More

I've written extensively about the lessons learned from this project — the traps of partial simulation success, sensor failures, frequency mismatches, and the year-long journey of debugging the gap between sim and real:

→ [Everything Worked. That Was the Problem.](/writings/everything-worked-that-was-the-problem/)
