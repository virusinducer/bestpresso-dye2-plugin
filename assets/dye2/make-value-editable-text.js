  if (!window.bpSlider) return bpOrigMakeValueEditable(valueId, min, max, formatter, onChange, allowText);
  if (allowText) {
    // Grind setting and similar: a plain number gets the slider, free text ("1.1.0", "15 clicks") keeps upstream's editor.
    const tEl = document.getElementById(valueId);
    if (!tEl || tEl.dataset.editable) return;
    tEl.addEventListener('click', (e) => {
      const t = window.bpVal(tEl).trim();
      if (t !== '' && t !== '—' && !isNumericText(t)) return;
      if (tEl.querySelector('input')) return;
      e.stopImmediatePropagation();
      e.stopPropagation();
      if (tEl.blur) tEl.blur(); // dismiss the keyboard the focus just raised
      window.bpSlider.openField(valueId, tEl, min, max, formatter, (v) => {
        window.bpSetVal(tEl, formatter(v));
        if (typeof onChange === 'function') onChange(v);
      });
    });
    return bpOrigMakeValueEditable(valueId, min, max, formatter, onChange, allowText);
  }
  const valEl = document.getElementById(valueId);
  if (!valEl || valEl.dataset.editable) return;
  valEl.dataset.editable = '1';
  valEl.style.cursor = 'pointer';
  if (valEl.tagName === 'INPUT') valEl.readOnly = true; // the slider is the editor: no keyboard
  valEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (valEl.blur) valEl.blur();
    window.bpSlider.openField(valueId, valEl, min, max, formatter, (v) => {
      window.bpSetVal(valEl, formatter(v));
      if (typeof onChange === 'function') onChange(v);
      else if (typeof syncPresetActive === 'function') syncPresetActive(valueId.replace('-value', ''), formatter(v));
    });
  });
}
function bpOrigMakeValueEditable(valueId, min, max, formatter, onChange, allowText) {
