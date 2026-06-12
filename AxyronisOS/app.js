// Axyronis renderer process
// -------------------------
// This file runs inside the desktop UI. It owns the virtual desktop shell:
// app registry, windows, menus, panels, and the built-in educational apps.
// Native Windows actions are never called directly here; they go through
// window.axyronisNative, which is provided by preload.js in Electron mode.

// App registry:
// Add new virtual apps here. Each app points to a render function that returns
// a DOM node. If nativeLaunch is set, Electron mode launches a real Windows app
// instead of opening a virtual window.
const apps = [
  {
    id: "files",
    name: "Axyronis Files",
    symbol: "F",
    desktop: true,
    size: [760, 500],
    render: renderFiles
  },
  {
    id: "browser",
    name: "Nebula Browser",
    symbol: "N",
    desktop: true,
    size: [820, 540],
    render: renderBrowser
  },
  {
    id: "chrome",
    name: "Google Chrome",
    symbol: "G",
    desktop: true,
    size: [520, 360],
    nativeLaunch: "chrome",
    render: renderChromeLauncher
  },
  {
    id: "windowsApps",
    name: "Windows Apps",
    symbol: "W",
    desktop: true,
    size: [720, 520],
    render: renderWindowsApps
  },
  {
    id: "terminal",
    name: "Axyron Terminal",
    symbol: ">",
    desktop: true,
    size: [680, 440],
    render: renderTerminal
  },
  {
    id: "notes",
    name: "Stardust Notes",
    symbol: "P",
    desktop: true,
    size: [560, 500],
    render: renderNotes
  },
  {
    id: "settings",
    name: "Settings",
    symbol: "S",
    desktop: true,
    size: [740, 520],
    render: renderSettings
  },
  {
    id: "system",
    name: "System Monitor",
    symbol: "M",
    desktop: true,
    size: [650, 460],
    render: renderSystem
  },
  {
    id: "calculator",
    name: "Calculator",
    symbol: "+",
    desktop: false,
    size: [390, 520],
    render: renderCalculator
  },
  {
    id: "about",
    name: "About Axyronis",
    symbol: "A",
    desktop: false,
    size: [560, 400],
    render: renderAbout
  }
];

// Sample virtual files for browser-only mode. Electron mode uses the real local
// file system through nativeAPI.listDir().
const files = {
  "Desktop": [
    ["folder", "Project Hub"],
    ["folder", "Design Assets"],
    ["file", "Axyronis Readme.txt"],
    ["file", "System Roadmap.axp"]
  ],
  "Documents": [
    ["file", "Future Features.md"],
    ["file", "User Profile.axd"],
    ["file", "Privacy and Security.txt"]
  ],
  "Images": [
    ["image", "Nebula Wallpaper.png"],
    ["image", "Glass UI Reference.png"],
    ["image", "Axyronis Mark Sketch.png"]
  ],
  "System": [
    ["file", "kernel.virtual"],
    ["file", "theme.config"],
    ["folder", "drivers"]
  ]
};

// Central UI state. Keeping this small makes the desktop easier to remix.
const state = {
  windows: new Map(),
  z: 30,
  active: null,
  startOpen: false,
  fileLocation: "Desktop",
  accent: localStorage.getItem("axyronis-accent") || "#33e0c2",
  lightMode: localStorage.getItem("axyronis-light") === "true"
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const appById = id => apps.find(app => app.id === id);
// Present only in Electron mode. In plain browser mode this remains null and
// native features fall back to safe virtual behavior.
const nativeAPI = window.axyronisNative || null;

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.style.setProperty("--accent", state.accent);
  document.body.classList.toggle("light-mode", state.lightMode);
  boot();
  renderDesktopIcons();
  renderStartMenu();
  wireGlobalEvents();
  updateClock();
  setInterval(updateClock, 1000);
});

function boot() {
  // The boot layer is visual only. After the delay, the interactive desktop is
  // revealed without opening any windows, keeping the first screen clean.
  setTimeout(() => {
    $("#boot").classList.add("is-hidden");
    $("#os").classList.remove("is-hidden");
  }, 1700);
}

