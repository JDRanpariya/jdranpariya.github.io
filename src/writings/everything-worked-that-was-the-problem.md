---
title: "Everything Worked. That Was the Problem."
published: 2026-04-14
lastUpdated: 2026-04-14
tags: ["simulation", "robotics", "AI", "sim2real"]
section: "writings"
series:
  name: "On Simulation"
  order: 3
layout: layouts/post.njk
description: "A wrong simulation is most dangerous when it still produces working behavior. Lessons from a year of sim2real on a real balancing system."
---

I remember the first time I deployed an RL policy on the actual hardware. Cart moving, ball rolling, the thing was balancing. I stood there watching it and I should've been happy — months of work, first real deployment, ball is staying on the cart. Except something felt wrong. The cart was jerking back and forth like it was panicking. Ball would drift towards one end, cart would slam in that direction, overshoot, ball rolls back, cart slams the other way. Never settled, never looked graceful, just barely surviving each moment. It took about 8 seconds to stabilize when simulation references suggest a decent controller should need about 2.

And it wasn't just RL. I tuned a PID controller. Same thing. Implemented nonlinear MPC — same aggressive, wall-slamming behavior. Every algorithm I threw at it would eventually balance the ball, but all of them looked like they were fighting the system instead of controlling it.

That's the trap nobody really warns you about in sim2real. The dangerous case isn't when your simulation fails completely — it's when it succeeds partially, and you can no longer tell whether your model is structurally wrong or just needs more tuning. The partial success becomes active camouflage. You start optimizing into the wrong world model and everything you learn is subtly contaminated.

I spent over a year learning this lesson at Fraunhofer. Here's the story.


### how it started

The project is simple to explain — balance a ball on a cart by moving the cart left and right on a linear rail. The cart is 3D-printed with a curved surface and a small concave dip where the ball rests, sits on a 1-meter linear actuator, and the whole thing looks like a CartPole problem from your RL textbook. We wanted to solve it with reinforcement learning.

I come from CS. My mental model of simulation was something like game engines, MuJoCo, IsaacSim — contact forces, friction, rigid body physics, all handled somewhere underneath. You describe your system on top. It took me a while to realize that the CartPole Gym environment is literally just a Python function with physics equations in the `step` method. No engine. Just math that takes a state and action and returns the next state.

Once I understood that, the path seemed straightforward — same state space as CartPole, I just need to change the equations of motion. I found a paper where people had controlled a similar ball-on-arc system and adapted their Euler-Lagrange derived equations[^1]. The paper used a force-based input model (their system was probably current-controlled, which maps directly to force), and I used the same without thinking much about it. Trained a policy in simulation, things looked reasonable, moved on.

That was the first mistake I wouldn't recognize for months.

---

### the fog of hardware

Getting hardware talking to Python had its small disasters — a week of debugging serial communication that turned out to be a broken USB cable. Classic. Once sorted, the real problems started.

#### sensors I couldn't trust

We used Time-of-Flight distance sensors to track the ball — two of them, one on each side of the cart[^2]. They died constantly. The ball hits the walls during training, vibrations travel through the 3D-printed frame, sensors stop responding — not cleanly, intermittently. Zeros, out-of-range values, silent freezes where the sensor stopped updating and the script didn't know. Soldering the jumper cables directly onto the microcontroller instead of breadboard connections helped with the dropouts — that's one thing I'd have done much earlier.

But here's what really got me. I was collecting training data with half-dead sensors and didn't fully realize it. I had too much trust in hardware for reasons I still can't explain — whenever a sensor died I'd restart it, sometimes the script ran through entire sessions with sensors idle or returning garbage, and I just kept going. It wasn't until I sat down and visualized the collected data that I saw most of the distance values were just zero. Flatlined. I'd tried training data-driven models for offline RL and they failed — I assumed I needed fancier approaches. Nope. My data was trash.

TwinCAT IPC data I could trust blindly. Cheap $10 sensors with a microcontroller? Every reading is guilty until proven innocent.

#### a frequency mismatch I couldn't see

I was running the control loop at 50Hz. History-based RL policies — ones given a window of past states — were performing *worse* than memoryless ones. More information should help; that's the whole premise of giving the agent memory. I had no explanation for a while.

Then I logged the actual state values during evaluation and noticed it: the same distance sensor value repeated 4-5 times before it changed. Dug into the datasheet. Each sensor maxes at about 20Hz in continuous mode, but I had two running sequentially to avoid interference, so each reading took about 34.5ms — roughly 12Hz total[^3]. The control loop thought it was seeing fresh data 50 times per second. It wasn't. History-based policies were training on repeated stale observations interleaved with fast-updating motor data — contradictory temporal information. Once I understood the frequency mismatch it clicked immediately. But until I logged the values and actually looked, I had no idea.

#### everything was real, nothing was definitive

