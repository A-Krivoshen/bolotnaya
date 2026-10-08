(function () {
  var nodes = document.querySelectorAll("img[data-poster-pool]");
  if (!nodes.length) return;
  fetch("/images/cameras/pool/manifest.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("pool");
      return response.json();
    })
    .then(function (data) {
      var list = (data && data.images) || [];
      if (!list.length) return;
      var pick = list[Math.floor(Math.random() * list.length)];
      if (!pick || !pick.src) return;
      var src = pick.src + (pick.v ? "?v=" + pick.v : "");
      for (var i = 0; i < nodes.length; i++) nodes[i].src = src;
    })
    .catch(function () {});
})();
