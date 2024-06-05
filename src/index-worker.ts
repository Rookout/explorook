import { ipcRenderer, IpcRendererEvent } from "electron";
import _ = require("lodash");
import net = require("net");
import { basename } from "path";
import { Repository } from "./common/repository";
import { notify } from "./exceptionManager";
import {setLogLevel} from "./logger";
import { repStore } from "./repoStore";
import * as graphQlServer from "./server";

let mainWindowId = -1;

const getRepos = () => repStore.getRepositories().map((r) => r.toModel());

const isPortInUse = (port: number): Promise<boolean> => new Promise<boolean>((resolve, reject) => {
    const testServer = net.createServer()
    .on("error", (err: any) => {
        err.code === "EADDRINUSE" ? resolve(true) : reject(err);
    })
    .on("listening", () => {
        testServer.once("close", () => resolve(false));
        testServer.close();
    })
    .listen({ port, host: "localhost" });
});

const onAddRepoRequest = async (fullpath: string, id?: string) => {
    ipcRenderer.send("track", "repo-add-request", { fullpath });
    if (!fullpath) {
        // will pop the menu for the user to choose repository
        ipcRenderer.sendTo(mainWindowId, "pop-choose-repository");
        ipcRenderer.send("track", "repo-add-pop-choose-repo");
        return true;
    }
    const repoName = basename(fullpath);
    // add repository
    const repoId = await repStore.add({ fullpath, repoName, id });
    // tell webview to refresh repos view
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
    ipcRenderer.send("track", "repo-add", { repoName, repoId });
    return true;
};

const onRemoveRepoRequest = async (repId: string) => {
  repStore.remove(repId);
  ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
  return true;
};

ipcRenderer.on("main-window-id", async (e: IpcRendererEvent, firstTimeLaunch: boolean, id: number) => {
    mainWindowId = id;
    const port = 44512;
    try {
        const portInUse = await isPortInUse(port);
        if (portInUse) {
            throw new Error(`port ${port} in use`);
        }
        const userId: string = ipcRenderer.sendSync("get-user-id");
        await graphQlServer.start({
            userId,
            port,
            firstTimeLaunch,
            onAddRepoRequest,
            onRemoveRepoRequest
        });
    } catch (err) {
        console.error(err);
        notify("Failed to start local server", { metaData: { err }});
        ipcRenderer.send("start-server-error", _.toString(err));
    }
});

ipcRenderer.on("add-repo", (e: IpcRendererEvent, repo: Repository) => {
    repStore.add(repo).then(repoId => {
        ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
        ipcRenderer.send("track", "repo-add", { repoName: repo.repoName, repoId });
    });
});
ipcRenderer.on("delete-repo", (e: IpcRendererEvent, repId: string) => {
    repStore.remove(repId);
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
});
ipcRenderer.on("edit-repo", (e: IpcRendererEvent, args: { id: string, repoName: string }) => {
    const { id, repoName } = args;
    repStore.update(id, repoName);
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
});
ipcRenderer.on("clear-all-repos", (e: IpcRendererEvent) => {
    const allRepos = _.map(repStore.getRepositories(), "id");
    _.forEach(allRepos, repo => {
        repStore.remove(repo);
    });
    ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos());
});

ipcRenderer.on("repos-request", (e: IpcRendererEvent) => ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos()));

ipcRenderer.on("set-log-level", (e: IpcRendererEvent, newLogLevel: string) => {
    setLogLevel(newLogLevel);
});

ipcRenderer.send("index-worker-up");
ipcRenderer.send("exception-manager-is-enabled-req");
