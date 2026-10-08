(function(){
  const blockId = 'R-A-19616132-12';
  const renderTo = 'yandex_rtb_R-A-19616132-12';

  function start(){
    const slot = document.getElementById(renderTo);
    const wrap = slot && slot.closest('.cam-ad');
    if (!slot || !wrap || wrap.dataset.bound) return;
    wrap.dataset.bound = '1';
    wrap.hidden = false;

    let filled = false;

    function collapse(){
      if (filled) return;
      wrap.hidden = true;
    }

    window.requestAnimationFrame(function(){
      window.requestAnimationFrame(function(){
        if (slot.offsetWidth < 160 || slot.offsetHeight < 200) {
          collapse();
          return;
        }
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
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
