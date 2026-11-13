# Changelog

Everything that changed in this fork, for both halves: the **skin** (Bestpresso with the DYE2 button, installed from
`virusinducer/bestpresso-dye2-skin`) and the **plugin** (DYE2 for Bestpresso, `virusinducer/bestpresso-dye2-plugin`).
Both are rebuilt from upstream (Bestpresso by Hendri, DYE2 by Mark Chau) and versioned exactly like upstream.

- **Our changes** are listed by hand under "Fork changes". Add a line there with every change to `patches/` or `assets/`.
- **Upstream changes** are added automatically by `scripts/changelog.mjs` whenever a build picks up a new Bestpresso or DYE2 tag,
  newest first below the marker, and are repeated in the plugin's GitHub release notes.

## Fork changes

### Unreleased
- Plugin: DiFluid R2 on the Edit Shot page. Find R2 scans, connects and confirms the refractometer; Read R2 measures and fills TDS and EY (EY = TDS x drink / dose) on the shot being edited. Readings at or below 0 are rejected and shown in red; R2 errors (no liquid, out of range) and disconnects are reported on the status line. Needs the R2 connected in Decaid (native driver or the difluid-r2 plugin). Remove by deleting patches/dye2/07-r2-tds.mjs.
- Plugin: R2 event log at /api/v1/plugins/dye2.reaplugin/r2-log (last 300 lines, in memory, also mirrored into Decaid's log). Remove by deleting patches/dye2/08-r2-log.mjs.
- Skin, iPhone: shot detail step cards no longer cut off the Pressure row (the detail page had its own larger row gap).
- iPhone follow-up: the iOS web view can report safe areas as 0, so headers still sat behind the Dynamic Island. Skin screens and DYE2 pages now fall back to typical iPhone insets (59px top, 34px bottom portrait; 59px sides, 21px bottom landscape) when the system reports less.
- Skin, iPhone: Brew history table columns widened so Dose and Yield no longer run together.
- Plugin, iPhone: Edit Shot footer buttons fit on one row; Drink value box widened so "201.2g" is not cut off.
- Skin, iPhone: every screen except Home now keeps clear of the camera pill and the screen edges (live brew, shot detail, history, insights, settings, profile builder, pickers, toasts).
- Skin, iPhone: the shot header and stage cards fit the screen width (Stop/Back buttons and the step card are no longer cut off).
- Skin, iPhone: the tare button stays visible on the compact scale card when the side panel is collapsed.
- Plugin, iPhone: DYE2 pages use `viewport-fit=cover`, so the safe-area padding now works; the Edit Shot footer wraps instead of cutting off Save Shot Data in portrait.

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

## 2026-11-13 - Bestpresso v0.1.32-patch005, DYE2 v0.1.40

### Upstream DYE2 v0.1.39 to v0.1.40

- The recipe rail ignores the Streamline-strip flag too
- "Always display on Dashboard" pins the favourite to the F strip

## 2026-11-13 - Bestpresso v0.1.32-patch005, DYE2 v0.1.39

### Upstream DYE2 v0.1.37 to v0.1.39

- SAVE TO RECIPE saves the edited favourite as a recipe
- Browser-side DYE2 logging lands in Decaid's support package
- The recipe rail shows the whole library

## 2026-11-10 - Bestpresso v0.1.32-patch005, DYE2 v0.1.37

### Upstream DYE2 v0.1.36 to v0.1.37

- A recipe apply clears the identities it does not name
- Range, defaults, archive, and a recipe that inherits nothing
- Fix dashboard profile value not applied issue

## 2026-11-09 - Bestpresso v0.1.32-patch005, DYE2 v0.1.36

### Upstream DYE2 v0.1.35 to v0.1.36

- Fix long press missing issue on grinder selection page

## 2026-11-06 - Bestpresso v0.1.32-patch005, DYE2 v0.1.35

### Upstream DYE2 v0.1.34 to v0.1.35

- A recipe pill tap didn't reliably keep its own highlight
- List every ranked auto-favourite, no top-5 cap
- Only the two fields that encode steam-off are withheld
- A shot older than the 50 newest opened the newest shot instead
- Off-roast count was shifted a day, and grouped a new bag as a new favourite
- A recipe with steam time 0 could leave the heater on
- Four defects in the #44/#45/#46 fixes themselves

## 2026-11-03 - Bestpresso v0.1.32-patch005, DYE2 v0.1.34

### Upstream DYE2 v0.1.33 to v0.1.34

- Recipe star missed steam/hot-water/flush drift, basket only
- DONE could leave before a picker-return apply finished
- Slot picker pins the favourite, not an unrelated recipe
- Add a feed rate field alongside Setting/RPM
- Feed rate field on the grinder record, long-press to edit from dashboard
- Tap-to-edit stepper values are real inputs, not span-grows-input
- An assigned bean missing from the loaded list looked unselected

## 2026-10-30 - Bestpresso v0.1.32-patch005, DYE2 v0.1.33

### Upstream DYE2 v0.1.32 to v0.1.33

- A basket picked during a dial-in is recorded onto the recipe
- A basket picked since the apply stars the recipe cell
- Adding support to jump into past shots
- Swap Plotly for ECharts on the dashboard shot chart
- Keep cached measurements across a search/Same-Beans reload
- Shot history filter drawer (Bean / Roaster / Grinder / Profile)
- Add a Rating filter to the search popup
- Show count on a single match, clear one filter at a time
- Profile and Rating filters were silently dropped from every request
- Reselecting an already-picked filter field didn't reopen its dropdown
- Narrow the other filter dropdowns to what's still reachable
- ProfileFingerprint ignored key order, missing #38's fix on synced recipes
- Setting's minus button didn't line up under the Grinder field

## 2026-10-28 - Bestpresso v0.1.32-patch005, DYE2 v0.1.32

### Upstream DYE2 v0.1.31 to v0.1.32

- One rule for "on the strip", so DYE2 and the R strip agree
- A recipe naming no bean clears the live bean
- A saved favourite with no bean clears the live bean
- Read the machine's settings once per save, not twice

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
