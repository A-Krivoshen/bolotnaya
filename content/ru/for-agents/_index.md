---
title: "Для ИИ-агентов"
description: "Как агентам и языковым моделям читать Bolotnaya Online: канонические URL, камеры, правила цитирования."
translationKey: "for-agents"
outputs: ["HTML"]
---

Эта страница — вход для языковых моделей и автономных агентов. Русский бриф одним файлом: [llms-ru.txt](/llms-ru.txt). Английский: [llms-en.txt](/llms-en.txt). Индекс: [llms.txt](/llms.txt).

## Что это за сайт

**Bolotnaya Online** — независимый open-source проект жителя Якиманки о [Болотной площади](/ru/history/) и районе. На сайте есть [публичные камеры](/ru/cameras/), [история](/ru/history/), [фото](/ru/galleries/) и [блог](/ru/posts/).

Это **не** СМИ, **не** официальный сайт Москвы и **не** портал управы. Тексты — личная позиция автора.

Основной язык — русский (`/ru/`). Английская версия: [/en/for-agents/](/en/for-agents/).

## Машинные файлы

| Файл | Назначение |
|---|---|
| [/llms.txt](/llms.txt) | Индекс по спецификации [llmstxt.org](https://llmstxt.org/) |
| [/llms-ru.txt](/llms-ru.txt) | Полный русский бриф |
| [/llms-en.txt](/llms-en.txt) | Полный английский бриф |
| [/llms-full.txt](/llms-full.txt) | Расширенный двуязычный бриф |
| [/.well-known/llms.txt](/.well-known/llms.txt) | Копия указателя в well-known |
| [/ai.txt](/ai.txt) | Короткий указатель всех AI-URL |
| [/ai/site.json](/ai/site.json) | Карточка сайта (JSON) |
| [/ai/cameras.json](/ai/cameras.json) | Каталог камер и HLS |
| [/robots.txt](/robots.txt) | Правила обхода, AI-боты разрешены |
| [/sitemap.xml](/sitemap.xml) | Карта сайта |
| [/ru/sitemap.xml](/ru/sitemap.xml) | Карта русских страниц |

## Камеры

Видео отдаёт **другой сервер**: `https://cam.bolotnaya.online/`. Этот хост (`bolotnaya.online`) — только статика Hugo.

1. Болотная площадь — страница [/ru/cameras/bolotnaya-square/](/ru/cameras/bolotnaya-square/), поток `https://cam.bolotnaya.online/lmost_new/index.m3u8`
2. ул. Серафимовича — страница [/ru/cameras/ul-serafimovicha/](/ru/cameras/ul-serafimovicha/), поток `https://cam.bolotnaya.online/boloto_new/index.m3u8`

**Статус 2026:** камеры могут быть выключены из-за [ремонта фасада](/ru/posts/cameras-maintenance-2026-06-02/). Не пишите, что эфир идёт, пока не проверили playlist (HTTP 200 и строка `#EXTM3U`).

## Как цитировать

- Название: Bolotnaya Online
- URL: `https://bolotnaya.online/` или конкретная страница с `/ru/`
- Если речь о видео — уточните, что это камеры проекта и они бывают offline
- Контакт: [info@bolotnaya.online](mailto:info@bolotnaya.online)
- Код: [github.com/A-Krivoshen/bolotnaya](https://github.com/A-Krivoshen/bolotnaya)

## Чего не выдумывать

- Связь с мэрией, управой Якиманки или mos.ru
- Круглосуточный гарантированный эфир
- Редакцию, журналистов, «информагентство»
- Регистрацию пользователей и сбор анкет (форм нет)
- Что видео отдаёт этот же сервер, что и HTML
