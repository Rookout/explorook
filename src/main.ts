import { app, BrowserWindow, ipcMain, Menu, Tray } from "electron";
import Store = require("electron-store");
import * as path from "path";
const uuidv4 = require("uuid/v4");
import * as cdnServer from "./server";

const ICONS_DIR = "../assets/icons/";
const ROOKOUT_ICON = path.join(__dirname, ICONS_DIR, "rookout_favicon.ico");
const ROOKOUT_LOGO = path.join(__dirname, ICONS_DIR, "logo.png");
const CLOSE_ICON = path.join(__dirname, ICONS_DIR, "baseline_close_black_18dp.png");
const SETTINGS_ICON = path.join(__dirname, ICONS_DIR, "baseline_settings_black_18dp.png");

let mainWindow: Electron.BrowserWindow;
let tray: Tray;
let token: string;

function main() {
  const store = new Store();
  token = store.get("token", null);
  if (!token) {
    token = uuidv4();
    store.set("token", token);
  }
  ipcMain.on("hidden", showActiveOnBackgroundBalloon);
  createWindow();
  spinServer();
  openTray();
}

function showActiveOnBackgroundBalloon() {
  if (tray != null) {
    tray.displayBalloon({ title: "I'm still here!",
    content: "Files are still served in the background",
    // TODO: better logo
    icon: ROOKOUT_LOGO });
  }
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 450,
    width: 550,
    minWidth: 500,
    minHeight: 400,
    frame: false,
  });

  // and load the index.html of the app.
  // mainWindow.loadFile(path.join(__dirname, "http://localhost:3000"));
  mainWindow.loadURL("http://localhost:3000");

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
  tray = new Tray(ROOKOUT_ICON);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Close", icon: CLOSE_ICON, click: app.quit },
    { label: "Config...", icon: SETTINGS_ICON, click: maximize },
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
