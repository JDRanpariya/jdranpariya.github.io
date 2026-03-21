---
title: "Article Summarizer"
description: "A web app for summarizing articles by pasting text or providing a URL, powered by Hugging Face Transformers."
image: "/assets/images/projects/article_summarizer.jpg"
url: "https://github.com/jdranpariya/Article_Summarizer.git"
tech: ["Next.JS", "Django", "Hugging face", "Tailwind CSS", "GraphQL"]
status: "active"
published: 2025-09-24
lastUpdated: 2026-03-21
layout: layouts/post
tags: ["tech"]
---


## Overview
- [Project Link](https://github.com/jdranpariya/article_summarizer)

Tech Stack
* Frontend: Next.js, Tailwind CSS
* Backend: Django, GraphQL, SQLite
* AI: Hugging Face Transformers
 
Notes
* Summarization uses facebook/bart-large-cnn locally — responses are slow 
  without a GPU. This is expected, not a bug.
* Built as a learning project to explore full-stack development with a 
  Django/GraphQL backend and Next.js frontend.
 
Future Directions
* Add a job queue so summarization runs asynchronously
* Deploy affordably long-term (GPU requirement makes this tricky)
* Extend into multi-perspective article discussion via LLMs