function wireGlobalEvents() {
  // Global event delegation keeps most shell controls declarative. Buttons use
  // data-action or data-open-app attributes in index.html.
  $("#startButton").addEventListener("click", toggleStart);
  document.addEventListener("click", event => {
    const actionTarget = event.target.closest("[data-action]");
    const openTarget = event.target.closest("[data-open-app]");

    if (openTarget) {
      openApp(openTarget.dataset.openApp);
      closeStart();
    }

    if (actionTarget) {
      const action = actionTarget.dataset.action;
      if (action === "toggle-start") toggleStart();
      if (action === "reboot") location.reload();
      if (action === "refresh-desktop") refreshDesktop();
      if (action === "toggle-quick-center") toggleQuickCenter();
      if (action === "open-command-palette") openCommandPalette();
    }

    if (!event.target.closest(".start-menu") && !event.target.closest("#startButton")) {
      closeStart();
    }
    if (!event.target.closest(".desktop-menu")) {
      closeDesktopMenu();
    }
    if (!event.target.closest(".quick-center") && !event.target.closest("[data-action='toggle-quick-center']")) {
      closeQuickCenter();
    }
  });

  $("#appSearch").addEventListener("input", renderStartMenu);
  $("#commandSearch").addEventListener("input", renderCommandResults);
  $("#commandSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      $(".command-item")?.click();
    }
  });
  $("#commandPalette").addEventListener("click", event => {
    if (event.target.id === "commandPalette") closeCommandPalette();
  });
  $$(".quick-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => toggle.classList.toggle("active"));
  });
  $("#desktop").addEventListener("contextmenu", event => {
    if (event.target.closest(".app-window")) return;
    event.preventDefault();
    openDesktopMenu(event.clientX, event.clientY);
  });
  window.addEventListener("resize", keepWindowsOnScreen);
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeStart();
      closeDesktopMenu();
      closeQuickCenter();
      closeCommandPalette();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandPalette();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "q") {
      event.preventDefault();
      toggleQuickCenter();
    }
  });
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
  $("#trayTime").textContent = time;
  $("#trayDate").textContent = date;
  $("#desktopClock").textContent = time;
}

function renderDesktopIcons() {
  const desktop = $("#desktopIcons");
  desktop.innerHTML = "";
  apps.filter(app => app.desktop).forEach(app => {
    const button = document.createElement("button");
    button.className = "desktop-icon";
    button.dataset.openApp = app.id;
    button.innerHTML = `<span class="icon-tile">${app.symbol}</span><span>${app.name}</span>`;
    button.addEventListener("dblclick", () => openApp(app.id));
    desktop.append(button);
  });
}

function renderStartMenu() {
  const query = ($("#appSearch")?.value || "").trim().toLowerCase();
  const filtered = apps.filter(app => app.name.toLowerCase().includes(query) || app.id.includes(query));
  const pinned = $("#pinnedApps");
  pinned.innerHTML = "";

  filtered.forEach(app => {
    const card = document.createElement("button");
    card.className = "app-card";
    card.dataset.openApp = app.id;
    card.innerHTML = `<span class="icon-tile">${app.symbol}</span><span>${app.name}</span>`;
    pinned.append(card);
  });

  $("#recommendations").innerHTML = [
    ["Continue Editing", "System ideas in Stardust Notes"],
    ["Power Shortcut", "Open System Monitor"],
    ["Personalize", "Change the Axyronis accent color"]
  ].map(item => `<button class="recommendation"><strong>${item[0]}</strong><span>${item[1]}</span></button>`).join("");
}

function toggleStart() {
  state.startOpen = !state.startOpen;
  $("#startMenu").classList.toggle("open", state.startOpen);
  $("#startMenu").setAttribute("aria-hidden", String(!state.startOpen));
  if (state.startOpen) $("#appSearch").focus();
}

function closeStart() {
  state.startOpen = false;
  $("#startMenu").classList.remove("open");
  $("#startMenu").setAttribute("aria-hidden", "true");
}

function toggleQuickCenter() {
  const center = $("#quickCenter");
  const open = !center.classList.contains("open");
  center.classList.toggle("open", open);
  center.setAttribute("aria-hidden", String(!open));
}

function closeQuickCenter() {
  const center = $("#quickCenter");
  center.classList.remove("open");
  center.setAttribute("aria-hidden", "true");
}

function openCommandPalette() {
  closeStart();
  closeDesktopMenu();
  const palette = $("#commandPalette");
  palette.classList.add("open");
  palette.setAttribute("aria-hidden", "false");
  $("#commandSearch").value = "";
  renderCommandResults();
  setTimeout(() => $("#commandSearch").focus(), 30);
}

function closeCommandPalette() {
  const palette = $("#commandPalette");
  palette.classList.remove("open");
  palette.setAttribute("aria-hidden", "true");
}

