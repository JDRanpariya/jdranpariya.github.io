---
title: "Tardigrade"
fullTitle: "Tardigrade: A Palm-Sized Quadruped"
description: "A full-stack physical AI project — from custom brushless actuators and PCB design to sim2real reinforcement learning — inspired by nature's most indestructible micro-animal."
image: "/assets/images/projects/tardigrade.png"
url: "https://github.com/jdranpariya/tardigrade"
tech: ["Robotics", "BLDC/FOC", "PCB Design", "CAD", "RL", "Sim2Real", "MuJoCo", "World Models"]
status: "active"
published: 2026-05-01
lastUpdated: 2026-05-24
layout: layouts/post
section: "projects"
tags: ["robotics", "AI", "simulation"]
hasInteractive: true
---

Tardigrade is a palm-sized 4-legged robot in the KT2 form factor — custom brushless actuators, learning-based control, and everything in between. With learning based behaviours at core instead of scripted behaviours. The robot should figure things out, build a repertoire of skills, respond to higher-order commands.

I found the KT2 demo on Twitter, couldn't stop myself staring at it, felt so cool but got a sigh when I learned it's using scripted behaviours. I wanted to do an action figure type open-source humanoid inspired by [Asimov](https://github.com/asimovinc), because I don't have 20k to spare. And at the same time idea clicks why not build something simpler like kt2, something like Asimov at action figure scale is more complex than it looks, so I decide to for kt2 form factor — it can do cool things while still helping me build the skillset. Although it might sound simple, there are grave challenges in deployment of policies on such tiny form factor.

My aim is to get a foundational understanding of layers in the physical AI stack. I want to rebuild it from scratch, understand every layer, and replace the scripted behaviours with something that actually *learns* like how animals and insects figure things out on their own.

## Why Build This

This is the new fullstack. Every layer is something I either want to learn or get significantly better at:

- **Actuators** — very hyped to learn more and build from scratch, yeah firmware and low level control included
- **PCB design** — quite some time I want to get my hands dirty on this
- **CAD design** — I've worked a bit with Onshape and liked it, now I want to improve it even further
- **FEA and CFD** — sounds cool to explore, always wanted to learn how they do this in aerodynamics and maybe we also make our Tardy learn to swim (would be fun to do structural analysis) :)
- **System identification** — I've partially done this but want to get a better idea of it
- **Simulation** — I've worked on this but there exists a plethora of things I still haven't figured out, particularly making USD and MJCF properly
- **Learning** — sim2real, world models, and downstream behaviours would be interesting to play with once I have foundations set up

## Body Shell — 3D Model

::: interactive model-viewer
src: /assets/models/tardigrade_body.glb
height: 400
autoRotate: true
caption: "Tardigrade body shell. Drag to rotate, scroll to zoom. <a href='https://cad.onshape.com/documents/1048d89a61f1e858e3ba4a97/w/b1b85f1b31fcbb5d2b3978c3/e/679b13b860959ffe0e6c071e' target='_blank' rel='noopener'>View on Onshape →</a>"
:::

## Architecture

| Layer | Purpose |
|---|---|
| Electrical — Actuator | FOC driver PCB (KiCad) |
| Electrical — Mainboard | ESP32 main board |
| Mechanical — Actuator | Motor housing, gearbox CAD |
| Mechanical — Body | Frame, legs, feet |
| Firmware — STM32 | FOC controller per actuator |
| Firmware — ESP32 | Main control loop, comms, safety |
| Simulation — Model | MJCF + meshes |
| Simulation — Envs | Gymnasium environments |
| Training | RL training scripts + configs |
| Deployment | Policy → weights → MCU inference (C) |

## Key Design Decisions

**Custom actuators over off-the-shelf servos.** Torque and velocity control matter for learning-based policies. FOC-driven BLDC motors give direct torque control and other ways of operating mode and hopefully silent.

**Learning over scripting.** Scripted gaits are brittle. An animal doesn't have a lookup table for every terrain — it has a nervous system that adapts. The robot should build a repertoire of skills through interaction, not through my engineering effort.

**Open source.** This is the kind of project where sharing the work multiplies its value. Documenting everything as I go.

## Status

Early-stage. Mechanical design underway in Onshape, project structure established, research into actuator design ongoing.

→ [GitHub Repository](https://github.com/jdranpariya/tardigrade)
