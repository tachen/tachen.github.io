// 不蒜子只按请求的 Referer 返回并累加这一页的 page_pv，没有按地址查询的只读接口。
// 列表页不能改自己的 Referer，所以在同源空白帧里把地址换成文章路径再请求，
// 拿到的才是该文自己的次数。每次真实请求都会给该文 +1，结果在本地记 24 小时，
// 避免同一次浏览里反复打开列表时每篇文章都被重复计数。
(function () {
  var current = document.currentScript;
  var frameSrc = current && current.getAttribute("data-pv-frame");
  var ttl = 24 * 60 * 60 * 1000;
  var prefix = "busuanzi-page-pv:";

  function canon(path) {
    if (!path || path.charAt(0) !== "/" || path.charAt(1) === "/") return "";
    var clean = path.split("#")[0].split("?")[0];
    if (!/\.[a-zA-Z0-9]+$/.test(clean) && clean.charAt(clean.length - 1) !== "/") {
      clean += "/";
    }
    return clean;
  }

  function read(path) {
    try {
      var raw = localStorage.getItem(prefix + path);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.n !== "number" || !isFinite(data.n)) return null;
      if (Date.now() - data.t > ttl) return null;
      return data.n;
    } catch (e) {
      return null;
    }
  }

  function write(path, n) {
    try {
      localStorage.setItem(prefix + path, JSON.stringify({ n: n, t: Date.now() }));
    } catch (e) {}
  }

  var slot = document.getElementById("busuanzi_value_page_pv");
  if (slot) {
    var savePage = function () {
      var n = Number(slot.textContent);
      if (slot.textContent === "" || !isFinite(n)) return;
      write(canon(location.pathname), n);
    };
    if (window.MutationObserver) {
      new MutationObserver(savePage).observe(slot, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
    savePage();
  }

  var nodes = document.querySelectorAll(".pv[data-pv-path]");
  if (!nodes.length || !frameSrc) return;

  var groups = {};
  var pending = [];
  var ready = [];
  for (var i = 0; i < nodes.length; i++) {
    var path = canon(nodes[i].getAttribute("data-pv-path"));
    if (!path) continue;
    if (!groups[path]) {
      groups[path] = [];
      var cached = read(path);
      if (cached == null) pending.push(path);
      else ready.push([path, cached]);
    }
    groups[path].push(nodes[i]);
  }
  for (var r = 0; r < ready.length; r++) paint(ready[r][0], ready[r][1]);

  if (!pending.length) return;

  var iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.title = "";
  iframe.style.cssText = "position:absolute;width:0;height:0;border:0;left:-9999px;";
  iframe.src = frameSrc;
  iframe.addEventListener("load", function onLoad() {
    iframe.removeEventListener("load", onLoad);
    run(0);
  });
  document.body.appendChild(iframe);

  function paint(path, n) {
    var list = groups[path];
    if (!list) return;
    var text = String(n);
    for (var j = 0; j < list.length; j++) {
      var num = list[j].querySelector(".pv-n");
      if (!num) continue;
      num.textContent = text;
      list[j].hidden = false;
    }
  }

  function run(index) {
    if (index >= pending.length) {
      iframe.remove();
      return;
    }
    var path = pending[index];
    var win = iframe.contentWindow;
    var doc = iframe.contentDocument;
    if (!win || !doc) {
      run(index + 1);
      return;
    }
    var cb = "BusuanziListCb_" + index + "_" + Math.floor(Math.random() * 1e9);
    var finished = false;
    var el = null;
    var timer = setTimeout(function () { finish(null); }, 7000);

    function finish(n) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { delete win[cb]; } catch (e) {}
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (typeof n === "number" && isFinite(n)) {
        write(path, n);
        paint(path, n);
      }
      setTimeout(function () { run(index + 1); }, 80);
    }

    win[cb] = function (data) {
      var n = data && Number(data.page_pv);
      finish(isFinite(n) ? n : null);
    };
    try {
      win.history.replaceState(null, "", path);
    } catch (e) {
      finish(null);
      return;
    }
    el = doc.createElement("script");
    el.referrerPolicy = "no-referrer-when-downgrade";
    el.src = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=" + cb;
    (doc.head || doc.documentElement).appendChild(el);
  }
})();
