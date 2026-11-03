  if (!window.bpSlider) return bpOrigMakeValueEditable(valueId, min, max, formatter, onChange);
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
function bpOrigMakeValueEditable(valueId, min, max, formatter, onChange) {
