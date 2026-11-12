// DiFluid R2 on the Edit Shot page: find and connect the R2, read TDS, fill TDS and EY.
// Inserted into edit-shot.ts's page script by patches/dye2/07-r2-tds.mjs, which is a template literal:
// no backticks, no dollar-brace and no backslashes in this file.
//
// Button states: "Find R2" while no R2 sensor is connected (scan, connect, confirm), "Read R2" once it is
// (start a test, wait for the result, fill the shot being edited, which opens on the most recent shot).
// Problems show in red on the status line. A background check notices if the R2 is switched off or
// disconnected, and the button goes back to Find R2.
var R2_RED = '#ff4d4f';

// Logging: every R2 event is queued here and posted in batches to the plugin's r2-log endpoint, which keeps the
// last 300 lines (read them at /api/v1/plugins/dye2.reaplugin/r2-log) and mirrors them into Decaid's own log.
// Times are UTC. [xxxx#n] is the page load and the attempt number. Logging never affects the R2 flow.
var R2_LOG_URL = '/api/v1/plugins/dye2.reaplugin/r2-log';
var r2Sid = Math.random().toString(36).slice(2, 6);
var r2Attempt = 0;
var r2LogQ = [];
var r2LogTimer = null;
function r2Short(v, n) {
  var t;
  try { t = typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { t = String(v); }
  if (t == null) t = String(v);
  return t.length > n ? t.slice(0, n) + '...' : t;
}
function r2LogFlush() {
  r2LogTimer = null;
  if (!r2LogQ.length) return;
  var lines = r2LogQ.splice(0, r2LogQ.length);
  try {
    fetch(R2_LOG_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: lines }), keepalive: true })
      .catch(function() {});
  } catch (e) {}
}
function r2Log(msg, flushNow) {
  try {
    var ts;
    try { ts = new Date().toISOString().slice(11, 23); } catch (e) { ts = String(Date.now()); }
    r2LogQ.push(ts + ' [' + r2Sid + (r2Attempt ? '#' + r2Attempt : '') + '] ' + r2Short(msg, 500));
    if (r2LogQ.length > 200) r2LogQ.shift();
    if (flushNow) r2LogFlush();
    else if (!r2LogTimer) r2LogTimer = setTimeout(r2LogFlush, 1000);
  } catch (e) {}
}
function r2Status(msg, isError) {
  r2Log('status' + (isError ? ' ERR' : '') + ': ' + msg, !!isError);
  var el = document.getElementById('es-r2-status');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = isError ? R2_RED : 'var(--text-primary)';
}
function r2SetBtn(label) { var b = document.getElementById('es-r2-btn'); if (b) b.textContent = label; }
function r2Sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function r2List(j) {
  if (Array.isArray(j)) return j;
  if (j && typeof j === 'object') {
    var keys = ['items', 'sensors', 'data', 'devices'];
    for (var i = 0; i < keys.length; i++) {
      var v = j[keys[i]];
      if (Array.isArray(v)) return v;
      if (v && typeof v === 'object') { var r = r2List(v); if (r.length) return r; }
    }
  }
  return [];
}
function r2FindReading(o, depth) {
  depth = depth || 0;
  if (!o || typeof o !== 'object' || depth > 4) return null;
  if (o.reading && typeof o.reading === 'object' && o.reading.tds != null) return o.reading;
  if (typeof o.tds === 'number') return o;
  var ks = Object.keys(o);
  for (var i = 0; i < ks.length; i++) { var r = r2FindReading(o[ks[i]], depth + 1); if (r) return r; }
  return null;
}
function r2Id(o) { return o && (o.id || o.sensorId || o.deviceId || o.identity); }
function r2IsR2(o) { return /difluid|refractometer|(^|[^a-z0-9])r2([^a-z0-9]|$)/i.test(JSON.stringify(o)); }

