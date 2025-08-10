document.addEventListener('DOMContentLoaded', function () {
  const containers = document.querySelectorAll('.camera-container[data-streams]');
  containers.forEach(container => {
    const streams = JSON.parse(container.getAttribute('data-streams') || '[]');
    const adblockMessage = container.querySelector('#adblock-message');

    // Построение вкладок и панелей
    const buttonsHost = container.querySelector('.tab-buttons');
    const tabsHost = container.querySelector('.tabs-host');

    streams.forEach((s, idx) => {
      const id = s.id || `camera${idx + 1}`;
      const title = s.title || `Camera ${idx + 1}`;
      const url = s.url;

      // Кнопки
      if (buttonsHost) {
        const btn = document.createElement('button');
        btn.className = 'tab-button';
        btn.dataset.tab = id;
        btn.textContent = title;
        buttonsHost.appendChild(btn);
      }

      // Панели
      const tabContent = document.createElement('div');
      tabContent.className = 'tab-content' + (idx === 0 ? ' active' : '');
      tabContent.id = id;

      const tabPane = document.createElement('div');
      tabPane.className = 'tab-pane';

      const video = document.createElement('video');
      video.id = `video_${id}`;
      video.setAttribute('controls', '');
      video.setAttribute('muted', '');
      tabPane.appendChild(video);

      const status = document.createElement('div');
      status.id = `status_${id}`;
      status.className = 'status';
      status.textContent = '—';
      tabPane.appendChild(status);

      tabContent.appendChild(tabPane);
      tabsHost.appendChild(tabContent);
    });

    // ======== Логика HLS, переподключения, статусы ========
    const hlsInstances = {};
    const errorStartTimes = {};
    const countdownIntervals = {};

    function updateCountdown(key) {
      const start = errorStartTimes[key] || Date.now();
      const elapsed = (Date.now() - start) / 1000;
      return Math.max(2 - elapsed, 0);
    }

    function checkStreamAvailability(url, callback) {
      const xhr = new XMLHttpRequest();
      xhr.open('HEAD', url, true);
      xhr.timeout = 5000;
      xhr.onload = () => callback(true);
      xhr.onerror = () => callback(false);
      xhr.ontimeout = () => callback(false);
      xhr.send();
    }

    function setupCamera(id, streamUrl) {
      const video = document.getElementById(`video_${id}`);
      const status = document.getElementById(`status_${id}`);
      const tabPane = video.parentElement;

      if (!streamUrl) {
        status.textContent = 'URL не задан';
        status.className = 'status error';
        return;
      }

      checkStreamAvailability(streamUrl, isAvailable => {
        if (!isAvailable) {
          status.textContent = 'Поток недоступен';
          status.className = 'status error';
          setTimeout(() => setupCamera(id, streamUrl), 2000);
          return;
        }

        if (window.Hls && window.Hls.isSupported()) {
          const hls = new Hls({
            liveSyncDuration: 2,
            maxBufferLength: 15,
            maxMaxBufferLength: 30,
            liveBackBufferLength: 5,
            maxFragLookUpTolerance: 0.2,
            highBufferWatchdogPeriod: 2,
            lowBufferWatchdogPeriod: 1,
            enableWorker: true,
            startFragPrefetch: true,
            backBufferLength: 90,
            fragLoadingTimeOut: 5000,
            manifestLoadingTimeOut: 5000,
            levelLoadingTimeOut: 5000
          });

          hls.loadSource(streamUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, function () {
            video.play().catch(() => {});
            status.textContent = 'Подключено';
            status.className = 'status connected';
            clearInterval(countdownIntervals[id]);
            delete errorStartTimes[id];
          });

          hls.on(Hls.Events.ERROR, function (_event, data) {
            if (!errorStartTimes[id]) {
              errorStartTimes[id] = Date.now();
              countdownIntervals[id] = setInterval(() => {
                const countdown = updateCountdown(id);
                status.textContent = `Ошибка. Переподключение (${Math.ceil(countdown)}s)`;
                if (countdown <= 0) {
                  clearInterval(countdownIntervals[id]);
                  delete countdownIntervals[id];
                  setupCamera(id, streamUrl);
                }
              }, 1000);
            }

            status.className = 'status error reconnecting';

            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.destroy(); delete hlsInstances[id];
                  setTimeout(() => setupCamera(id, streamUrl), 2000);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy(); delete hlsInstances[id];
                  setTimeout(() => setupCamera(id, streamUrl), 2000);
                  break;
              }
            }
          });

          video.addEventListener('error', function () {
            if (!errorStartTimes[id]) {
              errorStartTimes[id] = Date.now();
              countdownIntervals[id] = setInterval(() => {
                const countdown = updateCountdown(id);
                status.textContent = `Ошибка. Переподключение (${Math.ceil(countdown)}s)`;
                if (countdown <= 0) {
                  clearInterval(countdownIntervals[id]);
                  delete countdownIntervals[id];
                  setupCamera(id, streamUrl);
                }
              }, 1000);
            }
            status.className = 'status error reconnecting';
            if (hlsInstances[id]) { hlsInstances[id].destroy(); delete hlsInstances[id]; }
          });

          video.addEventListener('stalled', function () {
            if (!errorStartTimes[id]) {
              errorStartTimes[id] = Date.now();
              countdownIntervals[id] = setInterval(() => {
                const countdown = updateCountdown(id);
                status.textContent = `Ошибка. Переподключение (${Math.ceil(countdown)}s)`;
                if (countdown <= 0) {
                  clearInterval(countdownIntervals[id]);
                  delete countdownIntervals[id];
                  setupCamera(id, streamUrl);
                }
              }, 1000);
            }
            status.className = 'status error reconnecting';
            if (hlsInstances[id]) { hlsInstances[id].destroy(); delete hlsInstances[id]; }
          });

          video.addEventListener('waiting', function () {
            status.textContent = 'Буферизация...';
            status.className = 'status buffering';
            clearInterval(countdownIntervals[id]);
            delete errorStartTimes[id];
          });

          video.addEventListener('playing', function () {
            tabPane.classList.add('loaded');
            status.textContent = 'Подключено';
            status.className = 'status connected';
            clearInterval(countdownIntervals[id]);
            delete errorStartTimes[id];
          });

          hlsInstances[id] = hls;

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          video.addEventListener('loadedmetadata', function () {
            video.play().catch(() => {});
            tabPane.classList.add('loaded');
            status.textContent = 'Подключено';
            status.className = 'status connected';
            clearInterval(countdownIntervals[id]);
            delete errorStartTimes[id];
          });
        }
      });
    }

    function openTab(tabId) {
      const allTabs = container.querySelectorAll('.tab-content');
      const allButtons = container.querySelectorAll('.tab-button');
      const videos = container.querySelectorAll('.tab-pane video');

      allTabs.forEach(el => el.classList.remove('active'));
      allButtons.forEach(btn => btn.classList.remove('active'));
      videos.forEach(v => v.pause());

      const activePane = container.querySelector(`#${tabId}`);
      if (activePane) activePane.classList.add('active');

      const activeButton = container.querySelector(`.tab-button[data-tab="${tabId}"]`);
      if (activeButton) activeButton.classList.add('active');

      // Находим URL для этой вкладки
      const stream = streams.find(s => (s.id || '').toString() === tabId);
      if (stream && stream.url) setupCamera(tabId, stream.url);
    }

    // Слушатели для кнопок
    if (buttonsHost) {
      buttonsHost.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-button');
        if (!btn) return;
        openTab(btn.dataset.tab);
      });
    }

    // Открыть первую камеру по умолчанию
    const firstId = (streams[0].id || 'camera1').toString();
    if (buttonsHost) {
      const btns = buttonsHost.querySelectorAll('.tab-button');
      if (btns.length) btns[0].classList.add('active');
    }
    openTab(firstId);

    // Простейшая асинхронная проверка AdBlock
    function detectAdBlockerAsync(url, cb) {
      const script = document.createElement('script');
      script.onerror = function () { script.remove(); cb(true); };
      script.onload  = function () { script.remove(); cb(false); };
      script.src = url;
      document.body.appendChild(script);
    }

    detectAdBlockerAsync('https://ads.pubmatic.com/AdServer/js/gshowad.js', function(isAdBlockDetected) {
      if (!adblockMessage) return;
      if (isAdBlockDetected) {
        adblockMessage.style.display = 'block';
        container.querySelectorAll('.tab-content, .tab-buttons').forEach(el => el.style.display = 'none');
      }
    });
  });
});
