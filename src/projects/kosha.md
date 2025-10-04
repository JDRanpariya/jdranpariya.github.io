---
title: "Kosha"
fullTitle: "Kosha: Personalized Content Streamer"
description: "Personal AI-powered content aggregator and recommender for articles, videos, podcasts, and research, learning your preferences over time."
image: "/assets/images/projects/lotus_2.jpg"
url: "https://github.com/jdranpariya/kosha.git"
tech: ["react", "python", "RAG", "RLFH", "open-source"]
status: "active"
published: 2025-10-03
lastUpdated: 2025-10-05
layout: layouts/post
tags: ["tech"]
---


## Overview
- [Project Link](https://github.com/jdranpariya/kosha)
- I'm still working on this page!!

I invite you to Explore the repo, try the setup, and suggest improvements,
contributions of any size are welcome.

## Motivation
I'm building Kosha to tame my curiosity, allowing me to process overwhelming flow
of information, not all is important but even fraction of what I'm interested in seems to be growing exponentially.

What I want is to have a system, where I can select sources of my information say 
youtube subscriptions, papers or articles on particular topic etc. then on daily or weekly
basis It prompts me with new content from all sources to consume in one place,
initially I would look through it manually and select some to study later
or add that as a part of learning curriculum. While AI model learns my preference[^1]
and after learning enough, it would do the content curation and tell me what would fency me.
or what could be of my interest related to project I'm working on (i.e via obsidian).

I also want to use Kosha to deeply understand how a full-stack application comes together,
while learning from and contributing alongside other open-source developers.


## Challenges
This section is for people interested in contributing, Kosha is a full stack project,
spanning infra, frontend, backend, ML and everything in between. There is something for everyone.
For me it's going to be crazy ride learning and integrating the entire system.

### Connectors

This is data aggregation layer, Idea is to have a plugin architecture in python,
to support easy additions and maintainance of connectors. The challenge is to design an 
efficient and scalable architecture.

### Backend

I plan to use FastAPI, to connect backend with database and orchestrate connector
calls. It also includes business logic and AI model integration. 

### Database

This layer has it's own complexities, we probably need more than one db, I chose postgres for 
storing user data. We'll need to decide where do we store content or embeddings, what 
should be the schema and how components interact.

### Intelligence

Currently for MVP, I start with simple preference based system based on likes or embeddings and RAG but
eventually want to move onto architecture that's suited for task of deeply understanding the reasoning behind
our choices and why. Instead of liking you would provide model your reasoning on why you find something interesting. Capturing
your curiosity evolve over time.

### Fronend
I am using React + Tailwind CSS with the aim of developing minimal, intuitive UI. I don't have much
experience with frontend, would be interesting to learn best practices from others.

### Infra
The Main focus right now is making it reproducible with docker compose, making it easier 
for new contributers to get started. In future, we'll explore DevOps and cloud scaling to support multiple users . 

Above all, I want to make it simple for people to understand the idea and contribute
to any part of the kosha they're interested in.

## What's with the Name?
On name kosha, it means a outer information layer in addition to 5 layers we have according to panchkosha.
I’m still exploring how best to convey the meaning and relevance of the name — or whether another might fit better.

I liked the name *Thalamus*, it has similar function of filtering the information in
brain but AI model I envision is doing more. Curation based on my evolving interest
and later I also want model to find the links between concepts and domains which I might miss, unique 
perspective.

[^1]:I don’t mean the usual “preferences” you see in recommender systems.
I’m talking about a model that actually learns how you think - your patterns, your worldview.
It knows why you like something, and when it recommends something new, it tells you why.
