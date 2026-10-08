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

  function ensureContext(){
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
      layer.classList.remove('is-filled');
      layer.classList.remove('is-open');
      resume.hidden = true;
      slot.replaceChildren();
      played = 0;
      creativeShown = false;
      nextAt = nextGap;
    }

    function finish(){
      closeLayer(watchBetweenAds);
    }

    function showAd(){
      phase = 'ad';
      badge.hidden = true;
      resume.hidden = true;
      layer.classList.remove('is-filled');
      layer.classList.add('is-open');
      layer.hidden = false;
      showIndex += 1;
      const generation = showIndex;
      const renderTo = slot.id + '-' + generation;
      const box = document.createElement('div');
      box.id = renderTo;
      box.className = 'cam-ad-render';
      slot.replaceChildren(box);
      ensureContext();

      function stillThis(){
        return phase === 'ad' && generation === showIndex;
      }

      function arm(){
        if (!stillThis() || creativeShown) return;
        creativeShown = true;
        window.clearTimeout(emptyTimer);
        layer.classList.add('is-filled');
        resume.hidden = false;
        if (window.innerWidth <= 700) {
          box.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
        hideTimer = window.setTimeout(finish, adVisibleMs);
      }

      function miss(){
        if (!stillThis() || creativeShown) return;
        closeLayer(60);
      }

      // Yandex measures the node at the render() call. A hidden or
      // zero-size box gets no banner, so wait until layout has a real box.
      window.requestAnimationFrame(function(){
        window.requestAnimationFrame(function(){
          if (!stillThis()) return;
          if (box.offsetWidth < 300 || box.offsetHeight < 200) {
            miss();
            return;
          }
          window.yaContextCb = window.yaContextCb || [];
          window.yaContextCb.push(function(){
            if (!stillThis()) return;
            if (!window.Ya || !window.Ya.Context || !window.Ya.Context.AdvManager) {
              miss();
              return;
            }
            window.Ya.Context.AdvManager.render({
              blockId: adBlockId,
              renderTo: renderTo,
              onRender: arm,
              onError: function(data){
                if (data && data.type === 'warning') return;
                miss();
              }
            }, miss);
          });
          emptyTimer = window.setTimeout(miss, 12000);
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
