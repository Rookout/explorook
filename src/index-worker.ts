import { IpcMessageEvent, ipcRenderer } from "electron";
import { Repository, repStore } from "./rep-store";
import * as graphQlServer from "./server";

// configure Sentry
import * as Raven from 'raven-js';
Raven.config('https://e860d220250640e581535a5cec2118d0@sentry.io/1260942')
     .install();

let mainWindowId = -1;

const getRepos = () => repStore.getRepositories().map((r) => r.toModel());

ipcRenderer.on("main-window-id", (e: IpcMessageEvent, token: string, id: number) => {
    mainWindowId = id;
    graphQlServer.start(token);
});

ipcRenderer.on("add-repo", (e: IpcMessageEvent, repo: Repository) => {
    repStore.add(repo).then((repoId) => {
        ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
    });
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

ipcRenderer.on("repos-request", (e: IpcMessageEvent) => ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos()));

ipcRenderer.send("index-worker-up");
