import {
  enable as remoteEnable,
  initialize as initElectronRemote
} from "@electron/remote/main";
import Analytics = require("analytics-node");
import {
  app,
  BrowserWindow,
  ipcMain,
  IpcMainEvent,
  Menu,
  nativeImage,
  nativeTheme,
  Notification,
  Tray
} from "electron";
import * as log from "electron-log";
import * as Store from "electron-store";
import {autoUpdater, UpdateInfo} from "electron-updater";
import fs = require("fs");
import {
  arch as operatingSystemArch,
  platform as operatingSystemPlatform,
  userInfo,
  version as operatingSystemVersion
} from "os";
import * as path from "path";
import {deeplinkHandler, initDeeplinks} from "./deeplinks";
import { ExplorookStore } from "./explorook-store";
const uuidv4 = require("uuid/v4");
import AutoLaunch = require("auto-launch");
import fetch from "node-fetch";
import {SemVer} from "semver";
import { initExceptionManager, Logger, notify } from "./exceptionManager";

initElectronRemote();
autoUpdater.logger = new Logger();
log.transports.console.level = "warn";
Store.initRenderer();

const ICONS_DIR = "../assets/icons/";
const APP_ICON = path.join(__dirname, ICONS_DIR, getAppIcon());
const TRAY_ICON = path.join(__dirname, ICONS_DIR, getTrayIcon());
const ROOKOUT_LOGO = path.join(__dirname, ICONS_DIR, "logo.png");
const CLOSE_ICON_BLACK = path.join(__dirname, ICONS_DIR, "baseline_close_black_18dp.png");
const SETTINGS_ICON_BLACK = path.join(__dirname, ICONS_DIR, "baseline_settings_black_18dp.png");
const CLOSE_ICON_WHITE = path.join(__dirname, ICONS_DIR, "baseline_close_white_18dp.png");
const SETTINGS_ICON_WHITE = path.join(__dirname, ICONS_DIR, "baseline_settings_white_18dp.png");
const TEN_MINUTES = 1000 * 60 * 10;

let mainWindow: Electron.BrowserWindow;
let indexWorker: Electron.BrowserWindow;
let tray: Tray;
let firstTimeLaunch = false;
let al: AutoLaunch;
let store: ExplorookStore;
let willUpdateOnClose: boolean = false;
let dataCollectionEnabled: boolean;
const icon = nativeImage.createFromPath(APP_ICON);
let analytics: Analytics;
let userId: string;
let signedEula: boolean = false;

// getAppIcon resolves the right icon for the running platform
function getAppIcon() {
  if (process.platform.match("win32")) {
    return "/win/icon.ico";
  } else if (process.platform.match("darwin")) {
    return "logo.png";
  } else {
    return "/logo.png";
  }
}

function getTrayIcon() {
  if (process.platform.match("darwin")) {
    return "mac/explorook_tray_Template.png";
  }
  return getAppIcon();
}

async function linuxAutoLaunchPatch() {
  if (process.platform !== "linux" || !store.get("linux-start-with-os", false)) {
    return;
  }
  // AppImage filename changes after every update so we need to make sure we disable
  // autolaunch before update is installed and re-enable it on the next startup - which is now
  await enableAutoLaunch();
}

async function firstTimeAutoLaunch() {
  if (!firstTimeLaunch) return;
  if (await isReadonlyVolume()) return;
  await enableAutoLaunch();
}

async function enableAutoLaunch() {
  try {
    const isEnabled = await al.isEnabled();
    if (!isEnabled) {
      await al.enable();
    }
  } catch (error) {
    notify(error);
  }
}

