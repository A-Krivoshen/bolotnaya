(function () {
  if (window.__bolotnayaDistrictMap) return;
  window.__bolotnayaDistrictMap = true;

  var API = "https://api-maps.yandex.ru/2.1/?lang=";
  var MOVE = 12;
  var maps = [];
  var touch = { x: 0, y: 0, moved: false };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function coarse() {
    return window.matchMedia && (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 800px)").matches
    );
  }

  function loadApi(lang) {
    if (window.ymaps) return Promise.resolve();
    if (window.__ymapsP) return window.__ymapsP;
    window.__ymapsP = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = API + encodeURIComponent(lang || "ru_RU");
      s.async = true;
      s.onload = function () {
        if (window.ymaps) window.ymaps.ready(resolve);
        else reject(new Error("ymaps missing"));
      };
      s.onerror = function () { reject(new Error("ymaps load")); };
      document.head.appendChild(s);
    });
    return window.__ymapsP;
  }

  function balloonHtml(p, openLabel) {
    var href = p.href || "";
    var cta = p.cta || openLabel || "";
    var html = "<div class=\"dmap-balloon\">";
    html += "<strong class=\"dmap-balloon__title\">" + escapeHtml(p.title || p.caption) + "</strong>";
    if (p.text) html += "<p class=\"dmap-balloon__text\">" + escapeHtml(p.text) + "</p>";
    if (href) {
      html += "<a class=\"dmap-balloon__link\" href=\"" + escapeAttr(href) + "\">" + escapeHtml(cta) + "</a>";
    }
    html += "</div>";
    return html;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  function lock(wrap) {
    if (!wrap) return;
    wrap.classList.remove("is-unlocked");
    var s = wrap.querySelector(".district-map__shield");
    if (s) s.setAttribute("aria-pressed", "false");
    var rec = wrap.__dmap;
    if (rec && rec.map && coarse()) {
      rec.map.behaviors.disable(["drag", "multiTouch"]);
    }
  }

  function unlock(wrap) {
    if (!wrap) return;
    wrap.classList.add("is-unlocked");
    var s = wrap.querySelector(".district-map__shield");
    if (s) s.setAttribute("aria-pressed", "true");
    var rec = wrap.__dmap;
    if (rec && rec.map) {
      rec.map.behaviors.enable(["drag", "multiTouch"]);
      rec.map.behaviors.disable(["scrollZoom"]);
    }
  }

  function lockOthers(keep) {
    maps.forEach(function (w) {
      if (w !== keep) lock(w);
    });
  }

  function focusPin(wrap, id, go) {
    var rec = wrap.__dmap;
    if (!rec || !rec.pins[id]) {
      if (go) return true;
      return false;
    }
    var pin = rec.pins[id];
    var map = rec.map;
    var coords = pin.geometry.getCoordinates();
    var opts = { duration: reduce ? 0 : 280, flying: false };
    map.panTo(coords, opts).then(function () {
      pin.balloon.open();
    });
    return false;
  }

  function initMap(wrap) {
    if (!wrap || wrap.__dmap) return;
    var box = wrap.querySelector(".district-map__canvas");
    var raw = wrap.querySelector(".district-map__cfg");
    if (!box || !raw) return;
    var cfg;
    try {
      cfg = JSON.parse(raw.textContent);
      if (typeof cfg === "string") cfg = JSON.parse(cfg);
    } catch (e) { return; }

    var map = new ymaps.Map(box, {
      center: cfg.center,
      zoom: cfg.zoom,
      controls: ["zoomControl"],
      behaviors: ["drag", "multiTouch"]
    }, {
      suppressMapOpenBlock: true,
      yandexMapDisablePoiInteractivity: true,
      balloonPanelMaxMapArea: coarse() ? Infinity : 0
    });

    map.behaviors.disable(["scrollZoom", "rightMouseButtonMagnifier"]);
    if (coarse()) map.behaviors.disable(["drag", "multiTouch"]);

    try { map.controls.get("zoomControl").options.set({ size: "small", position: { right: 10, top: 10 } }); }
    catch (e) {}

    var pins = {};
    (cfg.points || []).forEach(function (p) {
      var pm = new ymaps.Placemark(
        [p.lat, p.lon],
        {
          iconCaption: p.caption,
          hintContent: p.title,
          balloonContent: balloonHtml(p, cfg.open)
        },
        {
          preset: p.preset || "islands#redDotIconWithCaption",
          iconCaptionMaxWidth: 160,
          hideIconOnBalloonOpen: false,
          openBalloonOnClick: true,
          hasBalloon: true,
          hasHint: true
        }
      );
      pins[p.id] = pm;
      map.geoObjects.add(pm);
    });

    wrap.__dmap = { map: map, pins: pins, cfg: cfg };
    maps.push(wrap);

    wrap.querySelectorAll(".district-map__legend-item").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("data-pin");
        if (!id || !pins[id]) return;
        e.preventDefault();
        if (coarse()) unlock(wrap);
        focusPin(wrap, id, false);
      });
    });
  }

  function boot() {
    var nodes = document.querySelectorAll(".district-map");
    if (!nodes.length) return;
    var lang = "ru_RU";
    var firstCfg = document.querySelector(".district-map__cfg");
    if (firstCfg) {
      try { lang = JSON.parse(firstCfg.textContent).lang || lang; }
      catch (e) {}
    }

    var io;
    function start(wrap) {
      loadApi(lang).then(function () { initMap(wrap); }).catch(function () {
        wrap.classList.add("is-fallback");
      });
    }

    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (ents) {
        ents.forEach(function (ent) {
          if (!ent.isIntersecting) return;
          start(ent.target);
          io.unobserve(ent.target);
        });
      }, { rootMargin: "240px" });
      nodes.forEach(function (n) { io.observe(n); });
    } else {
      nodes.forEach(start);
    }
  }

  document.addEventListener("touchstart", function (e) {
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    touch.x = t.clientX;
    touch.y = t.clientY;
    touch.moved = false;
  }, { passive: true });

  document.addEventListener("touchmove", function (e) {
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    if (Math.abs(t.clientX - touch.x) > MOVE || Math.abs(t.clientY - touch.y) > MOVE) {
      touch.moved = true;
    }
  }, { passive: true });

  document.addEventListener("touchend", function (e) {
    var shield = e.target.closest && e.target.closest(".district-map__shield");
    if (shield && !touch.moved) {
      e.preventDefault();
      unlock(shield.closest(".district-map"));
    }
  }, { passive: false });

  document.addEventListener("click", function (e) {
    var shield = e.target.closest && e.target.closest(".district-map__shield");
    if (shield) {
      e.preventDefault();
      unlock(shield.closest(".district-map"));
      return;
    }
    var wrap = e.target.closest && e.target.closest(".district-map");
    lockOthers(wrap);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var shield = e.target.closest && e.target.closest(".district-map__shield");
    if (!shield) return;
    e.preventDefault();
    unlock(shield.closest(".district-map"));
  });

  var scrollLock = 0;
  window.addEventListener("scroll", function () {
    if (!coarse()) return;
    if (scrollLock) return;
    scrollLock = 1;
    requestAnimationFrame(function () {
      scrollLock = 0;
      maps.forEach(lock);
    });
  }, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
