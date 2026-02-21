
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

  document.addEventListener('visibilitychange', () => {
    videos.forEach(v => { if (document.hidden) v.pause(); else v.play().catch(()=>{}); });
  });
})();
