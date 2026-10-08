(function(){
  const playBeforeAd = 18;
  const countdownFrom = 5;
  const watchBetweenAds = 5 * 60;
  const adVisibleMs = 30000;
  const adBlockId = 'R-A-19616132-12';
  const lang = (document.documentElement.getAttribute('lang') || 'ru').toLowerCase().startsWith('en') ? 'en' : 'ru';
  let showIndex = 0;

  function label(seconds){
    if (lang === 'en') return 'Ad starts in ' + seconds + ' seconds';
    return 'Реклама начнётся через ' + seconds + ' секунд';
  }

  function loadSlot(slot){
    showIndex += 1;
    let renderTo = slot.id;
    if (showIndex > 1) {
      slot.replaceChildren();
      renderTo = slot.id + '-' + showIndex;
      const box = document.createElement('div');
      box.id = renderTo;
      slot.appendChild(box);
    }
    const page = showIndex;
    window.yaContextCb = window.yaContextCb || [];
    window.yaContextCb.push(function(){
      if (!window.Ya || !window.Ya.Context || !window.Ya.Context.AdvManager) return;
      const opts = {
        blockId: adBlockId,
        renderTo: renderTo
      };
      if (page > 1) opts.pageNumber = page;
      window.Ya.Context.AdvManager.render(opts);
    });
    if (document.querySelector('script[src*="yandex.ru/ads/system/context.js"]')) return;
    const script = document.createElement('script');
    script.src = 'https://yandex.ru/ads/system/context.js';
    script.async = true;
    document.head.appendChild(script);
  }

  function attach(video){
    const pane = video.closest('.tab-pane');
    if (!pane || pane.dataset.camAdBound) return;
    pane.dataset.camAdBound = '1';
    const badge = pane.querySelector('.cam-ad-countdown');
    const layer = pane.querySelector('.cam-ad-layer');
    const slot = pane.querySelector('.cam-ad-slot');
    const resume = pane.querySelector('.cam-ad-resume');
    if (!badge || !layer || !slot || !resume) return;

    let played = 0;
    let nextAt = playBeforeAd;
    let phase = 'watch';
    let hideTimer = 0;

    function finish(){
      if (phase === 'watch') return;
      phase = 'watch';
      window.clearTimeout(hideTimer);
      badge.hidden = true;
      layer.hidden = true;
      slot.replaceChildren();
      played = 0;
      nextAt = watchBetweenAds;
    }

    function showAd(){
      phase = 'ad';
      badge.hidden = true;
      layer.hidden = false;
      // The slot must have a box before Yandex measures it.
      window.requestAnimationFrame(function(){
        window.requestAnimationFrame(function(){
          loadSlot(slot);
        });
      });
      hideTimer = window.setTimeout(finish, adVisibleMs);
    }

    function startCountdown(){
      phase = 'count';
      let left = countdownFrom;
      badge.hidden = false;
      function tick(){
        if (phase !== 'count') return;
        badge.textContent = label(left);
        if (left <= 0) {
          showAd();
          return;
        }
        left -= 1;
        window.setTimeout(tick, 1000);
      }
      tick();
    }

    // Live HLS jumps currentTime by several seconds, so media deltas
    // never add up. Count wall-clock seconds while a frame is showing.
    window.setInterval(function(){
      if (phase !== 'watch') return;
      if (video.paused || video.ended || document.hidden) return;
      if (video.readyState < 2) return;
      played += 1;
      if (played >= nextAt) startCountdown();
    }, 1000);

    resume.addEventListener('click', finish);
  }

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('video[data-hls]').forEach(attach);
  });
})();
