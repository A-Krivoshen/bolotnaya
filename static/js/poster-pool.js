(function () {
  var nodes = document.querySelectorAll("img[data-poster-pool]");
  if (!nodes.length) return;
  fetch("/images/cameras/pool/manifest.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("pool");
      return response.json();
    })
    .then(function (data) {
      var src = "";
      if (data && data.loop) {
        src = data.loop + (data.loop_v ? "?v=" + data.loop_v : "");
      } else {
        var list = ((data && data.images) || []).filter(function (item) {
          return item && item.src && item.src.indexOf("/seed.jpg") === -1;
        });
        if (!list.length) return;
        var pick = list[Math.floor(Math.random() * list.length)];
        src = pick.src + (pick.v ? "?v=" + pick.v : "");
      }
      if (!src) return;
      for (var i = 0; i < nodes.length; i++) nodes[i].src = src;
    })
    .catch(function () {});
})();
