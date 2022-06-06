import { ipcRenderer } from "electron";
// import * as remote from '@electron/remote';

export const closeWindow = () => {
    const w = require('@electron/remote').getCurrentWindow();
    if (window.process.platform.match("darwin")) {
        require('@electron/remote').app.dock.hide();
    }
    w.hide();
    ipcRenderer.send("hidden");
};

export const exitApplication = () => {
  ipcRenderer.send("force-exit");
};