function getCommands() {
  // Command Palette entries are intentionally simple objects. This makes it
  // easy for contributors to add shortcuts without touching the palette UI.
  const appCommands = apps.map(app => ({
    title: `Open ${app.name}`,
    detail: "Axyronis app",
    run: () => openApp(app.id)
  }));

  return [
    ...appCommands,
    {
      title: "Launch Google Chrome",
      detail: "Open the real Windows Chrome app",
      run: () => openApp("chrome")
    },
    {
      title: "Open Windows App Center",
      detail: "Launch real Windows programs",
      run: () => openApp("windowsApps")
    },
    {
      title: "Arrange Power Workspace",
      detail: "Open Files, Browser, Terminal, and Monitor",
      run: openPowerWorkspace
    },
    {
      title: "Toggle Quick Center",
      detail: "Network, focus, and display controls",
      run: toggleQuickCenter
    },
    {
      title: "Refresh Desktop",
      detail: "Refresh icon layout",
      run: refreshDesktop
    }
  ];
}

function renderCommandResults() {
  const query = ($("#commandSearch")?.value || "").trim().toLowerCase();
  const list = getCommands().filter(command => {
    return !query || command.title.toLowerCase().includes(query) || command.detail.toLowerCase().includes(query);
  }).slice(0, 10);
  const results = $("#commandResults");
  results.innerHTML = "";
  list.forEach(command => {
    const item = document.createElement("button");
    item.className = "command-item";
    item.innerHTML = `<strong>${command.title}</strong><span>${command.detail}</span>`;
    item.addEventListener("click", () => {
      closeCommandPalette();
      command.run();
    });
    results.append(item);
  });
}

function openPowerWorkspace() {
  // A small example of a "workspace preset": open several apps and place their
  // windows in a productive layout. Remixers can add more presets here.
  ["files", "browser", "terminal", "system"].forEach(openApp);
  setTimeout(() => {
    const layout = [
      ["files", 150, 76, 620, 430],
      ["browser", 790, 76, 680, 430],
      ["terminal", 150, 526, 620, 360],
      ["system", 790, 526, 680, 360]
    ];
    layout.forEach(([id, left, top, width, height]) => {
      const entry = state.windows.get(id);
      if (!entry) return;
      entry.el.classList.remove("maximized");
      Object.assign(entry.el.style, {
        left: `${Math.min(left, window.innerWidth - 160)}px`,
        top: `${Math.min(top, window.innerHeight - 140)}px`,
        width: `${Math.min(width, window.innerWidth - 24)}px`,
        height: `${Math.min(height, window.innerHeight - 96)}px`
      });
    });
  }, 120);
}

function openDesktopMenu(x, y) {
  closeStart();
  const menu = $("#desktopMenu");
  const width = 190;
  const height = 188;
  menu.style.left = `${clamp(x, 8, window.innerWidth - width - 8)}px`;
  menu.style.top = `${clamp(y, 8, window.innerHeight - height - 68)}px`;
  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
}

function closeDesktopMenu() {
  const menu = $("#desktopMenu");
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
}

function refreshDesktop() {
  closeDesktopMenu();
  const icons = $("#desktopIcons");
  icons.animate(
    [
      { opacity: 0.55, transform: "translateY(3px)" },
      { opacity: 1, transform: "translateY(0)" }
    ],
    { duration: 180, easing: "ease-out" }
  );
}

function showToast(message, type = "ok") {
  // Lightweight system notifications used by native launchers and other shell
  // actions. They are intentionally non-blocking.
  let tray = $("#toastTray");
  if (!tray) {
    tray = document.createElement("div");
    tray.id = "toastTray";
    tray.className = "toast-tray";
    document.body.append(tray);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  tray.append(toast);
  setTimeout(() => toast.classList.add("show"), 20);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 180);
  }, 3200);
}

function openApp(id) {
  const app = appById(id);
  if (!app) return;

  // Some desktop icons represent real Windows applications. In Electron mode
  // those launch through the native bridge; in browser mode they fall back to a
  // normal educational window explaining the limitation.
  if (nativeAPI && app.nativeLaunch) {
    nativeAPI.launchApp(app.nativeLaunch).then(result => {
      showToast(result.message || (result.ok ? `Launched ${app.name}` : `${app.name} failed to launch`), result.ok ? "ok" : "error");
      if (!result.ok) openWindowApp(app);
    }).catch(error => {
      showToast(error.message || String(error), "error");
      openWindowApp(app);
    });
    return;
  }

  openWindowApp(app);
}

