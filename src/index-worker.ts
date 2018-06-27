import { IpcMessageEvent, ipcRenderer } from "electron";
import Store = require("electron-store");
import { Repository, repStore } from "./rep-store";

const store = new Store({ name: "explorook" });
let mainWindowId = -1;

ipcRenderer.on("main-window-id", (e: IpcMessageEvent, id: number) => {
    mainWindowId = id;
});

ipcRenderer.on("add-repo", (e: IpcMessageEvent, repo: Repository) => {
    repStore.add(repo);
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", repStore.getRepositories());
});
ipcRenderer.on("delete-repo", (e: IpcMessageEvent, repId: string) => {
    repStore.remove(repId);
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", repStore.getRepositories());
});
ipcRenderer.on("edit-repo", (e: IpcMessageEvent, args: { id: string, repoName: string }) => {
    const { id, repoName } = args;
    repStore.update(id, repoName);
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", repStore.getRepositories());
});
ipcRenderer.on("is-search-enabled", (e: IpcMessageEvent) =>
    ipcRenderer.sendTo(mainWindowId, "search-index-enabled-changed", repStore.getAllowIndex()));

ipcRenderer.on("search-index-set", (e: IpcMessageEvent, enable: boolean) => {
        store.set("allow-indexing", enable.toString());
        repStore.setAllowIndex(enable);
        ipcRenderer.sendTo(mainWindowId, "search-index-enabled-changed", enable);
    });

ipcRenderer.on("repos-request", (e: IpcMessageEvent) => ipcRenderer.sendTo(mainWindowId, "refresh-repos", repStore.getRepositories()));

ipcRenderer.send("index-worker-up");
