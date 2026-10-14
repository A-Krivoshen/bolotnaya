/* Bolotnaya weather widget — Open-Meteo, met.no fallback. Vanilla ES2017, no external links. v2 */
(function () {
  'use strict';
  if (window.__bolotnayaWeather) return;
  window.__bolotnayaWeather = 1;

  var URL = 'https://api.open-meteo.com/v1/forecast?latitude=55.7448&longitude=37.6176' +
    '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day' +
    '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
    '&timezone=Europe%2FMoscow&forecast_days=3&wind_speed_unit=ms';
  var MET = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=55.7448&lon=37.6176';
  var KEY = 'bolotnaya-weather-v1';
  var TTL = 15 * 60 * 1000;
  var TIMEOUT = 12000;
  var RETRY = 1500;

  // WMO code -> [ru, en, dayIcon, nightIcon]
  var WMO = {
    0: ['Ясно', 'Clear', '☀️', '🌙'],
    1: ['Преимущественно ясно', 'Mainly clear', '🌤️', '🌙'],
    2: ['Переменная облачность', 'Partly cloudy', '⛅', '☁️'],
    3: ['Пасмурно', 'Overcast', '☁️', '☁️'],
    45: ['Туман', 'Fog', '🌫️', '🌫️'],
    48: ['Изморозь, туман', 'Rime fog', '🌫️', '🌫️'],
    51: ['Слабая морось', 'Light drizzle', '🌦️', '🌧️'],
    53: ['Морось', 'Drizzle', '🌦️', '🌧️'],
    55: ['Сильная морось', 'Dense drizzle', '🌧️', '🌧️'],
    56: ['Ледяная морось', 'Freezing drizzle', '🌧️', '🌧️'],
    57: ['Сильная ледяная морось', 'Heavy freezing drizzle', '🌧️', '🌧️'],
    61: ['Небольшой дождь', 'Light rain', '🌦️', '🌧️'],
    63: ['Дождь', 'Rain', '🌧️', '🌧️'],
    65: ['Сильный дождь', 'Heavy rain', '🌧️', '🌧️'],
    66: ['Ледяной дождь', 'Freezing rain', '🌧️', '🌧️'],
    67: ['Сильный ледяной дождь', 'Heavy freezing rain', '🌧️', '🌧️'],
    71: ['Небольшой снег', 'Light snow', '🌨️', '🌨️'],
    73: ['Снег', 'Snow', '🌨️', '🌨️'],
    75: ['Сильный снег', 'Heavy snow', '❄️', '❄️'],
    77: ['Снежные зёрна', 'Snow grains', '🌨️', '🌨️'],
    80: ['Небольшой ливень', 'Light showers', '🌦️', '🌧️'],
    81: ['Ливень', 'Showers', '🌧️', '🌧️'],
    82: ['Сильный ливень', 'Violent showers', '⛈️', '⛈️'],
    85: ['Снегопад', 'Snow showers', '🌨️', '🌨️'],
    86: ['Сильный снегопад', 'Heavy snow showers', '❄️', '❄️'],
    95: ['Гроза', 'Thunderstorm', '⛈️', '⛈️'],
    96: ['Гроза с градом', 'Thunderstorm, hail', '⛈️', '⛈️'],
    99: ['Сильная гроза с градом', 'Severe thunderstorm, hail', '⛈️', '⛈️']
  };
  // met.no symbol_code base (suffix _day/_night/_polartwilight already removed) -> WMO
  var SYMBOL = {
    clearsky: 0,
    fair: 1,
    partlycloudy: 2,
    cloudy: 3,
    fog: 45,
    lightrain: 61,
    rain: 63,
    heavyrain: 65,
    lightrainshowers: 80,
    rainshowers: 81,
    heavyrainshowers: 82,
    lightsleet: 66,
    sleet: 66,
    lightsleetshowers: 66,
    sleetshowers: 66,
    heavysleet: 67,
    heavysleetshowers: 67,
    lightsnow: 71,
    snow: 73,
    heavysnow: 75,
    lightsnowshowers: 85,
    snowshowers: 85,
    heavysnowshowers: 86
  };
  // Higher number wins when picking a day's icon from 09:00–21:00 MSK.
  var WEIGHT = {
    0: 0, 1: 1, 2: 2, 3: 3, 45: 4,
    61: 10, 63: 12, 65: 14,
    80: 11, 81: 13, 82: 16,
    66: 17, 67: 18,
    71: 20, 73: 22, 75: 24,
    85: 21, 86: 25,
    95: 30
  };
  var DOW = {
    ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };
  var T = {
    ru: { feels: 'ощущается как', wind: 'ветер', ms: 'м/с', today: 'Сегодня' },
    en: { feels: 'feels like', wind: 'wind', ms: 'm/s', today: 'Today' }
  };

  function wmo(code) { return WMO[code] || ['—', '—', '🌡️', '🌡️']; }
  function deg(v) {
    if (typeof v !== 'number' || isNaN(v)) return '—';
    var r = Math.round(v);
    if (r === 0) r = 0; // avoid -0
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '°';
  }
  function valid(d) {
    return d && d.current && typeof d.current.temperature_2m === 'number' && d.daily && d.daily.time;
  }
  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && valid(c.data) ? c : null;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), data: data })); } catch (e) {}
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function fetchJson(url) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
    var opts = { cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }, function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  function fetchOpenMeteo() {
    function once() {
      return fetchJson(URL).then(function (d) {
        if (!valid(d)) throw new Error('bad data');
        return d;
      });
    }
    return once().catch(function () {
      return delay(RETRY).then(once);
    });
  }

  function moscowParts(ms) {
    var d = new Date(ms + 3 * 3600 * 1000);
    var month = d.getUTCMonth() + 1;
    var day = d.getUTCDate();
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return {
      key: d.getUTCFullYear() + '-' + pad(month) + '-' + pad(day),
      hour: d.getUTCHours()
    };
  }

  function symbolToWmo(symbol) {
    if (!symbol) return null;
    var s = String(symbol);
    var suffix = '';
    if (/_night$/.test(s)) suffix = 'night';
    else if (/_day$/.test(s)) suffix = 'day';
    var base = s.replace(/_(day|night|polartwilight)$/, '');
    if (base.indexOf('thunder') !== -1) return { code: 95, suffix: suffix };
    if (Object.prototype.hasOwnProperty.call(SYMBOL, base)) return { code: SYMBOL[base], suffix: suffix };
    return null;
  }

  function symbolOf(point) {
    var data = (point && point.data) || {};
    var blocks = ['next_1_hours', 'next_6_hours', 'next_12_hours'];
    for (var i = 0; i < blocks.length; i++) {
      var block = data[blocks[i]];
      if (block && block.summary && block.summary.symbol_code) return block.summary.symbol_code;
    }
    return '';
  }

  function nearest(series, nowMs) {
    var best = null;
    var bestDiff = Infinity;
    for (var i = 0; i < series.length; i++) {
      var t = Date.parse(series[i].time);
      if (isNaN(t)) continue;
      var diff = Math.abs(t - nowMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = series[i];
      }
    }
    return best;
  }

  function heavier(a, b) {
    var wa = WEIGHT[a] == null ? 0 : WEIGHT[a];
    var wb = WEIGHT[b] == null ? 0 : WEIGHT[b];
    return wa >= wb ? a : b;
  }

  // Environment Canada wind chill. Only defined for cold air and some wind.
  function windChill(tempC, windMs) {
    if (typeof tempC !== 'number' || typeof windMs !== 'number') return null;
    if (isNaN(tempC) || isNaN(windMs)) return null;
    var kmh = windMs * 3.6;
    if (tempC > 10 || kmh < 4.8) return null;
    var w = Math.pow(kmh, 0.16);
    var feel = 13.12 + 0.6215 * tempC - 11.37 * w + 0.3965 * tempC * w;
    return isNaN(feel) ? null : feel;
  }

  function fromMetNo(doc) {
    var series = doc && doc.properties && doc.properties.timeseries;
    if (!series || !series.length) throw new Error('met.no');
    var now = Date.now();
    var point = nearest(series, now);
    if (!point) throw new Error('met.no');
    var details = point.data && point.data.instant && point.data.instant.details;
    details = details || {};
    var temp = details.air_temperature;
    var wind = details.wind_speed;
    if (typeof temp !== 'number') throw new Error('met.no');
    var parsed = symbolToWmo(symbolOf(point));
    var code = parsed ? parsed.code : 3;
    var hour = moscowParts(now).hour;
    var isDay = (hour >= 7 && hour < 19) ? 1 : 0;
    if (parsed && parsed.suffix === 'night') isDay = 0;
    else if (parsed && parsed.suffix === 'day') isDay = 1;
    var current = {
      temperature_2m: temp,
      weather_code: code,
      is_day: isDay
    };
    if (typeof wind === 'number') current.wind_speed_10m = wind;
    var feel = windChill(temp, wind);
    if (feel != null) current.apparent_temperature = feel;

    var buckets = {};
    var order = [];
    for (var i = 0; i < series.length; i++) {
      var pt = series[i];
      var ms = Date.parse(pt.time);
      if (isNaN(ms)) continue;
      var parts = moscowParts(ms);
      if (!buckets[parts.key]) {
        buckets[parts.key] = { temps: [], codes: [] };
        order.push(parts.key);
      }
      var det = pt.data && pt.data.instant && pt.data.instant.details;
      det = det || {};
      if (typeof det.air_temperature === 'number') buckets[parts.key].temps.push(det.air_temperature);
      if (parts.hour >= 9 && parts.hour <= 21) {
        var sc = symbolToWmo(symbolOf(pt));
        if (sc) buckets[parts.key].codes.push(sc.code);
      }
    }
    var today = moscowParts(now).key;
    var keys = [];
    for (var n = 0; n < order.length; n++) {
      if (order[n] >= today) keys.push(order[n]);
    }
    keys = keys.slice(0, 3);
    var time = [];
    var tmax = [];
    var tmin = [];
    var wcode = [];
    for (var j = 0; j < keys.length; j++) {
      var bucket = buckets[keys[j]];
      if (!bucket.temps.length) continue;
      var max = bucket.temps[0];
      var min = bucket.temps[0];
      for (var k = 1; k < bucket.temps.length; k++) {
        if (bucket.temps[k] > max) max = bucket.temps[k];
        if (bucket.temps[k] < min) min = bucket.temps[k];
      }
      var heavy = bucket.codes.length ? bucket.codes[0] : code;
      for (var c = 1; c < bucket.codes.length; c++) heavy = heavier(heavy, bucket.codes[c]);
      time.push(keys[j]);
      tmax.push(max);
      tmin.push(min);
      wcode.push(heavy);
    }
    if (!time.length) throw new Error('met.no');
    return {
      current: current,
      daily: {
        time: time,
        temperature_2m_max: tmax,
        temperature_2m_min: tmin,
        weather_code: wcode
      }
    };
  }

  function fetchMetNo() {
    return fetchJson(MET).then(fromMetNo).then(function (d) {
      if (!valid(d)) throw new Error('bad data');
      return d;
    });
  }

  function fetchWeather() {
    return fetchOpenMeteo().catch(fetchMetNo);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render(root, d) {
    var lang = root.getAttribute('data-bw-lang') === 'en' ? 'en' : 'ru';
    var t = T[lang], c = d.current, w = wmo(c.weather_code);
    var cond = lang === 'ru' ? w[0] : w[1];
    root.querySelector('.bw__icon').textContent = c.is_day === 0 ? w[3] : w[2];
    root.querySelector('.bw__temp').textContent = deg(c.temperature_2m);
    root.querySelector('.bw__cond').textContent = cond;
    var parts = [];
    if (typeof c.apparent_temperature === 'number' && !isNaN(c.apparent_temperature)) {
      parts.push(t.feels + ' ' + deg(c.apparent_temperature));
    }
    if (typeof c.wind_speed_10m === 'number') {
      parts.push(t.wind + ' ' + (Math.round(c.wind_speed_10m * 10) / 10) + ' ' + t.ms);
    }
    var meta = parts.join(' · ');
    root.querySelector('.bw__meta').textContent = meta;

    var days = root.querySelector('.bw__days');
    days.textContent = '';
    var dd = d.daily;
    for (var i = 0; i < dd.time.length && i < 3; i++) {
      var p = String(dd.time[i]).split('-');
      var date = new Date(+p[0], +p[1] - 1, +p[2]);
      var dw = wmo(dd.weather_code[i]);
      var item = el('div', 'bw__day');
      item.setAttribute('title', lang === 'ru' ? dw[0] : dw[1]);
      item.appendChild(el('span', 'bw__dname', i === 0 ? t.today : DOW[lang][date.getDay()]));
      item.appendChild(el('span', 'bw__dicon', dw[2]));
      item.appendChild(el('span', 'bw__drange',
        deg(dd.temperature_2m_max[i]) + ' / ' + deg(dd.temperature_2m_min[i])));
      days.appendChild(item);
    }
    root.setAttribute('aria-label', root.querySelector('.bw__place').textContent + ': ' +
      deg(c.temperature_2m) + ', ' + cond + (meta ? ', ' + meta : ''));
    root.classList.add('bw--ready');
    root.classList.remove('bw--empty');
  }

  function init() {
    var roots = document.querySelectorAll('.bw');
    if (!roots.length) return;
    var cached = readCache();
    var each = function (fn) { for (var i = 0; i < roots.length; i++) fn(roots[i]); };
    if (cached) each(function (r) { render(r, cached.data); });
    else each(function (r) { r.classList.add('bw--empty'); });
    if (cached && Date.now() - cached.t < TTL) return;
    fetchWeather().then(function (d) {
      if (!valid(d)) return;
      writeCache(d);
      each(function (r) { render(r, d); });
    }).catch(function () {
      // A failed fetch must not replace a shown forecast with "—".
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