function openWindowApp(app) {
  // Create a virtual app window from the template in index.html.
  const id = app.id;
  const existing = state.windows.get(id);
  if (existing) {
    existing.el.classList.remove("is-hidden");
    activateWindow(id);
    return;
  }

  const template = $("#windowTemplate").content.firstElementChild.cloneNode(true);
  const [width, height] = app.size;
  const offset = state.windows.size * 28;
  template.dataset.app = id;
  template.style.width = `${Math.min(width, window.innerWidth - 24)}px`;
  template.style.height = `${Math.min(height, window.innerHeight - 96)}px`;
  template.style.left = `${Math.max(12, 160 + offset)}px`;
  template.style.top = `${Math.max(12, 96 + offset)}px`;
  $(".app-symbol", template).textContent = app.symbol;
  $(".app-name", template).textContent = app.name;
  $(".window-body", template).append(app.render());
  $("#windowLayer").append(template);

  state.windows.set(id, { app, el: template, minimized: false, maximized: false, restore: null });
  wireWindow(template, id);
  activateWindow(id);
  renderTaskbar();
}

function wireWindow(win, id) {
  // Window controls are implemented once here and reused by every virtual app.
  win.addEventListener("mousedown", () => activateWindow(id));
  $(".window-controls", win).addEventListener("click", event => {
    const button = event.target.closest("[data-window-action]");
    if (!button) return;
    const action = button.dataset.windowAction;
    if (action === "close") closeWindow(id);
    if (action === "minimize") minimizeWindow(id);
    if (action === "maximize") toggleMaximize(id);
  });
  makeDraggable(win, $(".window-titlebar", win));
}

function makeDraggable(win, handle) {
  // Simple pointer-based drag behavior for educational readability.
  let drag = null;
  handle.addEventListener("pointerdown", event => {
    if (event.target.closest("button") || win.classList.contains("maximized")) return;
    drag = {
      x: event.clientX,
      y: event.clientY,
      left: win.offsetLeft,
      top: win.offsetTop
    };
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", event => {
    if (!drag) return;
    const nextLeft = clamp(drag.left + event.clientX - drag.x, 6, window.innerWidth - 120);
    const nextTop = clamp(drag.top + event.clientY - drag.y, 6, window.innerHeight - 120);
    win.style.left = `${nextLeft}px`;
    win.style.top = `${nextTop}px`;
  });

  handle.addEventListener("pointerup", () => {
    drag = null;
  });
}

function activateWindow(id) {
  const entry = state.windows.get(id);
  if (!entry) return;
  state.active = id;
  entry.el.style.zIndex = ++state.z;
  $$(".app-window").forEach(win => win.classList.toggle("focused", win === entry.el));
  renderTaskbar();
}

function closeWindow(id) {
  const entry = state.windows.get(id);
  if (!entry) return;
  entry.el.remove();
  state.windows.delete(id);
  if (state.active === id) state.active = null;
  renderTaskbar();
}

function minimizeWindow(id) {
  const entry = state.windows.get(id);
  if (!entry) return;
  entry.el.classList.add("is-hidden");
  entry.minimized = true;
  renderTaskbar();
}

function toggleMaximize(id) {
  const entry = state.windows.get(id);
  if (!entry) return;
  const el = entry.el;
  if (entry.maximized) {
    el.classList.remove("maximized");
    Object.assign(el.style, entry.restore);
    entry.maximized = false;
  } else {
    entry.restore = {
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
      height: el.style.height
    };
    el.classList.add("maximized");
    entry.maximized = true;
  }
  activateWindow(id);
}

function renderTaskbar() {
  // The taskbar mirrors currently open virtual windows. Real Windows apps are
  // launched outside Axyronis and are not tracked here.
  const bar = $("#taskbarApps");
  bar.innerHTML = "";
  state.windows.forEach((entry, id) => {
    const button = document.createElement("button");
    button.className = `taskbar-item ${state.active === id && !entry.el.classList.contains("is-hidden") ? "active" : ""}`;
    button.innerHTML = `<span class="app-symbol">${entry.app.symbol}</span><span>${entry.app.name}</span>`;
    button.addEventListener("click", () => {
      if (state.active === id && !entry.el.classList.contains("is-hidden")) {
        minimizeWindow(id);
      } else {
        entry.el.classList.remove("is-hidden");
        entry.minimized = false;
        activateWindow(id);
      }
    });
    bar.append(button);
  });
}

function keepWindowsOnScreen() {
  state.windows.forEach(entry => {
    const rect = entry.el.getBoundingClientRect();
    entry.el.style.left = `${clamp(rect.left, 6, window.innerWidth - 120)}px`;
    entry.el.style.top = `${clamp(rect.top, 6, window.innerHeight - 120)}px`;
  });
}

