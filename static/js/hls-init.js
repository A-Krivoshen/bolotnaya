
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
      bufferingShort: 'Буферизация',
      streamUnavailable: 'Поток недоступен',
      unsupported: 'HLS не поддерживается в этом браузере',
      adblock: 'Отключите блокировщик рекламы для просмотра трансляции.',
      connectionError: seconds => `Ошибка подключения. Переподключение (${seconds}s)`
    },
    en: {
      connecting: 'Connecting…',
      connected: 'Connected',
      buffering: 'Buffering…',
      bufferingShort: 'Buffering',
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
    if (video) disarmBuffer(video);
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
    const video = pane && pane.querySelector('video');
    if (video) disarmBuffer(video);
    setStatus(status, msg('connected'), 'connected');
    clearTimer(key);
    errorStart.delete(key);
  }

  function bufferMeter(video){
    const pane = video.closest('.tab-pane');
    if (!pane) return null;
    let box = pane.querySelector('.buffer-meter');
    if (box) return box;
    box = document.createElement('div');
    box.className = 'buffer-meter';
    box.hidden = true;
    box.innerHTML = '<span class="buffer-meter__pct">0%</span><span class="buffer-meter__bar"><span></span></span><span class="buffer-meter__label"></span>';
    pane.appendChild(box);
    return box;
  }

  function showMeter(video, pct){
    const box = bufferMeter(video);
    if (!box) return;
    const next = Math.max(0, Math.min(99, Math.round(pct)));
    const num = box.querySelector('.buffer-meter__pct');
    const bar = box.querySelector('.buffer-meter__bar span');
    const label = box.querySelector('.buffer-meter__label');
    if (num) num.textContent = next + '%';
    if (bar) bar.style.width = next + '%';
    if (label) label.textContent = msg('bufferingShort');
    box.hidden = false;
    const pane = video.closest('.tab-pane');
    if (pane) pane.classList.add('is-buffering');
  }

  function noteBuffer(video, pct){
    if (video.dataset.buffering !== '1') return;
    const prev = Number(video.dataset.bufferPct || 0);
    const next = Math.max(prev, Math.max(0, Math.min(99, pct)));
    video.dataset.bufferPct = String(next);
    showMeter(video, next);
  }

  function armBuffer(video){
    const fresh = video.dataset.buffering !== '1';
    video.dataset.buffering = '1';
    if (fresh) video.dataset.bufferPct = '0';
    showMeter(video, Number(video.dataset.bufferPct || 0));
  }

  function disarmBuffer(video){
    video.dataset.buffering = '0';
    video.dataset.bufferPct = '0';
    const pane = video.closest('.tab-pane');
    if (pane) pane.classList.remove('is-buffering');
    const box = pane && pane.querySelector('.buffer-meter');
    if (box) box.hidden = true;
  }

  function bufferAhead(video){
    const t = video.currentTime || 0;
    const ranges = video.buffered;
    if (!ranges) return 0;
    for (let i = 0; i < ranges.length; i++){
      if (ranges.start(i) - 0.35 <= t && t <= ranges.end(i)) {
        return Math.max(0, ranges.end(i) - t);
      }
    }
    return 0;
  }

  function bindVideoEvents(video){
    if (video.dataset.hlsEventsBound) return;
    video.dataset.hlsEventsBound = 'true';

    video.addEventListener('error', () => {
      const key = videoKey(video);
      if (hlsInstances.has(key)) return;
      const container = video.closest('.camera-container') || document;
      const status = container.querySelector('.status');
      scheduleReconnect(key, video, status);
    });

    video.addEventListener('waiting', () => {
      const key = videoKey(video);
      if (timers.has(key)) return;
      if (window.Hls && window.Hls.isSupported() && !hlsInstances.has(key)) return;
      const container = video.closest('.camera-container') || document;
      const status = container.querySelector('.status');
      setStatus(status, msg('buffering'), 'buffering');
      armBuffer(video);
      noteBuffer(video, bufferAhead(video) / 2 * 100);
    });

    video.addEventListener('progress', () => {
      if (video.dataset.buffering !== '1') return;
      noteBuffer(video, bufferAhead(video) / 2 * 100);
    });

    video.addEventListener('playing', () => {
      const key = videoKey(video);
      const container = video.closest('.camera-container') || document;
      const status = container.querySelector('.status');
      const pane = video.closest('.tab-pane') || container;
      markConnected(key, pane, status);
    });
  }

  const camToken = { exp: 0, sig: '' };

  function dropToken(){
    camToken.exp = 0;
    camToken.sig = '';
  }

  function streamPath(url){
    try {
      return new URL(url, window.location.href).pathname.split('/').filter(Boolean)[0] || '';
    } catch (e) {
      return '';
    }
  }

  function withSig(url){
    if (!camToken.sig) return url;
    const u = new URL(url, window.location.href);
    u.searchParams.set('exp', String(camToken.exp));
    u.searchParams.set('sig', camToken.sig);
    return u.toString();
  }

  let signFlight = null;

  async function ensureSiteTicket(){
    const res = await fetch('/cam-ticket', {
      credentials: 'include',
      cache: 'no-store'
    });
    return res.ok;
  }

  async function ensureToken(streamUrl){
    const path = streamPath(streamUrl);
    if (!path) return false;
    if (camToken.sig && camToken.exp * 1000 - Date.now() > 120000) return true;
    if (signFlight) return signFlight;
    signFlight = (async function(){
      const ticket = await ensureSiteTicket();
      if (!ticket) return false;
      const endpoint = new URL(streamUrl, window.location.href);
      endpoint.pathname = '/sign/' + path;
      endpoint.search = '';
      const res = await fetch(endpoint.toString(), {
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store'
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data || !data.sig || !data.exp) return false;
      camToken.exp = data.exp;
      camToken.sig = data.sig;
      return true;
    })();
    try {
      return await signFlight;
    } finally {
      signFlight = null;
    }
  }

  function signedLoader(){
    const Base = window.Hls && window.Hls.DefaultConfig && window.Hls.DefaultConfig.loader;
    if (!Base) return undefined;
    return class extends Base {
      load(context, config, callbacks){
        const run = () => {
          if (context && context.url) context.url = withSig(context.url);
          super.load(context, config, callbacks);
        };
        const left = camToken.exp * 1000 - Date.now();
        if (camToken.sig && left > 120000) {
          run();
          return;
        }
        const src = (context && context.url) || '';
        ensureToken(src).then(run).catch(run);
      }
    };
  }

  async function setup(video){
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
    delete video.dataset.hlsMediaRetried;
    delete video.dataset.hlsNetRetried;
    setStatus(status, msg('connecting'), '');
    armBuffer(video);

    const signed = await ensureToken(url);
    if (!signed){
      disarmBuffer(video);
      setStatus(status, msg('streamUnavailable'), 'error');
      scheduleReconnect(key, video, status);
      return;
    }

    if (window.Hls && window.Hls.isSupported()){
      const hls = new window.Hls({
        // Three finished segments behind the edge. A 2s target sat inside
        // the 5s GOP and the picture waited on a segment that was not ready.
        liveSyncDurationCount: 3,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        liveBackBufferLength: 30,
        maxFragLookUpTolerance: 0.5,
        highBufferWatchdogPeriod: 3,
        lowBufferWatchdogPeriod: 1,
        enableWorker: true,
        startFragPrefetch: true,
        backBufferLength: 60,
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
        xhrSetup: function(xhr, url){
          xhr.withCredentials = true;
          if (!url || !/\.ts(?:\?|$)/.test(url)) return;
          xhr.addEventListener('progress', function(ev){
            if (!ev.lengthComputable || !ev.total) return;
            noteBuffer(video, ev.loaded / ev.total * 100);
          });
        },
        loader: signedLoader()
      });
      hls.loadSource(withSig(url));
      hls.attachMedia(video);

      hls.on(window.Hls.Events.MANIFEST_PARSED, function(){
        video.play().catch(()=>{});
        markConnected(key, pane, status);
      });

      hls.on(window.Hls.Events.ERROR, function(event, data){
        if (!data || !data.fatal) return;
        if (data.response && (data.response.code === 401 || data.response.code === 403)) dropToken();
        if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR && !video.dataset.hlsMediaRetried) {
          video.dataset.hlsMediaRetried = '1';
          try { hls.recoverMediaError(); return; } catch (e) {}
        }
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR && !video.dataset.hlsNetRetried) {
          video.dataset.hlsNetRetried = '1';
          try { hls.startLoad(); return; } catch (e) {}
        }
        destroyHls(key);
        scheduleReconnect(key, video, status);
      });

      hlsInstances.set(key, hls);

    } else if (video.canPlayType('application/vnd.apple.mpegurl')){
      if (!video.dataset.hlsMetaBound) {
        video.dataset.hlsMetaBound = '1';
        video.addEventListener('loadedmetadata', function(){
          video.play().catch(()=>{});
          markConnected(videoKey(video), pane, status);
        });
      }
      if (!video.dataset.hlsSafariRefresh) {
        video.dataset.hlsSafariRefresh = '1';
        window.setInterval(function(){
          if (video.paused || document.hidden) return;
          if (camToken.sig && camToken.exp * 1000 - Date.now() > 120000) return;
          ensureToken(url).then(function(ok){
            if (!ok) return;
            video.src = withSig(url);
          }).catch(function(){});
        }, 60000);
      }
      video.src = withSig(url);
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
      script.onload = () => finish(false);
      script.src = url;
      document.body.appendChild(script);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    detectAdBlockerAsync('https://ads.pubmatic.com/AdServer/js/gshowad.js').then(isBlock => {
      videos.forEach(video => {
        const container = video.closest('.camera-container') || document;
        const adBox = container.querySelector('#adblock-message');
        if (!isBlock) {
          if (adBox) adBox.hidden = true;
          setup(video);
          return;
        }
        if (adBox) {
          if (!adBox.textContent.trim()) adBox.textContent = msg('adblock');
          adBox.hidden = false;
        }
        const pane = video.closest('.tab-pane');
        if (pane) pane.hidden = true;
        const status = container.querySelector('.status');
        setStatus(status, msg('adblock'), 'error');
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
