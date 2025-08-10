(function(){
  function ensureHls(cb){
    if (window.Hls) return cb();
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/hls.js@1';
    s.onload=cb; document.head.appendChild(s);
  }
  function start(v, url){
    if(!v || !url) return;
    if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = url; v.play().catch(()=>{});
    } else {
      ensureHls(function(){
        try{
          var h=new Hls();
          h.loadSource(url);
          h.attachMedia(v);
        }catch(e){ console.warn('HLS init failed', e); }
      });
    }
  }
  document.addEventListener('DOMContentLoaded', function(){
    var v=document.querySelector('main video') || document.querySelector('video');
    if (!v) return;
    var url = v.dataset.hls || v.getAttribute('data-src') || v.currentSrc || v.src;
    start(v, url);
  });
})();