function renderFiles() {
  // Browser mode uses virtual sample data; Electron mode uses real local files.
  if (nativeAPI) return renderNativeFiles();

  const root = div("app-layout two-column");
  const sidebar = div("sidebar");
  const content = div("app-layout");
  const preview = div("file-preview");
  const path = div("file-path");
  const grid = div("file-grid");

  const refresh = () => {
    sidebar.innerHTML = "";
    Object.keys(files).forEach(location => {
      const item = document.createElement("button");
      item.className = location === state.fileLocation ? "active" : "";
      item.textContent = location;
      item.addEventListener("click", () => {
        state.fileLocation = location;
        preview.innerHTML = "Select an item to view details.";
        refresh();
      });
      sidebar.append(item);
    });

    path.textContent = `Axyronis://${state.fileLocation}`;
    grid.innerHTML = "";
    files[state.fileLocation].forEach(([type, name]) => {
      const tile = document.createElement("button");
      tile.className = "file-item";
      tile.innerHTML = `<span class="icon-tile">${type === "folder" ? "D" : type === "image" ? "I" : "T"}</span><strong>${name}</strong>`;
      tile.addEventListener("click", () => {
        preview.innerHTML = `<strong>${name}</strong><p>${fileDescription(type, name)}</p>`;
      });
      grid.append(tile);
    });
  };

  content.append(path, grid, preview);
  root.append(sidebar, content);
  refresh();
  return root;
}

function renderNativeFiles() {
  // Real local file browser. The renderer asks electron-main.js to read folders
  // and open paths, so Node.js APIs stay outside the UI layer.
  const root = div("app-layout native-files");
  const toolbar = div("toolbar");
  const up = button("Up", "text-button");
  const choose = button("Choose Folder", "text-button primary");
  const open = button("Open Selected", "text-button");
  const status = document.createElement("span");
  status.textContent = "Reading local files...";
  const pathLine = div("file-path");
  const grid = div("file-grid native-file-grid");
  const preview = div("file-preview");
  let currentPath = "";
  let parentPath = "";
  let selectedPath = "";

  toolbar.append(up, choose, open, status);
  root.append(toolbar, pathLine, grid, preview);

  const load = async targetPath => {
    grid.innerHTML = "";
    preview.textContent = "Select an item to view details.";
    status.textContent = "Loading...";
    try {
      const result = await nativeAPI.listDir(targetPath);
      currentPath = result.path;
      parentPath = result.parent;
      pathLine.textContent = currentPath;
      status.textContent = `${result.items.length} items`;
      result.items.forEach(item => {
        const tile = document.createElement("button");
        tile.className = "file-item";
        tile.innerHTML = `
          <span class="icon-tile">${item.type === "folder" ? "D" : "F"}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${formatFileMeta(item)}</small>
        `;
        tile.addEventListener("click", () => {
          selectedPath = item.path;
          preview.innerHTML = `<strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.path)}</p><p>${formatFileMeta(item)}</p>`;
        });
        tile.addEventListener("dblclick", () => {
          if (item.type === "folder") load(item.path);
          else nativeAPI.openPath(item.path);
        });
        grid.append(tile);
      });
    } catch (error) {
      status.textContent = "Load failed";
      preview.textContent = error.message || String(error);
    }
  };

  up.addEventListener("click", () => parentPath && load(parentPath));
  choose.addEventListener("click", async () => {
    const picked = await nativeAPI.pickFolder();
    if (picked) load(picked);
  });
  open.addEventListener("click", () => {
    if (selectedPath) nativeAPI.openPath(selectedPath);
  });

  load();
  return root;
}

function fileDescription(type, name) {
  if (type === "folder") return "This virtual folder can connect to a real file system in the desktop edition.";
  if (type === "image") return "Axyronis visual asset preview for wallpapers, themes, and system identity.";
  return `${name} is a sample file inside the Axyronis virtual environment.`;
}

function renderBrowser() {
  if (nativeAPI) return renderNativeBrowser();

  const root = div("app-layout");
  const bar = div("browser-bar");
  const input = document.createElement("input");
  input.value = "axyronis://home";
  const go = button("GO", "text-button primary");
  const page = div("browser-page");
  bar.append(input, go);
  root.append(bar, page);

  const draw = () => {
    const value = input.value.trim();
    page.innerHTML = `
      <section class="portal-hero">
        <h2>Axyronis Portal</h2>
        <p>${value || "axyronis://home"}</p>
      </section>
      <div class="portal-grid">
        <article class="portal-card"><h3>System Vision</h3><p>A personal desktop environment focused on speed, privacy, customization, and visual polish.</p></article>
        <article class="portal-card"><h3>Current Focus</h3><p>Desktop, windows, files, terminal, settings, browser, and monitor are interactive.</p></article>
        <article class="portal-card"><h3>Next Layer</h3><p>The desktop edition can launch real Windows apps and connect to local files.</p></article>
      </div>
    `;
  };
  go.addEventListener("click", draw);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") draw();
  });
  draw();
  return root;
}

