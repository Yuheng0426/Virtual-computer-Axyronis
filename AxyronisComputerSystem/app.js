// Axyronis renderer process
// -------------------------
// This file runs inside the computer-style desktop UI. It owns the virtual shell:
// app registry, windows, menus, panels, and the built-in educational apps.
// Native Windows actions are never called directly here; they go through
// window.axyronisNative, which is provided by preload.js in Electron mode.

// App registry:
// Add new virtual apps here. Each app points to a render function that returns
// a DOM node. Native Windows programs are launched from the Windows Apps panel,
// while desktop icons stay inside the Axyronis computer system.
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
    size: [980, 640],
    render: renderChromeBrowser
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
    size: [1320, 820],
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
const wallpaperPresets = [
  {
    id: "axyronis-grid",
    name: "Axyronis Grid",
    image: 'url("./assets/axyronis-wallpaper.png")',
    preview: "radial-gradient(circle at 22% 30%, rgba(51,224,194,0.38), transparent 24%), radial-gradient(circle at 74% 38%, rgba(255,95,162,0.28), transparent 26%), linear-gradient(135deg, #08121a, #171528 48%, #08241f)"
  },
  {
    id: "midnight-lab",
    name: "Midnight Lab",
    image: "radial-gradient(circle at 22% 24%, rgba(51,224,194,0.42), transparent 28%), radial-gradient(circle at 80% 35%, rgba(255,95,162,0.32), transparent 30%), linear-gradient(135deg, #070a12, #151526 48%, #061b18)",
    preview: "radial-gradient(circle at 22% 24%, rgba(51,224,194,0.42), transparent 28%), radial-gradient(circle at 80% 35%, rgba(255,95,162,0.32), transparent 30%), linear-gradient(135deg, #070a12, #151526 48%, #061b18)"
  },
  {
    id: "solar-array",
    name: "Solar Array",
    image: "radial-gradient(circle at 42% 70%, rgba(255,200,87,0.36), transparent 26%), radial-gradient(circle at 78% 25%, rgba(124,140,255,0.3), transparent 28%), linear-gradient(135deg, #0a1016, #261524 45%, #10201c)",
    preview: "radial-gradient(circle at 42% 70%, rgba(255,200,87,0.36), transparent 26%), radial-gradient(circle at 78% 25%, rgba(124,140,255,0.3), transparent 28%), linear-gradient(135deg, #0a1016, #261524 45%, #10201c)"
  },
  {
    id: "clean-slate",
    name: "Clean Slate",
    image: "linear-gradient(135deg, #111827, #172033 44%, #0f2a2a)",
    preview: "linear-gradient(135deg, #111827, #172033 44%, #0f2a2a)"
  }
];

const defaultPreferences = {
  systemName: "Axyronis Computer System",
  desktopBrand: "Axyronis",
  userName: "Axyronis User",
  deviceName: "Axyronis Workstation",
  bootSubtitle: "Personal Computing Environment",
  avatarInitial: "A",
  avatarImage: "",
  avatarSource: "Initial avatar",
  accent: "#33e0c2",
  lightMode: false,
  wallpaperDim: 20,
  wallpaperPreset: "axyronis-grid",
  wallpaperImage: wallpaperPresets[0].image,
  wallpaperSource: "Built-in preset",
  glassBlur: 30,
  startupMode: "clean",
  language: "en-US"
};

const preferences = loadPreferences();

const state = {
  windows: new Map(),
  z: 30,
  active: null,
  startOpen: false,
  settingsSection: "identity",
  settingsCategory: "home",
  settingsPage: "home",
  fileLocation: "Desktop",
  accent: preferences.accent,
  lightMode: preferences.lightMode
};

