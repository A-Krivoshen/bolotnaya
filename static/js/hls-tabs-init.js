(() => {
  const elVideo = document.getElementById("hls-video");
  const elTitle = document.getElementById("player-title");
  const tabs = document.querySelectorAll(".tab-btn");
  let hls;

  const streams = window.__STREAMS__ || [];

  function destroy() {
    if (hls) { try { hls.destroy(); } catch(e){}; hls=null; }
    elVideo.pause();
    elVideo.removeAttribute("src");
    elVideo.load();
  }

  function play(url, label) {
    const isRu = document.documentElement.lang === 'ru' || (window.location.pathname.match(/^\/ru\//) || window.location.pathname === '/');
    elTitle.textContent = label || (isRu ? "Онлайн трансляция" : "Live stream");
    destroy();
    if (window.Hls && window.Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(elVideo);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { elVideo.play().catch(()=>{}); });
      hls.on(Hls.Events.ERROR, (e, data) => {
        if (data && data.type === "networkError") setTimeout(() => play(url, label), 1500);
      });
    } else if (elVideo.canPlayType("application/vnd.apple.mpegurl")) {
      elVideo.src = url;
      elVideo.play().catch(()=>{});
    } else {
      console.warn("HLS unsupported");
    }
  }

  function updateActiveAd(key) {
    document.querySelectorAll('.ad-slot').forEach(el => el.classList.remove('active'));
    const activeAd = document.querySelector(`.ad-slot[data-ad="${key}"]`);
    if (activeAd) activeAd.classList.add('active');
  }

  // Rotate ad overlay position in different corners so it doesn't always cover the same part of the picture
  // Positions: top-right, bottom-right, top-left, bottom-left
  const adPositions = ['pos-tr', 'pos-br', 'pos-tl', 'pos-bl'];
  let positionIndex = 0;

  function rotateAdPosition(overlay) {
    if (!overlay) return;
    adPositions.forEach(p => overlay.classList.remove(p));
    overlay.classList.add(adPositions[positionIndex % adPositions.length]);
    positionIndex++;
  }

  // Start rotating every 45 seconds for the current ad overlay
  let adRotateTimer = null;
  function startAdPositionRotation() {
    const overlay = document.querySelector('.video-ad-overlay');
    if (!overlay) return;
    clearInterval(adRotateTimer);
    adRotateTimer = setInterval(() => {
      rotateAdPosition(overlay);
    }, 45000); // 45s
    // initial
    rotateAdPosition(overlay);
  }

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(t => t.setAttribute("aria-selected","false"));
      btn.setAttribute("aria-selected","true");
      const key = btn.dataset.key;
      const s = streams.find(x => x.id===key) || streams[0];
      if (s) play(s.url, s.title);
      updateActiveAd(key);
      startAdPositionRotation(); // restart rotation for new ad
    });
  });

  if (tabs.length) {
    tabs[0].click();
    // ensure first ad is shown after initial click
    setTimeout(() => {
      const firstKey = tabs[0].dataset.key || 'cam1';
      updateActiveAd(firstKey);
      startAdPositionRotation();
    }, 50);
  }
})();