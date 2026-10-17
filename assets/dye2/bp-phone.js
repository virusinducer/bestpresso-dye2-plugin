// Portrait and phone fit for the DYE2 pages. The stock shell draws a fixed 1920x1200 canvas and
// scales it to the screen: about 20% on a phone, and a small letterboxed island on a portrait
// tablet. In portrait this lays the page out at a narrower design width instead (one pane per row)
// and scales that; landscape phones get the full-width canvas with scrolling panes. Returns the
// scale, or 0 for a landscape tablet or desktop so the stock fit runs unchanged.
(function () {
  var PORTRAIT_MIN_W = 960;
  var PORTRAIT_MAX_W = 1500;
  var PORTRAIT_TARGET_H = 2100;
  var LANDSCAPE_W = 1920;
  function inset(side) {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding-' + side + ':env(safe-area-inset-' + side + ',0px)';
    document.documentElement.appendChild(probe);
    var px = parseFloat(getComputedStyle(probe)['padding' + side.charAt(0).toUpperCase() + side.slice(1)]) || 0;
    probe.remove();
    return px;
  }
  window.__bpPhoneFit = function (vw, vh) {
    var portrait = vh > vw;
    var landscape = !portrait && vh <= 500;
    var root = document.documentElement;
    root.classList.toggle('bp-phone-p', portrait);
    root.classList.toggle('bp-phone-l', landscape);
    if (!portrait && !landscape) return 0;
    var top = inset('top');
    var bottom = inset('bottom');
    var left = landscape ? inset('left') : 0;
    var right = landscape ? inset('right') : 0;
    var designW = portrait ? Math.min(PORTRAIT_MAX_W, Math.max(PORTRAIT_MIN_W, Math.round(PORTRAIT_TARGET_H * vw / vh))) : LANDSCAPE_W;
    var s = (vw - left - right) / designW;
    var designH = (vh - top - bottom) / s;
    var b = document.body.style;
    b.width = designW + 'px';
    b.height = designH + 'px';
    b.transformOrigin = 'top left';
    b.transform = 'translate(' + left + 'px, ' + top + 'px) scale(' + s + ')';
    var rootEl = document.body.firstElementChild;
    if (rootEl) { rootEl.style.width = '100%'; rootEl.style.height = '100%'; }
    return s;
  };
})();
