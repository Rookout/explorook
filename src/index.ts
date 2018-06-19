import { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, Tray } from "electron";
import * as log from "electron-log";
import Store = require("electron-store");
import { autoUpdater } from "electron-updater";
import * as path from "path";
const uuidv4 = require("uuid/v4");
import { repStore, Repository } from "./rep-store";
import * as cdnServer from "./server";

autoUpdater.logger = log;
// log.transports.file.level = "debug";
log.transports.console.level = "warn";
log.verbose("app starting...");

const ICONS_DIR = "../assets/icons/";
const APP_ICON = path.join(__dirname, ICONS_DIR, getAppIcon());
const ROOKOUT_LOGO = path.join(__dirname, ICONS_DIR, "logo.png");
const CLOSE_ICON = path.join(__dirname, ICONS_DIR, "baseline_close_black_18dp.png");
const SETTINGS_ICON = path.join(__dirname, ICONS_DIR, "baseline_settings_black_18dp.png");

let mainWindow: Electron.BrowserWindow;
let tray: Tray;
let token: string;
const icon = nativeImage.createFromPath(APP_ICON);

// getAppIcon resolves the right icon for the running platform
function getAppIcon() {
  if (process.platform.match("win32")) {
    return "/win/icon.ico";
  } else if (process.platform.match("darwin")) {
    return "/mac/icon.icns";
  } else {
    return "/logo.png";
  }
}

function main() {
  const store = new Store();
  token = store.get("token", null);
  if (!token) {
    token = uuidv4();
    store.set("token", token);
  }
  ipcMain.on("hidden", showActiveOnBackgroundBalloon);
  // TODO: move all event emitters to somewhere else?
  ipcMain.on("repos-request", (e: any) => e.returnValue = repStore.get());
  ipcMain.on("version-request", (e: any) => e.returnValue = autoUpdater.currentVersion);
  ipcMain.on("token-request", (e: any) => e.returnValue = token);
  ipcMain.on("add-repo", (e: any, repo: Repository) => {
    repStore.add(repo);
    e.sender.send("refresh-repos", repStore.get());
  });
  ipcMain.on("delete-repo", (e: any, repId: string) => {
    repStore.remove(repId);
    e.sender.send("refresh-repos", repStore.get());
  });
  ipcMain.on("edit-repo", (e: any, args: { id: string, repoName: string }) => {
    const { id, repoName } = args;
    repStore.update(id, repoName);
    e.sender.send("refresh-repos", repStore.get());
  });
  autoUpdater.checkForUpdatesAndNotify();
  createWindow();
  spinServer();
  openTray();
}

function showActiveOnBackgroundBalloon() {
  if (tray != null) {
    if (!process.platform.match("win32")) {
      const notif = new Notification({
        title: "I'm still here!",
        body: "Files are still served in the background", icon: APP_ICON
      });
      notif.on("click", (e) => {
        maximize();
      });
      notif.show();
    } else {
      tray.displayBalloon({
        title: "I'm still here!",
        content: "Files are still served in the background", icon: ROOKOUT_LOGO
      });
    }
  }
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 450,
    width: 600,
    minWidth: 550,
    minHeight: 400,
    frame: false,
    icon,
  });

  // and load the index.html of the app.
  if (process.env.development) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "index.html"));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

function maximize() {
  if (mainWindow === null) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    return;
  }
  mainWindow.show();
  mainWindow.focus();
}

function openTray() {
  tray = new Tray(APP_ICON);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Config...", icon: SETTINGS_ICON, click: maximize },
    { label: "Close", icon: CLOSE_ICON, click: app.quit },
  ]);
  tray.setToolTip("Rookout");
  tray.setContextMenu(contextMenu);
}

function spinServer() {
  cdnServer.start();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  main();
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  showActiveOnBackgroundBalloon();
});

app.on("activate", maximize);
