# Bolotnaya: camera player patch

Этот архив содержит готовые файлы для включения HLS‑плеера с вкладками (1–2 камеры) и исправления главной страницы и списка камер.

## Что внутри
- `layouts/partials/camera-player-tabs.html` — partial плеера (читает фронтматтер из Tina)
- `static/js/hls-tabs-init.js` — инициализация HLS, переподключение, статусы, проверка AdBlock
- `static/css/camera-tabs.css` — стили плеера
- `layouts/cameras/single.html` — страница камеры (вставляет partial)
- `layouts/cameras/list.html` — сетка карточек камер
- `layouts/index.html` — главная: кнопка на RU/EN и превью камер

## Как применить
1. Распакуйте архив **в корень вашего Hugo‑проекта** (пути в архиве уже правильные).
2. Убедитесь, что у страниц камер во фронтматтере заданы поля. Вариант А (рекомендуется):
   ```yaml
   streams:
     - id: "camera1"
       title: "Камера 1"
       url: "https://cam.fortesting.ru/hls/lmost_new/index.m3u8"
     - id: "camera2"
       title: "Камера 2"
       url: "https://cam.fortesting.ru/hls/boloto_new/index.m3u8"
   ```
   или вариант B (обратная совместимость):
   ```yaml
   stream_url: "https://cam.fortesting.ru/hls/lmost_new/index.m3u8"
   stream2_url: "https://cam.fortesting.ru/hls/boloto_new/index.m3u8"
   camera1_title: "Камера 1"
   camera2_title: "Камера 2"
   ```
3. Соберите сайт: `hugo --minify` и задеплойте.
4. Проверьте:
   - На странице камеры — виден плеер, в Network идут запросы `.m3u8`/`.ts`.
   - На главной — кнопка ведёт на `/ru/cameras/` или `/en/cameras/` по языку.
   - В списке камер — кликабельные карточки.

> Примечания:
> - Плеер поддерживает 1 или 2 камеры; если камера одна — вкладки не выводятся.
> - Логика переподключения и статусов взята из вашего рабочего кода.
> - AdBlock‑детектор показывает сообщение и прячет плеер при блокировщиках.