// registerIpc listens to ipc requests\event
function registerIpc() {
  let alConfig = { name: "Explorook", isHidden: true };
  // When bundled inside Appimage the executable itself is run from a tmp dir.
  // we need to reference the parent executable which is the Appimage file.
  // The name of the executable is passes as this environment variable
  if (process.env.APPIMAGE) {
    alConfig = Object.assign(alConfig, { path: process.env.APPIMAGE });
  }
  al = new AutoLaunch(alConfig);
  linuxAutoLaunchPatch();
  firstTimeAutoLaunch();
  ipcMain.on("hidden", displayWindowHiddenNotification);
  ipcMain.on("start-server-error", (e: IpcMainEvent, err: any) => {
    displayNotification("Rookout Desktop App", `App failed to start local server: ${err}`);
    track("start-server-error", { err });
  });
  ipcMain.on("track", (e: IpcMainEvent, trackEvent: string, props: any) => {
    track(trackEvent, props);
  });
  ipcMain.on("get-user-id", (e: IpcMainEvent) => e.returnValue = userId);
  ipcMain.on("get-platform", (e: IpcMainEvent) => e.returnValue = process.platform.toString());
  ipcMain.on("force-exit", (e: IpcMainEvent) => quitApplication());
  ipcMain.on("inspect-all", () => {
    mainWindow.webContents.openDevTools();
    indexWorker.webContents.openDevTools();
  });
  ipcMain.on("auto-launch-is-enabled-req", async (e: IpcMainEvent) => {
    // inspecting al.isEnabled prompts permissions dialog on macOS
    // so we prevent it from happening on readonly volume
    const enabled = !(await isReadonlyVolume()) && await al.isEnabled();
    e.sender.send("auto-launch-is-enabled-changed", enabled);
  });
  ipcMain.on("exception-manager-is-enabled-req", (e: IpcMainEvent) => {
    e.sender.send("exception-manager-enabled-changed", dataCollectionEnabled);
  });
  ipcMain.on("exception-manager-enabled-set", (e: IpcMainEvent, enable: boolean) => {
    store.set("sentry-enabled", enable);
    e.sender.send("exception-manager-enabled-changed", enable);
  });
  ipcMain.on("has-signed-eula", (e: IpcMainEvent) => {
    e.returnValue = store.get("has-signed-eula", false);
  });
  ipcMain.on("signed-eula", (e: IpcMainEvent) => {
    if (dataCollectionEnabled || process.env.development) {
      initExceptionManager(() => userId);
      initAnalytics();
      track("signed-eula");
    }
    store.set("has-signed-eula", true);
    startGraphqlServer();
  });
  ipcMain.on("auto-launch-set", (e: IpcMainEvent, enable: boolean) => {
    if (enable) {
      store.set("linux-start-with-os", true);
      al.enable().then(() => e.sender.send("auto-launch-is-enabled-changed", true));
    } else {
      store.set("linux-start-with-os", false);
      al.disable().then(() => e.sender.send("auto-launch-is-enabled-changed", false));
    }
  });
}

function track(eventName: string, props: any = null, callback: () => void = null) {
  if (!analytics) {
    return;
  }
  analytics.track({
    userId,
    event: eventName,
    properties: props
  }, callback);
}

function flushAnalytics(callback: () => void) {
  if (!analytics) {
    return;
  }
  analytics.flush(callback);
}

function identifyAnalytics() {
  const { username } = userInfo();
  const osArch = operatingSystemArch();
  const osPlatform = operatingSystemPlatform();
  const osVersion = operatingSystemVersion();
  analytics.identify({ userId, traits: { username, osPlatform, osArch, osVersion } });
}

function initAnalytics() {
  analytics = new Analytics("isfxG3NQsq3qDoNPZPvhIVlmYVGDOLdH");
  identifyAnalytics();
  track("startup");
}

async function quitApplication() {
  track("quit-application");
  flushAnalytics(() => app.quit());
  // This timeout is here in case the callback is not called or takes too long
  setTimeout(() => app.quit(), 3000);
}

function main() {
  // check if another instance of this app is already open
  const primary = app.requestSingleInstanceLock();
  if (primary) {
    app.on("second-instance", () => {
      // Deep link handling for windows and linux is a bit different
      if (["win32", "linux"].includes(process.platform)) {
        deeplinkHandler();
      }

      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  } else {
    quitApplication();
  }

  initDeeplinks(app);
  // store helps us store data on local disk
  store = new ExplorookStore();
  // Only set firstTimeLaunch to true if the deprecated "token" store var does not exist
  store.getOrCreate("token", "foobar", () => {
    firstTimeLaunch = true;
  });
  userId = store.getOrCreate("user-id", uuidv4());
  dataCollectionEnabled = Boolean(store.get("sentry-enabled", true));
  signedEula = Boolean(store.get("has-signed-eula", false));
  if (signedEula && (dataCollectionEnabled || process.env.development)) {
    initExceptionManager(() => userId);
    initAnalytics();
  }

  // listen to RPC's coming from windows
  registerIpc();
  // open windows (index worker and main config window)
  createWindows();
  // pop tray icon
  openTray();
  // update app
  update();
}

function isReadonlyVolume(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // this check is only relevant for macOS ATM
    if (!process.platform.match("darwin")) {
      return resolve(false);
    }
    fs.access(app.getPath("exe"), fs.constants.W_OK, err => {
      if (err && err.code === "EROFS") {
        return resolve(true);
      }
      resolve(false);
    });
  });
}

async function update() {
  // don't try to update if app runs from readonly volume
  // https://github.com/electron/electron/issues/7357#issuecomment-249792476
  if (await isReadonlyVolume()) {
    console.log("detected read-only volume - auto update disabled");
    return;
  }
  autoUpdater.on("error",  async (error) => {
    console.error("autoUpdater error", {error});
    notify(error);
  });
  let updateInterval: ReturnType<typeof setInterval> = null;
  autoUpdater.signals.updateDownloaded((info: UpdateInfo) => {
    willUpdateOnClose = true;
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    displayNotification(`Update available (${info.version})`, "a new version of the app is available and will be installed on next exit");
  });
  const tryUpdate = async () => {
    try {
      const latestVersion = await getLatestVersionName();
      const latestVersionObj = new SemVer(latestVersion);
      const currentVersionObj = new SemVer(app.getVersion());
      // If the minor and major did not change, don't auto update
      if (
          latestVersionObj.major === currentVersionObj.major &&
          latestVersionObj.minor === currentVersionObj.minor
      ) {
        return;
      }
      await autoUpdater.checkForUpdates();
    } catch (error) {
    }
  };
  updateInterval = setInterval(() => tryUpdate(), TEN_MINUTES);
  tryUpdate();
}