// The connected R2 sensor, or null. A sensor that Decaid still lists but marks disconnected does not count.
async function r2GetSensor() {
  var res = await fetch('/api/v1/sensors');
  if (!res.ok) { r2Log('sensors list -> ' + res.status); throw new Error('Sensors API returned ' + res.status); }
  var hits = r2List(await res.json()).filter(function(sn) { return r2IsR2(sn) && sn.state !== 'disconnected'; });
  // Right after the R2 drops, Decaid can keep listing it for a few seconds. Ignore it until it leaves the list.
  if (r2Stale) {
    var still = hits.some(function(sn) { return r2Id(sn) === r2Stale; });
    if (!still) r2Stale = '';
    else hits = hits.filter(function(sn) { return r2Id(sn) !== r2Stale; });
  }
  var pref = hits.filter(function(sn) { return String(r2Id(sn)).indexOf('plugin:difluid-r2') === 0; });
  return pref[0] || hits[0] || null;
}
async function r2Execute(id, commandId) {
  var res;
  try {
    res = await fetch('/api/v1/sensors/' + encodeURIComponent(id) + '/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId: commandId, params: {} })
    });
  } catch (e) { r2Log('execute ' + commandId + ' threw: ' + (e && e.message ? e.message : e)); throw e; }
  var body = null; try { body = await res.json(); } catch (e) {}
  r2Log('execute ' + commandId + ' -> ' + res.status + ' ' + r2Short(body, 240));
  return { ok: res.ok, status: res.status, body: body };
}

var r2Seen = null; // last known connection state: true, false, or null before the first check
var r2Stale = ''; // id of a sensor Decaid still lists but that answered Sensor not found
var r2Busy = false;
function r2Lost(staleId, reason) {
  r2Log('lost: ' + (reason || 'unknown reason') + (staleId ? ' (stale ' + staleId + ')' : ''), true);
  if (staleId) r2Stale = staleId;
  r2Seen = false;
  r2SetBtn('Find R2');
  r2Status('R2 disconnected. Switch it on and tap Find R2 to reconnect.', true);
}

// Step 1: find the R2 (known devices, then a scan of up to 30 s), connect it, and confirm it shows up as a sensor.
async function r2Connect() {
  r2Status('Looking for the R2 (scanning, up to 30 s)...');
  var found = null;
  var known = await fetch('/api/v1/devices');
  if (known.ok) {
    var kl = r2List(await known.json());
    found = kl.filter(r2IsR2)[0] || null;
    r2Log('devices -> ' + kl.map(function(d) { return (d.name || '?') + ':' + (d.state || '?'); }).join(', '));
  } else r2Log('devices -> ' + known.status);
  if (!found) {
    // Scan, and meanwhile look at the device list every second so the R2 is used as soon as it shows up.
    var scanDone = false, scanRes = null, scanErr = null;
    var scanP = fetch('/api/v1/devices/scan').then(function(r) { scanRes = r; scanDone = true; }, function(e) { scanErr = e; scanDone = true; });
    for (var w = 0; w < 32 && !found && !scanDone; w++) {
      await r2Sleep(1000);
      try {
        var pl = await fetch('/api/v1/devices');
        if (pl.ok) found = r2List(await pl.json()).filter(r2IsR2)[0] || null;
      } catch (e) {}
    }
    if (found) r2Log('found while scanning after ' + w + ' s: ' + (found.name || '?') + ':' + (found.state || '?'));
    else {
      if (!scanDone) await scanP;
      if (scanErr || !scanRes || !scanRes.ok) { r2Log('scan -> ' + (scanRes ? scanRes.status : 'failed')); throw new Error('Scan failed' + (scanRes ? ' (' + scanRes.status + ')' : '') + '.'); }
      var sl = r2List(await scanRes.json());
      found = sl.filter(r2IsR2)[0] || null;
      r2Log('scan -> ' + sl.map(function(d) { return (d.name || '?') + ':' + (d.state || '?'); }).join(', '));
    }
  }
  if (!found) {
    r2Status('R2 not found. Switch it on, wake it, close DiFluid Cafe or any other app using it, then tap Find R2.', true);
    return false;
  }
  var nm = found.name || 'R2';
  if (found.state !== 'connected') {
    r2Status('Found ' + nm + '. Connecting...');
    r2Stale = '';
    var c = await fetch('/api/v1/devices/connect', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: r2Id(found) })
    });
    var cb = null; try { cb = await c.clone().json(); } catch (e) {}
    r2Log('connect ' + r2Short(r2Id(found), 100) + ' -> ' + c.status + (cb ? ' ' + r2Short(cb, 200) : ''));
    if (!c.ok) throw new Error('Found ' + nm + ' but connecting failed (' + c.status + ').');
  }
  for (var k = 0; k < 10; k++) {
    if (await r2GetSensor()) { r2Seen = true; r2Status('R2 connected: ' + nm + '. Tap Read R2 to measure.'); r2SetBtn('Read R2'); return true; }
    await r2Sleep(1000);
  }
  r2Status('Found ' + nm + ' and sent connect, but it is not reporting as a sensor yet. Tap Find R2 to check again.', true);
  return false;
}

