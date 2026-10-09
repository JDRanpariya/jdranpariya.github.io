---
title: neuro-inspired ai
published: 2026-09-18
lastUpdated: 2026-10-09
tags: [research, neuroscience, AI]
status: published
section: writings
layout: layouts/post.njk
description: How do nervous systems learn, remember and adapt, and how can we use principles behind them to build better AI and Physical AI?
---

My [broader interest](https://research.jdranpariya.com) is reverse-engineering intelligence to build better physical AI systems.

I want to understand how brains learn, remember and reorganize well enough to separate portable computational principles from biology, and to test which of them improve artificial systems.[^direction] (The other side, intelligence in cells, tissues and bodies beyond the brain, is in [diverse intelligence].)

- I am interested in evolutionary development of nervous systems, from precursors (e.g. single-celled organisms and sea sponges)[^precursors] to nerve nets in jellyfish to flatworms, fruit fly and human brain.

- I want to investigate how memory, learning, reasoning, decision-making, behavior, and adaptation emerge from interactions among neural structure, physical substrate, epigenetics, development, embodiment, and accumulated experience.

- I am especially interested in long-term episodic and semantic memory, continual and lifelong learning, sleep and offline consolidation, knowledge representation, world models, local learning rules, dynamic structural plasticity, metacognition, curiosity, goal-directed behavior, habit formation, self-modification, self-repair, and coordination among these processes.

I had an epiphany when reading *Why We Sleep*:[^whywesleep] while learning a physical skill like basketball, errors during waking practice may mark relevant neural circuits through hormonal or neuromodulatory processes. During sleep, those circuits may be reactivated, and part of the learning and consolidation may occur through that offline processing. How much of learning happens in sleep vs in awake state?

I believe that understanding sleep may help answer important questions about episodic memory, long-term memory, and lifelong or continual learning. I want to investigate what is replayed during sleep, how experiences are selected, how memories are strengthened, transformed, integrated, compressed, or forgotten, and how offline processing changes future learning and behavior.

This also connects to structural plasticity and development. I want to understand how neural circuits change over time, including how connections form, strengthen, weaken, reorganize, or disappear. Developmental periods such as adolescence, when substantial pruning and reorganization occur, may offer clues about how an intelligent system can revise its own structure as it gains experience. I am interested in whether artificial systems could use related principles for bounded growth, specialization, reuse, pruning, self-modification, and self-repair across a lifetime.[^ann-structure]

Another question that strongly interests me is how compression happens in the brain. Schmidhuber's work on compression[^compression] and my own beliefs influenced me. As I gain knowledge, I often feel that my mind discovers patterns that allow information to be represented more compactly while retaining meaning and creating more connections across ideas. This is especially noticeable in language, which is also the medium in which I think.[^language] New knowledge does not simply seem to occupy more space. It may reorganize earlier knowledge, expose shared structure, and make multiple ideas easier to connect. I want to understand whether this intuition corresponds to known mechanisms in neuroscience and can inform design of artificial architectures.

Recently, Sakana AI released the [PC-ALM](https://pub.sakana.ai/pc-alm/) paper on local learning rules, which is interesting.[^pcalm] It is one example of a wider design space in which researchers are questioning whether learning must depend on standard global backpropagation and exploring mechanisms that may be more local, adaptive, efficient, or biologically plausible. I want to evaluate such mechanisms by what they actually contribute rather than by how closely they resemble biology.

I also want to examine areas often described as limitations or open challenges in AI (e.g. generalization, robustness, data efficiency, causal learning, reasoning, interpretability, energy efficiency, multimodal learning, and continual adaptation). I want to establish what current systems can already do, where they still fail, under which conditions those failures appear, and whether the remaining limitations arise from data, objectives, architectures, learning rules, memory, coordination, embodiment, or computational substrate.

The central translation question is which biological mechanisms represent portable computational principles, which are consequences or limitations of biological implementation, which can be realized in simulation, and which may depend on different hardware or substrates.

The eventual goal is to develop AI architectures and systems that learn, remember, reason, adapt, reorganize experience, and improve across a lifetime while retaining the scale and capabilities of modern machine intelligence. I have had many intuitions and personal epiphanies around these questions. I now want to turn them into a serious research program and bring the strongest ideas into the world.

A few adjacent groups working in similar fields:

- [Grewe Lab | ETHZ](https://grewelab.org/research/bio-inspired-ai)
- [Sakana AI](https://sakana.ai/)
- [Lossfunk](https://lossfunk.com/) → Unfortunately, most of their work is concentrated around LLMs and current ML, with much less on the broader foundational topics I care about. Research questions also often feel more like gaps from recent papers than questions built from first principles. :(

[^direction]: NeuroAI also runs in the other direction: using AI models to understand nervous systems. I have done some of that too, modeling the motor neuron sequences behind the *Drosophila* larva's escape reflex with spiking neural networks.

[^precursors]: Sponges have no neurons, but they carry many of the genes for synaptic proteins. Some single-celled organisms, such as *Paramecium*, already fire action-potential-like electrical signals. The machinery came before the nervous system.

[^whywesleep]: The book makes stronger claims than the evidence supports, including that learning truly happens only during sleep, and some of its claims have been publicly criticized. The core idea, that offline replay shapes what gets consolidated, has solid support in work on hippocampal replay and targeted memory reactivation.

[^ann-structure]: Artificial neural networks usually learn by reweighting a fixed architecture chosen in advance, then stop learning once deployed. There are exceptions, such as topology evolution (NEAT), growing networks (cascade-correlation, progressive networks) and dynamic sparse training that prunes and regrows connections (SET, RigL), but these are mostly training techniques, not lifelong self-reorganization.

[^compression]: Especially his formal theory of curiosity and creativity, in which an agent is driven by compression progress: finding data that becomes more predictable or compressible in ways it did not know before.

[^language]: People with aphasia can think, but aren't able to read, write, speak or understand. Thought and reasoning don't require language, even in humans.

[^pcalm]: PC-ALM (Augmented Lagrangian Predictive Coding) trains very deep networks using only layer-local dynamics while recovering backprop-aligned credit signals. It builds on predictive coding, which is also one of the candidate mechanisms for compression in the brain.