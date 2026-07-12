---
title: Robotics
layout: layouts/post
section: "odyssey"
category: "Engineering & Computing"
description: "Notes on robotics as a field: what it takes to work in it, labs and people worth knowing, and a framework for foundation models across robot bodies."
tags: ["robotics", "AI", "engineering"]
published: 2023-04-08
lastUpdated: 2023-04-08
---

> [!important]
> Please don't assume it must be having Mechanical and Electrical Engineering. Until you figure out how and why other options are dull before them.

1. Engineering the body of entity
   1. Self modifiable hardware
2. Inner workings of entity
   1. Be it brain, coordination, or kind of chemistry

> [!info]
> Don't know where math fits in :JOY: I'm sure it is everywhere invisibly (not easy to perceive).

## Reddit Source 1

> Well, you're right in regards to "know your part well." You could be a CS grad, just cover the software part and let your team mates do the rest. As I highlighted in the paragraphs, there are ME, EE and CS that are involved in robotics.

> CS person is more tricky though, because software sits on top of the hardware. CS person working a robot is someone who cannot escape physics at all. EE might, but CS? I don't think so. If you're going to implement a motion stabilizing system or any motion related system at all, you're going to need to understand motion physics, otherwise you would become someone who keeps asking your team mates for every simple thing.

> If you're pushing to the visual/imaging frontier (such as 3D point cloud, Kinect-like application, object recognition), you're going to need to understand optical physics (focal length, optical distortion, depth of field, field of view, triangulation, etc). Or you could grab someone else's work, an open source library for instance, put it in your application and call it a day.

> If you're working on AI, it's going beyond physics here: Game theory, optimization theories, regression analysis, back-propagation neural network, fuzzy logic, simulated annealing or perhaps

## Reddit Source 2

> You have to pursue all the paths at once.

> Apply for jobs that seem beyond you. Think about what type of businesses and industries you want to work in, what you want to be building, and do research to find those and apply for positions there. Apply for positions that are not listed: just send in your resume and cover letter. It's OK to say in an interview, "I don't know enough about X yet, and I want to learn, and I'm interested in this position because obviously I will have to learn on the job."

> There's a lot you need to know about materials science, and safety. For industrial robotics you'll need to know about PLC's and being an expert in Solidworks is a big asset.

> Try getting involved with the local university's robotics club. Sometimes they are working on things like mars rovers for NASA competitions.

