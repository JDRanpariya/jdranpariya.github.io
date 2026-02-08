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

Now that we have the equations, let's implement them in JAX. Our goal is to create a dynamics function that's not just accurate, but also fully differentiable so we can compute gradients through the physics.

#### Technical Choices

**Continuous Action Space:** In a standard Gym env, we usually see discrete actions: 0 for Left, 1 for Right. 
For a differentiable simulation, we need a **continuous force** input (e.g., -18.0 to 18.0).
Gradients require a smooth mathematical landscape, you can't differentiate a "jump" between discrete steps.

**State as a NamedTuple:** JAX is functional and doesn't like globals or mutable objects since everything gets compiled. By using a `NamedTuple`, we treat our state as a **PyTree**. This allows JAX to map derivatives directly to our variables like `x` and `theta`.
```python
from typing import NamedTuple
import jax
import jax.numpy as jnp


class CartPoleState(NamedTuple):
    x: jnp.ndarray
    x_dot: jnp.ndarray
    theta: jnp.ndarray
    theta_dot: jnp.ndarray


def cartpole_dynamics(state: CartPoleState, force: float):
    """
    Cart-Pole Dynamics Implemented via JAX
    We neglect friction for simplicity
    """
    # Physics constants
    tau = 0.01
    g = 9.81
    cart_mass = 0.5
    pole_mass = 0.1
    pole_length = 2.0
    total_mass = cart_mass + pole_mass

    # Forces and Trigonometry
    sintheta = jnp.sin(state.theta)
    costheta = jnp.cos(state.theta)

    # Calculate accelerations using the analytical model
    theta_acc = (g * sintheta + costheta * (-force - pole_mass * pole_length * (state.theta_dot**2) * sintheta) / total_mass)
    theta_acc /= pole_length * (4/3 - (pole_mass * (costheta**2) / total_mass))

    x_acc = (force + pole_mass * pole_length * ((state.theta_dot**2) * sintheta - theta_acc * costheta))
    x_acc /= total_mass

    # Semi-implicit Euler integration
    new_x_dot = state.x_dot + tau * x_acc
    new_x = state.x + tau * new_x_dot
    new_theta_dot = state.theta_dot + tau * theta_acc
    new_theta = state.theta + tau * new_theta_dot

    return CartPoleState(x=new_x, x_dot=new_x_dot, theta=new_theta, theta_dot=new_theta_dot)
```

#### Analyzing Sensitivity: `jax.grad` vs. `jax.jacfwd`

Now that we have a differentiable dynamics function, we can do something impossible with traditional black-box simulators: compute exactly how sensitive our system is to control inputs.

**`jax.grad`:** This is used when you have a single scalar output. It's great if you only care about one thing like the pole's angle (theta).

**`jax.jacfwd`:** This calculates the **Jacobian matrix**. Since our simulation returns a full CartPoleState (four different values), the Jacobian gives us the derivative of every state variable with respect to our input force in a single pass.

Let's see what happens when we apply force to a slightly tilted pole:
```python
state = CartPoleState(x=0.0, x_dot=0.0, theta=0.1, theta_dot=0.0)

grad_fn = jax.jacfwd(cartpole_dynamics, argnums=1)
gradient = grad_fn(state, 18.0)
print(f"Gradient of state w.r.t force: {gradient}")
```

The output gives us the "sensitivity" of our physics:
```python
CartPoleState(x=0.00019, x_dot=0.019, theta=-7.09e-05, theta_dot=-0.007)
```

This tells us exactly how each state variable changes with respect to the applied force:

- **Positive x gradient (0.00019):** Pushing with positive force moves the cart to the right. Makes sense.
- **Negative theta gradient (−7.09×10⁻⁵):** Here's the interesting part, pushing the cart right causes the pole to tilt left (decreasing the angle). This captures the effect of inertia perfectly!
- **The magnitude:** These values tell us how much the state will change in exactly one timestep (τ=0.01s).

This gradient information becomes crucial when we want to optimize control policies or compute trajectory derivatives efficiently.

Similarly, we parameterize the environment parameters like state and pass it to dynamics function, which enables us to 
do system identification and domain randamizaiton!

#### Scaling to Time with `jax.lax.scan`

We can now differentiate a single step, but RL and trajectory optimization happen over hundreds of steps. If we used a standard Python `for` loop, JAX would try to "unroll" the entire simulation into one giant mathematical expression. This makes compilation slow and eats up memory.

Instead, we use *`jax.lax.scan`* a compiled "for-loop" that JAX understands.

**The Scan Pattern:** To use it, we need a wrapper that follows a specific signature:
`(carry, input) -> (next_carry, output)`.

1. **Carry:** The state that persists (our `CartPoleState`).
2. **Input:** The action/force taken at that specific timestep.
3. **Output:** Whatever you want to track (the state history or rewards).

**Why this is better:**
- **Constant Memory:** JAX can backpropagate through the loop efficiently without unrolling.
- **Lightning Speed:** The entire 100-step trajectory is compiled into a single optimized GPU kernel.
```python
def simulate_trajectory(initial_state, force_sequence):
    """
    Roll out a trajectory given a sequence of actions.
    Returns the entire state trajectory.
    """
    def scan_op(carry, current_force):
        next_state = cartpole_dynamics(carry, current_force)
        return next_state, next_state  # Carry the state forward, and also output it
    
    final_state, trajectory = jax.lax.scan(scan_op, initial_state, force_sequence)
    return trajectory


# Example: 100 timesteps with constant force
forces = jnp.ones(100) * 10.0  # Push with 10N for 100 steps
initial_state = CartPoleState(x=0.0, x_dot=0.0, theta=0.1, theta_dot=0.0)

trajectory = simulate_trajectory(initial_state, forces)
print(f"Trajectory theta shape: {trajectory.theta.shape}")  # Should be (100,)
```

