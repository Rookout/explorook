import {getLibraryFolder} from "./utils";

const path = require("path");
import * as fs from "fs";
import _ = require("lodash");
import {P4} from "p4api";
import * as util from "util";
import {notify} from "./exceptionManager";
import {getStoreSafe} from "./explorook-store";
import {repStore} from "./repoStore";
const getFileContent = util.promisify(fs.readFile);

export interface IPerforceRepo {
    fullPath: string;
    id: string;
}

export interface IPerforceView {
    map: string;
    name: string;
}

export interface IPerforceWorkspace {
    client: string;
    Owner: string;
    Root: string;
}

export interface IPerforceManager {
    getAllViews(): Promise<IPerforceView[]>;
    changeViews(views: string[], shouldSync?: boolean): Promise<IPerforceRepo[]>;
    getCurrentViewRepos(): string[];
    switchChangelist(changelistId: string): Promise<OperationStatus>;
    getCurrentClient(): any;
    getChangelistForFile(fullPath: string): Promise<string>;
    isSameRemoteOrigin(filePath: string, remoteOrigin: string): Promise<boolean>;
    getSpecificFile(fileDepotPath: string, labelOrChangelist: string, retry?: boolean): Promise<string>;
    getDepotFileTree(depot: string, labelOrChangelist: string): Promise<[string]>;
}

const store = getStoreSafe();
const PERFORCE_ROOKOUT_CLIENT_PREFIX = "ROOKOUT_DESKTOP_";
// Currently supporting only Windows and OSX
const ROOT = path.join(getLibraryFolder(), "Perforce_Root");
const P4API_TIMEOUT = 3000;

class PerforceManager {
    private p4: any;
    constructor(perforceConnectionString: string) {
        this.p4 = new P4({
            P4PORT: perforceConnectionString,
            P4API_TIMEOUT
        });

        // Getting the current client of the connected perforce server. The result contains "stat" which is a list of all the actual results;
        const client = this.getCurrentClient();
        const currentRookoutClientName = `${PERFORCE_ROOKOUT_CLIENT_PREFIX}_${client?.Owner}_${client?.Host}`;

        // Checking if current client is not the wanted client. If so, changing it.
        if (!client || client.Client === currentRookoutClientName) {
          return;
        }
        // Check if workspace exists. If not, create it. Only get this user's workspaces.
        const allWorkspaces = this.p4.cmdSync(`workspaces -u ${client.Owner}`)?.stat;
        if (!_.find(allWorkspaces, workspace => workspace.Client === currentRookoutClientName)) {
            // Creating a new client for Rookout desktop app without own root so we can change depots when needed
            const newClient = { ...client, Client: currentRookoutClientName };
            this.p4.cmdSync(`client -i`, newClient);
        }

        this.p4 = new P4({
                P4PORT: perforceConnectionString,
                P4CLIENT: currentRookoutClientName,
                P4API_TIMEOUT
            });
    }


    public async getAllViews(): Promise<IPerforceView[]> {
        return (await this.p4.cmd("depots"))?.stat || [];
    }

