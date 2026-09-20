export type ResearchTheme = {
  slug: string;
  title: string;
  questions: string;
  links?: string[];
};

export const researchThemes: ResearchTheme[] = [
  {
    slug: "physical-intelligence",
    title: "Physical intelligence",
    questions:
      "What separates a physically intelligent system from a robot that runs an AI model? How should language, reasoning, planning, skills, control, and reflexes work together instead of being treated as a one-way stack?",
  },
  {
    slug: "embodiment-morphology-materials",
    title: "Embodiment, morphology, and materials",
    questions:
      "What computation should happen in the body itself? When do compliance, passive dynamics, actuation, and morphology reduce what a controller has to learn? Can a body help a machine adapt, repair itself, and degrade gracefully?",
  },
  {
    slug: "perception-action-control",
    title: "Perception, action, and control",
    questions:
      "How should vision, touch, proprioception, and action be coupled? Which sensorimotor loops should stay fast and local, and which should involve learned policies, world models, or deliberate reasoning?",
  },
  {
    slug: "learning-from-physical-interaction",
    title: "Learning from physical interaction",
    questions:
      "How can an agent learn useful skills with far less real-world data? What should come from demonstration, simulation, exploration, or practice on hardware, and how should learning continue after deployment?",
  },
  {
    slug: "simulation-world-models",
    title: "Simulation and world models",
    questions:
      "What does an embodied agent actually need to predict to act well? How should video models, physics models, digital twins, and real experience meet? How can a system notice that its model of the world or its own body is wrong?",
  },
  {
    slug: "memory-sleep-consolidation",
    title: "Memory, sleep, and consolidation",
    questions:
      "What should be replayed, compressed, integrated, or forgotten when an agent is offline? Can errors during physical practice decide what gets consolidated, and can this produce better motor learning and continual adaptation?",
  },
  {
    slug: "plasticity-lifelong-learning",
    title: "Plasticity and lifelong learning",
    questions:
      "How can a system keep learning without forgetting old skills or growing without bound? Can it reorganize, specialize, prune, reuse, and repair its own structure as its experience changes?",
  },
  {
    slug: "learning-rules-architecture",
    title: "Learning rules and architecture",
    questions:
      "What should be learned end to end, and what should be handled by local learning rules or fixed structure? Can parallel processes and hardware-software co-design produce architectures that are more efficient, robust, and adaptable?",
  },
  {
    slug: "intelligence-without-neurons",
    title: "Intelligence without neurons",
    questions:
      "Can morphogenesis, regeneration, and cell collectives be understood as computation? This attacks the question of what computation is and how intelligence emerges more directly than brains do; brains are the complicated case.",
  },
  {
    slug: "physics-of-learning",
    title: "The physics of learning",
    questions:
      "What are the thermodynamic limits of computation and learning? Why can a brain run on 20 W, and what is the minimum energy per bit learned? This joins energy to information and compression without needing biology.",
  },
  {
    slug: "biology-intelligent-design",
    title: "Biology and intelligent design",
    questions:
      "Which biological mechanisms are portable computational principles, and which are consequences of biological constraints? What can engineering copy, what should it discard, and where can designed systems do better?",
  },
  {
    slug: "energy-civilizational-capacity",
    title: "Energy and civilizational capacity",
    questions:
      "Is the next major leap in civilization constrained by how much energy we can harness and direct? What would abundant energy make possible for manufacturing, research, and AI, and what would it take to move industry away from oil and finite resources?",
  },
];
