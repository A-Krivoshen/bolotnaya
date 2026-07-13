
(function(){
  const videos = document.querySelectorAll('video[data-hls]');
  const hlsInstances = new Map();
  const errorStart = new Map();
  const timers = new Map();
  const reconnectDelayMs = 2000;
  const lang = (document.documentElement.getAttribute('lang') || 'ru').toLowerCase().startsWith('en') ? 'en' : 'ru';
  const messages = {
    ru: {
      connecting: 'Подключение…',
      connected: 'Подключено',
      buffering: 'Буферизация…',
      streamUnavailable: 'Поток недоступен',
      unsupported: 'HLS не поддерживается в этом браузере',
      adblock: 'Отключите блокировщик рекламы для просмотра трансляции.',
      connectionError: seconds => `Ошибка подключения. Переподключение (${seconds}s)`
    },
    en: {
      connecting: 'Connecting…',
      connected: 'Connected',
      buffering: 'Buffering…',
      streamUnavailable: 'Stream unavailable',
      unsupported: 'HLS is not supported in this browser',
      adblock: 'Disable your ad blocker to view the stream.',
      connectionError: seconds => `Connection error. Reconnecting (${seconds}s)`
    }
  };

  function msg(key, value){
    const text = messages[lang][key] || messages.ru[key];
    return typeof text === 'function' ? text(value) : text;
  }

  function setStatus(status, text, state){
    if (!status) return;
    status.textContent = text;
    status.className = ('status ' + (state || '')).trim();
  }

  function videoKey(video){
    const url = video.getAttribute('data-hls') || '';
    const index = Array.prototype.indexOf.call(videos, video);
    return url + '|' + (video.id || index);
  }

  function updateCountdown(key){
    const start = errorStart.get(key) || Date.now();
    const elapsed = (Date.now() - start)/1000;
    return Math.max((reconnectDelayMs / 1000) - elapsed, 0);
  }

  function clearTimer(key){
    const timer = timers.get(key);
    if (timer){
      clearInterval(timer);
      timers.delete(key);
    }
  }

  function destroyHls(key){
    const hls = hlsInstances.get(key);
    if (hls){
      try { hls.destroy(); } catch(e){}
      hlsInstances.delete(key);
    }
  }

  function cleanup(key){
    destroyHls(key);
    clearTimer(key);
    errorStart.delete(key);
  }

  function scheduleReconnect(key, video, status){
    if (!errorStart.has(key)) errorStart.set(key, Date.now());
    setStatus(status, msg('connectionError', Math.ceil(updateCountdown(key))), 'error reconnecting');
    if (timers.has(key)) return;

    timers.set(key, setInterval(() => {
      const seconds = Math.ceil(updateCountdown(key));
      setStatus(status, msg('connectionError', seconds), 'error reconnecting');
      if (seconds <= 0){
        clearTimer(key);
        errorStart.delete(key);
        setup(video);
      }
    }, 1000));
  }

  function markConnected(key, pane, status){
    pane && pane.classList.add('loaded');
    setStatus(status, msg('connected'), 'connected');
    clearTimer(key);
    errorStart.delete(key);
  }

  function bindVideoEvents(video){
    if (video.dataset.hlsEventsBound) return;
    video.dataset.hlsEventsBound = 'true';

    video.addEventListener('error', () => {
      const key = videoKey(video);
      const container = video.closest('.camera-container') || document;
      const status = container.querySelector('.status');
      destroyHls(key);
      scheduleReconnect(key, video, status);
    });

    video.addEventListener('stalled', () => {
      const key = videoKey(video);
      const container = video.closest('.camera-container') || document;
      const status = container.querySelector('.status');
      destroyHls(key);
      scheduleReconnect(key, video, status);
    });

    video.addEventListener('waiting', () => {
      const key = videoKey(video);
      const container = video.closest('.camera-container') || document;
      const status = container.querySelector('.status');
      setStatus(status, msg('buffering'), 'buffering');
      clearTimer(key);
      errorStart.delete(key);
    });

    video.addEventListener('playing', () => {
      const key = videoKey(video);
      const container = video.closest('.camera-container') || document;
      const status = container.querySelector('.status');
      const pane = video.closest('.tab-pane') || container;
      markConnected(key, pane, status);
    });
  }

  function setup(video){
    const url = video.getAttribute('data-hls');
    const container = video.closest('.camera-container') || document;
    const status = container.querySelector('.status');
    const pane = video.closest('.tab-pane') || container;
    const key = videoKey(video);

    if (!url){
      setStatus(status, msg('streamUnavailable'), 'error');
      return;
    }

    cleanup(key);
    bindVideoEvents(video);
    setStatus(status, msg('connecting'), '');

    if (window.Hls && window.Hls.isSupported()){
      const hls = new window.Hls({
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
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(window.Hls.Events.MANIFEST_PARSED, function(){
        video.play().catch(()=>{});
        markConnected(key, pane, status);
      });

      hls.on(window.Hls.Events.ERROR, function(event, data){
        scheduleReconnect(key, video, status);
        if (data && data.fatal){
          switch (data.type){
            case window.Hls.ErrorTypes.NETWORK_ERROR:
              destroyHls(key);
              break;
            case window.Hls.ErrorTypes.MEDIA_ERROR:
              try{ hls.recoverMediaError(); }catch(e){}
              break;
            default:
              destroyHls(key);
          }
        }
      });

      hlsInstances.set(key, hls);

    } else if (video.canPlayType('application/vnd.apple.mpegurl')){
      video.src = url;
      video.addEventListener('loadedmetadata', function(){
        video.play().catch(()=>{});
        markConnected(key, pane, status);
      });
    } else {
      setStatus(status, msg('unsupported'), 'error');
    }
  }

  function detectAdBlockerAsync(url){
    return new Promise(resolve => {
      let settled = false;
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(false), 1500);

      function finish(blocked){
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.onerror = null;
        script.onload = null;
        script.remove();
        resolve(blocked);
      }

      script.onerror = () => finish(true);
      script.onload  = () => finish(false);
      script.src = url;
      document.body.appendChild(script);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    detectAdBlockerAsync('https://ads.pubmatic.com/AdServer/js/gshowad.js').then(isBlock => {
      videos.forEach(video => {
        const container = video.closest('.camera-container') || document;
        const adBox = container.querySelector('#adblock-message');

        if (isBlock){
          if (adBox){
            if (!adBox.textContent.trim()) adBox.textContent = msg('adblock');
            adBox.style.display = 'block';
          }

          const pane = video.closest('.tab-pane');
          if (pane) pane.style.display = 'none';

          const status = container.querySelector('.status');
          setStatus(status, msg('adblock'), 'error');
          return;
        }

        if (adBox) {
          adBox.style.display = 'none';
        }

        setup(video);
      });
    });
  });

  // Shared flag: visibility handler must not resume stream while mid-roll is open
  let midrollActive = false;

  document.addEventListener('visibilitychange', () => {
    videos.forEach(v => {
      if (document.hidden) {
        v.pause();
      } else if (!midrollActive) {
        // Resume only if no mid-roll ad is currently shown
        v.play().catch(() => {});
      }
    });
  });

  // ==================== VIDEO MID-ROLL ====================
  // Floor Ad R-A-5829540-22 after 8 minutes of viewing; skip after 6s.
  // Does not touch HLS setup / reconnect / adblock detection above.
  function initVideoMidroll(video) {
    const overlay = document.getElementById('video-ad-overlay');
    const adContainer = document.getElementById('video-ad-container');
    const skipBtn = document.getElementById('skip-ad-btn');

    if (!overlay || !adContainer || !video) return;

    const SESSION_KEY = 'bolotnayaMidrollShown';
    const MIDROLL_DELAY = 8 * 60 * 1000; // 8 минут
    const SKIP_DELAY = 6 * 1000;         // 6 секунд до кнопки «Пропустить»
    const FAILSAFE_DELAY = 12 * 1000;    // не держим пустой overlay, если реклама не отрендерилась
    const BLOCK_ID = 'R-A-5829540-22';

    let adShown = hasSessionMidrollShown();
    let midrollTimer = null;
    let skipTimer = null;
    let failSafeTimer = null;

    function hasSessionMidrollShown() {
      try {
        return window.sessionStorage.getItem(SESSION_KEY) === '1';
      } catch (e) {
        return false;
      }
    }

    function markSessionMidrollShown() {
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1');
      } catch (e) {}
    }

    function clearMidrollTimer() {
      if (midrollTimer) {
        clearTimeout(midrollTimer);
        midrollTimer = null;
      }
    }

    function clearSkipTimer() {
      if (skipTimer) {
        clearTimeout(skipTimer);
        skipTimer = null;
      }
    }

    function clearFailSafeTimer() {
      if (failSafeTimer) {
        clearTimeout(failSafeTimer);
        failSafeTimer = null;
      }
    }

    function hasRenderedFloorAd() {
      const mount = document.getElementById('floor-ad-midroll');
      if (!mount) return false;
      const box = mount.getBoundingClientRect();
      return Boolean(
        mount.querySelector('iframe, ins, [id^="yandex"], [class*="yandex"], [class*="ya-"]') ||
        (mount.childElementCount > 0 && box.width > 20 && box.height > 20) ||
        mount.textContent.trim()
      );
    }

    function closeMidroll() {
      clearSkipTimer();
      clearFailSafeTimer();
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
      adContainer.innerHTML = '';
      if (skipBtn) skipBtn.style.display = 'none';
      midrollActive = false;
      video.play().catch(function () {});
    }

    function scheduleMidroll() {
      if (adShown) return;
      clearMidrollTimer();
      midrollTimer = setTimeout(showMidrollAd, MIDROLL_DELAY);
    }

    function renderFloorAd() {
      // Fresh mount point for each mid-roll (avoids stale RTB DOM)
      adContainer.innerHTML = '<div id="floor-ad-midroll"></div>';

      const doRender = function () {
        if (!window.Ya || !Ya.Context || !Ya.Context.AdvManager) return;
        try {
          Ya.Context.AdvManager.render({
            blockId: BLOCK_ID,
            renderTo: 'floor-ad-midroll',
            async: true
          });
        } catch (e) {
          console.warn('[midroll] AdvManager.render failed', e);
        }
      };

      // context.js may still be loading (Autoplacement async scripts)
      window.yaContextCb = window.yaContextCb || [];
      if (window.Ya && Ya.Context && Ya.Context.AdvManager) {
        doRender();
      } else {
        window.yaContextCb.push(doRender);
      }
    }

    function showMidrollAd() {
      if (adShown) return;
      adShown = true;
      markSessionMidrollShown();
      midrollActive = true;
      clearMidrollTimer();
      clearSkipTimer();
      clearFailSafeTimer();

      // Пауза трансляции на время рекламы
      try { video.pause(); } catch (e) {}

      if (skipBtn) skipBtn.style.display = 'none';
      overlay.style.display = 'flex';
      overlay.setAttribute('aria-hidden', 'false');

      // Рендерим Floor Ad
      renderFloorAd();

      // Если рекламный SDK не вставил содержимое, не оставляем зрителя на пустом экране.
      failSafeTimer = setTimeout(function () {
        if (!hasRenderedFloorAd()) {
          console.warn('[midroll] ad did not render, closing overlay');
          closeMidroll();
        }
      }, FAILSAFE_DELAY);

      // Показываем кнопку пропуска через 6 секунд
      skipTimer = setTimeout(function () {
        if (skipBtn) skipBtn.style.display = 'block';
      }, SKIP_DELAY);
    }

    // Обработчик кнопки пропуска (один раз)
    if (skipBtn) {
      skipBtn.onclick = function () {
        closeMidroll();
      };
    }

    // Запускаем таймер при начале воспроизведения (один раз на старт сессии)
    video.addEventListener('playing', function () {
      if (!adShown && !midrollTimer) {
        scheduleMidroll();
      }
    }, { once: true });

    // Если поток уже играет к моменту init (race с HLS MANIFEST_PARSED)
    if (!video.paused && !video.ended && !adShown && !midrollTimer) {
      scheduleMidroll();
    }
  }

  // Инициализация mid-roll на всех видео камер (рядом с HLS DOMContentLoaded)
  function bootVideoMidroll() {
    const midrollVideos = document.querySelectorAll('video.hls-player, video[data-hls]');
    midrollVideos.forEach(function (video) {
      initVideoMidroll(video);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootVideoMidroll);
  } else {
    bootVideoMidroll();
  }
})();
