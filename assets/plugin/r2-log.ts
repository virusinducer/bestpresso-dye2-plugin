// Generated into the DYE2 plugin by bestpresso-dye2-plugin (patches/dye2/08-r2-log.mjs). Do not edit there.
//
// Log of the DiFluid R2 flow on the Edit Shot page. The page posts batches of lines to
//   POST /api/v1/plugins/dye2.reaplugin/r2-log   { "lines": ["12:00:00.000 [ab12#1] tap ...", ...] }
// and this keeps the last MAX_LINES in memory and mirrors each line into Decaid's own log.
// Read it back with
//   GET  /api/v1/plugins/dye2.reaplugin/r2-log            plain text, oldest first
//   GET  /api/v1/plugins/dye2.reaplugin/r2-log?n=50       only the last 50
//   GET  /api/v1/plugins/dye2.reaplugin/r2-log?format=json
// and empty it with POST { "clear": true }.
// The log lives in memory, so it starts empty when the plugin reloads or Decaid restarts.
const MAX_LINES = 300;
const MAX_LINE_LENGTH = 600;
const MAX_PER_POST = 100;

const lines: string[] = [];

function reply(request: HttpRequest, status: number, contentType: string, body: string): HttpResponse {
  return {
    requestId: request.requestId,
    status,
    headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
    body,
  };
}

function parseBody(request: HttpRequest): any {
  let body: any = request.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = null;
    }
  }
  return body;
}

export function handleR2Log(request: HttpRequest, log: (message: string) => void): HttpResponse {
  if (request.method === "POST") {
    const body = parseBody(request);
    if (body && body.clear === true) {
      lines.length = 0;
      return reply(request, 200, "application/json", JSON.stringify({ cleared: true }));
    }
    const incoming: unknown[] = body && Array.isArray(body.lines) ? body.lines.slice(0, MAX_PER_POST) : [];
    let stored = 0;
    for (const item of incoming) {
      if (typeof item !== "string" || !item) continue;
      const text = item.length > MAX_LINE_LENGTH ? `${item.slice(0, MAX_LINE_LENGTH)}...` : item;
      lines.push(text);
      log(`[r2] ${text}`);
      stored++;
    }
    if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
    return reply(request, 200, "application/json", JSON.stringify({ stored, total: lines.length }));
  }

  const asked = request.query ? parseInt(request.query.n, 10) : NaN;
  const count = Number.isFinite(asked) && asked > 0 ? Math.min(asked, MAX_LINES) : MAX_LINES;
  const out = lines.slice(-count);
  if (request.query && request.query.format === "json") {
    return reply(request, 200, "application/json", JSON.stringify({ total: lines.length, lines: out }));
  }
  return reply(request, 200, "text/plain; charset=utf-8", out.length ? `${out.join("\n")}\n` : "");
}
