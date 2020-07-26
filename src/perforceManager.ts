import {getLibraryFolder} from "./utils";

import childProcess = require("child_process");
const path = require("path");
import * as fs from "fs";
import _ = require("lodash");
import {P4} from "p4api";
import * as util from "util";
import {notify} from "./exceptionManager";
import {getStoreSafe} from "./explorook-store";
import {getLogger} from "./logger";
import {repStore} from "./repoStore";
const getFileContent = util.promisify(fs.readFile);
const exec = util.promisify(childProcess.exec);

const addUsrBinToPathIfNeeded = () => {
    if (process.platform === "darwin") {
        if (process.env.PATH.includes("/usr/local/bin")) return;

        // Add /usr/local/bin to the end of the PATH env var to make sure we find p4 if it is there. Making sure we don't get a double colon
        process.env.PATH = process.env.PATH.endsWith(":") ?
            `${process.env.PATH}/usr/local/bin` : `${process.env.PATH}:/usr/local/bin`;
    }
};

addUsrBinToPathIfNeeded();

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

export interface PerforceConnectionOptions {
    connectionString: string;
    timeout?: number;
    username?: string;
}

const store = getStoreSafe();
const PERFORCE_ROOKOUT_CLIENT_PREFIX = "ROOKOUT_DESKTOP_";
// Currently supporting only Windows and OSX
const ROOT = path.join(getLibraryFolder(), "Perforce_Root");
const P4API_TIMEOUT = 5000;
const logger = getLogger("perforce");

class PerforceManager {
    private p4: any;
    constructor(connectionOptions: PerforceConnectionOptions) {
        logger.debug("Creating new P4 instance", {connectionOptions});
        this.p4 = new P4({
            P4PORT: connectionOptions.connectionString,
            P4API_TIMEOUT: connectionOptions.timeout > 0 ? connectionOptions.timeout : P4API_TIMEOUT,
            P4USER: connectionOptions.username
        });

        process.env.P4PORT = connectionOptions.connectionString;
        process.env.P4API_TIMEOUT = String(connectionOptions.timeout > 0 ? connectionOptions.timeout : P4API_TIMEOUT);
        process.env.P4USER = connectionOptions.username;

        // Getting the current client of the connected perforce server. The result contains "stat" which is a list of all the actual results;
        const client = this.getCurrentClient();
        const currentRookoutClientName = `${PERFORCE_ROOKOUT_CLIENT_PREFIX}_${client?.Owner}_${client?.Host}`;
        logger.debug("Got client", {client, currentRookoutClientName});

        // Checking if current client is not the wanted client. If so, changing it.
        if (!client || client.Client === currentRookoutClientName) {
            logger.debug("Perforce client set to rookout client. Skipping client creation");
            return;
        }
        // Check if workspace exists. If not, create it. Only get this user's workspaces.
        const allWorkspaces = this.p4.cmdSync(`workspaces -u ${client.Owner}`)?.stat;
        if (!_.find(allWorkspaces, workspace => workspace.Client === currentRookoutClientName)) {
            // Creating a new client for Rookout desktop app without own root so we can change depots when needed
            const newClient = { ...client, Client: currentRookoutClientName,
                Options: "noallwrite noclobber nocompress unlocked nomodtime normdir", SubmitOptions: "submitunchanged" };
            logger.debug("Creating new client", newClient);
            this.p4.cmdSync(`client -i`, newClient);
        }

        this.p4 = new P4({
            P4PORT: connectionOptions.connectionString,
            P4CLIENT: currentRookoutClientName,
            P4API_TIMEOUT: connectionOptions.timeout > 0 ? connectionOptions.timeout : P4API_TIMEOUT,
            P4USER: connectionOptions.username
        });
        logger.debug("Client created successfully");
    }


    public async getAllViews(): Promise<IPerforceView[]> {
        return (await this.p4.cmd("depots"))?.stat || [];
    }

