
/*! Auto Lightbox with admin guard */
(function(){
  // Don't run inside Tina admin app (dev port) or other admin frames
  var isAdmin = (location.port === "4001") || /\/admin(\/|$)/.test(location.pathname);
  var inIframe = (function(){ try { return window.top !== window.self; } catch(e){ return true; } })();
  if (isAdmin && inIframe) return; // disable in Tina preview iframe

  function ensureAnchors(scope) {
    document.querySelectorAll(scope + ' .gallery-grid').forEach(function(grid){
      grid.querySelectorAll(':scope img').forEach(function(img){
        var p = img.parentElement;
        if (p && p.tagName === 'A') {
          p.classList.add('glightbox','gallery-item');
          if (!p.getAttribute('href')) p.setAttribute('href', img.currentSrc || img.src);
          if (!p.dataset.gallery) p.dataset.gallery = grid.id || 'gallery';
        } else {
          var a = document.createElement('a');
          a.className = 'glightbox gallery-item';
          a.href = img.currentSrc || img.src;
          var cap = img.getAttribute('alt');
          if (cap) a.setAttribute('data-title', cap);
          img.replaceWith(a); a.appendChild(img);
        }
      });
    });
    document.querySelectorAll(scope + ' .prose img').forEach(function(img){
      if (img.closest('a')) return;
      var a = document.createElement('a');
      a.className = 'glightbox prose-image';
      a.href = img.currentSrc || img.src;
      var cap = img.getAttribute('alt');
      if (cap) a.setAttribute('data-title', cap);
      img.replaceWith(a); a.appendChild(img);
    });
  }
  function initGLB(){
    if (typeof GLightbox === 'undefined') return;
    if (window.__glb) { try { window.__glb.destroy(); } catch(e){} }
    window.__glb = GLightbox({ selector: '.glightbox', touchNavigation: true, loop: true });
  }
  function boot(){ ensureAnchors(''); initGLB(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('pageshow', function(){ setTimeout(boot, 50); });
  setTimeout(function(){ if (!window.__glb) boot(); }, 500);
  var mo = new MutationObserver(function(m){
    for (var i=0;i<m.length;i++){
      if (m[i].addedNodes && m[i].addedNodes.length){ ensureAnchors(''); initGLB(); break; }
    }
  });
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();