- [ ] [How to get started in robotics education/career](https://www.reddit.com/r/robotics/comments/kpkne5/how_to_get_started_in_robotics_education_career/)

## People and Labs

- [Murray Shanahan](http://www.doc.ic.ac.uk/~mpsha/)
- [Robot Intelligence Lab](https://www.imperial.ac.uk/robot-intelligence/research/)
- [Robot Learning Lab UK](https://www.robot-learning.uk/)
- [Bioinspired Autonomous Miniature Robots Group](https://minibot.is.mpg.de/)
- [Sensing to Intelligence Caltech](https://s2i.caltech.edu/research)
- [Center for Autonomous Systems Caltech](https://cast.caltech.edu/)
- [Robotics Institute CMU](https://www.ri.cmu.edu/research/)
- [Munich Robotics](https://munich-robotics-ai.de/)
- [Cyber Physical Systems Munich](https://www.ce.cit.tum.de/en/cps/home/)
- [Fraunhofer Cognitive Systems](https://www.iks.fraunhofer.de/)
- [Learning Systems | ETH Max Planck](https://learning-systems.org/research)
- [Autonomous Learning Group | Tübingen](https://uni-tuebingen.de/fakultaeten/mathematisch-naturwissenschaftliche-fakultaet/fachbereiche/informatik/lehrstuehle/distributed-intelligence/home/)
- [Robotics | EPFL](https://www.epfl.ch/research/domains/robotics/)

## IIS Fraunhofer

- Fraunhofer IIS Nordostpark 84, 90411 Nürnberg. At the entrance: call Tobias Feigl (+4917623260251).

## Foundation Model for Robotics

Study current foundation models:

- [RT-2: VLA](https://arxiv.org/pdf/2307.15818)
- [Octo: Open Source Generalist Policy](https://octo-models.github.io/)
- [Gen-0](https://generalistai.com/blog/nov-04-2025-GEN-0)
- [CrossFormer: Cross-Embodied Learning](https://crossformer-model.github.io/)
- [BLM 1](https://arxiv.org/pdf/2510.24161)
- [X-VLA](https://arxiv.org/abs/2510.10274)
- [Robust Visual Embodiment](https://arxiv.org/pdf/2510.03677)
- [Teaching Robots to Build Simulations of Themselves](https://www.nature.com/articles/s42256-025-01006-w)
- [Robo Brain 2.5](https://superrobobrain.github.io/)
- [Morphology-Agnostic Control in Robotics](https://www.emergentmind.com/topics/morphology-agnostic-control-framework)

My modular framework for a foundation model:

- Identity Layer: figure out morphology, self ID
- High level policy/task layer: VLM or diffusion transformer in ARCH
- Hybrid RL-MP Skill Library
- Watchdog layer: for re-triggering of self ID

### 1. The Level 0 (Identity Layer) Gaps

**The problem:** your "wiggle phase" provides a snapshot, not a dynamics map.

- **The "unobservable" gap:** 2 seconds of motor babbling can identify joint counts (kinematics), but it cannot easily identify mass, inertia, or friction (dynamics). If your 3-wheeled robot is carrying a 5kg payload today vs. 0kg yesterday, the wiggle might look the same, but the "execute" phase will overshoot or fail.
- **The "affordance" gap:** self-ID tells the robot *what it is*, but not *what it can reach*. Knowing you have a 7-DOF arm doesn't automatically tell you the reachable workspace relative to the floor.

> **Improvement:** move from a static identity vector to a dynamic latent belief. Instead of a one-time "wiggle," the identity layer should output a continuous stream of confidence scores about its own hardware state.

### 2. The Level 1 (Task/VLA Layer) Gaps

**The problem:** the "semantic-to-spatial" gap.

- **Affordance grounding:** VLMs are great at saying "pick up the cup," but they are notoriously bad at geometric precision. ARCH uses pose estimation for this, but if your robot's height changes (e.g., it's on a 4-legged base vs. a 3-wheeled base), the "pixel-to-world" mapping in the VLM's head breaks.
- **The context length gap:** in long-horizon tasks (the "H" in ARCH), VLMs tend to forget the early steps of a 20-step assembly process (the "AI amnesia" problem).

### 3. The Level 2 (Skill Library) Gaps

**The problem:** the "action space alignment" problem.

- **The universal action head:** this is the biggest gap. If you have a single `Grasp` skill, it must output a control vector. On Robot A (wheels), "forward" means `Velocity(x, y)`. On Robot B (legs), "forward" means a complex `Gait_Sequence(q1...q12)`.
- **The coordination gap:** your framework treats "self-ID" as a parameter fed into the skill. But inter-limb coordination is harder. If a robot has two arms, the "grasp" skill needs to know if the other arm is currently balancing the body or helping with the grasp. Your modular approach risks making the arms "blind" to each other.

### 4. The Level 3 (Watchdog Layer) Gaps

**The problem:** "drift vs. noise" discrimination.

- **Sudden vs. gradual shift:** a watchdog that re-triggers on a "discrepancy" might be too sensitive. In real-world environments, shadows, moving people, or changing floor surfaces (carpet to tile) look like "morphology changes" to a simple vision-based watchdog.
- **The recovery gap:** triggering a "self-ID" mid-task is dangerous. If the robot is holding a heavy object and a motor fails, a "wiggle" to recalibrate might drop the object. You need asynchronous calibration: the robot learns while it works, without needing to stop for a dedicated wiggle.

### 5. The "Glue" Gaps (The Integration Problem)

Even if every layer is perfect, the interface between them often fails:

1. **Sim-to-real fidelity:** most SOTA (including ARCH) is trained in simulation. The contact-rich physics of ARCH are incredibly hard to transfer because simulators don't model the "squishiness" of real robotic grippers or the microscopic vibration of motors.
2. **Latency compounding:** by the time the watchdog detects a drift, the VLM decomposes a task, and the skill library calculates a motor pulse, the robot has already fallen over or crashed. In high-precision assembly, 10ms is the lifetime of a movement.

### Summary Table: How to Plug the Gaps

| Layer | The gap | The 2026 solution |
|---|---|---|
| **Identity** | Dynamics (mass/friction) are hidden. | **Online SysID:** continual estimation during task execution. |
| **Task** | VLMs lack 3D spatial awareness. | **3D foundation models:** using point clouds instead of just pixels. |
| **Skill** | Action space mismatch. | **Latent action space:** mapping all robots to a "virtual end-effector" space. |
| **Watchdog** | False positives (noise). | **Bayesian surprise:** only re-trigger if the error exceeds the expected noise floor. |
