/* Bolotnaya weather widget — Open-Meteo, vanilla ES2017, no external links. v1 */
(function () {
  'use strict';
  if (window.__bolotnayaWeather) return;
  window.__bolotnayaWeather = 1;

  var URL = 'https://api.open-meteo.com/v1/forecast?latitude=55.7448&longitude=37.6176' +
    '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day' +
    '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
    '&timezone=Europe%2FMoscow&forecast_days=3&wind_speed_unit=ms';
  var KEY = 'bolotnaya-weather-v1';
  var TTL = 15 * 60 * 1000;
  var TIMEOUT = 8000;

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

  function fetchOnce() {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
    return fetch(URL, ctrl ? { signal: ctrl.signal, cache: 'no-store' } : { cache: 'no-store' })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }, function (e) { clearTimeout(timer); throw e; })
      .then(function (d) { if (!valid(d)) throw new Error('bad data'); return d; });
  }
  function fetchWeather() {
    return fetchOnce().catch(function () {
      return new Promise(function (res) { setTimeout(res, 1500); }).then(fetchOnce);
    });
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
    var meta = t.feels + ' ' + deg(c.apparent_temperature);
    if (typeof c.wind_speed_10m === 'number') {
      meta += ' · ' + t.wind + ' ' + (Math.round(c.wind_speed_10m * 10) / 10) + ' ' + t.ms;
    }
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
      deg(c.temperature_2m) + ', ' + cond + ', ' + meta);
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
      writeCache(d);
      each(function (r) { render(r, d); });
    }).catch(function () {
      // keep last cached value if any; otherwise widget stays in neutral "—" state
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