// Step 2: fill TDS on the shot being edited and work out EY = TDS x drink / dose from the fields on screen.
function r2ApplyTds(tds) {
  if (!currentShot) return;
  currentShot.annotations = currentShot.annotations || {};
  var a = currentShot.annotations;
  var tdsV = Math.round(tds * 100) / 100;
  a.drinkTds = tdsV;
  r2Log('apply tds=' + tdsV + ' dose=' + (document.getElementById('es-dose-value') || {}).value + ' drink=' + (document.getElementById('es-drink-value') || {}).value);
  setVal('es-tds-value', tdsV.toFixed(2) + '%');
  var doseEl = document.getElementById('es-dose-value');
  var drinkEl = document.getElementById('es-drink-value');
  var dose = parseFloat(doseEl && doseEl.value);
  var out = parseFloat(drinkEl && drinkEl.value);
  if (dose > 0 && out > 0) {
    var ey = Math.round(tdsV * out / dose * 100) / 100;
    a.drinkEy = ey;
    setVal('es-ey-value', ey.toFixed(2) + '%');
    r2Status('TDS ' + tdsV.toFixed(2) + '%, EY ' + ey.toFixed(2) + '% filled in. Tap Save to keep it.');
  } else {
    r2Status('TDS ' + tdsV.toFixed(2) + '% filled in. Set dose and drink weight to get EY. Tap Save to keep it.');
  }
}

// Sync the button (and, when the state changed, the status line) with what Decaid reports.
// quiet: only fix the button and the remembered state, never replace a message the user is reading.
var r2LastKey = '';
async function r2Refresh(quiet) {
  try {
    var sn = await r2GetSensor();
    var key = sn ? 'on ' + r2Id(sn) : 'off';
    if (key !== r2LastKey) { r2LastKey = key; r2Log('sensor ' + (sn ? 'listed: ' + r2Short(sn, 260) : 'not listed')); }
    r2SetBtn(sn ? 'Read R2' : 'Find R2');
    if (sn && r2Seen !== true) { r2Seen = true; if (!quiet) r2Status('R2 connected: ' + (sn.name || 'R2')); }
    if (!sn && r2Seen === true) r2Lost('', 'idle check: sensor no longer listed');
    if (!sn && r2Seen === null) { r2Seen = false; if (!quiet) r2Status('R2 not connected. Tap Find R2.'); }
    return sn;
  } catch (e) { r2Log('refresh failed: ' + (e && e.message ? e.message : e)); r2SetBtn('Find R2'); return null; }
}

