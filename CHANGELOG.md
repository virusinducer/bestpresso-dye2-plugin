# Changelog

Everything that changed in this fork, for both halves: the **skin** (Bestpresso with the DYE2 button, installed from
`virusinducer/bestpresso-dye2-skin`) and the **plugin** (DYE2 for Bestpresso, `virusinducer/bestpresso-dye2-plugin`).
Both are rebuilt from upstream (Bestpresso by Hendri, DYE2 by Mark Chau) and versioned exactly like upstream.

- **Our changes** are listed by hand under "Fork changes". Add a line there with every change to `patches/` or `assets/`.
- **Upstream changes** are added automatically by `scripts/changelog.mjs` whenever a build picks up a new Bestpresso or DYE2 tag,
  newest first below the marker, and are repeated in the plugin's GitHub release notes.

## Fork changes

### Unreleased
- Nothing yet.

### 2026-10-26 - Classic / OLED look
- Skin: new Look setting (Settings > App experience): **Classic** (stock green) or **OLED** (pure black, #cbcb13 accent). Default OLED. Classic is the untouched upstream stylesheet; OLED is a second stylesheet generated after the build. Light theme is unchanged.
- Skin, OLED: active profile card is a solid #cbcb13 like the water bar, with a red pressure line and blue flow line; flow and pressure stay distinguishable in charts; borders are yellow-tinted; icons recolour at runtime.
- Plugin: DYE2 pages and the value slider follow the same look (the D2 button passes the chosen look); the D2 button matches the OLED header buttons; pressure trace in DYE2 charts uses the accent.
- Tests for the colour mapping, the button and the changelog tooling.

### 2026-10-24
- Plugin: follow DYE2 v0.1.26 restyle anchors (moved picker CSS, reworded lines).

### 2026-10-21
- Plugin: build against DYE2 releases that ship a dark mode, with dark mode switched off (the Bestpresso look stays).
- Tooling: `upstream.json` can list upstream tags to skip.

### 2026-10-20 / 2026-10-18
- Plugin: anchor the DYE2 button patch on the plotly-asset import.
- Tooling: check upstream every 6 hours instead of daily.

### 2026-10-17 - Phone layouts
- Skin: phone layouts for portrait, landscape and compact mode; clears the Dynamic Island; tappable metric labels on iOS; no overlapping labels and chevrons in compact mode.
- Plugin: DYE2 phone fit (portrait stacks Last Shot over Next Shot Planning; landscape keeps action bars at the bottom); the value editor fits phone width.

### 2026-10-14 - First release
- Skin: empty plugin slot next to Sleep plus a loader that shows the DYE2 button only while the plugin is loaded.
- Plugin: DYE2 button (boxed D2 mark) that opens DYE2 with a return link; plugin renamed "DYE2 for Bestpresso", version equals the DYE2 tag, authors credited.
- Plugin: Bestpresso look for DYE2 (restyle rules, outlined Cancel buttons, Bestpresso-style value slider, basket carry-over).
- Tooling: automatic build, test and release from upstream tags; skin published from its own repo.

## Upstream changes

<!-- upstream-entries -->

## 2026-10-27 - Bestpresso v0.1.32-patch005, DYE2 v0.1.31

### Upstream DYE2 v0.1.30 to v0.1.31

- Hide rail arrows when pills fit, drop the dead stepper arrows
- Keep a grind setting as typed, dots and all

## 2026-10-26 - Bestpresso v0.1.32-patch005, DYE2 v0.1.30

### Upstream Bestpresso (v0.1.32 and patches 001 to 005)

**Bestpresso v0.1.32 - More languages**

- Added French, Italian, Spanish, Traditional Chinese and Simplified Chinese. Choose your language in Settings → App experience, or follow your device.
- Localised numbers, decimal input, dates and times respect regional preferences. Profile names and saved measurements stay unchanged.
- Shorter French and Italian status labels and settings headings, with status pills that fit their content and consistent 12px right padding.
- Clearer early-stop calibration and flow/pressure limiter wording, including updated German explanations.
- Improved spacing for translated profile settings and narrow-screen headers.

**Patch 001 - Yield flow and home-screen refinements**

- Live extraction and shot-history charts now show Yield flow in g/s on the brown line, with translated labels in every supported language. Total yield remains available in grams; missing flow readings are left blank rather than shown as zero.
- The hot-water dispensing screen now clearly shows Target temperature, instead of the machine's mix-temperature reading. Dispensing behavior is unchanged.
- Steam starts with a neutral loading state until its setting is confirmed, avoiding a brief incorrect On display.
- Improved status-pill spacing, inset utility-card dividers, and breathing room for insight and history cards.
- Enforced Bestpresso's tare protection during active shots when enabled.

**Patch 002 - Yield consistency and spacing**

- The completed final stage now matches total yield, including captured drips, in live view and history. Cached history uses its saved total; earlier stages, recorded chart samples and exit reasons remain unchanged.
- Hot-water, steam and flush modals remain visible for 500 ms after stopping, with content-sized metric panels and balanced padding.
- Insight and last-shot captions have matching side and bottom padding. The last-shot graph has 4px of bottom clearance to avoid clipping its lowest line.

**Patch 003 - Home-card layout**

- The home-screen history chart is now edge-to-edge, clipped at both sides, top-aligned and 6px shorter.
- Added 4px more horizontal padding to insight and history captions.
- Added the GPLv3 license declaration to the README.

**Patch 004 - History chart height**

- Increased the home-screen history chart height by 4px, preserving its top alignment, edge-to-edge layout and caption padding.

**Patch 005 - Optional sleep-screen blackout**

- Added Screen off after in Power settings. The clock can go black after a configurable delay; disabled by default. This dims the display to zero rather than powering off the panel.
- Tap the black screen to bring back the clock without waking the machine. Hold for one second on either screen to wake the machine and restore normal brightness.
- Restoring the clock restarts the blackout timer. Clock updates and hint animations stop while blacked out.

### Upstream DYE2 (v0.1.25 to v0.1.30)

- Replace the card column's scrollbar with a short indicator
- Hide the recipe rail's scrollbar on the tablet
- Name recipes from profile + bean, and Save as Recipe from a shot
- Arrows, not chevrons, for the header's prev/next
- Rank recipes and favourites by the ratings their shots carry
- Highlight the selected pill by id, and centre it in the rail
- Drop the duplicate recipes button, grey the rail arrows at each end
- Select-recipe assign mode, so Streamline's "Replace" lands on that slot
- A recipe cleared off the strip no longer holds its recipe-edit tab
- Re-applying a recipe after its profile was edited keeps it selected
- Repair favourites already stored with a profile in name only
- Favourites keep the whole profile, and a read resolves it
- A favourite read fills the variables it has no value for
- Read From Favourite fills what the record actually holds
- Recipe-edit takes a target slot from the URL, plus tests for today's guards
- Tapping a profile fills the recipe's variables
- An empty steps array is not a usable profile snapshot
- The dashboard chart survives losing the race with Plotly
- Show on Streamline Dashboard reads as the frame draws it
- Preset grey, stepper label size and input height per Figma 2386:1873
- The Dashboard Variables rules stop collapsing to nothing
- Match the Figma recipe editor - pair sub-lines, preset type, stepper glyphs
- Barista row sits on the same label grid as Beverage (Figma 2396:820)
- Recipe editor puts Machine Settings at the bottom of the right panel
- One saved favourite per favSlot, F slots are 1..4, one-time dedupe of shared slots
- The R strip never auto-assigns a recipe slot
- An unassigned recipe tab is blank, not 'Empty n'
- Re-mirror the derived selection after Save changes so the KV mirror stops reporting modified:true
- Recipe-edit accepts ?id= and ?new=1 so the skin can open a recipe across origins
- Clear the pill star when the recipe is saved from the strip
- Dashboard chart re-sizes after layout settles, return trip prefers referrer
- Recipes slot collision, slotless selection visible, touch New… row
- Keyboard avoidance falls back to padding and a page-root shift, re-checks as the keyboard animates
- Select Roaster onto the shared picker css, header and search rail
- Most Used / Least Used sorts on Select Recipe from shotIndex.uses
- Open card editor by long-press on bean picker and select recipe, drop pencil button
- Restyle Select Recipe to the bean picker's Figma translation
- Restore recipe-edit five-tab strip as the strip-slot assignment control
- Select Recipe page, recipe library with stripSlot split from ids
- Use a list icon for the dashboard All recipes button
- Recipes button on dashboard, honest recipe tab labels; drop dashboard Save to recipes
- Suggest recipes from groups after the F strip, cite stop reasons
- Rank auto-favourites by score, cache a shot index, Save to Recipe

Older upstream releases: https://github.com/xinghendri/bestpresso/releases and https://github.com/decentespresso/dye2/releases
