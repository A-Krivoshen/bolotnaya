(function () {
  "use strict";

  var TIMEOUT_MS = 15000;
  var INTERVAL_MS = 60000;
  var RETRY_MS = 12000;
  var FAIL_LIMIT = 3;
  var lang = (document.documentElement.getAttribute("lang") || "ru").toLowerCase();
  var labels = lang.indexOf("en") === 0
    ? { checking: "Checking…", online: "Online", offline: "Offline" }
    : { checking: "Проверка…", online: "Онлайн", offline: "Офлайн" };

  function nodes() {
    return Array.prototype.filter.call(
      document.querySelectorAll("[data-cam-status]"),
      function (node) {
        return node.hasAttribute("data-stream-url");
      }
    );
  }

  function streamPath(url) {
    try {
      return new URL(url, window.location.href).pathname.split("/").filter(Boolean)[0] || "";
    } catch (e) {
      return "";
    }
  }

  function apply(node, state) {
    if (node.getAttribute("data-state") === state) return;
    node.setAttribute("data-state", state);
    node.classList.remove("is-checking", "is-online", "is-offline");
    node.classList.add(state === "online" ? "is-online" : state === "offline" ? "is-offline" : "is-checking");
    var text = node.querySelector(".cam-status__text");
    if (text) text.textContent = labels[state] || labels.offline;
  }

  function playlistLive(body) {
    var text = String(body || "").replace(/^\uFEFF/, "").trim();
    return text.indexOf("#EXTM3U") === 0 &&
      (text.indexOf("#EXTINF") !== -1 || text.indexOf("#EXT-X-STREAM-INF") !== -1);
  }

  function checkStream(streamUrl, signal) {
    var path = streamPath(streamUrl);
    if (!path) return Promise.reject(new Error("path"));
    var endpoint = new URL(streamUrl, window.location.href);
    endpoint.pathname = "/sign/" + path;
    endpoint.search = "";
    return fetch(endpoint.toString(), {
      credentials: "include",
      mode: "cors",
      cache: "no-store",
      signal: signal
    }).then(function (res) {
      if (!res.ok) throw new Error("sign");
      return res.json();
    }).then(function (data) {
      if (!data || !data.sig || !data.exp) throw new Error("token");
      var playlist = new URL(streamUrl, window.location.href);
      playlist.searchParams.set("exp", String(data.exp));
      playlist.searchParams.set("sig", String(data.sig));
      return fetch(playlist.toString(), {
        credentials: "include",
        mode: "cors",
        cache: "no-store",
        signal: signal
      });
    }).then(function (res) {
      if (!res || res.status !== 200) throw new Error("playlist");
      return res.text();
    }).then(function (body) {
      if (!playlistLive(body)) throw new Error("body");
    });
  }

  var inflight = Object.create(null);
  var fails = Object.create(null);
  var retryTimer = null;

  // The page player is the best proof: if the video is really playing, the stream is online.
  function playerPlaying() {
    var v = document.querySelector("video.hls-player, video[data-hls]");
    return !!v && !v.paused && !v.ended && v.readyState >= 3 && v.currentTime > 0;
  }

  function scheduleRetry() {
    if (retryTimer) return;
    retryTimer = setTimeout(function () {
      retryTimer = null;
      checkAll();
    }, RETRY_MS);
  }

  function checkAll() {
    if (document.hidden) return;
    var groups = Object.create(null);
    nodes().forEach(function (node) {
      var url = node.getAttribute("data-stream-url") || "";
      if (!groups[url]) groups[url] = [];
      groups[url].push(node);
    });
    Object.keys(groups).forEach(function (url) {
      var group = groups[url];
      if (!url) {
        group.forEach(function (node) { apply(node, "offline"); });
        return;
      }
      if (inflight[url]) return;

      if (playerPlaying()) {
        fails[url] = 0;
        group.forEach(function (node) { apply(node, "online"); });
        return;
      }

      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
      inflight[url] = checkStream(url, ctrl.signal).then(function () {
        fails[url] = 0;
        group.forEach(function (node) { apply(node, "online"); });
      }, function () {
        fails[url] = (fails[url] || 0) + 1;
        if (fails[url] >= FAIL_LIMIT) {
          group.forEach(function (node) { apply(node, "offline"); });
        } else {
          // One failed check is not proof: keep the previous state, re-check soon.
          scheduleRetry();
        }
      });
      inflight[url].then(function () {
        clearTimeout(timer);
        delete inflight[url];
      });
    });
  }

  function start() {
    checkAll();
    setInterval(checkAll, INTERVAL_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) checkAll();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