// The reason Decaid gives for a failed command, shortened for the status line.
function r2Why(body) {
  if (!body || typeof body !== 'object') return '';
  var t = body.error || body.message || (body.result && (body.result.error || body.result.message)) || '';
  if (typeof t !== 'string') t = JSON.stringify(t);
  return t.length > 140 ? t.slice(0, 140) + '...' : t;
}
// What the R2 reports when a test fails, in words for the person at the machine.
function r2ErrText(code) {
  var c = String(code);
  if (c === 'no_liquid') return 'R2 says no liquid. Put the sample on the prism so it is covered, then tap Read R2 again.';
  if (c === 'beyond_range') return 'R2 says the sample is beyond its range. Check the sample and try again.';
  if (c === 'measurement_timeout') return 'The R2 did not finish the test in time. Check the sample and try again.';
  if (c.indexOf('hardware_error') === 0) return 'R2 hardware error (' + c + '). Switch the R2 off and on, then tap Find R2.';
  return 'R2 error: ' + c.split('_').join(' ') + '.';
}
// The R2 reports failures only on its live snapshot stream (the REST getReading just says there is no reading).
function r2Watch(id, onValues) {
  try {
    if (typeof WebSocket === 'undefined') { r2Log('ws: WebSocket not available, polling only'); return null; }
    var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
    var ws = new WebSocket(proto + location.host + '/ws/v1/sensors/' + encodeURIComponent(id) + '/snapshot');
    r2Log('ws: opening ' + r2Short(id, 80));
    ws.onopen = function() { r2Log('ws: open'); };
    ws.onclose = function(ev) { r2Log('ws: closed' + (ev && ev.code != null ? ' code ' + ev.code : '')); };
    ws.onerror = function() { r2Log('ws: error'); };
    ws.onmessage = function(ev) {
      r2Log('ws frame: ' + r2Short(ev && ev.data, 400));
      try { var m = JSON.parse(ev.data); onValues((m && m.values) || m || {}); } catch (e) { r2Log('ws frame not parsed: ' + (e && e.message ? e.message : e)); }
    };
    return ws;
  } catch (e) { r2Log('ws: could not open: ' + (e && e.message ? e.message : e)); return null; }
}
// A real espresso is several percent. Zero or below means no sample on the prism or a drifted zero.
function r2Finish(rd) {
  if (!(rd.tds > 0)) {
    var raw = typeof rd.tds === 'number' ? rd.tds.toFixed(2) + '%' : String(rd.tds);
    r2Status('R2 read ' + raw + ', at or below zero, so nothing was filled in. Check the sample covers the prism, or calibrate the R2.', true);
    return;
  }
  r2ApplyTds(rd.tds);
}

