---
title: "Ball Balancing on Arc"
fullTitle: "Ball Balancing on Arc"
description: "A 13-controller benchmark on real ball-on-arc hardware—650 trials across classical control, RL, offline RL, and world models."
image: "/assets/images/projects/ball_on_arc_cart.png"
tech: ["RL", "Sim2Real", "World Models", "Nonlinear Dynamics", "Control Theory"]
status: "under-review"
published: 2026-04-14
lastUpdated: 2026-08-12
layout: layouts/post
section: "projects"
tags: ["robotics", "simulation"]
---

> **Paper status, August 2026:** submitted to *IEEE Robotics & Automation Magazine* and under review. The identity-linked artifact URL will be added here after review.

## Brief

A ball rolling on an arc-shaped rail mounted on a linear cart. Sounds simple enough, until you realize everything works, and *that* was the problem.

The system exhibits underactuated nonlinear dynamics where the cart (actuated) must stabilize the ball (unactuated) at an equilibrium atop the arc. The challenge isn't making it work in theory. It's that the linearized model, the energy-based controller, and the feedback linearization all "work" independently, but reconciling their domains of attraction into a single robust controller reveals subtle coupling effects that classical approaches gloss over.

The completed benchmark includes:

- 13 classical and learning-based controllers
- 50 real-hardware trials per controller, 650 trials in total
- PID, LQR, NMPC, reinforcement learning, offline reinforcement learning, and world-model approaches
- Explicit boundary and blind-zone handling for safe, repeatable hardware evaluation
- A reproducible comparison of simulation performance and real-world reliability

## Read More

I've written extensively about the lessons learned from this project: the traps of partial simulation success, sensor failures, frequency mismatches, and the year-long journey of debugging the gap between sim and real:

→ [Everything Worked. That Was the Problem.](/writings/everything-worked-that-was-the-problem/)