Sensor noise was real — 3-5% in the state space. Communication delays I wasn't fully accounting for in loop timing. RL episodes terminating too early because I'd initialized states near the limits, so small early actions in the wrong direction would end the episode immediately[^4]. I fixed these one by one. Results improved each time.

And that's exactly what made the actual problem so easy to miss. Every item on this list was genuinely a problem. Each could plausibly explain the performance gap. So you chase them all, fix them all, performance improves a little each time — but never enough. And you have no idea if you're 80% done or 10% done, because when you have five plausible explanations and results get better as you work through them, there's not much natural pressure to question the foundations.

---

### the prior that was wrong

I had a belief I think a lot of people coming from ML and CS share: if the simulation is fundamentally broken, training fails obviously. A completely wrong sim doesn't produce a policy. I believed this. I was wrong.

A simulation that's wrong in the right way still produces behavior. The policy learns direction — roughly: go left, go right, stop — and that's learnable even from wrong physics. What gets contaminated is everything more precise: convergence speed, smoothness, how the system responds to disturbances. But the ball balanced sometimes. And "sometimes" is enough to stay busy with the real problems for a long time without questioning the model's foundations.

There's a zone between "totally broken sim that fails to train" and "correct sim" where the sim is just wrong enough to produce behavior, just wrong enough to give you something to deploy, and just good enough that you never feel the need to go back and verify the equations. I was in that zone for most of this project. Without a robotics background, "model structure" was nowhere near the top of my debugging list. The algorithms were balancing the ball. Why would the sim be the problem?

---

### the verification

The thing that forced me to actually look was writing the paper.

Writing forces a kind of precision that day-to-day implementation doesn't. You have to describe exactly what you did, and when you do that carefully, you notice things that loose working practice lets slide. I was tracing the dynamics model end-to-end against the TwinCAT program and actuator documentation — with some help from Claude, which I'll mention because the honesty matters more than the tool. The real point is that this verification only happened at paper-writing time. Not before hardware. Not at the first strange result. More than a year in.

First thing I found: force magnitude was wrong. 18N in simulation. Working back from the actual motor specs — torque constant, gearing ratio, effective mass — the real figure was about 2-2.5N[^5]. Off by nearly an order of magnitude. With 18N of simulated force, I'd set velocity limits to 5 m/s, thinking it was necessary for exploration. It was an artifact of the force being completely wrong. Concerning, but I kept going.

Then the structural thing.

I looked at the TwinCAT command I'd been using for continuous control: `MC_MoveVelocity`[^6]. You give it a value between -0.9 and 0.9 m/s. It commands a velocity. There is no force input. The servo drive handles force internally. My entire simulation was built on force-based input dynamics. Every equation, every controller, every trained policy — all optimized against a model that thought it was applying forces to a cart, when the real system was receiving velocity commands.

Not wrong parameters in the same framework. A different model structure entirely.

I have a CS background and the distinction between actuator control models — position, velocity, torque, current — genuinely wasn't in my thinking. It's assumed knowledge in robotics and basically absent from ML literature. I'd inherited the force assumption from the reference paper without once checking it against my own hardware interface. And the ball was balancing, so why would I question the model?

---

### what changed

I derived a velocity-based input model from scratch, re-did the Euler-Lagrange formulation, and retrained everything.

The difference was immediate. PID went from 8-20 seconds to about 2 seconds. RL trained cleanly at 20Hz — the same frequency where it previously refused to converge, and I'd spent months attributing that to simulation quality, the frequency mismatch, system nonlinearity. Wrong attribution, all of it. The policy had been trying to learn velocity control through a force interface. Once the interface matched, it learned. The bang-bang behavior mostly disappeared. Trajectories were smooth, deliberate, the cart making small corrections instead of slamming between extremes. NMPC worked the way theory said it should.

All those other problems — sensor noise, frequency limits, parameter uncertainty — still there. But now they were residual errors on top of a correct foundation instead of noise stacked on a wrong one. And here's what I found most useful about having a correct model: the remaining problems became separable. Before, everything was entangled — any result could be explained multiple ways and I had no clean baseline to reason from. After the structural fix, sensor noise was just sensor noise. Frequency limits were just frequency limits. Each became individually diagnosable instead of part of one undifferentiated mess.

Around the same time I also ran into the substepping problem. I'd assumed simulation frequency and control frequency were tied — run the controller at 5Hz, sim also runs at 5Hz. But fewer integration steps means larger numerical error, and at low frequencies you get instability even with RK4[^7]. The fix is substepping: run physics internally at 100Hz for numerical stability, let the control loop operate at whatever frequency you actually need. MuJoCo and IsaacSim handle this automatically. When you write your own environment from equations, you build it in deliberately or you hit this problem and blame the controller. I blamed the controller.

---

### what I'd tell myself 14 months ago