function renderNativeBrowser() {
  // Electron webview gives Nebula Browser real web navigation while keeping it
  // visually inside the Axyronis desktop.
  const root = div("app-layout native-browser");
  const bar = div("browser-bar");
  const back = button("<", "text-button");
  const forward = button(">", "text-button");
  const reload = button("Reload", "text-button");
  const input = document.createElement("input");
  const go = button("Go", "text-button primary");
  const external = button("Open External", "text-button");
  const webview = document.createElement("webview");
  webview.className = "webview";
  webview.setAttribute("allowpopups", "");
  input.value = "https://www.bing.com";
  webview.src = input.value;

  const navigate = () => {
    const url = normalizeUrl(input.value);
    input.value = url;
    webview.src = url;
  };

  go.addEventListener("click", navigate);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") navigate();
  });
  back.addEventListener("click", () => webview.canGoBack() && webview.goBack());
  forward.addEventListener("click", () => webview.canGoForward() && webview.goForward());
  reload.addEventListener("click", () => webview.reload());
  external.addEventListener("click", () => nativeAPI.openExternal(webview.getURL() || input.value));
  webview.addEventListener("did-navigate", event => {
    input.value = event.url;
  });
  webview.addEventListener("did-navigate-in-page", event => {
    input.value = event.url;
  });

  bar.append(back, forward, reload, input, go, external);
  root.append(bar, webview);
  return root;
}

function renderChromeLauncher() {
  const root = div("app-layout");
  root.innerHTML = `
    <section class="native-launch-hero">
      <div class="icon-tile">G</div>
      <div>
        <h2>Google Chrome</h2>
        <p>In the desktop edition, this launches the real Google Chrome installed on Windows.</p>
      </div>
    </section>
  `;

  const bar = div("browser-bar");
  const input = document.createElement("input");
  input.value = "https://www.google.com";
  const launch = button("Open with Chrome", "text-button primary");
  const edge = button("Open with Edge", "text-button");
  const status = div("file-preview");
  status.textContent = nativeAPI ? "Ready to launch a real browser." : "Web mode cannot launch local Chrome. Start the desktop edition instead.";

  launch.addEventListener("click", async () => {
    if (!nativeAPI) return;
    const result = await nativeAPI.launchApp("chrome", [normalizeUrl(input.value)]);
    status.textContent = result.message;
    showToast(result.message, result.ok ? "ok" : "error");
  });

  edge.addEventListener("click", async () => {
    if (!nativeAPI) return;
    const result = await nativeAPI.launchApp("edge", [normalizeUrl(input.value)]);
    status.textContent = result.message;
    showToast(result.message, result.ok ? "ok" : "error");
  });

  bar.append(input, launch, edge);
  root.append(bar, status);
  return root;
}

function renderWindowsApps() {
  // A launcher for real Windows applications exposed by electron-main.js.
  const root = div("app-layout");
  const header = div("toolbar");
  const status = document.createElement("span");
  status.textContent = nativeAPI ? "Scanning Windows apps..." : "Web mode cannot launch local apps.";
  const refresh = button("Refresh", "text-button");
  header.append(status, refresh);

  const grid = div("launcher-grid");
  const runBar = div("browser-bar");
  const runInput = document.createElement("input");
  runInput.placeholder = "Enter an app or command, such as notepad, calc, or mspaint";
  const runButton = button("Run", "text-button primary");
  runBar.append(runInput, runButton);

  const launch = async appId => {
    if (!nativeAPI) return;
    const result = await nativeAPI.launchApp(appId);
    status.textContent = result.message;
    showToast(result.message, result.ok ? "ok" : "error");
  };

  const draw = async () => {
    grid.innerHTML = "";
    if (!nativeAPI) {
      grid.innerHTML = `<article class="launcher-card"><strong>Desktop Edition Required</strong><span>Double-click Start-Axyronis.bat to launch Electron mode.</span></article>`;
      return;
    }

    const nativeApps = await nativeAPI.listApps();
    nativeApps.forEach(item => {
      const card = document.createElement("button");
      card.className = "launcher-card";
      card.innerHTML = `
        <span class="icon-tile">${item.name.slice(0, 1).toUpperCase()}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${item.available ? "Ready" : "System launch"}</small>
      `;
      card.addEventListener("click", () => launch(item.id));
      grid.append(card);
    });
    status.textContent = `${nativeApps.length} system launchers`;
  };

  const run = async () => {
    if (!nativeAPI) return;
    const result = await nativeAPI.runApp(runInput.value);
    status.textContent = result.message;
    showToast(result.message, result.ok ? "ok" : "error");
  };

  refresh.addEventListener("click", draw);
  runButton.addEventListener("click", run);
  runInput.addEventListener("keydown", event => {
    if (event.key === "Enter") run();
  });

  root.append(header, grid, runBar);
  draw();
  return root;
}

