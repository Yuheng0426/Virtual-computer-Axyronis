# Axyronis Computer System Architecture

This document explains the project for learners and remixers.

## Layers

```text
index.html
  Static shell containers and templates.

styles.css
  Visual language, window chrome, taskbar, panels, desktop icons, and responsive rules.

app.js
  Renderer-side computer desktop:
  - app registry
  - window manager
  - start menu
  - command palette
  - quick center
  - built-in app renderers

preload.js
  Safe native bridge exposed as window.axyronisNative.

electron-main.js
  Trusted Electron main process:
  - creates the desktop window
  - reads local folders
  - launches Windows applications
  - runs terminal commands
  - returns system information
```

## Adding A Built-In App

1. Add an entry to the `apps` array in `app.js`.
2. Create a renderer function that returns a DOM element.
3. Use `openApp("yourId")` from buttons, desktop icons, or commands.

Example shape:

```js
{
  id: "yourApp",
  name: "Your App",
  symbol: "Y",
  desktop: true,
  size: [640, 420],
  render: renderYourApp
}
```

## Adding A Native Windows Launcher

1. Add a key to `windowsApps` in `electron-main.js`.
2. Add a friendly English name and command.
3. Optionally add known executable paths.

The renderer calls:

```js
nativeAPI.launchApp("chrome");
```

Desktop icons should generally open windows inside Axyronis. Host Windows apps belong in the Windows Apps launcher so the computer system feels self-contained.

## Security Pattern

The renderer cannot access Node.js directly. This keeps the UI easier to reason about.

Use this path for native features:

```text
app.js -> preload.js -> electron-main.js -> Windows
```

Only expose methods that the UI actually needs.

## Settings System

Default user-facing identity and theme values live in `defaultPreferences` inside `app.js`.

The Settings app stores changes in `localStorage` under `axyronis-preferences`. This keeps experiments local and makes it easy to reset or remix without a backend.

Useful entry points:

```text
defaultPreferences     Default system name, user name, theme, and startup mode
loadPreferences()      Reads saved local settings
savePreferences()      Persists settings
applyPreferences()     Applies settings to the live desktop
renderSettings()       Builds the Settings app UI
```

Settings uses a layered route stored in `state.settingsCategory` and `state.settingsPage`:

```text
home -> category -> detail page
```

Display language strings live in the `locales` object inside `app.js`. Add a new locale by copying the English strings, changing `name`, and translating the `strings` values. The `t("key")` helper falls back to English when a translation is missing.

For a major remix, start by changing `defaultPreferences`, the `apps` array, and the design tokens in `styles.css`.

## Wallpaper System

Wallpaper presets live in `wallpaperPresets` inside `app.js`.

The active wallpaper is stored in preferences:

```text
wallpaperPreset   Current built-in preset id or local-file marker
wallpaperImage    CSS background image value
wallpaperSource   Human-readable source text
```

Wallpaper controls are rendered inside Settings rather than as a standalone desktop app. This keeps the system control model simple: users customize identity, avatar, appearance, wallpaper, desktop behavior, and startup behavior from one place.

Electron mode can select a local image through:

```text
app.js -> preload.js -> electron-main.js -> wallpaper:pickImage
```

Browser mode can preview a selected image for the current session with a blob URL. It does not persist the file after reload.

## Browser Download System

Electron download routing lives in `electron-main.js`.

```text
webview download -> session.defaultSession will-download -> Axyronis Desktop
```

Downloads are saved inside Electron user data:

```text
app.getPath("userData")/Axyronis Desktop
```

The renderer does not choose arbitrary save paths. It receives download status through `desktop:downloads-changed`, refreshes desktop file icons, and lets users open downloaded files through the scoped `desktop:open` handler.

## Versioning

The repository uses Git tags for downloadable versions.

```text
v1.0.0   Settings wallpaper and identity release
v1.1.0   Usability and browser download release
v1.2.0   Next feature update
```
