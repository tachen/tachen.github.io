(function () {
  var sheet = document.querySelector(".sheet");
  if (!sheet || !window.matchMedia) return;

  var media = window.matchMedia("(prefers-reduced-motion: reduce)");
  var inside = false;
  var frame = 0;
  var point = null;
  var listening = false;

  function live() {
    return inside && !media.matches && !document.hidden;
  }

  function clearFrame() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function paint() {
    frame = 0;
    if (!live() || !point) return;
    var rect = sheet.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    sheet.style.setProperty("--mx", ((point.x - rect.left) / rect.width) * 100 + "%");
    sheet.style.setProperty("--my", ((point.y - rect.top) / rect.height) * 100 + "%");
  }

  function queue() {
    if (!live() || frame) return;
    frame = requestAnimationFrame(paint);
  }

  function onEnter(event) {
    if (event.pointerType === "touch" || media.matches || document.hidden) return;
    inside = true;
    sheet.style.setProperty("--glow", "1");
  }

  function onMove(event) {
    if (event.pointerType === "touch" || !inside) return;
    point = { x: event.clientX, y: event.clientY };
    queue();
  }

  function onLeave() {
    inside = false;
    point = null;
    clearFrame();
    sheet.style.setProperty("--glow", "0");
  }

  function onHide() {
    if (!document.hidden) return;
    clearFrame();
    sheet.style.setProperty("--glow", "0");
  }

  function bind() {
    if (listening || media.matches) return;
    listening = true;
    sheet.addEventListener("pointerenter", onEnter);
    sheet.addEventListener("pointermove", onMove);
    sheet.addEventListener("pointerleave", onLeave);
    sheet.addEventListener("pointercancel", onLeave);
    document.addEventListener("visibilitychange", onHide);
  }

  function unbind() {
    if (!listening) return;
    listening = false;
    sheet.removeEventListener("pointerenter", onEnter);
    sheet.removeEventListener("pointermove", onMove);
    sheet.removeEventListener("pointerleave", onLeave);
    sheet.removeEventListener("pointercancel", onLeave);
    document.removeEventListener("visibilitychange", onHide);
    onLeave();
  }

  if (!media.matches) bind();
  if (media.addEventListener) {
    media.addEventListener("change", function () {
      if (media.matches) unbind();
      else bind();
    });
  }
})();
