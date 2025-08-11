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
    elTitle.textContent = label || "Онлайн трансляция";
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

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(t => t.setAttribute("aria-selected","false"));
      btn.setAttribute("aria-selected","true");
      const key = btn.dataset.key;
      const s = streams.find(x => x.id===key) || streams[0];
      if (s) play(s.url, s.title);
    });
  });

  if (tabs.length) tabs[0].click();
})();