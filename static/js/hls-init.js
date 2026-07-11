
(function(){
  const videos = document.querySelectorAll('video[data-hls]');
  const hlsInstances = new Map();
  const errorStart = new Map();
  const timers = new Map();

  function updateCountdown(key){
    const start = errorStart.get(key) || Date.now();
    const elapsed = (Date.now() - start)/1000;
    return Math.max(2 - elapsed, 0);
  }

  function headOk(url){
    return new Promise(resolve => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);
        xhr.timeout = 5000;
        xhr.onload = () => resolve(true);
        xhr.onerror = () => resolve(false);
        xhr.ontimeout = () => resolve(false);
        xhr.send();
      } catch(e){ resolve(false); }
    });
  }

  function cleanup(key){
    const h = hlsInstances.get(key);
    if (h){ try { h.destroy(); } catch(e){}; hlsInstances.delete(key); }
    const t = timers.get(key);
    if (t){ clearInterval(t); timers.delete(key); }
    errorStart.delete(key);
  }

  async function setup(video){
    const url = video.getAttribute('data-hls');
    const container = video.closest('.camera-container') || document;
    const status = container.querySelector('.status');
    const pane = video.closest('.tab-pane') || container;

    const key = url + '|' + (video.id || '');

    const ok = await headOk(url);
    if (!ok){
      status && (status.textContent = 'Поток недоступен');
      status && status.classList.remove('connected','buffering');
      status && status.classList.add('error','reconnecting');
      if (!errorStart.has(key)) errorStart.set(key, Date.now());
      timers.set(key, setInterval(()=>{
        const t = Math.ceil(updateCountdown(key));
        status && (status.textContent = `Ошибка подключения. Переподключение (${t}s)`);
        if (t<=0){ clearInterval(timers.get(key)); timers.delete(key); setup(video); }
      }, 1000));
      return;
    }

    if (window.Hls && Hls.isSupported()){
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
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, function(){
        video.play().catch(()=>{});
        pane && pane.classList.add('loaded');
        status && (status.textContent = 'Подключено');
        status && (status.className = 'status connected');
        const t = timers.get(key); if (t) { clearInterval(t); timers.delete(key); }
        errorStart.delete(key);
      });

      hls.on(Hls.Events.ERROR, function(event, data){
        if (!errorStart.has(key)) errorStart.set(key, Date.now());
        status && (status.className = 'status error reconnecting');
        if (!timers.has(key)){
          timers.set(key, setInterval(()=>{
            const t = Math.ceil(updateCountdown(key));
            status && (status.textContent = `Ошибка подключения. Переподключение (${t}s)`);
            if (t<=0){ clearInterval(timers.get(key)); timers.delete(key); setup(video); }
          },1000));
        }
        if (data && data.fatal){
          switch (data.type){
            case Hls.ErrorTypes.NETWORK_ERROR:
              cleanup(key);
              setTimeout(()=>setup(video), 2000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              try{ hls.recoverMediaError(); }catch(e){}
              break;
            default:
              cleanup(key);
              setTimeout(()=>setup(video), 2000);
          }
        }
      });

      video.addEventListener('error', ()=>{
        status && (status.className = 'status error reconnecting');
        if (!errorStart.has(key)) errorStart.set(key, Date.now());
        if (!timers.has(key)){
          timers.set(key, setInterval(()=>{
            const t = Math.ceil(updateCountdown(key));
            status && (status.textContent = `Ошибка подключения. Переподключение (${t}s)`);
            if (t<=0){ clearInterval(timers.get(key)); timers.delete(key); setup(video); }
          },1000));
        }
        cleanup(key);
      });

      video.addEventListener('stalled', ()=>{
        status && (status.className = 'status error reconnecting');
        if (!errorStart.has(key)) errorStart.set(key, Date.now());
        if (!timers.has(key)){
          timers.set(key, setInterval(()=>{
            const t = Math.ceil(updateCountdown(key));
            status && (status.textContent = `Ошибка подключения. Переподключение (${t}s)`);
            if (t<=0){ clearInterval(timers.get(key)); timers.delete(key); setup(video); }
          },1000));
        }
        cleanup(key);
      });

      video.addEventListener('waiting', ()=>{
        status && (status.textContent = 'Буферизация…');
        status && (status.className = 'status buffering');
        const t = timers.get(key); if (t) { clearInterval(t); timers.delete(key); }
        errorStart.delete(key);
      });

      video.addEventListener('playing', ()=>{
        pane && pane.classList.add('loaded');
        status && (status.textContent = 'Подключено');
        status && (status.className = 'status connected');
        const t = timers.get(key); if (t) { clearInterval(t); timers.delete(key); }
        errorStart.delete(key);
      });

      hlsInstances.set(key, hls);

    } else if (video.canPlayType('application/vnd.apple.mpegurl')){
      video.src = url;
      video.addEventListener('loadedmetadata', function(){
        video.play().catch(()=>{});
        pane && pane.classList.add('loaded');
        status && (status.textContent = 'Подключено');
        status && (status.className = 'status connected');
      });
    }
  }

  function detectAdBlockerAsync(url){
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.onerror = () => { script.remove(); resolve(true); };
      script.onload  = () => { script.remove(); resolve(false); };
      script.src = url;
      document.body.appendChild(script);
    });
  }

  document.addEventListener('DOMContentLoaded', async function(){
    const isBlock = await detectAdBlockerAsync('https://ads.pubmatic.com/AdServer/js/gshowad.js');
    videos.forEach(video => {
      const container = video.closest('.camera-container') || document;
      const adBox = container.querySelector('#adblock-message');
      if (isBlock){
        if (adBox) adBox.style.display = 'block';
        const pane = container.querySelector('.tab-pane'); if (pane) pane.style.display='none';
        const status = container.querySelector('.status'); if (status){ status.textContent='Загрузка заблокирована adblock'; status.className='status error'; }
      } else {
        setup(video);
      }
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

    let adShown = false;
    let midrollTimer = null;
    let skipTimer = null;
    const MIDROLL_DELAY = 8 * 60 * 1000; // 8 минут
    const SKIP_DELAY = 6 * 1000;         // 6 секунд до кнопки «Пропустить»
    const BLOCK_ID = 'R-A-5829540-22';

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

    function scheduleMidroll() {
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
      midrollActive = true;
      clearMidrollTimer();
      clearSkipTimer();

      // Пауза трансляции на время рекламы
      try { video.pause(); } catch (e) {}

      if (skipBtn) skipBtn.style.display = 'none';
      overlay.style.display = 'flex';
      overlay.setAttribute('aria-hidden', 'false');

      // Рендерим Floor Ad
      renderFloorAd();

      // Показываем кнопку пропуска через 6 секунд
      skipTimer = setTimeout(function () {
        if (skipBtn) skipBtn.style.display = 'block';
      }, SKIP_DELAY);
    }

    // Обработчик кнопки пропуска (один раз)
    if (skipBtn) {
      skipBtn.onclick = function () {
        clearSkipTimer();
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        adContainer.innerHTML = '';
        skipBtn.style.display = 'none';

        midrollActive = false;
        adShown = false;

        // Возобновляем HLS-трансляцию
        video.play().catch(function () {});

        // Перезапускаем таймер для следующей рекламы (ещё 8 минут)
        scheduleMidroll();
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
