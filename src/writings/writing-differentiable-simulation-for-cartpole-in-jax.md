---
title: "Building a Differentiable Cart-Pole World in JAX" 
published: 2026-01-23
lastUpdated: 2026-01-27
tags: ["simulation", "jax"]
section: "writings"
series:
  name: "On Simulation"   # Series title
  order: 1                           # Position in the series
layout: layouts/post.njk
description: "Implementing Differentiable Cart-Pole Environment in JAX"
---

### Motivation
I understood a great deal of importance simulations pose to the growth of science and
engineering while studying the [lectures](https://www.youtube.com/watch?v=O5Ml5kPouG8)
by [Richard Hamming](http://localhost:8080/library/lectures/the-art-of-doing-science-and-engineering/).
Simulation is a cheaper, faster, and more effective way of carrying out the counterfactuals that we humans mentally are good at. I believe it is one of the best use cases of computers.

However, two things to keep in mind about simulations are the stability of the system you 
are simulating and the necessity of knowing the system very well to write down the equations.
Without that expertise, you simply won't get reliable answers.

In the world of Robotics, simulation provides a safe way of training and testing algorithms
and policies, much cheaper and faster without breaking actual hardware.
Although approximate, they act as a good solid prior for residual learning of the 
real-world environment. Yet, there is always a gap between the real world and the simulation model 
we have, an overview of which is presented in [Reality Gap in Robotics](https://arxiv.org/pdf/2510.20808).

Increasingly, there is more focus on learning-based and model-based methods, 
and it remains an open problem how to leverage differentiable simulation effectively.


### Foundation
Simulations are typically mathematical models of the system and consist of *Dynamics*
(Equations of motion), *Numerical Integrator*[^1] and *Solver*. 
It is easier to look at equations and get a feel, but under the hood, MuJoCo, Gazebo, etc. 
use the same equations which model Newtonian mechanics rendered on screen. 
They do incorporate sensors and have individual mathematical models.

For a controller or a Reinforcement Learning agent, these simulators usually act as a 
Black Box. The agent provides an action and the simulator outputs the next state, 
but the internal gears of the equations are hidden from the optimization process. 
This means the optimizer does not know the mathematical sensitivity of the output relative 
to the input.

In a standard simulator, the code is written in a way that the computer cannot calculate 
gradients through the solver. By writing our own analytical model in JAX, 
we ensure the equations are part of a differentiable graph. 
This allows the optimizer to "see" inside the physics.

For this project, I went to the [Cart-Pole Gym Environment](https://github.com/Farama-Foundation/Gymnasium/blob/main/gymnasium/envs/classic_control/cartpole.py#L163) 
code. In the step function, I found the [equations](https://coneural.org/florian/papers/05_cart_pole.pdf)
that define the system.

In general, for any system, you follow this framework:

1. Define the forces and parameters.

2. Write the Euler-Lagrangian formulation: $$L=T−V$$ (Kinetic Energy minus Potential Energy).

3. Solve for each parameter to get the differential equations.

Once you have those equations, Implementation is what separates normal vs differentiable simulator.

### The state and the Dynamics

To implement the environment, we first define the system's State Vector. 
For a Cart-Pole, the state at any time t is fully described by four variables:

$$s=[x, \dot{x}, \theta, \dot{\theta}]^T$$

Where:
* $x$: Position of the cart.
* $\dot{x}$: Velocity of the cart.
* $\theta$: Angle of the pole (where $0$ is the upright position).
* $\dot{\theta}$: Angular velocity of the pole.


Following the analytical model used in the Gymnasium implementation[^2], 
we arrive at the two second-order differential equations for acceleration. 
These equations describe how the system evolves when a force u is applied to the cart:

The angular acceleration $\ddot{\theta}$ is computed as:

$$\ddot{\theta}=\frac{g\sin\theta+\cos\theta\left(\frac{-u-m_pl\dot{\theta}^2\sin\theta}{m_c+m_p}\right)}{l\left(\frac{4}{3}-\frac{m_p\cos^2\theta}{m_c+m_p}\right)}$$

Once we have $\ddot{\theta}$, we solve for the linear acceleration of the cart $\ddot{x}$:

$$\ddot{x}=\frac{u+m_pl\left(\dot{\theta}^2\sin\theta-\ddot{\theta}\cos\theta\right)}{m_c+m_p}$$

### JAX Implementation
**Work in Progress**

### Power of Differentiability

### Results and Conclusion


#### Appendix
- [The Reality Gap in Robotics](https://arxiv.org/pdf/2510.20808)
- [Differential Simulation Overview](https://www.emergentmind.com/topics/differentiable-simulation)
- [Elements of Differentiable Programming](https://arxiv.org/pdf/2403.14606)
- [Differentiable Simulation Project](https://fab.cba.mit.edu/classes/864.20/people/erik/final_project.html)
- [Cart-Pole Analytical Model](https://coneural.org/florian/papers/05_cart_pole.pdf)
- [Do Differentiable Simulators Give Better Policy Gradients?](https://arxiv.org/pdf/2202.00817)
- [DiffTachi](https://arxiv.org/pdf/1910.00935)

[^1]: The method used to approximate the continuous physics in discrete time steps ($dt$). Common options include Euler (fast/simple) and Runge-Kutta/RK4 (accurate/stable).
[^2]: Paper by Florian, [link](https://coneural.org/florian/papers/05_cart_pole.pdf).
