// Which look the DYE2 pages wear: "oled" (jet black, #cbcb13) or "classic" (the Bestpresso green look).
// The skin's button passes ?look=; it is remembered here so later pages and reloads agree. Default: oled, like the skin.
(function () {
  var KEY = 'bestpresso.dye2.look';
  var look = null;
  try { look = new URLSearchParams(window.location.search).get('look'); } catch (e) { look = null; }
  try {
    if (look === 'classic' || look === 'oled') window.localStorage.setItem(KEY, look);
    else look = window.localStorage.getItem(KEY);
  } catch (e) { /* storage blocked: fall through to the default */ }
  document.documentElement.setAttribute('data-bp-look', look === 'classic' ? 'classic' : 'oled');
})();
