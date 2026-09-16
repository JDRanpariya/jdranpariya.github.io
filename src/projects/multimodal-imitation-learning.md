---
title: "Multimodal Imitation Learning"
fullTitle: "Multimodal Imitation Learning via Hardware-Native Proprioception for Contact-Rich Manipulation"
description: "My master's thesis at Fraunhofer IIS, testing whether raw servo-bus signals improve imitation-learning policies for contact-rich SO-101 manipulation."
image: "/assets/images/projects/multimodal-imitation-learning.webp"
tech: ["PyTorch", "LeRobot", "SO-101", "Imitation Learning", "Proprioception"]
status: "active"
published: 2026-05-02
lastUpdated: 2026-09-16
layout: layouts/post.njk
section: "projects"
tags: ["robotics", "AI", "physical-ai"]
---

![The SO-101 workspace used for contact-rich peg-insertion experiments.](/assets/images/projects/multimodal-imitation-learning.webp)

My master's thesis at Fraunhofer IIS asks whether signals already available inside low-cost robot servos can improve imitation-learning policies during contact-rich manipulation.

## Research question

The SO-101's STS3215 servos expose current, load, and voltage readings through the motor bus. I use these readings as hardware-native proprioception and compare multimodal policies with vision-only baselines on a peg-insertion task.

## What I am working with

- SO-101 leader and follower arms
- contact-rich peg insertion on real hardware
- Action Chunking Transformer and Diffusion Policy
- raw servo-bus current, load, and voltage readings
- vision-only and multimodal policy comparisons
- phase-level failure analysis around contact and insertion

## Status

This is active thesis work. I will add the complete results and thesis after the work is public.
