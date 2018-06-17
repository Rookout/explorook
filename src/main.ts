import { app, BrowserWindow, Menu, Tray } from "electron";
const Store = require("electron-store");
import * as path from "path";
import * as cdnServer from "./server";
const uuidv4 = require("uuid/v4");

let mainWindow: Electron.BrowserWindow;
let tray: Tray;

function main() {
  const store = new Store();
  let token = store.get("token", null);
  if (!token) {
    token = uuidv4();
    store.set("token", token);
  }
  createWindow();
  spinServer();
  openTray();
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
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

function openTray() {
  const icoPath = path.join(__dirname, "../assets/icons/rookout_favicon.ico");
  console.log(icoPath);
  tray = new Tray(icoPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Item1", type: "radio" },
    { label: "Item2", type: "radio" },
    { label: "Item3", type: "radio", checked: true },
    { label: "Item4", type: "radio" },
  ]);
  tray.setToolTip("This is my application.");
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
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it"s common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    // createWindow();
    main();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
