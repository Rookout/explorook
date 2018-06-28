import { IpcMessageEvent, ipcRenderer } from "electron";
import Store = require("electron-store");
import { Repository, repStore } from "./rep-store";
import * as graphQlServer from "./server";

const store = new Store({ name: "explorook" });
let mainWindowId = -1;

const getRepos = () => repStore.getRepositories().map((r) => r.toModel());

ipcRenderer.on("main-window-id", (e: IpcMessageEvent, token: string, id: number) => {
    mainWindowId = id;
    graphQlServer.start(token);
});

ipcRenderer.on("add-repo", (e: IpcMessageEvent, repo: Repository) => {
    repStore.add(repo);
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
});
ipcRenderer.on("delete-repo", (e: IpcMessageEvent, repId: string) => {
    repStore.remove(repId);
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
});
ipcRenderer.on("edit-repo", (e: IpcMessageEvent, args: { id: string, repoName: string }) => {
    const { id, repoName } = args;
    repStore.update(id, repoName);
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
});
ipcRenderer.on("is-search-enabled", (e: IpcMessageEvent) =>
    ipcRenderer.sendTo(mainWindowId, "search-index-enabled-changed", repStore.getAllowIndex()));

ipcRenderer.on("search-index-set", (e: IpcMessageEvent, enable: boolean) => {
        store.set("allow-indexing", enable.toString());
        repStore.setAllowIndex(enable);
        ipcRenderer.sendTo(mainWindowId, "search-index-enabled-changed", enable);
    });

ipcRenderer.on("repos-request", (e: IpcMessageEvent) => ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos()));

ipcRenderer.send("index-worker-up");
