# Pyde Design Handoff Pre Checklist

A Figma plugin with a handoff checklist stored per root frame / section. State is saved in the file itself, so every designer sees the same status.

## Install

1. Download this repo (Code → Download ZIP) and unzip it.
2. In Figma: Plugins → Development → Import plugin from manifest… → select `manifest.json`.

## Releasing a new version

1. Bump `VERSION` in `ui.html`.
2. Bump `version` in `version.json` to the same number.
3. Push to `main`. Anyone running an older version will see an "Update required" screen with a download link.

The version check is mandatory: the plugin shows a blocking screen until it has verified the version on GitHub, and if it can't (offline, GitHub down) it stays blocked with a "Try again" button.

Note: `version.json` must stay in the repo root on `main` and the repo must be public, because the plugin reads it from `raw.githubusercontent.com`.

## Editing checklist items

Edit the `ITEMS` array in `ui.html`. Each item has a stable `id` (what is stored in the file) and a display `text`, so you can reword an item without losing existing checks. Never change an existing `id`.