// Localized shell strings. Add a new language by copying the English object and
// replacing the values. User-created names such as systemName stay editable in
// Settings, while these strings cover the desktop shell and Settings app.
const locales = {
  "en-US": {
    name: "English (United States)",
    direction: "ltr",
    strings: {
      "app.files.name": "Axyronis Files",
      "app.browser.name": "Nebula Browser",
      "app.chrome.name": "Google Chrome",
      "app.windowsApps.name": "Windows Apps",
      "app.terminal.name": "Axyron Terminal",
      "app.notes.name": "Stardust Notes",
      "app.settings.name": "Settings",
      "app.system.name": "System Monitor",
      "app.calculator.name": "Calculator",
      "app.about.name": "About Axyronis",
      "shell.searchApps": "Search apps, files, and settings",
      "shell.pinnedApps": "Pinned Apps",
      "shell.recommended": "Recommended",
      "shell.commandPalette": "Command Palette",
      "shell.settings": "Settings",
      "shell.restartDemo": "Restart Demo",
      "shell.quickCenter": "Quick Center",
      "shell.quantumLink": "Quantum Link",
      "shell.focusMode": "Focus Mode",
      "shell.nightShift": "Night Shift",
      "shell.silentMode": "Silent Mode",
      "shell.brightness": "Brightness",
      "shell.interfaceScale": "Interface Scale",
      "shell.personalize": "Personalize",
      "shell.openTerminal": "Open in Terminal",
      "shell.newNote": "New Note",
      "shell.about": "About Axyronis",
      "shell.typeCommand": "Type a command or app name",
      "rec.continue": "Continue Editing",
      "rec.continueDetail": "System ideas in Stardust Notes",
      "rec.power": "Power Shortcut",
      "rec.powerDetail": "Open System Monitor",
      "rec.personalize": "Personalize",
      "rec.personalizeDetail": "Change the Axyronis accent color",
      "settings.home": "Home",
      "settings.search": "Find a setting",
      "settings.profileStatus": "Local Axyronis account",
      "settings.deviceCard": "Device",
      "settings.rename": "Rename",
      "settings.connected": "Connected",
      "settings.secure": "Secure",
      "settings.upToDate": "Up to date",
      "settings.lastChecked": "Last checked just now",
      "settings.recommended": "Recommended settings",
      "settings.recommendedDesc": "Recently used and common controls",
      "settings.camera": "Camera",
      "settings.microphone": "Microphone",
      "settings.printers": "Printers & scanners",
      "settings.storage": "Cloud storage",
      "settings.storageDesc": "Simulated learning storage for files, notes, and backups.",
      "settings.backup": "Computer backup",
      "settings.manageStorage": "Manage storage",
      "settings.system": "System",
      "settings.devices": "Bluetooth & devices",
      "settings.network": "Network & Internet",
      "settings.personalization": "Personalization",
      "settings.apps": "Apps",
      "settings.accounts": "Accounts",
      "settings.timeLanguage": "Time & language",
      "settings.gaming": "Gaming",
      "settings.accessibility": "Accessibility",
      "settings.privacy": "Privacy & security",
      "settings.update": "System Updates",
      "settings.developer": "Developer",
      "settings.display": "Display",
      "settings.sound": "Sound",
      "settings.power": "Power",
      "settings.wallpaper": "Wallpaper",
      "settings.colors": "Colors",
      "settings.identity": "Identity",
      "settings.startup": "Startup",
      "settings.language": "Language",
      "settings.region": "Region",
      "settings.keyboard": "Keyboard",
      "settings.devFreedom": "Developer freedom",
      "settings.open": "Open",
      "settings.launch": "Launch",
      "settings.arrange": "Arrange",
      "settings.refresh": "Refresh",
      "settings.reset": "Reset",
      "settings.chooseImage": "Choose Image",
      "settings.useInitial": "Use Initial",
      "settings.systemIdentity": "System identity",
      "settings.identityDesc": "Rename the system for your own remix or research build.",
      "settings.appearanceDesc": "Tune the visual language without touching CSS.",
      "settings.wallpaperTuning": "Wallpaper tuning",
      "settings.wallpaperDesc": "Fine-tune how the wallpaper sits behind the desktop shell.",
      "settings.desktopBehavior": "Desktop behavior",
      "settings.desktopDesc": "Small shell controls that are useful for remixers.",
      "settings.startupDesc": "Choose what Axyronis opens after the boot animation.",
      "settings.languageDesc": "Switch the desktop and Settings language at any time.",
      "settings.developerDesc": "This project is intentionally open for major rewrites.",
      "settings.systemName": "System Name",
      "settings.desktopBrand": "Desktop Brand",
      "settings.userName": "User Name",
      "settings.deviceName": "Device Name",
      "settings.bootSubtitle": "Boot Subtitle",
      "settings.avatarInitial": "Avatar Initial",
      "settings.avatarImage": "Avatar Image",
      "settings.lightMode": "Light Mode",
      "settings.glassBlur": "Glass Blur",
      "settings.accentColor": "Accent Color",
      "settings.wallpaperDim": "Wallpaper Dim",
      "settings.startupMode": "Startup Mode",
      "settings.cleanDesktop": "Clean Desktop",
      "settings.welcomeWindow": "Welcome Window",
      "settings.powerWorkspace": "Power Workspace",
      "settings.displayLanguage": "Display Language",
      "settings.languageNote": "Language changes apply instantly to the shell, Settings, Start menu, desktop icons, and taskbar.",
      "settings.freedomNote": "You may rename the system, replace the brand, reorganize files, rewrite the UI, add native APIs, or turn Axyronis into a completely different educational computer system. Keep safety notes visible when exposing native power.",
      "toast.preferencesReset": "Preferences reset",
      "toast.languageApplied": "Language applied"
    }
  },
  "zh-CN": {
    name: "简体中文",
    direction: "ltr",
    strings: {
      "app.files.name": "Axyronis 文件",
      "app.browser.name": "星云浏览器",
      "app.chrome.name": "Google Chrome",
      "app.windowsApps.name": "Windows 应用",
      "app.terminal.name": "Axyron 终端",
      "app.notes.name": "星尘笔记",
      "app.settings.name": "设置",
      "app.system.name": "系统监视器",
      "app.calculator.name": "计算器",
      "app.about.name": "关于 Axyronis",
      "shell.searchApps": "搜索应用、文件和设置",
      "shell.pinnedApps": "固定的应用",
      "shell.recommended": "推荐",
      "shell.commandPalette": "命令面板",
      "shell.settings": "设置",
      "shell.restartDemo": "重启演示",
      "shell.quickCenter": "快速中心",
      "shell.quantumLink": "量子连接",
      "shell.focusMode": "专注模式",
      "shell.nightShift": "夜间模式",
      "shell.silentMode": "静音模式",
      "shell.brightness": "亮度",
      "shell.interfaceScale": "界面缩放",
      "shell.personalize": "个性化",
      "shell.openTerminal": "在终端中打开",
      "shell.newNote": "新建笔记",
      "shell.about": "关于 Axyronis",
      "shell.typeCommand": "输入命令或应用名称",
      "rec.continue": "继续编辑",
      "rec.continueDetail": "星尘笔记中的系统想法",
      "rec.power": "高效快捷方式",
      "rec.powerDetail": "打开系统监视器",
      "rec.personalize": "个性化",
      "rec.personalizeDetail": "更改 Axyronis 强调色",
      "settings.home": "主页",
      "settings.search": "查找设置",
      "settings.profileStatus": "本地 Axyronis 帐户",
      "settings.deviceCard": "设备",
      "settings.rename": "重命名",
      "settings.connected": "已连接",
      "settings.secure": "安全",
      "settings.upToDate": "已是最新",
      "settings.lastChecked": "刚刚检查",
      "settings.recommended": "推荐设置",
      "settings.recommendedDesc": "最近使用和常用设置",
      "settings.camera": "摄像头",
      "settings.microphone": "麦克风",
      "settings.printers": "打印机和扫描仪",
      "settings.storage": "云存储空间",
      "settings.storageDesc": "用于文件、笔记和备份的模拟学习存储。",
      "settings.backup": "电脑备份",
      "settings.manageStorage": "管理存储",
      "settings.system": "系统",
      "settings.devices": "蓝牙和其他设备",
      "settings.network": "网络和 Internet",
      "settings.personalization": "个性化",
      "settings.apps": "应用",
      "settings.accounts": "帐户",
      "settings.timeLanguage": "时间和语言",
      "settings.gaming": "游戏",
      "settings.accessibility": "辅助功能",
      "settings.privacy": "隐私和安全性",
      "settings.update": "系统更新",
      "settings.developer": "开发者",
      "settings.display": "显示",
      "settings.sound": "声音",
      "settings.power": "电源",
      "settings.wallpaper": "壁纸",
      "settings.colors": "颜色",
      "settings.identity": "身份",
      "settings.startup": "启动",
      "settings.language": "语言",
      "settings.region": "区域",
      "settings.keyboard": "键盘",
      "settings.devFreedom": "开发者自由",
      "settings.open": "打开",
      "settings.launch": "启动",
      "settings.arrange": "排列",
      "settings.refresh": "刷新",
      "settings.reset": "重置",
      "settings.chooseImage": "选择图片",
      "settings.useInitial": "使用首字母",
      "settings.systemIdentity": "系统身份",
      "settings.identityDesc": "为你的二次创作或研究版本重命名系统。",
      "settings.appearanceDesc": "无需修改 CSS 即可调整视觉语言。",
      "settings.wallpaperTuning": "壁纸调节",
      "settings.wallpaperDesc": "微调桌面外壳背后的壁纸效果。",
      "settings.desktopBehavior": "桌面行为",
      "settings.desktopDesc": "适合二次创作者使用的小型外壳控制。",
      "settings.startupDesc": "选择开机动画后 Axyronis 打开的内容。",
      "settings.languageDesc": "随时切换桌面和设置语言。",
      "settings.developerDesc": "这个项目允许进行大幅重写。",
      "settings.systemName": "系统名称",
      "settings.desktopBrand": "桌面品牌",
      "settings.userName": "用户名",
      "settings.deviceName": "设备名称",
      "settings.bootSubtitle": "启动副标题",
      "settings.avatarInitial": "头像首字母",
      "settings.avatarImage": "头像图片",
      "settings.lightMode": "浅色模式",
      "settings.glassBlur": "玻璃模糊",
      "settings.accentColor": "强调色",
      "settings.wallpaperDim": "壁纸暗度",
      "settings.startupMode": "启动模式",
      "settings.cleanDesktop": "干净桌面",
      "settings.welcomeWindow": "欢迎窗口",
      "settings.powerWorkspace": "高效工作区",
      "settings.displayLanguage": "显示语言",
      "settings.languageNote": "语言会立即应用到桌面外壳、设置、开始菜单、桌面图标和任务栏。",
      "settings.freedomNote": "你可以重命名系统、替换品牌、重组文件、重写界面、添加原生 API，或把 Axyronis 改造成完全不同的教育电脑系统。开放原生能力时请保留安全说明。",
      "toast.preferencesReset": "偏好设置已重置",
      "toast.languageApplied": "语言已应用"
    }
  },
  "ja-JP": {
    name: "日本語",
    direction: "ltr",
    strings: {
      "settings.home": "ホーム",
      "settings.search": "設定を検索",
      "settings.language": "言語",
      "settings.timeLanguage": "時刻と言語",
      "settings.displayLanguage": "表示言語",
      "settings.languageDesc": "デスクトップと設定の言語をいつでも切り替えます。",
      "settings.languageNote": "言語はシェル、設定、スタート メニュー、デスクトップ アイコン、タスクバーにすぐ適用されます。",
      "shell.settings": "設定",
      "shell.searchApps": "アプリ、ファイル、設定を検索",
      "shell.pinnedApps": "ピン留め済みアプリ",
      "shell.recommended": "おすすめ",
      "shell.quickCenter": "クイック センター",
      "shell.commandPalette": "コマンド パレット",
      "app.settings.name": "設定"
    }
  },
  "es-ES": {
    name: "Español",
    direction: "ltr",
    strings: {
      "settings.home": "Inicio",
      "settings.search": "Buscar una configuracion",
      "settings.language": "Idioma",
      "settings.timeLanguage": "Hora e idioma",
      "settings.displayLanguage": "Idioma de pantalla",
      "settings.languageDesc": "Cambia el idioma del escritorio y Configuracion en cualquier momento.",
      "settings.languageNote": "El idioma se aplica al shell, Configuracion, Inicio, iconos del escritorio y barra de tareas.",
      "shell.settings": "Configuracion",
      "shell.searchApps": "Buscar aplicaciones, archivos y configuracion",
      "shell.pinnedApps": "Aplicaciones ancladas",
      "shell.recommended": "Recomendado",
      "shell.quickCenter": "Centro rapido",
      "shell.commandPalette": "Paleta de comandos",
      "app.settings.name": "Configuracion"
    }
  },
  "fr-FR": {
    name: "Francais",
    direction: "ltr",
    strings: {
      "settings.home": "Accueil",
      "settings.search": "Rechercher un parametre",
      "settings.language": "Langue",
      "settings.timeLanguage": "Heure et langue",
      "settings.displayLanguage": "Langue d'affichage",
      "settings.languageDesc": "Changez la langue du bureau et des Parametres a tout moment.",
      "settings.languageNote": "La langue s'applique au shell, aux Parametres, au menu Demarrer, aux icones et a la barre des taches.",
      "shell.settings": "Parametres",
      "shell.searchApps": "Rechercher des applications, fichiers et parametres",
      "shell.pinnedApps": "Applications epinglees",
      "shell.recommended": "Recommande",
      "shell.quickCenter": "Centre rapide",
      "shell.commandPalette": "Palette de commandes",
      "app.settings.name": "Parametres"
    }
  }
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const appById = id => apps.find(app => app.id === id);
const locale = () => locales[preferences.language] || locales["en-US"];
const t = key => locale().strings[key] || locales["en-US"].strings[key] || key;
const appDisplayName = app => t(`app.${app.id}.name`) || app.name;
// Present only in Electron mode. In plain browser mode this remains null and
// native features fall back to safe virtual behavior.
const nativeAPI = window.axyronisNative || null;

document.addEventListener("DOMContentLoaded", () => {
  applyPreferences();
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
    runStartupMode();
  }, 1700);
}