async function getLatestVersionName() {
  const LATEST_VERSION_URL = "https://api.github.com/repos/Rookout/explorook/releases/latest";
  const response = await fetch(LATEST_VERSION_URL);
  if (!response.ok) {
    throw new Error(`Error fetching latest version. Got: ${response.status} status with body: ${await response.text()}`);
  }
  return (await response.json()).name;
}

function displayWindowHiddenNotification() {
  displayNotification("I'm still here!", "Files are still served in the background");
}

function displayNotification(title: string, body: string, onClick?: (event: Electron.Event) => void) {
  if (onClick == null) {
    onClick = (e) => maximize();
  }
  if (!process.platform.match("win32")) {
    const notif = new Notification({
      title,
      silent: true,
      body,
      icon: process.platform.match("darwin") ? undefined : APP_ICON,
    });
    notif.on("click", onClick);
    notif.show();
  } else if (tray != null) {
    tray.displayBalloon({
      title,
      content: body,
      icon: ROOKOUT_LOGO,
    });
  }
}

function createWindows() {
  // legacy code to choose whether to open Explorok window or start hidden
  // we don't want to open a window on machine startup (only tray pops)
  // const startOptions = app.getLoginItemSettings();
  // const hidden = startOptions.wasOpenedAsHidden || _.includes(process.argv, "--hidden");
  indexWorker = new BrowserWindow({
    width: 400,
    height: 400,
    show: !!process.env.development,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  remoteEnable(indexWorker.webContents);
  ipcMain.on("index-worker-up", (e: IpcMainEvent) => {
    createMainWindow(indexWorker, !firstTimeLaunch);
  });
  indexWorker.loadFile(path.join(__dirname, "index-worker.html")).finally(() => {
    if (process.env.development || process.env.ELECTRON_ENV === "debug") {
      indexWorker.webContents.openDevTools();
    }
  });
}

function startGraphqlServer() {
  indexWorker.webContents.send("main-window-id", firstTimeLaunch, mainWindow.webContents.id);
}

function createMainWindow(indexWorkerWindow: BrowserWindow, hidden: boolean = false) {
  mainWindow = new BrowserWindow({
    height: 320,
    width: 650,
    minWidth: 600,
    minHeight: 320,
    frame: false,
    icon,
    show: !hidden,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  remoteEnable(mainWindow.webContents);
  if (signedEula) {
    startGraphqlServer();
  }
  ipcMain.on("app-window-up", (ev: IpcMainEvent) => {
    ev.sender.send("indexer-worker-id", indexWorker.id);
    if (hidden && process.platform === "darwin") {
      app.dock.hide();
    }
    if (firstTimeLaunch) {
      displayNotification("Rookout's Desktop App is running in the background", "You can access the app via the tray icon");
    }
  });

  // and load the index.html of the app.
  if (process.env.development) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "./webapp/index.html"));
  }

  // Open the DevTools.
  if (process.env.development || process.env.ELECTRON_ENV === "debug") {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

function maximize() {
  if (!mainWindow) {
    createMainWindow(indexWorker);
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    return;
  }
  if (process.platform.match("darwin")) {
    app.dock.show();
  }
  mainWindow.show();
  mainWindow.focus();
}

function openTray() {
  let darkMode = false;
  if (process.platform === "darwin") {
    darkMode = nativeTheme.shouldUseDarkColors;
  }
  tray = new Tray(TRAY_ICON);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Config...", icon: darkMode ? SETTINGS_ICON_WHITE : SETTINGS_ICON_BLACK, click: maximize },
    { label: "Close", icon: darkMode ? CLOSE_ICON_WHITE : CLOSE_ICON_BLACK, click: quitApplication },
  ]);
  tray.setToolTip("Rookout");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", maximize);
  if (process.platform.match("darwin")) {
    tray.on("right-click", (e) => tray.popUpContextMenu());
  }
}

// trying to workaround this bug: https://github.com/electron-userland/electron-builder/issues/2451
process.on("uncaughtException", (err: Error) => {
  try {
    notify(err);
  } catch (err) {
    console.trace(`uncaughtException hook: ${err}`);
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  main();
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  displayWindowHiddenNotification();
});

app.on("activate", () => {
  if (app.isReady()) {
    maximize();
  }
});

app.on("quit", async () => {
  // on linux: AppImage filename changes after every update so we need to make sure we disable
  // autolaunch before update is installed and re-enable it on the next startup
  // so this is where we disable it
  if (al && process.platform === "linux" && willUpdateOnClose) {
    try {
      await al.disable();
    } catch (error) {
      // bummer
      notify(error);
    }
  }
});
