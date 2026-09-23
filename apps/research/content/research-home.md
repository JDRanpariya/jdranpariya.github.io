# information, compression and learning dynamics

I'm interested in understanding and reverse engineering intelligence to build better robots. Intelligence is very hard to define, but I like Levin's idea of [diverse intelligence](https://www.youtube.com/watch?v=Or_3tlEOLj4).

Anything you can formalize can be simulated, and substrate only matters for cost: energy, time, parallelism, and noise tolerance. _A mechanism carries over if the constraint that made it worthwhile still holds on the new substrate._

We need our agents to be good enough!

> Finite agents must "satisfice" because true optimization is computationally impossible in the real world.
> — Simon

## Embodied intelligence and control {#embodied-intelligence-control}

What separates a physically intelligent system from a robot that runs an AI model? How should language, reasoning, planning, skills, control, and reflexes work together instead of being treated as a one-way stack? What computation should happen in the body itself, and when do compliance, passive dynamics, actuation, and morphology reduce what a controller has to learn? How should vision, touch, proprioception, and action be coupled, and which sensorimotor loops should stay fast and local?

## Learning, simulation, and world models {#learning-simulation-world-models}

How can an agent learn useful skills with far less real-world data? What should come from demonstration, simulation, exploration, or practice on hardware? What does an embodied agent actually need to predict to act well, and how should video models, physics models, digital twins, and real experience meet? How can a system notice that its model of the world or its own body is wrong?

## Continual learning and memory {#continual-learning-memory}

How can a system keep learning after deployment without forgetting old skills or growing without bound? What should be learned end to end, and what should be handled by local learning rules or fixed structure? What should be replayed, compressed, integrated, or forgotten when an agent is offline, and can errors during physical practice decide what gets consolidated? Can a system reorganize, specialize, prune, reuse, and repair its own structure as its experience changes?

## Computation in biology and physics {#computation-biology-physics}

Can morphogenesis, regeneration, and cell collectives be understood as computation? What are the thermodynamic limits of computation and learning, and why can a brain run on 20 W? Which biological mechanisms are portable computational principles, and which are consequences of biological constraints? What can engineering copy, what should it discard, and where can designed systems do better?

## Energy and civilization {#energy-civilization}

Is the next major leap in civilization constrained by how much energy we can harness and direct? What would abundant energy make possible for manufacturing, research, and AI, and what would it take to move industry away from oil and finite resources?
