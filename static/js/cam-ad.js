(function(){
  const playBeforeAd = 18;
  const countdownFrom = 5;
  const adBlockId = 'R-A-19616132-12';
  const lang = (document.documentElement.getAttribute('lang') || 'ru').toLowerCase().startsWith('en') ? 'en' : 'ru';

  function label(seconds){
    if (lang === 'en') return 'Ad starts in ' + seconds + ' seconds';
    return 'Реклама начнётся через ' + seconds + ' секунд';
  }

  function loadSlot(slot){
    window.yaContextCb = window.yaContextCb || [];
    window.yaContextCb.push(function(){
      if (!window.Ya || !window.Ya.Context || !window.Ya.Context.AdvManager) return;
      window.Ya.Context.AdvManager.render({
        blockId: adBlockId,
        renderTo: slot.id
      });
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
    let phase = 'watch';
    let hideTimer = 0;

    function finish(){
      if (phase === 'done') return;
      phase = 'done';
      window.clearTimeout(hideTimer);
      badge.hidden = true;
      layer.hidden = true;
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
      hideTimer = window.setTimeout(finish, 30000);
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
    // never add up to 18. Count wall-clock seconds while a frame is showing.
    const timer = window.setInterval(function(){
      if (phase !== 'watch') {
        window.clearInterval(timer);
        return;
      }
      if (video.paused || video.ended || document.hidden) return;
      if (video.readyState < 2) return;
      played += 1;
      if (played >= playBeforeAd) startCountdown();
    }, 1000);

    resume.addEventListener('click', finish);
  }

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('video[data-hls]').forEach(attach);
  });
})();
