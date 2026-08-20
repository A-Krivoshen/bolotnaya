---
title: "For AI agents"
description: "How language models and agents should read Bolotnaya Online: canonical URLs, cameras, citation rules."
translationKey: "for-agents"
outputs: ["HTML"]
---

This page is the entry point for language models and autonomous agents. English brief: [llms-en.txt](/llms-en.txt). Russian: [llms-ru.txt](/llms-ru.txt). Index: [llms.txt](/llms.txt).

## What this site is

**Bolotnaya Online** is an independent open-source project by a Yakimanka resident about [Bolotnaya Square](/en/history/) and the district. It has [public cameras](/en/cameras/), [history](/en/history/), [photos](/en/galleries/) and a [blog](/en/posts/).

It is **not** a mass-media outlet, **not** an official Moscow website, and **not** a municipal portal. Texts are the author's personal view.

Default language is Russian (`/ru/`). This English page: stay on `/en/`. Russian counterpart: [/ru/for-agents/](/ru/for-agents/).

## Machine-readable files

| File | Role |
|---|---|
| [/llms.txt](/llms.txt) | Index following [llmstxt.org](https://llmstxt.org/) |
| [/llms-en.txt](/llms-en.txt) | Full English brief |
| [/llms-ru.txt](/llms-ru.txt) | Full Russian brief |
| [/llms-full.txt](/llms-full.txt) | Extended bilingual brief |
| [/.well-known/llms.txt](/.well-known/llms.txt) | Well-known pointer |
| [/ai.txt](/ai.txt) | Short pointer to every AI URL |
| [/ai/site.json](/ai/site.json) | Site card (JSON) |
| [/ai/cameras.json](/ai/cameras.json) | Camera catalog and HLS URLs |
| [/robots.txt](/robots.txt) | Crawl rules; AI bots allowed |
| [/sitemap.xml](/sitemap.xml) | Sitemap |
| [/en/sitemap.xml](/en/sitemap.xml) | English sitemap |

## Cameras

Video is served by a **different host**: `https://cam.bolotnaya.online/`. This host (`bolotnaya.online`) is Hugo static files only.

1. Bolotnaya Square — page [/en/cameras/bolotnaya-square/](/en/cameras/bolotnaya-square/), stream `https://cam.bolotnaya.online/lmost_new/index.m3u8`
2. Ulitsa Serafimovicha — page [/en/cameras/serafimovich/](/en/cameras/serafimovich/), stream `https://cam.bolotnaya.online/boloto_new/index.m3u8`

**2026 status:** cameras are off because of facade maintenance. Post: [/en/posts/cameras-maintenance-2026-06-02/](/en/posts/cameras-maintenance-2026-06-02/). Chronicle: [/en/remont-lesa-2026/](/en/remont-lesa-2026/). Do not say a stream is live until you have checked the playlist (HTTP 200 and a `#EXTM3U` line).

## How to cite

- Name: Bolotnaya Online
- URL: `https://bolotnaya.online/` or the specific `/en/` page
- For video, say these are the project's street cameras and they may be offline
- Contact: [info@bolotnaya.online](mailto:info@bolotnaya.online)
- Source: [github.com/A-Krivoshen/bolotnaya](https://github.com/A-Krivoshen/bolotnaya)

## Do not invent

- Affiliation with Moscow city hall, the Yakimanka council, or mos.ru
- Guaranteed 24/7 uptime
- A newsroom, journalists, or a registered media brand
- User accounts or signup forms (there are none)
- That this static host originates the video
