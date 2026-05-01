---
title: building different box of tools
published: 2026-02-15
lastUpdated: 2026-03-15
tags: ["skills", "life"]
section: "writings"
layout: layouts/post.njk
description: "Having different tools matters more than having superior ones."
readNext: "/library/books/surely-you-are-joking-mr-feynman/"
---

> If he's been trying the same thing for a week, and I'm trying it and can't do it, it ain't the way to do it!
>
> *— Feynman*

Article is inspired by the Feynman, he tells a story...

>I had learned to do integrals by various methods shown in a book that my high school 
physics teacher Mr. Bader had given me.
>
>One day he told me to stay after class."Feynman," he said, "you talk too much and 
you make too much noise. I know why. You're bored. So I'm going to give you a book. 
You go up there in the back, in the corner, and study this book, and when you know 
everything that's in this book, you can talk again."
>
>So every physics class, I paid no attention to what was going on with Pascal's Law or 
whatever they were doing. I was up in the back with this book: Advanced Calculus, by Woods. 
Bader knew I had studied Calculus for the Practical Man a little bit, so he gave me the 
real works - it was for a junior or senior course in college. 
It had Fourier series, Bessel functions, determinants, elliptic functions - all kinds of wonderful stuff I didn't know anything about.
>
>**That book also showed how to differentiate parameters under the integral sign** - 
it's a certain operation. 
It turns out that's not taught much in the universities; they don't emphasize it. 
**But I caught on how to use that method, and I used that one damn tool again and again.**
So because I was self-taught using that book, I had peculiar methods of doing integrals.
>
>The result was, when the guys at MIT or Princeton had trouble doing a certain integral, 
it was because they couldn't do it with the standard methods they had learned in school. 
If it was contour integration, they would have found it; if it was a simple series expansion, 
they would have found it. Then I come along and try differentiating under the integral sign, 
and often it worked. **So I got a great reputation for doing integrals, only because my box of 
tool was different from everybody else's, and they had tries all their tools on it before giving 
the problem to me.**
>
>In Chicago, when I went to gather information on problems they were working on. When
the guy was explaining a problem, I said, "why don't you do it by differentiating under
the integral sign?". **In half and hour he had it solved, and they had been working on it for 3 months!**

---------

For all I know Reputation and Time both are of great importance to a men. I've heard cases of this
before and some personal experience as well. I believe it's important to spend sometime
thinking and reflecting about how can we build a set of toolbox that gives you edge in all
areas of your life not just career. This is my attempt to do so. It's important to understand 
that it's personal, me showing mine or feynman telling his doesn't mean you would be able to
relate and apply them in your life, It would be great pleasure if reading this makes you
think about how to approch this problem.

### Coding Error

I've a colleuge who tried to run code from the youtube tutorial but failed, it was a small repo 
but error was generic `Class Robot has no method from_url`. I told him there is no way tutorial 
doesn't work. I tried it myself and got the same error. Given my computer science background and
understanding of git and codebases, I just looked up the code for class in the git repo, in the comments and
documentation they had mentioned the use of `from_url` method but wasn't implemented. So I searched around
in the code base and found a file which mentioned other way of doing the same thing, and it worked. I looked back
at youtube video comments and found that rolling out older version also works.
1. **you can be little more curious and find easy fixes(like in comments).**
2. **Having deeper understanding and being thorough gives you an edge.**

### Building Heuristics via analogy

“Don’t you know how to square numbers near 50?” he says. “You square 50—that’s 2500—and subtract 100 times the difference of your number from 50 (in this case it’s 2), so you have 2300. If you want the correction, square the difference and add it on. That makes 2304.”

Later, Feynman talks about squaring the number 28. I stopped reading right there and tried to do it in my head, figuring that if for 50 he is subtracting 100, maybe it's about subtracting double the number, and you should have a similar rule for numbers near 30 or any other number. So I tried it for 28: you square 30, get 900, and for 28 you subtract 60 times the difference, which is 120. Now we have 780. At this point I thought it should be around there, and accounting for 2², it's 784.

But the moment I looked into how Feynman did it, it wasn't the same. He figured out some other technique and said it should be between 700 and 800. Which is quite close, but I overflowed with joy when I realized that Feynman had developed a more complex method than just finding this generalizable pattern and trying to use it. Surprisingly, this way of doubling the nearest whole number and subtracting works for all numbers up to 100. I haven't tried beyond that, but it should work fine.

It turns out this works because it is just the algebraic identity (a − b)² = a² − 2ab + b², which I arrived at not through algebra but through analogy. I took a specific trick for 50, asked what the pattern behind it was, and extracted a rule that works for any round number.

**When you encounter a technique that works in one context, ask whether the underlying structure applies more broadly. Do not just learn the trick. Extract the principle. That is how you add tools to your box rather than just collecting isolated techniques.**





::: references
- [Surely you're joking Mr. Feynman!](https://www.goodreads.com/book/show/35167685-surely-you-re-joking-mr-feynman)
- https://jamesclear.com/feynman-mental-models
- https://fs.blog/mental-tools-richard-feynman/
- https://merriman.industries/build-your-own-tools/
:::
