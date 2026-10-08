(function(){
  const blockId = 'R-A-19616132-12';
  const renderTo = 'yandex_rtb_R-A-19616132-12';

  function start(){
    const slot = document.getElementById(renderTo);
    const wrap = slot && slot.closest('.cam-ad');
    if (!slot || !wrap || wrap.dataset.bound) return;
    wrap.dataset.bound = '1';

    let filled = false;
    let asked = false;

    function collapse(){
      if (filled) return;
      wrap.hidden = true;
    }

    function ask(){
      if (asked) return;
      if (slot.offsetWidth < 160 || slot.offsetHeight < 200) return;
      asked = true;
      window.yaContextCb = window.yaContextCb || [];
      window.yaContextCb.push(function(){
        if (!window.Ya || !window.Ya.Context || !window.Ya.Context.AdvManager) {
          collapse();
          return;
        }
        window.Ya.Context.AdvManager.render({
          blockId: blockId,
          renderTo: renderTo,
          onRender: function(){
            filled = true;
          },
          onError: function(data){
            if (data && data.type === 'warning') return;
            collapse();
          }
        }, collapse);
      });
      window.setTimeout(collapse, 8000);
    }

    if (!('IntersectionObserver' in window)) {
      ask();
      return;
    }
    const watch = new IntersectionObserver(function(entries){
      const seen = entries.some(function(entry){
        return entry.isIntersecting && entry.intersectionRatio >= 0.6;
      });
      if (!seen) return;
      watch.disconnect();
      ask();
    }, { threshold: [0.6] });
    watch.observe(slot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
