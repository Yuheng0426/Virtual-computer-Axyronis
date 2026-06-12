# Axyronis Architecture

This document explains the project for learners and remixers.

## Layers

```text
index.html
  Static shell containers and templates.

styles.css
  Visual language, window chrome, taskbar, panels, desktop icons, and responsive rules.

app.js
  Renderer-side desktop environment:
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

## Security Pattern

The renderer cannot access Node.js directly. This keeps the UI easier to reason about.

Use this path for native features:

```text
app.js -> preload.js -> electron-main.js -> Windows
```

Only expose methods that the UI actually needs.
