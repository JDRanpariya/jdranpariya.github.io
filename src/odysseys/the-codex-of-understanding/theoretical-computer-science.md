---
title: Theoretical Computer Science
layout: layouts/post
section: "odyssey"
category: "Engineering & Computing"
description: "Working through the foundations of theoretical computer science (computability, complexity, formal proofs, and automata) from the ground up."
tags: ["tech", "science"]
hasMath: true
published: 2024-09-01
lastUpdated: 2024-09-01
---

## Resources

- [Great Ideas in Theoretical Computer Science | CMU](https://www.cs251.com/)
- [Theory of Computation | MIT](https://www.youtube.com/playlist?list=PLUl4u3cNGP60_JNv2MmK3wkOt9syvfQWY)
- [Information Theory](https://www.youtube.com/watch?v=BCiZc0n6COY&list=PLruBu5BI5n4aFpG32iMbdWoRVAA-Vcso6)
- [Undergrad Complexity | CMU](https://www.youtube.com/playlist?list=PLm3J0oaFux3YL5vLXpzOyJiLtqLp6dCW2)
- [CS Theory Toolkit at CMU](https://www.youtube.com/playlist?list=PLm3J0oaFux3ZYpFLwwrlv_EHH9wtH6pnX)
- Computational learning theory
- [Intro to CS | Harvard CS 121](https://introtcs.org/public/)
- *Introduction to the Theory of Computation* by Michael Sipser
- *The Nature of Computation* by Cristopher Moore and Stephan Mertens
- [Introduction to Theoretical Computer Science](http://www.introtcs.org/public/index.html) by Boaz Barak
- *Quantum Computing Since Democritus* by Scott Aaronson

## Great Ideas in Theoretical Computer Science

Formalizing computing.

### Introduction

- Computer science is the science of computation.
- Computation is manipulation of information.
- Algorithm is description of how the data/information is manipulated.
	- Computational problem is the input-output pairs.
- Role of the theoretical side:
	- Build mathematical model of computation.
	- Explore logical consequences to build new knowledge.
	- Look for interesting application.
- David Hilbert, 1900 → problems of [Mathematics](/odysseys/the-codex-of-understanding/mathematics/).
- Alan Turing defined a model of computation, showed it's equivalent to lambda calculus by Church.
- Church-Turing thesis: any computational problem that can be solved by any physical process can be solved by a Turing machine.
- Two main questions:
	- Computability of a problem.
	- Complexity of a problem in terms of time, space (memory), randomness, quantum resources: practical computability.
- Two camps:
	- Algorithm designers: trying to come up with efficient algorithms.
	- Complexity theorists: trying to show no efficient algorithm exists.
- [Millennium Problems](https://www.claymath.org/millennium-problems/)
- Algorithmic game theory, learning theory, quantum computation.

### Mathematical Reasoning and Proofs

- Simpler computer proofs.
- Zero knowledge proofs.
- Assumed truths → apply logical deductions → new/deduced truths, and cycle.
- Axioms → obvious/assumed truths.
- Problems with the old way of doing math:
	- What is obvious truth?
	- Can every mathematical theorem be derived from a set of agreed-upon axioms?
	- Infinity.
	- Russell's paradox: we need precise and unambiguous language.
- George Boole: inventor of propositional calculus.
- Gottlob Frege: lays the foundation for first order logic (predicate calculus), proposes axioms for set theory.
- Russell: *Principia Mathematica*.
- David Hilbert.
- Kurt Gödel: completeness and incompleteness theorems.
- Alan Turing: undecidability.
- Formal proofs: can be checked by computer, computer-assisted proofs.

### Strings, Encodings and Problems

- No-cloning theorem.
- How do we mathematically represent data/information?
- Information can be thought of as a physical property of an object, depending on the number of states it can be in.
- Alphabet → non-empty and finite set, denoted by $\sum$.
- Symbol/character → elements of alphabet.
- String/word → finite sequence of symbols from $\sum$.
- Today I realized we encode information of concepts like apple (through all sense and past memory) to a string "apple."
- What is an encoding scheme → a function, mapping from obj → string.
- Encoding → given a set A of objects, an encoding of elements of A is an injective function, A → $\sum$*.
- `<a>` → Enc(a)
- Encodable = countable.
- Alphabet doesn't matter as far as $\sum$ > 1.
- In TCS, there is only one type of data → string.

### Deterministic Finite Automata

- Computational model → allowed rules for information processing.
- Machine = computer = program = algorithm ← instantiation of a computational model.
- Assumptions:
	- No "universal machines."
	- We care only about decision problems, initially.
- General problem → decision problem.
- Any language that can be solved by a DFA is a regular language.