async function r2Read() {
  if (r2Busy) { r2Log('tap ignored: busy'); return; }
  r2Attempt++;
  r2Log('tap: button=' + ((document.getElementById('es-r2-btn') || {}).textContent) + ' seen=' + r2Seen + ' stale=' + (r2Stale || 'none'), true);
  if (!currentShot) { r2Status('No shot loaded.', true); return; }
  r2Busy = true;
  var btn = document.getElementById('es-r2-btn');
  if (btn) { btn.style.opacity = '0.6'; btn.textContent = 'Working...'; }
  try {
    var sn = await r2GetSensor();
    if (!sn) {
      if (r2Seen === true) { r2Lost('', 'tap: sensor no longer listed'); return; }
      await r2Connect();
      return;
    }
    var id = r2Id(sn);
    r2Log('using sensor ' + r2Short(sn, 260));
    // The test result comes back in the reply to measure and on the live stream. getReading is not used (older R2 plugins lack it).
    var armed = false, begun = false, sawClear = false, baseErr = '', lastErr = '', outcome = null;
    var lastStatus = '', lastFrame = '';
    var ws = r2Watch(id, function(v) {
      var err = v && v.error ? String(v.error) : '';
      var st = v && v.status ? String(v.status) : '';
      var rd = r2FindReading(v);
      if (!armed) { baseErr = err; return; }
      lastFrame = 'status ' + (st || '?') + (err ? ', error ' + err : '') + (rd && rd.tds != null ? ', tds ' + rd.tds : '');
      if (!err) sawClear = true;
      else { lastErr = err; if (err !== baseErr || sawClear) outcome = outcome || { error: err }; }
      if (!outcome && st === 'error') outcome = { error: err || 'unknown_error' };
      if (st === 'started' || v.measuring === true) begun = true;
      // Only a result that arrives after this test began counts, not a replay of the last one.
      if (!outcome && begun && rd && rd.tds != null) outcome = { reading: rd };
      // Show what the R2 is doing while it measures, unless this frame already ended the attempt.
      if (st && st !== lastStatus && !outcome) { lastStatus = st; r2Status('Measuring... (R2: ' + st.split('_').join(' ') + ')'); }
    });
    try {
      await r2Sleep(300);
      armed = true;
      r2Log('armed; baseErr=' + (baseErr || 'none')); 
      r2Status('Place the sample on the R2. Starting test...');
      var m = await r2Execute(id, 'measure');
      if (!m.ok) {
        var why = r2Why(m.body);
        r2Log('measure refused: ' + m.status + ' ' + (why || 'no reason given'), true);
        // Decaid can keep listing an R2 for a few seconds after it dropped, while every command to it answers 404.
        var gone = m.status === 404 || /not found|not connected|stale/i.test(why) || !(await r2GetSensor());
        if (gone) { r2Seen = false; r2SetBtn('Find R2'); if (m.status === 404 || /not found|stale/i.test(why)) r2Stale = id; }
        if (m.status === 404 || /not found|stale/i.test(why)) r2Status('The R2 connection was lost. Switch it on and tap Find R2.', true);
        else if (/busy/i.test(why)) r2Status('R2 is busy. Wait a moment and try again.', true);
        else if (/no.?liquid/i.test(why)) r2Status(r2ErrText('no_liquid'), true);
        else r2Status('R2 would not start the test (' + m.status + (why ? ': ' + why : '') + '). ' +
          (gone ? 'It has disconnected. Check there is liquid on the prism, then tap Find R2.' : 'Check there is liquid on the prism and try again.'), true);
        return;
      }
      // The reply to measure carries the result.
      var mr = r2FindReading(m.body);
      if (mr && !outcome) { r2Log('reading from the measure reply: tds ' + mr.tds); outcome = { reading: mr }; }
      if (!outcome) r2Status('Measuring...' + (lastStatus ? ' (R2: ' + lastStatus.split('_').join(' ') + ')' : ''));
      var deadline = Date.now() + 60000, tick = 0;
      while (Date.now() < deadline && !outcome) {
        await r2Sleep(500);
        tick++;
        if (outcome || tick % 6 !== 0) continue;
        // The stream is silent: check the R2 is still there.
        if (!(await r2GetSensor())) { r2Lost('', 'sensor gone while waiting for the result'); return; }
      }
      r2Log('wait over: outcome=' + (outcome ? (outcome.error ? 'error ' + outcome.error : 'reading') : 'none') + ' lastErr=' + (lastErr || 'none') + ' ticks=' + tick + ' lastFrame=' + (lastFrame || 'none'));
      if (outcome && outcome.error) r2Status(r2ErrText(outcome.error), true);
      else if (outcome && outcome.reading) r2Finish(outcome.reading);
      else if (lastErr) r2Status(r2ErrText(lastErr), true);
      else r2Status('No result from the R2 after 60 s (' + (lastFrame ? 'last R2 update: ' + lastFrame : 'no updates received from the R2') + '). Check the sample and try again.', true);
    } finally {
      if (ws) { try { ws.close(); } catch (e) {} }
    }
  } catch (e) {
    r2Log('read threw: ' + (e && e.stack ? r2Short(e.stack, 300) : e), true);
    r2Status(e && e.message ? e.message : 'R2 read failed.', true);
  } finally {
    r2Log('attempt finished', true);
    r2Busy = false;
    if (btn) btn.style.opacity = '1';
    await r2Refresh(true);
  }
}

function r2Init() {
  r2Log('page ready host=' + (typeof location !== 'undefined' ? location.host : '?') + ' ua=' + (typeof navigator !== 'undefined' ? r2Short(navigator.userAgent, 120) : '?'));
  try { window.addEventListener('pagehide', function() { r2LogFlush(); }); } catch (e) {}
  var b = document.getElementById('es-r2-btn');
  if (b) b.addEventListener('click', function() { r2Read(); });
  r2Refresh();
  // Notice a switched-off or disconnected R2 while the page sits open. Quiet unless the state changes.
  setInterval(function() { if (!r2Busy && !document.hidden) r2Refresh(); }, 5000);
}