function renderTerminal() {
  // Built-in commands work everywhere. In Electron mode, unknown commands are
  // passed to the native bridge and executed on the host system.
  const root = div("app-layout");
  const output = div("terminal-output");
  const input = document.createElement("input");
  input.className = "terminal-input";
  input.placeholder = "Type help to view commands";
  root.append(output, input);
  const lines = ["Axyronis Terminal 1.0", "Type help to view available commands."];

  const print = () => {
    output.textContent = lines.join("\n");
    output.scrollTop = output.scrollHeight;
  };

  input.addEventListener("keydown", async event => {
    if (event.key !== "Enter") return;
    const command = input.value.trim();
    input.value = "";
    lines.push(`axyronis> ${command}`);
    const [name, ...args] = command.split(" ");
    if (name === "help") lines.push("help, clear, date, apps, about, theme, echo");
    else if (name === "clear") lines.length = 0;
    else if (name === "date") lines.push(new Date().toLocaleString("zh-CN"));
    else if (name === "apps") lines.push(apps.map(app => app.name).join(", "));
    else if (name === "about") lines.push("Axyronis is your personal virtual desktop environment.");
    else if (name === "theme") lines.push(`accent=${state.accent} light=${state.lightMode}`);
    else if (name === "echo") lines.push(args.join(" "));
    else if (nativeAPI && command) {
      lines.push(await nativeAPI.runCommand(command));
    }
    else if (command) lines.push(`Unknown command: ${command}`);
    print();
  });

  print();
  setTimeout(() => input.focus(), 60);
  return root;
}

function renderNotes() {
  const root = div("app-layout");
  const toolbar = div("toolbar");
  const save = button("Save", "text-button primary");
  const clear = button("Clear", "text-button");
  const status = document.createElement("span");
  status.textContent = "Autosaved locally";
  toolbar.append(status, save, clear);
  const area = document.createElement("textarea");
  area.className = "note-pad";
  area.value = localStorage.getItem("axyronis-notes") || "Axyronis system ideas:\n- A clean personal desktop\n- Built-in files, settings, terminal, and browser\n- Real Windows app launching in desktop mode\n";
  save.addEventListener("click", () => {
    localStorage.setItem("axyronis-notes", area.value);
    status.textContent = "Saved " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  });
  clear.addEventListener("click", () => {
    area.value = "";
    area.focus();
  });
  area.addEventListener("input", () => localStorage.setItem("axyronis-notes", area.value));
  root.append(toolbar, area);
  return root;
}

function renderSettings() {
  // Settings are intentionally local and simple. This makes them easy to study
  // and safe to change during UI experiments.
  const root = div("app-layout");
  const grid = div("settings-grid");
  const accents = ["#33e0c2", "#ff5fa2", "#ffc857", "#7c8cff", "#65f283"];

  grid.innerHTML = `
    <section class="setting-block">
      <h3>Appearance</h3>
      <p>Adjust the Axyronis accent color and light mode.</p>
      <div class="settings-row"><span>Light Mode</span><button id="lightToggle" class="toggle ${state.lightMode ? "on" : ""}" title="Light Mode"></button></div>
      <div class="settings-row"><span>Accent Color</span><div class="swatches"></div></div>
    </section>
    <section class="setting-block">
      <h3>Performance</h3>
      <p>Virtual performance mode affects System Monitor visualization.</p>
      <div class="settings-row"><span>Performance Tier</span><input id="perf" type="range" min="1" max="5" value="4" /></div>
    </section>
    <section class="setting-block">
      <h3>Privacy</h3>
      <p>Notes and preferences are stored locally on this machine.</p>
      <div class="settings-row"><span>Local First</span><button class="toggle on" title="Local First"></button></div>
    </section>
    <section class="setting-block">
      <h3>System Info</h3>
      <p>Axyronis OS Prototype 1.0<br />Build AX-0612</p>
    </section>
  `;

  const swatches = $(".swatches", grid);
  accents.forEach(color => {
    const swatch = document.createElement("button");
    swatch.className = "swatch";
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener("click", () => {
      state.accent = color;
      localStorage.setItem("axyronis-accent", color);
      document.documentElement.style.setProperty("--accent", color);
    });
    swatches.append(swatch);
  });

  $("#lightToggle", grid).addEventListener("click", event => {
    state.lightMode = !state.lightMode;
    localStorage.setItem("axyronis-light", String(state.lightMode));
    document.body.classList.toggle("light-mode", state.lightMode);
    event.currentTarget.classList.toggle("on", state.lightMode);
  });

  root.append(grid);
  return root;
}

