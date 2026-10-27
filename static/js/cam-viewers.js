(function () {
  "use strict";

  var INTERVAL_MS = 30000;
  var TIMEOUT_MS = 8000;
  var lang = (document.documentElement.getAttribute("lang") || "ru").toLowerCase();
  var isEn = lang.indexOf("en") === 0;

  function label(n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    if (isEn) {
      return n === 1 ? "1 watching" : n + " watching";
    }
    var mod10 = n % 10;
    var mod100 = n % 100;
    var word;
    if (mod10 === 1 && mod100 !== 11) word = "зритель";
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "зрителя";
    else word = "зрителей";
    return n + " " + word;
  }

  function pathFromStream(url) {
    try {
      return new URL(url, window.location.href).pathname.split("/").filter(Boolean)[0] || "";
    } catch (e) {
      return "";
    }
  }

  function endpointFor(node) {
    var custom = node.getAttribute("data-viewers-url");
    if (custom) return custom;
    var stream = node.getAttribute("data-stream-url") || "";
    var path = pathFromStream(stream);
    if (!path) return "";
    // Same host as HLS: cam.bolotnaya.online/viewers/<path>
    try {
      var u = new URL(stream, window.location.href);
      u.pathname = "/viewers/" + path;
      u.search = "";
      u.hash = "";
      return u.toString();
    } catch (e) {
      return "";
    }
  }

  function apply(node, n) {
    var text = node.querySelector(".cam-viewers__text");
    if (!text) return;
    if (n === null || typeof n === "undefined" || isNaN(n)) {
      node.hidden = true;
      node.setAttribute("aria-hidden", "true");
      return;
    }
    text.textContent = label(n);
    node.hidden = false;
    node.removeAttribute("aria-hidden");
  }

  function parseBody(body) {
    if (body == null) return null;
    if (typeof body === "number") return body;
    if (typeof body === "object" && body !== null) {
      if (typeof body.viewers === "number") return body.viewers;
      if (typeof body.count === "number") return body.count;
      if (typeof body.readers === "number") return body.readers;
    }
    var s = String(body).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    try {
      var j = JSON.parse(s);
      return parseBody(j);
    } catch (e) {
      return null;
    }
  }

  function fetchOne(node) {
    var url = endpointFor(node);
    if (!url) {
      apply(node, null);
      return;
    }
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      signal: ctrl.signal,
      headers: { Accept: "application/json, text/plain, */*" }
    }).then(function (res) {
      if (!res.ok) throw new Error("http");
      var ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.indexOf("json") !== -1) return res.json();
      return res.text();
    }).then(function (body) {
      apply(node, parseBody(body));
    }).catch(function () {
      // Keep last good value if already shown; only hide on first failure.
      if (node.hidden || !node.querySelector(".cam-viewers__text").textContent) {
        apply(node, null);
      }
    }).then(function () {
      clearTimeout(t);
    });
  }

  function tick() {
    if (document.hidden) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-cam-viewers]"), fetchOne);
  }

  function start() {
    tick();
    setInterval(tick, INTERVAL_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) tick();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
