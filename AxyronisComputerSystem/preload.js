// Axyronis preload bridge
// -----------------------
// The renderer does not get direct Node.js access. Instead, this file exposes a
// small API on window.axyronisNative and forwards calls to electron-main.js.
// This pattern keeps native power explicit and easier to review.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("axyronisNative", {
  isElectron: true,
  getSystemInfo: () => ipcRenderer.invoke("system:getInfo"),
  pickFolder: () => ipcRenderer.invoke("fs:pickFolder"),
  pickWallpaper: () => ipcRenderer.invoke("wallpaper:pickImage"),
  listDir: path => ipcRenderer.invoke("fs:listDir", path),
  openPath: path => ipcRenderer.invoke("fs:openPath", path),
  openExternal: url => ipcRenderer.invoke("shell:openExternal", url),
  listApps: () => ipcRenderer.invoke("apps:list"),
  launchApp: (appId, extraArgs) => ipcRenderer.invoke("apps:launch", appId, extraArgs),
  runApp: command => ipcRenderer.invoke("apps:run", command),
  runCommand: command => ipcRenderer.invoke("terminal:run", command)
});