    public async changeViews(views: string[], shouldSync: boolean = true): Promise<IPerforceRepo[]> {
        const client = this.getCurrentClient();

        const allViews = await this.getAllViews();

        // Filter out non existing views and create the right mapping
        const targetViews = _.map(views, view => {
            const originalView = _.find(allViews, v => view.includes(v.name));
            return originalView ? {name: view, map: `${view}/...`} : undefined;
        });

        // Removing all existing views
        for (let i = 0;; i++) {
            const viewId = "View" + i;
            if (!client[viewId]) break;
            delete client[viewId];
        }

        // Making sure we create the folders in the right root.
        client.Root = ROOT;

        // Remove all existing depots from the repStore
        const existingRepos = await repStore.getRepositories();
        _.forEach(existingRepos, repo => {
          if (repo.fullpath.includes(client.Root)) {
             repStore.remove(repo.id);
          }
        });

        // Adding all the repos from the given list to the client.
        for (let i = 0; i < targetViews.length; i++) {
            // Small hack here to handle weird views with triple slashes.
            client["View" + i] = `//${targetViews[i].name}/... //${client.Client}/${targetViews[i].map}`.replace(/\/\/\//g, "/");
        }

        // Update the client. If successful sync the files
        let result = await this.p4.cmd("client -i", client);

        if (result.error) {
            notify(result.error);
            return [];
        }

        result = await this.p4.cmd(`sync ${shouldSync ? "-f" : "-k" }`);

        if (result.error) {
            notify(result.error);
            return [];
        }


        return _.map(targetViews, view => ({fullPath: path.join(client.Root, view.name), id: `Perforce-${view.name}`}));
    }

    public getCurrentViewRepos(): string[] {
        const client = this.getCurrentClient();

        const views: string[] = [];

        for (let i = 0;; i++) {
            const currentView = client["View" + i];
            if (!currentView) break;

            views.push(client.Root + currentView.split(`//${client.Client}`)?.[1]);
        }

        return views;
    }

    public async switchChangelist(changelistId: string): Promise<OperationStatus> {
        const result = await this.p4.cmd(`sync @${changelistId}`);
        if (result.error) {
            notify(result.error);
        }

        return {
          isSuccess: !result.error,
          reason: result?.error?.toString()
        };
    }

    public getCurrentClient(): any {
      const res = this.p4.cmdSync("client -o");
      return _.head(res?.stat);
    }

    public async getChangelistForFile(fullPath: string): Promise<string> {
        const client = this.getCurrentClient();
        const workspaces = (await this.p4.cmd(`workspaces -u ${client.Owner}`))?.stat;
        const workspace = _.find<IPerforceWorkspace | null>(workspaces,
           ws => (fullPath.includes(ws.Root) && client.Owner === ws.Owner));
        if (workspace) {
          return (await this.p4.cmd(`changes -m1 @${workspace.client}`))?.stat?.[0]?.change;
        }
        return null;
    }

    public async isSameRemoteOrigin(filePath: string, remoteOrigin: string): Promise<boolean> {
        // Removing the "Perforce://" prefix. A remote origin will look like Perforce://MyDepot/MySubDepot
        const remoteOriginWithoutPrefix: string = _.last(_.split(remoteOrigin, "://"));

        // Making sure that on Windows the path is with the right slashes
        const normalizedOrigin = path.normalize(remoteOriginWithoutPrefix);

        // If the Depot name is included in the path we assume it belongs to it.
        return filePath?.includes(normalizedOrigin);
    }

    public async getSpecificFile(fileDepotPath: string, labelOrChangelist: string, retry: boolean = true): Promise<string> {
        const result = await this.p4.cmd(`sync ${fileDepotPath} @${labelOrChangelist}`);

        const fileData: any = _.find(result.stat, file =>
            file.depotFile === fileDepotPath
        );

        if (!fileData) {
            return "";
        }

        const filePath = fileData.clientFile;
        // This is a hack to handle Perforce deleting the file if it already exists
        return getFileContent(filePath, "utf-8").catch(e => {
                if (retry) {
                    return this.getSpecificFile(fileDepotPath, labelOrChangelist, false);
                } else {
                    throw e;
                }
        });
    }

    public async getDepotFileTree(depot: string, labelOrChangelist: string): Promise<[string]> {
        // If depot doesn't end with /... we need to normalize it, taking into consideration that it might end with '/'
        const formattedDepot = depot.endsWith("/...") ? depot : `//${depot.endsWith("/") ? depot : `${depot}/`}...`;
        const result = await this.p4.cmd(`files ${formattedDepot} @${labelOrChangelist}`);
        // @ts-ignore
        return _.map(result?.stat, file => file.depotFile);
    }
}

let perforceManagerSingleton: IPerforceManager = null;

const connectionString = store.get("PerforceConnectionString", null);
if (connectionString) {
    perforceManagerSingleton = new PerforceManager(connectionString);
}

export const getPerforceManagerSingleton = (): IPerforceManager => {
    return perforceManagerSingleton;
};

export const changePerforceManagerSingleton = (newConnectionString: string): boolean => {
        perforceManagerSingleton = new PerforceManager(newConnectionString);

        // p4 client creation works no matter what so we make sure the client is created.
        const client = perforceManagerSingleton.getCurrentClient();
        if (!client) {
            return false;
        }
        store.set("PerforceConnectionString", newConnectionString);
        return true;
};
