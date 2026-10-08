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

  function loadSlot(slot, onRender){
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
      if (onRender) opts.onRender = onRender;
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
    let emptyTimer = 0;
    let creativeShown = false;

    function closeLayer(nextGap){
      if (phase === 'watch') return;
      phase = 'watch';
      window.clearTimeout(hideTimer);
      window.clearTimeout(emptyTimer);
      badge.hidden = true;
      layer.hidden = true;
      slot.replaceChildren();
      played = 0;
      creativeShown = false;
      nextAt = nextGap;
    }

    function finish(){
      closeLayer(watchBetweenAds);
    }

    function hasCreative(){
      const nodes = slot.querySelectorAll('iframe, img, a');
      for (let i = 0; i < nodes.length; i += 1) {
        const box = nodes[i].getBoundingClientRect();
        if (box.height > 8 && box.width > 30) return true;
      }
      return false;
    }

    function showAd(){
      phase = 'ad';
      badge.hidden = true;
      // Yandex measures the slot, so the layer has to be visible.
      // If no creative arrives, drop the veil instead of covering the picture.
      layer.hidden = false;
      let filled = false;
      function arm(){
        if (filled || phase !== 'ad') return;
        filled = true;
        creativeShown = true;
        window.clearTimeout(emptyTimer);
        hideTimer = window.setTimeout(finish, adVisibleMs);
      }
      const obs = new MutationObserver(function(){
        if (!hasCreative()) return;
        obs.disconnect();
        arm();
      });
      window.requestAnimationFrame(function(){
        window.requestAnimationFrame(function(){
          obs.observe(slot, { childList: true, subtree: true, attributes: true });
          loadSlot(slot, function(){
            if (hasCreative()) arm();
          });
          emptyTimer = window.setTimeout(function(){
            obs.disconnect();
            if (hasCreative()) arm();
            else if (phase === 'ad') closeLayer(60);
          }, 3500);
        });
      });
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

    resume.addEventListener('click', function(){
      closeLayer(creativeShown ? watchBetweenAds : 60);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('video[data-hls]').forEach(attach);
  });
})();
