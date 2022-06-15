import { ipcRenderer } from "electron";
import { app, getCurrentWindow } from "@electron/remote";

export const closeWindow = () => {
    const w = getCurrentWindow();
    if (window.process.platform.match("darwin")) {
        app.dock.hide();
    }
    w.hide();
    ipcRenderer.send("hidden");
};

export const exitApplication = () => {
  ipcRenderer.send("force-exit");
};
