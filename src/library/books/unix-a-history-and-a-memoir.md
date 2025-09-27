---
title: "UNIX: A Memoir"
fullTitle: "UNIX: A History and a Memoir"
author: "Brian W Kernighan "
cover: "https://m.media-amazon.com/images/I/61Z89RDXiiL._SY522_.jpg"
link: "https://www.amazon.de/UNIX-History-Memoir-Brian-Kernighan/dp/1695978552"
section: "books"
tags: ["unix", "research", "science"]
published: 2025-09-28 
last_updated: 2025-09-28 
layout: layouts/post.njk
description: "It's great book about rise and fall of research at AT&T and Unix."
---

Currently it's rough bookmarks, I'm working on providing insights kind of notes where I tag paras with what I learned form it.

## Notes

For now, it seems to me that Unix owes its success to an accidental combination of factors: two exceptional people, an excellent supporting cast, talented and enlightened  management, stable funding in a corporation that took a very long view, and an unfettered environment for exploration no matter how unconventional. Its adoption was facilitated by rapidly advancing technology where hardware kept getting smaller, cheaper and faster at an exponential rate.
 
Bell Labs was responsible for a remarkable number of scientific and technological advances that changed the world. Foremost among them was the transistor, invented in 1947 by John Bardeen, Walter Brattain and William Shockley, who were trying to improve amplifiers for long-distance telephone circuits. The transistor resulted from fundamental research into the properties of semiconductor materials, driven by a need for devices that would be more physically robust and less energy-hungry than vacuum tubes, which in the 1940's were the only way to make communications equipment and, incidentally, to build the earliest computers.

Other major inventions included negative feedback amplifiers, solar cells, lasers, cell phones, communications satellites and charge-coupled devices (which make the camera in your phone work).

AT&T spent about 2.8 percent of its revenues on research and development, with about 0.3 percent on basic research.

Stable funding was a crucial factor for research. It meant that AT&T could takealong-term view and Bell Labs researchers had the freedom to explore areas that might not have a near-term payoff and perhaps never would. That’s a contrast with today’s world, in which planning often seems to look ahead only a few months, and much effort is spent on speculating about financial results for the next quarter.

Another part of the Bell Labs mission was to develop a deep mathematical understanding of how communications systems worked. The most important result was Claude Shannon’s creation of information theory, which was in part motivated by his study of cryptography during World War II. His 1948 paper “A Mathematical Theory of Communication,” published in the Bell System Technical Journal, explained the fundamental properties and limitations on how much information could be sent through a communications system

*When I got to Bell Labs as a permanent employee in 1969, no one told me what I should work on. This was standard practice: people were introduced to other people, encouraged to wander around, and left to find their own* CHAPTER 1: BELL LABS 17 Figure 1.8: Shen Lin, ∼1970 (Courtesy of Bell Labs) research topics and collaborators. In retrospect, this seems like it must have been daunting, but I don’t recall any concern on my part. There was so much going on that it wasn’t hard to find something to explore or someone to work with, and after two summers I already knew people and some of the current projects. This lack of explicit management direction was standard practice.

**I don't like the hierarchy the bell labs was having for people and having designations which might lead to more responsibility in areas and waste of time. But best thing I can think of is peer group. Like damn man.**

A person who did great work in a narrow field might well be ranked highly by his or her immediate management, but no one further up would likely know of the work. Interdisciplinary work, on the other hand, stood out at higher levels because more managers would have seen it. The broader the collaborations, the more managers would know about it. *The end result was an organization that strongly favored collaboration and interdisciplinary research.* And because the managers who made the decisions had come up through the same process, they were inclined in the same direction

As Doug McIlroy said, “Collegiality was the genius of the system. Nobody’s advancement depended on the relationship with just one boss.”

They tried creating Multics and it was over-engineered **Don't over-engineer, keep it simple.** Unix was created in part as a reaction to the complexity of Multics.

First version of a Unix was created in 3 weeks by Ken Thompson. He was one of the three people who invented GO Programming.

Bell Labs after bad time with MultiCS weren't ready to spend on PDP-10 or 11. But after sometime it was decided they PDP 11 will be used to patents and Ken team will write programs that will match certain printing requirements of the patent department.

After the success, they were given another PDP-11. Can't imagine it could have costed them $65k for that and PDP-10 was around half a million.

So this new PDP-11 Became the first edition of Unix.

Dennis Ritchie explaining his career path
> “My undergraduate experience convinced me that I was not smart enough to be a physicist, and that computers were quite neat. My graduate school experience convinced me that I was not smart enough to be an expert in the theory of algorithms and also that I liked procedural languages better than functional ones.”


Resources
- https://www.youtube.com/playlist?list=PLZ4JlAKnv386oUwfilOo4Qbsnf4_v5zeo
- https://community.cadence.com/cadence_blogs_8/b/breakfast-bytes/posts/why-you-shouldn-t-trust-ken-thompson
- https://mananshah99.github.io/blog/2020/07/01/trusting-trust/

Research Papers
- https://www.cs.princeton.edu/people/profile/bwk



