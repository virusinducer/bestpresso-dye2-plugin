# bestpresso-dye2-plugin

A DYE2 button for the [Bestpresso](https://github.com/xinghendri/bestpresso) Decaid skin, delivered as
a Decaid plugin plus a patched skin, rebuilt automatically whenever either upstream moves.

- **Enable the plugin and a DYE2 button appears next to Sleep.** Disable or remove it and the button
  goes away (within 30 seconds, or at once when the app returns to the foreground).
- **Tapping it opens DYE2** with a return link, so you land back in Bestpresso.
- **Bestpresso look for DYE2.** Dark theme, green accents and the Bestpresso-style value slider are applied
  to DYE2 at build time (`patches/dye2/03-restyle.mjs`, rules in `assets/dye2/`).
- **Classic or OLED.** Settings > App experience > Look switches the skin (and DYE2, via the button) between the stock
  green look and OLED: pure black with a #cbcb13 accent. OLED is a second, recoloured stylesheet generated after the
  build (`patches/bestpresso/05-oled-theme.mjs`, `assets/skin/oled*`, `patches/dye2/05-oled-look.mjs`); Classic is untouched.
  Delete those files to drop OLED.
- **Updates itself.** Every 6 hours a workflow checks `xinghendri/bestpresso` and `decentespresso/dye2` for new
  tags (betas and patches included), rebuilds both, tests them and publishes.

## Install

Replace `<decaid-host>` with the machine Decaid runs on (`localhost` on the same device).

**1. Plugin** (Decaid tracks this repo's releases and updates it for you):

```
curl -X POST http://<decaid-host>:8080/api/v1/plugins/install/github-release \
  -H 'content-type: application/json' \
  -d '{"repo": "virusinducer/bestpresso-dye2-plugin"}'
```

**2. Skin** (installs from its own repo, `virusinducer/bestpresso-dye2-skin`, which republishes each build as a release):

```
curl -X POST http://<decaid-host>:8080/api/v1/webui/skins/install/github-release \
  -H 'content-type: application/json' \
  -d '{"repo": "virusinducer/bestpresso-dye2-skin"}'
curl -X PUT http://<decaid-host>:8080/api/v1/webui/skins/default \
  -H 'content-type: application/json' -d '{"skinId": "bestpresso-dye"}'
curl -X POST http://<decaid-host>:8080/api/v1/webui/server/stop
curl -X POST http://<decaid-host>:8080/api/v1/webui/server/start
```

In Decaid's screens: plugin screen `virusinducer/bestpresso-dye2-plugin`, skin screen `virusinducer/bestpresso-dye2-skin`.

The skin installs as `bestpresso-dye` ("Bestpresso + DYE2"), next to stock Bestpresso. The plugin
("DYE2 for Bestpresso") keeps the id `dye2.reaplugin`, so it replaces stock DYE2 (same settings and data).

## How it works

- The skin patch adds an empty `<span id="plugin-slot-dye2">` after the Sleep button and a small
  loader. The loader asks Decaid `GET /api/v1/plugins` whether `dye2.reaplugin` is loaded.
- Only then does it load `/api/v1/plugins/dye2.reaplugin/bestpresso-button`, a script served by the
  plugin, which draws the button. Button changes ship through plugin updates, not skin rebuilds.
- Patches live in `patches/` and fail the build if an upstream change moves their anchor, so a
  broken update is never published silently. The last good release stays in place and an issue is opened.

## Versions

- The plugin version is exactly the DYE2 version it is built from (DYE2 `v0.1.19` gives plugin `0.1.19`).
  The skin version is exactly the Bestpresso version (`0.1.32-patch005`). Nothing of ours is added.
- A new DYE2 or Bestpresso release is picked up within 6 hours and published under its own new version, so
  Decaid sees a normal update.
- When only our patches change (a fix to the button or the restyle), the version stays the same, so
  Decaid does not offer an update. Remove and reinstall the plugin or skin to pick it up.
- A plugin release carries exactly one zip, as Decaid requires. The skin lives on the `dist` branch and is
  republished as a release by [bestpresso-dye2-skin](https://github.com/virusinducer/bestpresso-dye2-skin).
- `upstream.json` records the upstream tags the last release was built from.

## Development

```
npm test                                   # unit tests
node scripts/build.mjs --bestpresso v0.1.32-patch005 --dye2 v0.1.19 --out out
SKIN_DIR=$PWD/out/skin PLUGIN_JS=$PWD/.work/dye2/dye2.reaplugin/plugin.js node test/e2e/mock-decaid.mjs &
python3 test/e2e/button.e2e.py             # needs playwright + chromium
```

## Credits

- **Bestpresso** is by Hendri ([xinghendri/bestpresso](https://github.com/xinghendri/bestpresso)). The skin
  here is his work with a small patch for the DYE2 button. Hendri has said it is open source; the
  repository does not yet carry a LICENSE file.
- **DYE2** is by Mark Chau and the DYE2 contributors at Decent Espresso ([decentespresso/dye2](https://github.com/decentespresso/dye2)).
  The plugin here is their work, restyled to match Bestpresso.
- **Decaid** and the DE1 are by Decent Espresso.

This repository contains only the patches, the button, the restyle and the build tooling. Upstream sources
are fetched at build time and are not copied here.

## Phone layout

`patches/bestpresso/04-phone-layout.mjs` adds `assets/skin/phone.css` to the skin. Every rule in it sits inside a media query that only phones match (portrait width up to 520px, or landscape height up to 500px), so iPad and desktop keep the stock layout. It fits the dashboard on one screen and keeps the compact-left-side toggle working.

To switch it off, delete `patches/bestpresso/04-phone-layout.mjs`, `assets/skin/phone.css` and `test/phone.test.mjs` (or revert the commit that added them), let the build republish, then remove and reinstall the skin in Decaid. The skin version does not change, so Decaid will not offer an update by itself.

## Portrait and phone layout for DYE2

`patches/dye2/04-phone-fit.mjs` adds `assets/dye2/bp-phone.js` and `bp-phone.css`. In portrait (any screen taller than wide) the DYE2 pages are laid out one pane above the other on a narrower design canvas instead of the stock 1920x1200 one. Landscape phones (height up to 500px) keep the wide canvas with scrolling panes and a pinned Cancel/Done row. Landscape tablets and desktops fall through to the stock fit unchanged.

To switch it off, delete `patches/dye2/04-phone-fit.mjs`, `assets/dye2/bp-phone.js`, `assets/dye2/bp-phone.css` and `test/dye2-phone.test.mjs`, rebuild, and reinstall the plugin.