Most of the time I lost came from not knowing what I didn't know about the hardware side. The force-vs-velocity mistake is easy to explain in hindsight and genuinely hard to catch in the middle of it. The thing that would've helped most, I think, is just knowing that actuator control models exist as a concept — that force, velocity, position, and current are structurally different interfaces to the same hardware, and that "which one does your system use" is a question you have to answer before writing a single equation. I didn't know to ask it. It's assumed knowledge in robotics, absent from ML literature, and nothing in the CartPole Gym environment signals that it matters.

The second thing is having a concrete benchmark before you leave simulation. I didn't know PID should converge in roughly 2 seconds until I watched a tutorial video months into hardware work. That's too late. If I'd known what "correct" looked like — a number, not a vague impression — the 10x performance gap on hardware would've pointed somewhere specific from day one instead of just feeling wrong and generating a list of plausible explanations.

The substepping and sensor lessons I learned the way you usually learn hardware things: by hitting them. Each one was obvious the moment I understood it and invisible until then. I don't think you fully avoid that. But input model and simulation benchmark — those I'd pass on upfront to anyone starting something similar, because they're the kind of structural questions that don't surface naturally when things are partially working.

One framing that stuck with me: rough parameters are survivable, structural errors are not. I got away with approximate friction and masses — controllers compensate for quantitative mismatch. But force-vs-velocity wasn't quantitative — it was *what is this simulation even modeling.* You can't tune your way out of that.

---

The paper is being finalized, experiments still running. The full codebase should go open-source with the dynamics models included.

Sim-to-real is usually framed as domain adaptation — clean simulation, noisy reality, how do you bridge the gap. That framing assumes the simulation is at least asking the right question about the physics. For me the more fundamental problem came earlier: does the input your optimizer learned to use correspond to what the hardware actually responds to.

I think partial success is genuinely harder to diagnose than total failure. Total failure tells you something is wrong at the foundations. Partial success tells you things are working, and when you're in that state with a real list of genuine problems, there's not much natural pressure to question the model structure. Writing the paper forced it. I'm not sure what else would have.


[^1]: Euler-Lagrange derives equations of motion from kinetic and potential energy rather than force diagrams. Standard for mechanical systems with constraints. The reference paper used a smaller system (~15cm arc radius vs our 2.1m) with a potentiometer for sensing and no concave dip. I figured the same equations would transfer. They did — just not the input model.

[^2]: VL53L1X Time-of-Flight sensors measure distance by timing a laser pulse reflection. They produce a cone-shaped measurement zone — with glass walls on each side of the cart, each sensor was only reliable up to about 150mm. Two sensors, one on each side, combined in software to estimate ball position. Effective sensing range roughly 30-300mm per sensor, with the first 30mm being a dead zone.

[^3]: Continuous mode wasn't practical — both sensors reading simultaneously causes IR interference. Sequential reads with I2C overhead landed each at about 34.5ms, giving roughly 12Hz total update rate across both sensors.

[^4]: Easy to get wrong when you inherit environment structure from CartPole or similar — those initialize uniformly over the full state range with termination at the edges. For a system with tight dynamics or a policy still learning, most episodes die in the first step or two. Initializing within 70-80% of state limits lets episodes run long enough for the policy to learn something.

[^5]: Working back from motor specs means going through the torque constant, gearing ratio, and effective mass. Not obvious if you haven't done it before, but straightforward once you know what to look for in the datasheet — and worth doing before your first training run.

[^6]: `MC_MoveVelocity` is a Beckhoff TwinCAT function block for velocity-controlled motion. You command a target velocity and the servo drive's internal PID loop handles all force and torque. There's no force input accessible from the application layer.

[^7]: RK4 is more accurate than simple Euler integration but still degrades with step size. At 5Hz each step spans 200ms — too coarse for fast balancing dynamics. Substepping runs RK4 internally at e.g. 100Hz (10ms steps) while only calling the control policy at 5Hz, giving numerical stability without coupling it to control frequency.

[^8]: PID computation was fastest. NMPC took 5-6ms per step. Serial communication to the PLC added a couple more milliseconds. If you don't account for these in your loop timing, there's drift between the control frequency you think you're running and what's actually executing.

::: references
- [Gymnasium CartPole Environment](https://github.com/Farama-Foundation/Gymnasium/blob/main/gymnasium/envs/classic_control/cartpole.py)
- [The Reality Gap in Robotics](https://arxiv.org/pdf/2510.20808)
- [Beckhoff TwinCAT MC_MoveVelocity](https://infosys.beckhoff.com/english.php?content=../content/1033/tcplclib_tc2_mc2/70102411.html&id=)
- [VL53L1X Datasheet](https://cdn.shopify.com/s/files/1/1509/1638/files/VL53L0X_Time_of_Flight_Sensor_Datenblatt_AZ-Delivery_Vertriebs_GmbH.pdf?v=1608104673)
- [CartPole Analytical Model — Florian](https://coneural.org/florian/papers/05_cart_pole.pdf)

:::
