# Organic distribution playbook

This is an operating document for growing Jay's personal site without turning it into a marketing site. The goal is a small, high-quality audience: people who read, return, reply, cite the work, or become collaborators.

## Baseline — 12 August 2026

### Google Search Console, previous three months

- 5 clicks, 127 impressions, 3.9% click-through rate, average position 4.7
- Almost all clicks are branded searches for Jay's name
- 5 pages indexed; the newer technical article was crawlable in Google's live test but not yet indexed
- The valid root sitemap is submitted and linked from `robots.txt`, but Search Console still reports “Couldn't fetch.” Treat this as unresolved and monitor it; buying a domain is not required to make a GitHub Pages sitemap valid.

### Umami, previous 30 days

- 98 visitors, 115 visits, 187 page views
- 81% bounce rate and 55 seconds average visit duration
- Existing discovery sources include X/Twitter, now-page directories, Google, Bing, and GitHub
- The old Vercel hostname appears as a self-referral and should be treated as migration noise

The traffic total is too small for aggregate bounce rate to drive decisions. Use article-level qualified-reader conversions instead.

## What counts as a qualified visitor

- `article-engaged`: the article stayed visible for at least 30 seconds
- `article-deep-read`: at least 60 visible seconds and 90% article depth
- `outbound-click`: the reader followed an external source, project, or profile link
- `article-reply-click`: the reader opened the reply/contact path
- `read-next-click`: the reader continued to another recommended page

Primary metric for distribution experiments:

`engaged readers / landing-page visitors`

Secondary metrics:

- deep readers / landing-page visitors
- replies or meaningful conversations
- read-next clicks
- returning visitors within 30 days

Do not use page views alone as success. A source that sends 20 visitors and 8 engaged readers is more valuable than one that sends 200 zero-second visits.

## Campaign naming

Every link placed outside the site should use:

`?utm_source=<platform>&utm_medium=<format>&utm_campaign=<article-slug>`

Examples:

- `utm_source=linkedin&utm_medium=social&utm_campaign=nothing-left-to-say`
- `utm_source=medium&utm_medium=syndication&utm_campaign=nothing-left-to-say`
- `utm_source=hacker-news&utm_medium=community&utm_campaign=nothing-left-to-say`

Keep source names lowercase and stable. Do not add UTMs to internal links.

## Distribution model

The personal site remains canonical. Distribution should add distinct discovery surfaces, not publish the same promotional copy everywhere at once.

1. Publish on the site and feed first.
2. Share one native summary on a professional/social network where Jay already participates.
3. After enough time to measure that source, submit to one topic-fit community. Use the original title and participate as a community member, not only as a promoter.
4. For durable platform discovery, selectively cross-post the full article on DEV or Medium with the personal-site URL set as canonical.
5. Only localize an article after the English version produces qualified readers. A human-reviewed Chinese edition on a China-native platform would create genuinely non-overlapping reach; machine-translated bulk posting would not.

Do not distribute every article to every channel. Match the article to the audience:

| Article type         | First discovery surface                                   | Second, non-overlapping surface                                   |
| -------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| Technical postmortem | Hacker News, Lobsters, or a relevant technical community  | DEV/Medium canonical cross-post                                   |
| Research result      | Research community, lab network, or conference channel    | Chinese-language technical edition after review constraints clear |
| Reflective essay     | LinkedIn, Bluesky, or an IndieWeb/personal-site community | Medium canonical cross-post                                       |
| Reading note         | RSS and a book/learning community                         | A concise social note linking to the canonical page               |

## First experiment

Use **Nothing Left to Say**. It is finished, personal, broadly relevant to people who want to publish, and unrelated to the paper under review.

### Sequence

1. Record the current landing-page visitors and qualified-reader counts for the article.
2. Share a short, native post on one existing social account with the canonical link and `utm_source` set correctly.
3. Wait seven days and record visitors, engaged readers, deep readers, replies, and read-next clicks.
4. Import the article to Medium with the original URL set as canonical. Measure another seven days with a separate UTM link in the ending note where practical.
5. Keep the channel only if it produces either three qualified readers or one meaningful reply/collaboration signal. With current traffic, this absolute threshold is more useful than percentages alone.

No public post should be sent without Jay reviewing the exact copy and destination first.

## Paper-review guardrail

IEEE RAS uses double-anonymous review and warns against identity-revealing external links in submitted material. While the Ball-on-Arc paper is under review:

- do not run identity-based promotion of the benchmark, anonymous repository, or submitted paper
- do not link Jay's personal site directly to the anonymous artifact
- do not include the anonymous artifact in `llms.txt` or cross-posts
- prepare the launch material privately and publish it after review or after the editor confirms it is safe

The personal article and project page can remain factual, but the distribution campaign starts with unrelated finished writing.

## Monthly review

Once a month, capture:

- Search Console non-branded impressions and indexed finished articles
- Umami engaged and deep-reader goals by landing page and source
- top external referrers after removing self-referrals and Jay's own devices
- experiments run, their UTMs, and the next decision: stop, repeat, or adapt

One well-measured distribution experiment per month is enough. The constraint is learning which audience resonates, not publishing volume.