    public async changeViews(views: string[], shouldSync: boolean = true): Promise<IPerforceRepo[]> {
        const client = this.getCurrentClient();
        logger.debug("About to change view for client", {client, views});

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
        logger.debug("Removed existing views from client");

        // Making sure we create the folders in the right root.
        logger.debug("Setting client view root", ROOT);
        client.Root = ROOT;

        // Remove all existing depots from the repStore
        const existingRepos = await repStore.getRepositories();
        logger.debug("Removing existing repos", existingRepos);
        _.forEach(existingRepos, repo => {
          if (repo.fullpath.includes(client.Root)) {
             repStore.remove(repo.id);
          }
        });

        // Adding all the repos from the given list to the client.
        logger.debug("About to add views to client");
        for (let i = 0; i < targetViews.length; i++) {
            // Small hack here to handle weird views with triple slashes.
            client["View" + i] = `//${targetViews[i].name}/... //${client.Client}/${targetViews[i].map}`.replace(/\/\/\//g, "/");
        }

        // Update the client. If successful sync the files
        logger.debug("Updating client with new views", client);
        let result = await this.p4.cmd("client -i", client);

        if (result.error) {
            logger.error("Failed to update client", result.error);
            notify(result.error);
            return [];
        }

        // I couldn't find a flag that does not sync the files so if shouldSync is false we set the max synced files to 1
        logger.debug("About to sync client");
        result = await this.p4.cmd(`sync ${shouldSync ? "-f" : "-m 1" }`);

        // @ts-ignore result.error[0].data is a string but ts-ling thinks it's a boolean. This error means we didn't actually need to change anything
        if (result.error && !result.error[0].data === "File(s) up-to-date.\n") {
            logger.error("Failed to sync files", result.error);
            notify(result.error);
            return [];
        }

        logger.debug("Changed client views successfully");
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
        logger.debug("Getting changelist for file", {client, fullPath});
        const workspaces = (await this.p4.cmd(`workspaces -u ${client.Owner}`))?.stat;
        const workspace = _.find<IPerforceWorkspace | null>(workspaces,
           ws => (fullPath.includes(ws.Root) && client.Owner === ws.Owner));
        if (workspace) {
          return (await this.p4.cmd(`changes -m1 @${workspace.client}`))?.stat?.[0]?.change;
        }
        logger.debug("Failed to find workspace");
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
        logger.debug("Fetching single file", {fileDepotPath, labelOrChangelist});
        const client = this.getCurrentClient();
        // -f forces p4 to refresh the files. -m 1 makes sure that we only get 1 file and not the whole workspace.
        const result = await exec(`p4 -c ${client.Client} sync -f -m 1 ${fileDepotPath} @${labelOrChangelist}`);

        if (result.stderr.includes("not in client view")) {
            logger.error("depot not in client view", {fileDepotPath});
            throw new Error("Depot not in client view");
        }

        logger.debug("result of execution for single file", result);
        // Turn depot file into a proper path in the root folder
        const filePath = path.join(client.Root, fileDepotPath.replace("//", ""));
        // This is a hack to handle Perforce deleting the file if it already exists
        logger.debug("Synced file. Getting content of file", filePath);
        return getFileContent(filePath, "utf-8").catch(e => {
                if (retry) {
                    return this.getSpecificFile(fileDepotPath, labelOrChangelist, false);
                } else {
                    logger.error("Failed to get single file", e);
                    throw e;
                }
        });
    }

    public async getDepotFileTree(depot: string, labelOrChangelist: string): Promise<[string]> {
        // If depot doesn't end with /... we need to normalize it, taking into consideration that it might end with '/'
        const formattedDepot = depot.endsWith("/...") ? depot : `//${depot.endsWith("/") ? depot : `${depot}/`}...`;
        logger.debug("Getting depot file tree", {depot, labelOrChangelist, formattedDepot});
        const result = await this.p4.cmd(`files ${formattedDepot}@${labelOrChangelist}`);
        result.error ? logger.error("Failed to get tree", result.error) : logger.debug("Depot file tree retrieved successfully");
        // Last action on a file can be: ["add","change","delete"].
        const noneDeletedFiles = _.filter(result?.stat, file => file.action !== "delete");
        // @ts-ignore
        return _.map(noneDeletedFiles, file => file.depotFile);
    }
}

let perforceManagerSingleton: IPerforceManager = null;

const connectionString = store.get("PerforceConnectionString", null);
const username = store.get("PerforceUser", null);
const timeout = store.get("PerforceTimeout", 0);
if (connectionString) {
    perforceManagerSingleton = new PerforceManager({connectionString, username, timeout});
}

export const getPerforceManagerSingleton = (): IPerforceManager => {
    return perforceManagerSingleton;
};

export const changePerforceManagerSingleton = (connectionOptions: PerforceConnectionOptions): boolean => {
        perforceManagerSingleton = new PerforceManager(connectionOptions);

        // p4 client creation works no matter what so we make sure the client is created.
        const client = perforceManagerSingleton.getCurrentClient();
        if (!client) {
            return false;
        }
        store.set("PerforceConnectionString", connectionOptions.connectionString);
        store.set("PerforceTimeout", connectionOptions.timeout || 5000);
        store.set("PerforceUser", connectionOptions.username || "");
        return true;
};
