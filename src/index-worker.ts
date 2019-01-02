import { IpcMessageEvent, ipcRenderer } from "electron";
import { repStore } from "./rep-store";
import { Repository } from "./common/repository";
import * as graphQlServer from "./server";
import { basename } from "path"

// configure Sentry
import * as Raven from 'raven-js';

let mainWindowId = -1;

const getRepos = () => repStore.getRepositories().map((r) => r.toModel());

ipcRenderer.once("sentry-enabled-changed", (e: IpcMessageEvent, enabled: boolean) => {
    if (enabled) {
        console.log("enabling sentry on index worker");
        Raven
            .config('https://e860d220250640e581535a5cec2118d0@sentry.io/1260942')
            .install();
    } else {
        console.log("sentry disabled on index worker");
    }
});

ipcRenderer.on("main-window-id", (e: IpcMessageEvent, token: string, id: number) => {
    mainWindowId = id;
    graphQlServer.start({ accessToken: token, onAddRepoRequest: async (fullpath) => {
        if (fullpath) {
            // add repository
            await repStore.add({ fullpath, repoName: basename(fullpath), id: undefined })
            // tell webview to refresh repos view
            ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
        } else {
            // will pop the menu for the user to choose repository
            ipcRenderer.sendTo(mainWindowId, 'pop-choose-repository')
        }
        return true;
    } });
});

ipcRenderer.on("add-repo", (e: IpcMessageEvent, repo: Repository) => {
    repStore.add(repo).then(() => {
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
ipcRenderer.send("sentry-is-enabled-req");
