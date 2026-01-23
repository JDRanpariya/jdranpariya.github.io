---
title: writing differentiable simulation for cartpole in JAX 
published: 2026-01-23
lastUpdated: 2026-01-23
tags: ["simulation", "jax"]
section: "writings"
series:
  name: "On Simulation"   # Series title
  order: 1                           # Position in the series
layout: layouts/post.njk
description: "Implementing Differentiable Cart-Pole Environment in JAX"
---

### Motivation
- Realization of impact of simulation in science that I got to know via Richard hamming 
- build general conceptual framework on how to approach the problem of making/writing  differentiable simulators
- learn JAX
- importance of sim to real gaps and how I believe using differential simulators make a difference, mention of sim 2 real paper 


We would need Analytical model of the simulator you’re trying to make differential.

### Fundamentals
Simulations are typically mathematical models of the system, it’s easier to look at equations and get a feel but under the hood Mujoco, Gazebo etc. uses same equations which models Newtonian mechanics which is rendered on screen. They do incorporate sensors and have individual mathematical models.


#### Appendix
- [The Reality Gap in Robotics](https://arxiv.org/pdf/2510.20808)
- [Differential Simulation Overview](https://www.emergentmind.com/topics/differentiable-simulation)
- [Elements of Differentiable Programming](https://arxiv.org/pdf/2403.14606)
- [Differentiable Simulation Project](https://fab.cba.mit.edu/classes/864.20/people/erik/final_project.html)
- [Cart-Pole Analytical Model](https://coneural.org/florian/papers/05_cart_pole.pdf)
- [Do Differentiable Simulators Give Better Policy Gradients?](https://arxiv.org/pdf/2202.00817)
- [DiffTachi](https://arxiv.org/pdf/1910.00935)