function renderSystem() {
  const root = div("app-layout");
  const grid = div("metrics-grid");
  const metrics = [
    ["CPU", 34, "Axyron Core X8"],
    ["Memory", 58, "16 GB virtual"],
    ["Storage", 71, "512 GB nebula disk"],
    ["Network", 92, "Quantum Link"]
  ];
  grid.innerHTML = metrics.map(([name, value, detail]) => `
    <article class="metric" data-base="${value}">
      <span>${name}</span>
      <strong>${value}%</strong>
      <div class="meter"><span style="--value:${value}%"></span></div>
      <p>${detail}</p>
    </article>
  `).join("");

  const processes = div("process-list");
  processes.innerHTML = [
    ["Desktop Shell", "9%"],
    ["Nebula Render", "13%"],
    ["Window Manager", "5%"],
    ["Local Storage", "2%"]
  ].map(item => `<div class="process"><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join("");

  setInterval(() => {
    $$(".metric", root).forEach(metric => {
      const base = Number(metric.dataset.base);
      const value = clamp(Math.round(base + Math.random() * 16 - 8), 4, 98);
      $("strong", metric).textContent = `${value}%`;
      $(".meter span", metric).style.setProperty("--value", `${value}%`);
    });
  }, 1800);

  if (nativeAPI) {
    nativeAPI.getSystemInfo().then(info => {
      const panel = div("native-info");
      panel.innerHTML = `
        <h3>Host Machine</h3>
        <div><span>User</span><strong>${escapeHtml(info.user)}</strong></div>
        <div><span>Host</span><strong>${escapeHtml(info.hostname)}</strong></div>
        <div><span>System</span><strong>${escapeHtml(info.platform)} ${escapeHtml(info.release)}</strong></div>
        <div><span>Arch</span><strong>${escapeHtml(info.arch)}</strong></div>
        <div><span>CPU</span><strong>${info.cpus} cores</strong></div>
        <div><span>Memory</span><strong>${formatBytes(info.freeMem)} / ${formatBytes(info.totalMem)}</strong></div>
      `;
      root.append(panel);
    }).catch(() => {});
  }

  root.append(grid, processes);
  return root;
}

function renderCalculator() {
  const root = div("calc");
  const display = div("calc-display");
  display.textContent = "0";
  const keys = div("calc-keys");
  const labels = ["C", "(", ")", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "DEL", "="];
  let expr = "";

  labels.forEach(label => {
    const key = button(label, `calc-key ${"/+-*=".includes(label) ? "operator" : ""}`);
    key.addEventListener("click", () => {
      if (label === "C") expr = "";
      else if (label === "DEL") expr = expr.slice(0, -1);
      else if (label === "=") {
        try {
          expr = String(Function(`"use strict"; return (${expr || 0})`)());
        } catch {
          expr = "Error";
        }
      } else {
        if (expr === "Error") expr = "";
        expr += label;
      }
      display.textContent = expr || "0";
    });
    keys.append(key);
  });
  root.append(display, keys);
  return root;
}

function renderAbout() {
  const root = div("app-layout");
  root.innerHTML = `
    <section class="portal-hero">
      <h2>Axyronis OS</h2>
      <p>Your personal desktop environment is online.</p>
    </section>
    <div class="portal-grid">
      <article class="portal-card"><h3>Desktop Experience</h3><p>Start menu, taskbar, desktop icons, and multi-window control.</p></article>
      <article class="portal-card"><h3>Built-In Tools</h3><p>Files, browser, terminal, notes, settings, monitor, and calculator.</p></article>
      <article class="portal-card"><h3>Native Power</h3><p>The desktop edition launches Windows apps and reads local folders.</p></article>
    </div>
  `;
  return root;
}

function div(className) {
  const el = document.createElement("div");
  el.className = className;
  return el;
}

function button(text, className) {
  const el = document.createElement("button");
  el.className = className;
  el.textContent = text;
  return el;
}

function normalizeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "https://www.bing.com";
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(text)) return `https://${text}`;
  return `https://www.bing.com/search?q=${encodeURIComponent(text)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[index]}`;
}

function formatFileMeta(item) {
  const size = item.type === "folder" ? "Folder" : formatBytes(item.size);
  const date = item.modified ? new Date(item.modified).toLocaleDateString("en-US") : "";
  return [size, date].filter(Boolean).join(" - ");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