function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem("axyronis-preferences") || "{}");
    return { ...defaultPreferences, ...stored };
  } catch {
    return { ...defaultPreferences };
  }
}

function savePreferences() {
  localStorage.setItem("axyronis-preferences", JSON.stringify(preferences));
}

function applyPreferences() {
  state.accent = preferences.accent;
  state.lightMode = preferences.lightMode;
  document.title = preferences.systemName;
  document.documentElement.lang = preferences.language;
  document.documentElement.dir = locale().direction;
  document.documentElement.style.setProperty("--accent", preferences.accent);
  document.documentElement.style.setProperty("--wallpaper-image", preferences.wallpaperImage);
  document.documentElement.style.setProperty("--wallpaper-dim", String(preferences.wallpaperDim / 100));
  document.documentElement.style.setProperty("--glass-blur", `${preferences.glassBlur}px`);
  document.body.classList.toggle("light-mode", preferences.lightMode);
  $(".boot-title").textContent = preferences.desktopBrand;
  $(".boot-subtitle").textContent = preferences.bootSubtitle;
  $(".desktop-brand span:last-child").textContent = preferences.desktopBrand;
  $(".user-chip strong").textContent = preferences.userName;
  $(".user-chip span").textContent = preferences.deviceName;
  $$(".avatar").forEach(avatar => {
    avatar.classList.toggle("has-image", Boolean(preferences.avatarImage));
    avatar.style.backgroundImage = preferences.avatarImage || "";
    avatar.textContent = preferences.avatarImage ? "" : preferences.avatarInitial.slice(0, 2).toUpperCase();
  });
  localizeShell();
  renderDesktopIcons();
  renderStartMenu();
  renderTaskbar();
  updateOpenWindowTitles();
  updateClock();
}