The beauty of `lax.scan` is that we can differentiate through the entire trajectory. 
This means we can compute the gradient of any loss function with respect to all 100 actions in 
one shot:
```python
def trajectory_loss(force_sequence, initial_state):
    """
    Example loss: Keep the pole upright and cart centered.
    """
    trajectory = simulate_trajectory(initial_state, force_sequence)
    # Penalize pole angle and cart position
    return jnp.mean(trajectory.theta**2 + 0.1 * trajectory.x**2)


# Compute gradient of loss w.r.t. all actions at once
loss_grad_fn = jax.grad(trajectory_loss)
action_gradients = loss_grad_fn(forces, initial_state)
```

This gives us the gradient of our loss with respect to every action in the sequence
, exactly what we need for gradient-based trajectory optimization.


#### From Dynamics to Environments

While having a physics function is great, we usually need a structured "Environment" to
manage resets, rewards, and termination logic.

Usually, designing a Reinforcement Learning environment requires defining a few core methods:
1. **Reset**: Handling the initial stochastic state.
2. **Step**: Managing the transition logic (Physics + Rewards + Done flags).

Here is how we wrap our CartPole dynamics into a functional JAX environment:

```python
class JaxCartPoleEnv:
    def __init__(self):
        self.x_threshold = 2.4
        self.theta_threshold = 0.209  # ~12 degrees

    def reset(self, rng):
        """Returns a random starting state based on a JAX RNG key."""
        rng, subkey = jax.random.split(rng)
        initial_values = jax.random.uniform(subkey, (4,), minval=-0.05, maxval=0.05)
        return CartPoleState(*initial_values)

    def step(self, params: EnvParams, state: CartPoleState, force: float):
        """A pure functional transition: (state, action) -> (next_state, reward, done)"""
        # 1. dynamics model 
        next_state = cartpole_dynamics(params, state, force)
        
        # 2. Differentiable Reward (Crucial for Gradient-based Optimization)
        reward = jnp.cos(next_state.theta) - 0.01 * jnp.abs(force)
        
        # 3. Termination Logic
        done = (jnp.abs(next_state.x) > self.x_threshold) | \
               (jnp.abs(next_state.theta) > self.theta_threshold)
               
        return next_state, reward, done
```

- `reset(rng)`: In JAX, randomness is [explicit](https://docs.jax.dev/en/latest/random-numbers.html#random-numbers-in-jax). Instead of a hidden seed, we pass a PRNGKey. 
This ensures that our "random" start is perfectly reproducible.
- `step(...)`: This is a Pure Function. It does not modify an internal self.state. 
It takes the current state as an input and returns the next state as an output. 
- `Differentiable Rewards`: Notice we use `jnp.cos(theta)` instead of a discrete +1/-1. 
For gradients to flow, the reward must be a "smooth slope." 
This tells the optimizer not just that it failed, but how close it was to succeeding.

#### From Actions to Policies

The simulate_trajectory function we built earlier is an "Open Loop" rollout: it takes a fixed sequence of forces and follows them blindly. In Reinforcement Learning, we need a "Closed Loop" system where a Policy (like a Neural Network) looks at the state at every step and decides the force dynamically.

By combining our JaxCartPoleEnv with `jax.lax.scan`, we can simulate an entire episode where the agent 
"thinks" at every timestep.

```python
def policy_rollout(params: EnvParams, env: JaxCartPoleEnv, policy_params, rng):
    """
    Simulates a full episode where a Policy decides the actions.
    """
    # 1. Initialize the environment
    initial_state = env.reset(rng)

    def scan_op(state, _):
        # We assume 'policy_network' is a simple MLP or linear layer
        force = policy_network.apply(policy_params, state)
        next_state, reward, done = env.step(params, state, force)
        return next_state, reward

    # Use scan to run 200 steps
    _, rewards = jax.lax.scan(scan_op, initial_state, None, length=200)
    
    return jnp.sum(rewards)
```

Now we already have basic building blocks, Dynamics Function, Env and Rollout function working in a differentiable manner.
Jax provides, `jax.vmap` functionality to scale in space(memory). Let's use that and write a training loop
which can run thousands of envs at same time.






### Power of Differentiability

### Results and Conclusion


#### References
- [The Reality Gap in Robotics](https://arxiv.org/pdf/2510.20808)
- [Differential Simulation Overview](https://www.emergentmind.com/topics/differentiable-simulation)
- [Elements of Differentiable Programming](https://arxiv.org/pdf/2403.14606)
- [Differentiable Simulation Project](https://fab.cba.mit.edu/classes/864.20/people/erik/final_project.html)
- [Cart-Pole Analytical Model](https://coneural.org/florian/papers/05_cart_pole.pdf)
- [Do Differentiable Simulators Give Better Policy Gradients?](https://arxiv.org/pdf/2202.00817)
- [DiffTachi](https://arxiv.org/pdf/1910.00935)

[^1]: The method used to approximate the continuous physics in discrete time steps ($dt$). Common options include Euler (fast/simple) and Runge-Kutta/RK4 (accurate/stable).
[^2]: Paper by Florian, [link](https://coneural.org/florian/papers/05_cart_pole.pdf).
