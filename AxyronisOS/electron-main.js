// Axyronis Electron main process
// ------------------------------
// This file is the trusted native layer. It creates the app window and exposes
// carefully scoped IPC handlers for local files, Windows app launching, system
// information, and terminal execution.

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const os = require("os");
const { exec, spawn } = require("child_process");

let mainWindow;

// Real Windows application launch registry.
// Add more apps here for remixing. Use known executable paths when available,
// and keep a command fallback for systems where the app is on PATH.
const windowsApps = {
  chrome: {
    name: "Google Chrome",
    command: "chrome",
    paths: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    ]
  },
  edge: {
    name: "Microsoft Edge",
    command: "msedge",
    paths: [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    ]
  },
  explorer: { name: "File Explorer", command: "explorer.exe" },
  notepad: { name: "Notepad", command: "notepad.exe" },
  calculator: { name: "Windows Calculator", command: "calc.exe" },
  taskmgr: { name: "Task Manager", command: "taskmgr.exe" },
  cmd: { name: "Command Prompt", command: "cmd.exe" },
  powershell: { name: "PowerShell", command: "powershell.exe" },
  paint: { name: "Paint", command: "mspaint.exe" }
};

function createWindow() {
  // Renderer security settings:
  // - contextIsolation keeps the web page separate from Electron internals.
  // - nodeIntegration stays disabled.
  // - preload.js exposes a small, reviewed API surface.
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 840,
    minWidth: 920,
    minHeight: 620,
    title: "Axyronis",
    backgroundColor: "#080a0f",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#10141f",
      symbolColor: "#f6f8fb",
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("system:getInfo", async () => ({
  // Read-only host information for System Monitor.
  platform: os.platform(),
  release: os.release(),
  arch: os.arch(),
  hostname: os.hostname(),
  user: os.userInfo().username,
  homeDir: os.homedir(),
  cpus: os.cpus().length,
  totalMem: os.totalmem(),
  freeMem: os.freemem()
}));

ipcMain.handle("fs:pickFolder", async () => {
  // Native folder picker. The selected path is returned to the renderer, which
  // then asks fs:listDir to read it.
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle("fs:listDir", async (_event, targetPath) => {
  // Limit the number of returned entries so huge folders do not freeze the UI.
  const safePath = targetPath || os.homedir();
  const entries = await fs.readdir(safePath, { withFileTypes: true });
  const items = await Promise.all(
    entries.slice(0, 120).map(async entry => {
      const fullPath = path.join(safePath, entry.name);
      let stat = null;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        stat = null;
      }
      return {
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? "folder" : "file",
        size: stat ? stat.size : 0,
        modified: stat ? stat.mtime.toISOString() : null
      };
    })
  );
  return { path: safePath, parent: path.dirname(safePath), items };
});

ipcMain.handle("fs:openPath", async (_event, targetPath) => {
  if (!targetPath) return false;
  await shell.openPath(targetPath);
  return true;
});

ipcMain.handle("shell:openExternal", async (_event, url) => {
  if (!/^https?:\/\//i.test(url)) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("apps:list", async () => {
  // Return launcher availability so the UI can display helpful status text.
  return Object.entries(windowsApps).map(([id, item]) => ({
    id,
    name: item.name,
    available: Boolean(resolveAppCommand(item))
  }));
});

ipcMain.handle("apps:launch", async (_event, appId, extraArgs = []) => {
  // Launch one of the approved registry entries. Avoid exposing arbitrary
  // executable paths through this handler.
  const item = windowsApps[appId];
  if (!item) throw new Error(`Unknown app: ${appId}`);
  return launchApp(item, Array.isArray(extraArgs) ? extraArgs : []);
});

ipcMain.handle("apps:run", async (_event, command) => {
  // This intentionally behaves like a lightweight Windows Run dialog. It is
  // powerful, so the README warns learners to avoid destructive commands.
  const text = String(command || "").trim();
  if (!text) return { ok: false, message: "Enter an app or command to run." };
  if (text.length > 260) return { ok: false, message: "Command is too long." };
  launchViaShell(text);
  return { ok: true, message: `Requested launch: ${text}` };
});

ipcMain.handle("terminal:run", async (_event, command) => {
  // Terminal execution is capped by length and timeout to keep experiments from
  // hanging the desktop forever.
  const text = String(command || "").trim();
  if (!text) return "";
  if (text.length > 260) return "Command is too long.";

  return new Promise(resolve => {
    exec(text, { cwd: os.homedir(), windowsHide: true, timeout: 8000 }, (error, stdout, stderr) => {
      const output = [stdout, stderr, error ? error.message : ""].filter(Boolean).join("\n");
      resolve(output || "Done.");
    });
  });
});

function resolveAppCommand(item) {
  if (process.platform === "win32" && item.paths) {
    return item.paths.find(candidate => fsSync.existsSync(candidate)) || item.command;
  }
  return item.command;
}

function launchApp(item, extraArgs = []) {
  // If we can resolve a real executable, spawn it directly. Otherwise ask the
  // Windows shell to resolve the command, matching normal desktop behavior.
  const command = resolveAppCommand(item);
  if (!command) return { ok: false, message: `${item.name} is not available.` };

  try {
    if (fsSync.existsSync(command)) {
      const child = spawn(command, extraArgs, {
        detached: true,
        stdio: "ignore",
        windowsHide: false
      });
      child.unref();
    } else {
      launchViaShell([command, ...extraArgs].join(" "));
    }
    return { ok: true, message: `Launched ${item.name}` };
  } catch (error) {
    return { ok: false, message: error.message || String(error) };
  }
}

function launchViaShell(command) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/s", "/c", `start "" ${command}`], {
      detached: true,
      stdio: "ignore",
      windowsHide: false
    }).unref();
    return;
  }

  spawn(command, {
    detached: true,
    stdio: "ignore"
  }).unref();
}
