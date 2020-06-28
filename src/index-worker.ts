import { ipcRenderer, IpcRendererEvent, remote } from "electron";
import _ = require("lodash");
import net = require("net");
import { basename } from "path";
import { Repository } from "./common/repository";
import { initExceptionManager, notify } from "./exceptionManager";
import {changePerforceManagerSingleton} from "./perforceManager";
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

ipcRenderer.once("exception-manager-enabled-changed", (e: IpcRendererEvent, enabled: boolean) => {
    if (enabled) {
        initExceptionManager(
          remote.process.env.development ? "development" : "production",
          remote.app.getVersion(),
          () => ipcRenderer.sendSync("get-user-id"));
    }
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

const updateGitLoadingState = (isLoading: boolean) => {
    ipcRenderer.sendTo(mainWindowId, "set-git-is-loading", [isLoading]);
};

ipcRenderer.on("main-window-id", async (e: IpcRendererEvent, token: string, firstTimeLaunch: boolean, id: number) => {
    mainWindowId = id;
    const port = 44512;
    try {
        const portInUse = await isPortInUse(port);
        if (portInUse) {
            throw new Error(`port ${port} in use`);
        }
        const userId: string = ipcRenderer.sendSync("get-user-id");
        const userSite: string = ipcRenderer.sendSync("get-user-site");
        await graphQlServer.start({ userId, userSite, accessToken: token, port, firstTimeLaunch, onAddRepoRequest, updateGitLoadingState });
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
ipcRenderer.on("test-perforce-connection", (e: IpcRendererEvent, connectionString: string) => {
    let isSuccess = false;
    try {
        isSuccess = !!changePerforceManagerSingleton(connectionString);
    } catch (e) {
        if (e.message?.code === "ENOENT") {
            ipcRenderer.send("no-p4-found");
        }
        console.error(`Failed to init perforce manager with port :${connectionString}`);
    }

    ipcRenderer.sendTo(mainWindowId, "test-perforce-connection-result", isSuccess);
});

ipcRenderer.on("repos-request", (e: IpcRendererEvent) => ipcRenderer.sendTo(mainWindowId, "refresh-repos", getRepos()));

ipcRenderer.send("index-worker-up");
ipcRenderer.send("exception-manager-is-enabled-req");