function updatePreference(key, value) {
  preferences[key] = value;
  savePreferences();
  applyPreferences();
  refreshOpenSettingsPanels();
}

function resetPreferences() {
  Object.assign(preferences, defaultPreferences);
  savePreferences();
  applyPreferences();
  renderDesktopIcons();
  renderStartMenu();
  refreshOpenSettingsPanels();
  showToast(t("toast.preferencesReset"));
}

function runStartupMode() {
  if (preferences.startupMode === "welcome") openApp("about");
  if (preferences.startupMode === "workspace") openPowerWorkspace();
}

function refreshOpenSettingsPanels() {
  const entry = state.windows.get("settings");
  if (!entry) return;
  const body = $(".window-body", entry.el);
  body.innerHTML = "";
  body.append(renderSettings());
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
  const time = now.toLocaleTimeString(preferences.language, { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString(preferences.language, { month: "2-digit", day: "2-digit" });
  $("#trayTime").textContent = time;
  $("#trayDate").textContent = date;
  $("#desktopClock").textContent = time;
}

function localizeShell() {
  // Static HTML stays in index.html for readability; this function applies the
  // active language after preferences load and whenever the language changes.
  const appSearch = $("#appSearch");
  const commandSearch = $("#commandSearch");
  if (appSearch) appSearch.placeholder = t("shell.searchApps");
  if (commandSearch) commandSearch.placeholder = t("shell.typeCommand");

  const headings = $$(".start-section .section-heading");
  if (headings[0]) headings[0].textContent = t("shell.pinnedApps");
  if (headings[1]) headings[1].textContent = t("shell.recommended");

  const menuLabels = {
    "settings": t("shell.personalize"),
    "terminal": t("shell.openTerminal"),
    "notes": t("shell.newNote"),
    "about": t("shell.about")
  };
  $$("[data-open-app]").forEach(item => {
    const label = menuLabels[item.dataset.openApp] || t(`app.${item.dataset.openApp}.name`);
    if (label && !item.classList.contains("desktop-icon") && !item.classList.contains("tray-button") && !item.classList.contains("app-card")) {
      item.textContent = label;
    }
  });

  $$("[data-action='open-command-palette']").forEach(item => {
    item.textContent = item.classList.contains("tray-button") ? "CMD" : t("shell.commandPalette");
    item.title = t("shell.commandPalette");
  });
  const settingsTray = $("[data-open-app='settings'].tray-button");
  if (settingsTray) settingsTray.title = t("shell.settings");
  const quickTray = $("[data-action='toggle-quick-center'].tray-button");
  if (quickTray) quickTray.title = t("shell.quickCenter");

  const startActions = $$(".start-actions button");
  if (startActions[1]) startActions[1].textContent = t("shell.settings");
  if (startActions[2]) startActions[2].textContent = t("shell.restartDemo");

  const quickTitle = $(".quick-center-top strong");
  if (quickTitle) quickTitle.textContent = t("shell.quickCenter");
  const quickToggles = $$(".quick-toggle");
  [t("shell.quantumLink"), t("shell.focusMode"), t("shell.nightShift"), t("shell.silentMode")].forEach((label, index) => {
    if (quickToggles[index]) quickToggles[index].textContent = label;
  });
  const sliders = $$(".slider-row span");
  if (sliders[0]) sliders[0].textContent = t("shell.brightness");
  if (sliders[1]) sliders[1].textContent = t("shell.interfaceScale");

  const statusPills = $$(".quick-stats span");
  if (statusPills[1]) statusPills[1].textContent = t("shell.quantumLink");
}

function updateOpenWindowTitles() {
  state.windows.forEach(entry => {
    const name = $(".app-name", entry.el);
    if (name) name.textContent = appDisplayName(entry.app);
  });
}

function renderDesktopIcons() {
  const desktop = $("#desktopIcons");
  desktop.innerHTML = "";
  apps.filter(app => app.desktop).forEach(app => {
    const button = document.createElement("button");
    button.className = "desktop-icon";
    button.dataset.openApp = app.id;
    button.innerHTML = `<span class="icon-tile">${app.symbol}</span><span>${appDisplayName(app)}</span>`;
    button.addEventListener("dblclick", () => openApp(app.id));
    desktop.append(button);
  });
}

function renderStartMenu() {
  const query = ($("#appSearch")?.value || "").trim().toLowerCase();
  const filtered = apps.filter(app => appDisplayName(app).toLowerCase().includes(query) || app.name.toLowerCase().includes(query) || app.id.includes(query));
  const pinned = $("#pinnedApps");
  pinned.innerHTML = "";

  filtered.forEach(app => {
    const card = document.createElement("button");
    card.className = "app-card";
    card.dataset.openApp = app.id;
    card.innerHTML = `<span class="icon-tile">${app.symbol}</span><span>${appDisplayName(app)}</span>`;
    pinned.append(card);
  });

  $("#recommendations").innerHTML = [
    [t("rec.continue"), t("rec.continueDetail")],
    [t("rec.power"), t("rec.powerDetail")],
    [t("rec.personalize"), t("rec.personalizeDetail")]
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
    title: `${t("settings.open")} ${appDisplayName(app)}`,
    detail: "Axyronis app",
    run: () => openApp(app.id)
  }));

  return [
    ...appCommands,
    {
      title: "Open Google Chrome",
      detail: "Browse Google inside Axyronis",
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
      title: "Open Wallpaper Settings",
      detail: "Change desktop wallpaper and presets",
      run: () => openSettingsSection("wallpaper")
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

function openSettingsSection(section = "identity") {
  const routes = {
    identity: ["accounts", "identity"],
    appearance: ["personalization", "colors"],
    wallpaper: ["personalization", "wallpaper"],
    desktop: ["system", "desktop"],
    startup: ["apps", "startup"],
    language: ["time", "language"],
    developer: ["developer", "developer"]
  };
  const [category, page] = routes[section] || ["home", "home"];
  state.settingsCategory = category;
  state.settingsPage = page;
  state.settingsSection = section;
  openApp("settings");
  refreshOpenSettingsPanels();
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

  // Most desktop icons open virtual windows inside Axyronis. If a remix adds
  // nativeLaunch to an app, this branch can still launch approved native apps.
  if (nativeAPI && app.nativeLaunch) {
    nativeAPI.launchApp(app.nativeLaunch).then(result => {
      showToast(result.message || (result.ok ? `Launched ${appDisplayName(app)}` : `${appDisplayName(app)} failed to launch`), result.ok ? "ok" : "error");
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
  const roomySettings = id === "settings";
  template.dataset.app = id;
  template.style.width = `${roomySettings ? Math.max(860, window.innerWidth - 28) : Math.min(width, window.innerWidth - 24)}px`;
  template.style.height = `${roomySettings ? Math.max(620, window.innerHeight - 92) : Math.min(height, window.innerHeight - 96)}px`;
  template.style.left = `${roomySettings ? 14 : Math.max(12, 160 + offset)}px`;
  template.style.top = `${roomySettings ? 14 : Math.max(12, 96 + offset)}px`;
  $(".app-symbol", template).textContent = app.symbol;
  $(".app-name", template).textContent = appDisplayName(app);
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
    button.innerHTML = `<span class="app-symbol">${entry.app.symbol}</span><span>${appDisplayName(entry.app)}</span>`;
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
        <article class="portal-card"><h3>System Vision</h3><p>A personal virtual computer system focused on speed, privacy, customization, and visual polish.</p></article>
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

function renderChromeBrowser() {
  // This is an internal Chrome-style browser window. It stays inside Axyronis
  // instead of launching the host Windows Chrome process.
  if (!nativeAPI) return renderBrowserOnlyChrome();

  const root = div("app-layout native-browser chrome-browser");
  const bar = div("browser-bar chrome-bar");
  const back = button("<", "text-button");
  const forward = button(">", "text-button");
  const reload = button("Reload", "text-button");
  const home = button("Home", "text-button");
  const input = document.createElement("input");
  const go = button("Go", "text-button primary");
  const webview = document.createElement("webview");
  webview.className = "webview";
  webview.setAttribute("allowpopups", "");
  input.value = "https://www.google.com/?hl=en";
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
  home.addEventListener("click", () => {
    input.value = "https://www.google.com/?hl=en";
    navigate();
  });
  webview.addEventListener("did-navigate", event => {
    input.value = event.url;
  });
  webview.addEventListener("did-navigate-in-page", event => {
    input.value = event.url;
  });

  bar.append(back, forward, reload, home, input, go);
  root.append(bar, webview);
  return root;
}

function renderBrowserOnlyChrome() {
  const root = div("app-layout");
  const bar = div("browser-bar");
  const input = document.createElement("input");
  input.value = "https://www.google.com/?hl=en";
  const go = button("Go", "text-button primary");
  const page = div("browser-page");
  const draw = () => {
    page.innerHTML = `
      <section class="portal-hero">
        <h2>Google Chrome</h2>
        <p>Internal browsing requires Electron desktop mode. Browser preview mode shows this simulated page.</p>
      </section>
      <div class="portal-grid">
        <article class="portal-card"><h3>Inside Axyronis</h3><p>In desktop mode, Google opens inside this computer system window.</p></article>
        <article class="portal-card"><h3>Address</h3><p>${escapeHtml(input.value)}</p></article>
      </div>
    `;
  };
  go.addEventListener("click", draw);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") draw();
  });
  bar.append(input, go);
  root.append(bar, page);
  draw();
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

function renderWallpaperSettings() {
  const root = div("app-layout");
  const header = div("native-launch-hero");
  header.innerHTML = `
    <div class="icon-tile">B</div>
    <div>
      <h2>Wallpaper</h2>
      <p>Change the desktop background with presets or a local image.</p>
    </div>
  `;

  const status = div("file-preview");
  status.innerHTML = `<strong>Current Source</strong><p>${escapeHtml(preferences.wallpaperSource)}</p>`;

  const presetGrid = div("wallpaper-grid");
  wallpaperPresets.forEach(preset => {
    const card = document.createElement("button");
    card.className = `wallpaper-card ${preferences.wallpaperPreset === preset.id ? "active" : ""}`;
    card.innerHTML = `
      <span class="wallpaper-preview" style="--preview-wallpaper:${preset.preview}"></span>
      <strong>${preset.name}</strong>
      <small>Built-in preset</small>
    `;
    card.addEventListener("click", () => {
      preferences.wallpaperPreset = preset.id;
      preferences.wallpaperImage = preset.image;
      preferences.wallpaperSource = preset.name;
      savePreferences();
      applyPreferences();
      refreshOpenSettingsPanels();
      showToast(`Wallpaper set: ${preset.name}`);
    });
    presetGrid.append(card);
  });

  const actions = div("toolbar");
  const chooseLocal = button("Choose Local Image", "text-button primary");
  const reset = button("Restore Default", "text-button");
  const browserUpload = document.createElement("input");
  browserUpload.type = "file";
  browserUpload.accept = "image/*";
  browserUpload.className = "wallpaper-upload";

  chooseLocal.addEventListener("click", async () => {
    if (nativeAPI) {
      const picked = await nativeAPI.pickWallpaper();
      if (!picked) return;
      preferences.wallpaperPreset = "local-file";
      preferences.wallpaperImage = `url("${picked.url}")`;
      preferences.wallpaperSource = picked.path;
      savePreferences();
      applyPreferences();
      refreshOpenSettingsPanels();
      showToast("Local wallpaper applied");
      return;
    }
    browserUpload.click();
  });

  browserUpload.addEventListener("change", () => {
    const file = browserUpload.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    preferences.wallpaperPreset = "browser-preview";
    preferences.wallpaperImage = `url("${objectUrl}")`;
    preferences.wallpaperSource = `${file.name} (session preview)`;
    applyPreferences();
    refreshOpenSettingsPanels();
    showToast("Session wallpaper preview applied");
  });

  reset.addEventListener("click", () => {
    const preset = wallpaperPresets[0];
    preferences.wallpaperPreset = preset.id;
    preferences.wallpaperImage = preset.image;
    preferences.wallpaperSource = preset.name;
    savePreferences();
    applyPreferences();
    refreshOpenSettingsPanels();
    showToast("Default wallpaper restored");
  });

  actions.append(chooseLocal, reset, browserUpload);
  root.append(header, presetGrid, actions, status);
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
    else if (name === "date") lines.push(new Date().toLocaleString("en-US"));
    else if (name === "apps") lines.push(apps.map(app => app.name).join(", "));
    else if (name === "about") lines.push("Axyronis is your personal virtual computer system.");
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
  area.value = localStorage.getItem("axyronis-notes") || "Axyronis computer system ideas:\n- A clean desktop computer experience\n- Built-in files, settings, terminal, and browser\n- Real Windows app launching in desktop mode\n";
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
  // Layered control center: Home -> category -> detail page. The active route
  // is kept in state so refreshing the Settings window preserves the layer.
  const root = div("app-layout settings-v2");
  const sidebar = div("settings-nav");
  const panel = div("settings-content");
  const accents = ["#33e0c2", "#ff5fa2", "#ffc857", "#7c8cff", "#65f283"];
  const categories = [
    { id: "home", icon: "H", label: t("settings.home"), desc: t("settings.recommendedDesc"), pages: [] },
    { id: "system", icon: "S", label: t("settings.system"), desc: "Display, sound, power, and desktop behavior.", pages: ["display", "sound", "power", "desktop"] },
    { id: "devices", icon: "B", label: t("settings.devices"), desc: "Bluetooth, cameras, printers, and connected devices.", pages: ["bluetooth", "camera", "printers"] },
    { id: "network", icon: "N", label: t("settings.network"), desc: "Connection status, Wi-Fi, and online services.", pages: ["wifi", "internet"] },
    { id: "personalization", icon: "P", label: t("settings.personalization"), desc: "Wallpaper, colors, glass, and desktop style.", pages: ["wallpaper", "colors"] },
    { id: "apps", icon: "A", label: t("settings.apps"), desc: "Startup behavior and app actions.", pages: ["startup", "defaultApps"] },
    { id: "accounts", icon: "U", label: t("settings.accounts"), desc: "User identity, device name, and avatar.", pages: ["identity"] },
    { id: "time", icon: "T", label: t("settings.timeLanguage"), desc: "Language, region, time, and keyboard.", pages: ["language", "region", "keyboard"] },
    { id: "gaming", icon: "G", label: t("settings.gaming"), desc: "Game mode and performance shortcuts.", pages: ["gameMode"] },
    { id: "accessibility", icon: "E", label: t("settings.accessibility"), desc: "Readable interface and focus controls.", pages: ["contrast", "motion"] },
    { id: "privacy", icon: "V", label: t("settings.privacy"), desc: "Permissions, safety notes, and local data.", pages: ["privacy"] },
    { id: "update", icon: "W", label: t("settings.update"), desc: "Version status and learning release notes.", pages: ["updates"] },
    { id: "developer", icon: "D", label: t("settings.developer"), desc: t("settings.developerDesc"), pages: ["developer"] }
  ];
  const pageMeta = {
    display: [t("settings.display"), "Scale, brightness, and display comfort."],
    sound: [t("settings.sound"), "Volume, microphone, and audio routing."],
    power: [t("settings.power"), "Startup mode, workspace restore, and performance profile."],
    desktop: [t("settings.desktopBehavior"), t("settings.desktopDesc")],
    bluetooth: [t("settings.devices"), "Pair and manage simulated devices."],
    camera: [t("settings.camera"), "Camera permissions and launch shortcuts."],
    printers: [t("settings.printers"), "Printer and scanner style settings."],
    wifi: [t("settings.network"), "Connection status and network controls."],
    internet: ["Internet", "Browser and web access settings."],
    wallpaper: [t("settings.wallpaper"), t("settings.wallpaperDesc")],
    colors: [t("settings.colors"), t("settings.appearanceDesc")],
    startup: [t("settings.startup"), t("settings.startupDesc")],
    defaultApps: ["Default apps", "Choose which virtual app opens common actions."],
    identity: [t("settings.identity"), t("settings.identityDesc")],
    language: [t("settings.language"), t("settings.languageDesc")],
    region: [t("settings.region"), "Regional formats for date and time."],
    keyboard: [t("settings.keyboard"), "Keyboard layout and shortcut preferences."],
    gameMode: [t("settings.gaming"), "Game mode and performance layout."],
    contrast: [t("settings.accessibility"), "Readable colors and visual comfort."],
    motion: ["Visual effects", "Motion and animation preferences."],
    privacy: [t("settings.privacy"), "Local privacy and native access notes."],
    updates: [t("settings.update"), "Current version and update channel."],
    developer: [t("settings.devFreedom"), t("settings.developerDesc")]
  };
  let activeCategory = state.settingsCategory || "home";
  let activePage = state.settingsPage || "home";

  const route = (category, page = "category") => {
    activeCategory = category;
    activePage = category === "home" ? "home" : page;
    state.settingsCategory = activeCategory;
    state.settingsPage = activePage;
    state.settingsSection = activePage === "category" ? activeCategory : activePage;
    drawSidebar();
    drawPanel();
  };

  const drawSidebar = () => {
    sidebar.innerHTML = "";
    const profile = div("settings-profile");
    profile.innerHTML = `
      <div class="avatar">${preferences.avatarImage ? "" : preferences.avatarInitial.slice(0, 2).toUpperCase()}</div>
      <div>
        <strong>${escapeHtml(preferences.userName)}</strong>
        <span>${escapeHtml(t("settings.profileStatus"))}</span>
      </div>
    `;
    const avatar = $(".avatar", profile);
    avatar.classList.toggle("has-image", Boolean(preferences.avatarImage));
    avatar.style.backgroundImage = preferences.avatarImage || "";

    const search = document.createElement("input");
    search.className = "settings-search";
    search.type = "search";
    search.placeholder = t("settings.search");
    sidebar.append(profile, search);

    categories.forEach(category => {
      const item = document.createElement("button");
      item.className = category.id === activeCategory ? "active" : "";
      item.innerHTML = `<span>${category.icon}</span><strong>${category.label}</strong>`;
      item.addEventListener("click", () => route(category.id));
      sidebar.append(item);
    });
  };

  const drawPanel = () => {
    panel.innerHTML = "";
    if (activePage === "home") {
      drawHome();
      return;
    }
    if (activePage === "category") {
      drawCategory(activeCategory);
      return;
    }
    drawDetail(activePage);
  };

  const drawHome = () => {
    const hero = div("settings-home-hero");
    hero.innerHTML = `
      <div class="settings-device-preview"></div>
      <div>
        <h2>${escapeHtml(preferences.userName)}</h2>
        <p>${escapeHtml(preferences.deviceName)}</p>
        <button class="text-button primary" type="button">${t("settings.rename")}</button>
      </div>
      <div class="settings-status-strip">
        <span><strong>${t("shell.quantumLink")}</strong><small>${t("settings.connected")}, ${t("settings.secure")}</small></span>
        <span><strong>${t("settings.update")}</strong><small>${t("settings.lastChecked")}</small></span>
      </div>
    `;
    $("button", hero).addEventListener("click", () => route("accounts", "identity"));

    const recommended = div("setting-block settings-stack");
    recommended.innerHTML = `<h3>${t("settings.recommended")}</h3><p>${t("settings.recommendedDesc")}</p>`;
    [
      [t("settings.camera"), "camera", "devices"],
      [t("settings.microphone"), "sound", "system"],
      [t("settings.printers"), "printers", "devices"]
    ].forEach(([label, page, category]) => recommended.append(settingLink(label, pageMeta[page][1], () => route(category, page))));

    const storage = div("setting-block settings-stack");
    storage.innerHTML = `
      <h3>${t("settings.storage")}</h3>
      <p>${t("settings.storageDesc")}</p>
      <div class="storage-meter"><span style="width: 18%"></span></div>
    `;
    storage.append(settingLink(t("settings.backup"), "Axyronis local profile ready", () => route("privacy", "privacy")));
    storage.append(settingLink(t("settings.manageStorage"), "9.9 GB used of 1.0 TB", () => route("system", "power")));

    const homeGrid = div("settings-home-grid");
    homeGrid.append(recommended, storage);

    const categoryGrid = div("settings-category-grid");
    categories.filter(category => category.id !== "home").forEach(category => {
      const card = document.createElement("button");
      card.className = "settings-category-card";
      card.innerHTML = `<span>${category.icon}</span><strong>${category.label}</strong><small>${category.desc}</small>`;
      card.addEventListener("click", () => route(category.id));
      categoryGrid.append(card);
    });

    panel.append(settingsHeader(t("settings.home"), t("settings.recommendedDesc")), hero, homeGrid, categoryGrid);
  };

  const drawCategory = categoryId => {
    const category = categories.find(item => item.id === categoryId) || categories[0];
    const list = div("settings-detail-list");
    category.pages.forEach(page => {
      const meta = pageMeta[page] || [page, ""];
      list.append(settingLink(meta[0], meta[1], () => route(categoryId, page)));
    });
    panel.append(settingsHeader(category.label, category.desc, () => route("home")), list);
  };

  const drawDetail = page => {
    const meta = pageMeta[page] || [page, ""];
    panel.append(settingsHeader(meta[0], meta[1], () => route(activeCategory)));

    if (page === "identity") {
      panel.append(settingsBlock(t("settings.systemIdentity"), t("settings.identityDesc"), [
        textSetting(t("settings.systemName"), "systemName"),
        textSetting(t("settings.desktopBrand"), "desktopBrand"),
        textSetting(t("settings.userName"), "userName"),
        textSetting(t("settings.deviceName"), "deviceName"),
        textSetting(t("settings.bootSubtitle"), "bootSubtitle"),
        textSetting(t("settings.avatarInitial"), "avatarInitial"),
        avatarSetting()
      ]));
    }

    if (page === "colors" || page === "display" || page === "contrast") {
      const block = settingsBlock(t("settings.colors"), t("settings.appearanceDesc"), [
        toggleSetting(t("settings.lightMode"), "lightMode"),
        rangeSetting(t("settings.glassBlur"), "glassBlur", 12, 48)
      ]);
      const colorRow = div("settings-row");
      colorRow.innerHTML = `<span>${t("settings.accentColor")}</span>`;
      const swatches = div("swatches");
      accents.forEach(color => {
        const swatch = document.createElement("button");
        swatch.className = "swatch";
        swatch.style.background = color;
        swatch.title = color;
        swatch.addEventListener("click", () => updatePreference("accent", color));
        swatches.append(swatch);
      });
      colorRow.append(swatches);
      block.append(colorRow);
      panel.append(block);
    }

    if (page === "wallpaper") {
      panel.append(renderWallpaperSettings());
      panel.append(settingsBlock(t("settings.wallpaperTuning"), t("settings.wallpaperDesc"), [
        rangeSetting(t("settings.wallpaperDim"), "wallpaperDim", 0, 70)
      ]));
    }

    if (page === "desktop" || page === "defaultApps") {
      panel.append(settingsBlock(t("settings.desktopBehavior"), t("settings.desktopDesc"), [
        actionSetting(t("settings.wallpaper"), t("settings.open"), () => route("personalization", "wallpaper")),
        actionSetting(t("shell.commandPalette"), t("settings.launch"), openCommandPalette),
        actionSetting(t("settings.powerWorkspace"), t("settings.arrange"), openPowerWorkspace),
        actionSetting("Desktop Icons", t("settings.refresh"), refreshDesktop)
      ]));
    }

    if (page === "startup" || page === "power") {
      panel.append(settingsBlock(t("settings.startup"), t("settings.startupDesc"), [
        selectSetting(t("settings.startupMode"), "startupMode", [
          ["clean", t("settings.cleanDesktop")],
          ["welcome", t("settings.welcomeWindow")],
          ["workspace", t("settings.powerWorkspace")]
        ]),
        actionSetting("Preferences", t("settings.reset"), resetPreferences)
      ]));
    }

    if (page === "language" || page === "region" || page === "keyboard") {
      const block = settingsBlock(t("settings.language"), t("settings.languageDesc"), [
        selectSetting(t("settings.displayLanguage"), "language", Object.entries(locales).map(([value, info]) => [value, info.name]))
      ]);
      const note = div("developer-note");
      note.textContent = t("settings.languageNote");
      block.append(note);
      panel.append(block);
    }

    if (["bluetooth", "camera", "printers", "wifi", "internet", "sound", "gameMode", "privacy", "updates", "motion"].includes(page)) {
      panel.append(settingsBlock(meta[0], meta[1], [
        actionSetting(t("settings.refresh"), t("settings.refresh"), () => showToast(`${meta[0]} ${t("settings.upToDate")}`)),
        actionSetting(t("settings.open"), t("settings.open"), () => showToast(`${meta[0]} ${t("settings.connected")}`))
      ]));
    }

    if (page === "developer") {
      const block = settingsBlock(t("settings.devFreedom"), t("settings.developerDesc"), [
        actionSetting("Architecture Notes", "Open Docs", () => openApp("about"))
      ]);
      const note = div("developer-note");
      note.textContent = t("settings.freedomNote");
      block.append(note);
      panel.append(block);
    }
  };

  drawSidebar();
  drawPanel();
  root.append(sidebar, panel);
  return root;
}

function settingsBlock(title, description, rows) {
  const block = div("setting-block wide");
  block.innerHTML = `<h3>${title}</h3><p>${description}</p>`;
  rows.forEach(row => block.append(row));
  return block;
}

function settingsHeader(title, description, backAction = null) {
  const header = div("settings-page-header");
  if (backAction) {
    const back = button("<", "icon-button");
    back.title = "Back";
    back.addEventListener("click", backAction);
    header.append(back);
  }
  const copy = document.createElement("div");
  copy.innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p>`;
  header.append(copy);
  return header;
}

function settingLink(title, description, action) {
  const item = document.createElement("button");
  item.className = "settings-link";
  item.innerHTML = `
    <span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(description)}</small>
    </span>
    <b>></b>
  `;
  item.addEventListener("click", action);
  return item;
}

function textSetting(label, key) {
  const row = div("settings-row");
  const input = document.createElement("input");
  input.value = preferences[key];
  input.maxLength = 42;
  input.addEventListener("change", () => {
    const value = input.value.trim() || defaultPreferences[key];
    updatePreference(key, key === "avatarInitial" ? value.slice(0, 2).toUpperCase() : value);
  });
  row.append(labelNode(label), input);
  return row;
}

function avatarSetting() {
  const row = div("settings-row avatar-setting");
  const controls = div("avatar-controls");
  const preview = div("avatar avatar-preview");
  const source = document.createElement("small");
  source.textContent = preferences.avatarSource;
  const choose = button(t("settings.chooseImage"), "text-button primary");
  const clear = button(t("settings.useInitial"), "text-button");
  const upload = document.createElement("input");
  upload.type = "file";
  upload.accept = "image/*";
  upload.className = "wallpaper-upload";

  const paintPreview = () => {
    preview.classList.toggle("has-image", Boolean(preferences.avatarImage));
    preview.style.backgroundImage = preferences.avatarImage || "";
    preview.textContent = preferences.avatarImage ? "" : preferences.avatarInitial.slice(0, 2).toUpperCase();
  };

  choose.addEventListener("click", async () => {
    if (nativeAPI) {
      const picked = await nativeAPI.pickWallpaper();
      if (!picked) return;
      preferences.avatarImage = `url("${picked.url}")`;
      preferences.avatarSource = picked.path;
      savePreferences();
      applyPreferences();
      refreshOpenSettingsPanels();
      showToast("Avatar image applied");
      return;
    }
    upload.click();
  });

  upload.addEventListener("change", () => {
    const file = upload.files?.[0];
    if (!file) return;
    preferences.avatarImage = `url("${URL.createObjectURL(file)}")`;
    preferences.avatarSource = `${file.name} (session preview)`;
    applyPreferences();
    refreshOpenSettingsPanels();
    showToast("Session avatar preview applied");
  });

  clear.addEventListener("click", () => {
    preferences.avatarImage = "";
    preferences.avatarSource = "Initial avatar";
    savePreferences();
    applyPreferences();
    refreshOpenSettingsPanels();
    showToast("Initial avatar restored");
  });

  paintPreview();
  controls.append(preview, choose, clear, source, upload);
  row.append(labelNode(t("settings.avatarImage")), controls);
  return row;
}

function toggleSetting(label, key) {
  const row = div("settings-row");
  const toggle = button("", `toggle ${preferences[key] ? "on" : ""}`);
  toggle.title = label;
  toggle.addEventListener("click", () => updatePreference(key, !preferences[key]));
  row.append(labelNode(label), toggle);
  return row;
}

function rangeSetting(label, key, min, max) {
  const row = div("settings-row");
  const input = document.createElement("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.value = preferences[key];
  input.addEventListener("input", () => {
    preferences[key] = Number(input.value);
    savePreferences();
    applyPreferences();
  });
  row.append(labelNode(label), input);
  return row;
}

function selectSetting(label, key, options) {
  const row = div("settings-row");
  const select = document.createElement("select");
  options.forEach(([value, text]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    option.selected = preferences[key] === value;
    select.append(option);
  });
  select.addEventListener("change", () => {
    updatePreference(key, select.value);
    if (key === "language") showToast(t("toast.languageApplied"));
  });
  row.append(labelNode(label), select);
  return row;
}

function actionSetting(label, actionLabel, action) {
  const row = div("settings-row");
  const actionButton = button(actionLabel, "text-button primary");
  actionButton.addEventListener("click", action);
  row.append(labelNode(label), actionButton);
  return row;
}

function labelNode(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
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
      <h2>Axyronis Computer System</h2>
      <p>Your personal virtual computer system is online.</p>
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
