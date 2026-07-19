
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

  document.addEventListener('visibilitychange', () => {
    videos.forEach(v => {
      if (document.hidden) {
        v.pause();
      } else {
        v.play().catch(() => {});
      }
    });
  });

})();
