import { ipcRenderer, remote } from "electron";

export const copyText = function(text) {
    var el = document.createElement("textarea");
    el.innerText= text;
    el.setAttribute("visibility", "hidden");
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
}

export const closeWindow = () => {
    const w = remote.getCurrentWindow();
    if (window.process.platform.match("darwin")) {
        remote.app.dock.hide();
    }
    w.hide();
    ipcRenderer.send("hidden");
};

export const exitApplication = () => {
  ipcRenderer.send("force-exit");
};
