import { remote } from "electron";
import fs = require("fs");
import _ = require("lodash");
import {posix} from "path";
import {
  BitBucketOnPremInput,
  getBranchesForRepoFromBitbucket,
  getCommitDetailsFromBitbucket,
  getCommitsForRepoFromBitbucket,
  getFileContentFromBitbucket,
  getFileTreeFromBitbucket,
  getProjectsFromBitbucket,
  getReposForProjectFromBitbucket,
  getUserFromBitbucket
} from "./BitBucketOnPrem";
import {Repository} from "./common/repository";
import {notify, USER_EMAIL_KEY} from "./exceptionManager";
import {getStoreSafe} from "./explorook-store";
import {
  canAuthGitRepo,
  checkGitRemote,
  cloneRemoteOriginWithCommit,
  getCommitIfRightOrigin,
  getLastCommitDescription as getLastCommitDescription,
  GIT_ROOT,
  isGitFolderBiggerThanMaxSize as computeGitFoldersSize,
  removeGitReposFromStore,
  TMP_DIR_PREFIX
} from "./git";
import { langServerConfigStore, minimumJavaVersionRequired } from "./langauge-servers/configStore";
import Log from "./logData";
import {getLogger} from "./logger";
import LogsContainer from "./logsContainer";
import {changePerforceManagerSingleton, getPerforceManagerSingleton, IPerforceRepo, IPerforceView} from "./perforceManager";
import {Repo, repStore} from "./repoStore";
import {loadingStateUpdateHandler, onAddRepoRequestHandler, onRemoveRepoRequestHandler} from "./server";
import { getSettings, setSettings } from "./utils";
const folderDelete = require("folder-delete");

// using posix api makes paths consistent across different platforms
const join = posix.join;

// Our schema for file size is `Int` which is limited to int32 (https://www.apollographql.com/docs/apollo-server/schemas/types.html)
// if a file we stat is bigger than 2.14GB then graphql will return some errors
const GRAPHQL_INT_MAX = 2147483647;

const logger = getLogger("api");
const store = getStoreSafe();

interface FileInfo {
  path: string;
  name: string;
  isFolder: boolean;
  size: number;
}

export const resolvers = {
  Repository: {
    lastCommitDescription: async (parent: Repository) => {
      const repo = repStore.getRepositories().find((r) => r.id === parent.id);
      logger.debug("Getting last commit description for repo", repo);
      const lastCommit = await getLastCommitDescription(repo);
      if (!lastCommit) {
        logger.error("Last commit not found");
        return null;
      }
      if (!lastCommit?.commit?.message) {
        notify("no commit message on last commit", {
          metaData: { lastCommit }
        });
        logger.warn("No commit message on last commit");
      }
      logger.debug("Found last commit", lastCommit);
      return {
        oid: lastCommit.oid,
        message: lastCommit?.commit?.message || "<no commit message>",
        author: lastCommit?.commit?.author || {}
      };
    },
  },
  Mutation: {
    settings: (parent: any, args: { settings: Settings }): Settings => {
      return setSettings(args.settings);
    },
    userEmail: (parent: any, args: { userEmail: string }): boolean => {
      if (args.userEmail) {
        const currentUserEmail = store.get(USER_EMAIL_KEY);
        if (!currentUserEmail) {
          store.set(USER_EMAIL_KEY, args.userEmail);
        } else if (currentUserEmail !== args.userEmail) {
          store.delete(USER_EMAIL_KEY);
          store.set(USER_EMAIL_KEY, args.userEmail);
        }
      }
      return true;
    },
    addRepository: async (parent: any, args: { fullpath: string }, context: { onAddRepoRequest: onAddRepoRequestHandler }): Promise<boolean> => {
      logger.debug("Adding repo", args.fullpath);
      return context.onAddRepoRequest(args.fullpath);
    },
    removeRepository: async (parent: any, args: {repoId: string}, context: {
      onAddRepoRequest: onAddRepoRequestHandler, onRemoveRepoRequest: onRemoveRepoRequestHandler }
      ): Promise<boolean> => {
      try {
        await context.onRemoveRepoRequest(args.repoId);
      } catch (e) {
        logger.error("failed to remove repo", {
          e,
          repoId: args.repoId
        });
        return false;
      }
      return true;
    },
    changePerforceViews: async (parent: any, args: {views: string[]}, context: { onAddRepoRequest: onAddRepoRequestHandler }):
        Promise<OperationStatus> => {
      const perforceManager = getPerforceManagerSingleton();

      if (!perforceManager) {
        logger.error("Failed to get Perforce manager instance", args.views);
        return { isSuccess: false, reason: "Perforce client not initialized" };
      }

      const newRepos = await perforceManager.changeViews(args.views);
      if (_.isEmpty(newRepos) && !_.isEmpty(args.views)) {
        logger.error("No depots with given input found", args.views);
        return { isSuccess: false, reason: "No depots with those names exist" };
      }

      const addRepoPromises = [] as Array<Promise<boolean>>;

      _.forEach(newRepos, (repo: IPerforceRepo) => {
        logger.debug("Adding repo", repo);
        addRepoPromises.push(context.onAddRepoRequest(repo.fullPath, repo.id));
      });

      const success = await Promise.all(addRepoPromises);

      const allSuccess = _.every(success, (s: boolean) => s);

      if (!allSuccess) {
        logger.error("Failed to create some of the depots");
      }

      return {
        isSuccess: allSuccess,
        reason: !allSuccess ? "Failed to create some of the repos in Explorook" : undefined
      };
    },
    switchPerforceChangelist: async (parent: any, args: {changelistId: string}): Promise<OperationStatus> => {
      const perforceManager = getPerforceManagerSingleton();
      if (!perforceManager) {
        logger.error("Failed to get Perforce manager instance");
        return { isSuccess: false, reason: "Perforce not initialized"};
      }
      logger.debug("Changing perforce to", args.changelistId);
      return await perforceManager.switchChangelist(args.changelistId);
    },
    getGitRepo: async (parent: any, args: {sources: [{repoUrl: string, commit: string}]},
                       context: { onAddRepoRequest: onAddRepoRequestHandler, updateGitLoadingState: loadingStateUpdateHandler }):
        Promise<OperationStatus> => {
      const subDirs = fs.readdirSync(GIT_ROOT);

      // Delete the folder if it's too big
      const sizeResult = await computeGitFoldersSize();
      if (!_.isEmpty(sizeResult.failedFolders)) {
        logger.debug("Deleting failed folders", sizeResult.failedFolders);
        _.forEach(sizeResult.failedFolders, folderPath => {
          try {
            folderDelete(folderPath);
          } catch (err) {
            logger.error("Failed to delete folder", { folderPath, err });
          }
        });
      }
      if (sizeResult.sizeOverMaxSize) {
        logger.debug("Removing repos because git folder is too big", subDirs);
        removeGitReposFromStore(subDirs);
      } else {
        // If we had any duplicate repos with two different commits we want to delete them now
        const tmpDirs = _.filter(subDirs, dir => dir.includes(TMP_DIR_PREFIX));
        if (!_.isEmpty(tmpDirs)) {
          logger.debug("Removing temporary git folders", tmpDirs);
          removeGitReposFromStore(tmpDirs);
        }
      }

      // If we have the same remote origin with two different commits we will take the first one only.
      const duplicates = _.keys(_.pickBy(_.groupBy(args.sources, "repoUrl"), d => d.length > 1));
      logger.debug("Found duplicate repos", duplicates);
      const updatedSourcesArray = _.uniqBy(args.sources, src => src.repoUrl);

      const addRepoPromises = _.map(updatedSourcesArray, async repo => {
        context.updateGitLoadingState(true, repo.repoUrl);
        if (!checkGitRemote(repo.repoUrl)) {
          notify(new Error(`Failed to parse give repo url: ${repo.repoUrl}`));
          logger.error("Failed to parse git url", repo);
          context.updateGitLoadingState(false, repo.repoUrl);
          return {
            isSuccess: false,
            reason: `Got bad format for git remote origin: ${repo.repoUrl}`
          };
        }
        try {
          logger.debug("Cloning repo", repo);
          const cloneDir = await cloneRemoteOriginWithCommit(repo.repoUrl, repo.commit);
          if (!cloneDir) {
            return {
              isSuccess: false,
              reason: "Failed to clone repository"
            };
          }
          const didAddRepo = await context.onAddRepoRequest(cloneDir);
          context.updateGitLoadingState(false, repo.repoUrl);
          logger.debug("Finished loading repo", {repo: repo.repoUrl, didAddRepo});
          return {
            isSuccess: didAddRepo,
            reason: didAddRepo ? undefined : `Failed to add repo on folder ${cloneDir}`
          };
        } catch (e) {
          notify(e);
          logger.error("Failed to clone repo", {repo, e});
          context.updateGitLoadingState(false, repo.repoUrl);
          return {
            isSuccess: false,
            reason: e.message
          };
        }
      });

      const res = await Promise.all(addRepoPromises);
      // Return the first error or success.
      context.updateGitLoadingState(false, "");
      logger.debug("Finished cloning git repos", res);
      return _.find(res, r => !r.isSuccess) || { isSuccess: true };
    },
    getFileFromPerforce: async (parent: any, args: { depotFilePath: string, labelOrChangelist: string }): Promise<string> => {
      const perforceManager = getPerforceManagerSingleton();
      if (!perforceManager) {
        logger.error("Could not get Perforce manager instace");
        return "";
      }

      logger.debug("Getting file from Perforce", args);
      return await perforceManager.getSpecificFile(args.depotFilePath, args.labelOrChangelist, true);
    },
    changePerforceViewsV2: async (parent: any, args: {views: string[], shouldSync: boolean}): Promise<OperationStatus> => {
      const perforceManager = getPerforceManagerSingleton();
      if (!perforceManager) {
        logger.error("Could not get Perforce manager instace");
        return {
          isSuccess: false,
          reason: "Perforce client not initialized"
        };
      }

      try {
        const result = await perforceManager.changeViews(args.views, args.shouldSync);
        logger.debug("Changed views for Perforce", {result});
        return {
          isSuccess: !_.isEmpty(result)
        };
      } catch (e) {
        notify(e);
        logger.error("Failed to change views for Perforce", e);
        return {
          isSuccess: false,
          reason: e.message
        };
      }
    },
    langServerConfig: async (parent: any):
        Promise<any> => {
      return {};
    }
  },
  Query: {
    async testPerforceConnection(parent: any, args: { connectionSettings: Settings }): Promise<OperationStatus> {
      try {
        const isSuccess = changePerforceManagerSingleton({
          connectionString: args.connectionSettings.PerforceConnectionString,
          timeout: parseInt(args.connectionSettings.PerforceTimeout || "5000", 10),
          username: args.connectionSettings.PerforceUser
        });
        return { isSuccess, reason: "make sure your configuration is correct" };
      } catch (e) {
        getLogger("Perforce").error("Failed to connect to Perforce", { e, settings: args.connectionSettings });
        console.error(`Failed to init perforce manager with port: ${args.connectionSettings}`);
        return { isSuccess: false, reason: e?.toString() || "an unexpected error occurred" };
      }
    },
    async canAuthGitRepos(parent: any, args: { sources: Array<{ repoUrl: string }> }): Promise<CanQueryRepoStatus[]> {
      const promises = _.map(args.sources, async src => {
        const res = await canAuthGitRepo(src.repoUrl);
        return {
          isSuccess: res.querySuccessful,
          repoUrl: src.repoUrl,
          protocol: res.protocol.toString()
        };
      });
      return Promise.all(promises);
    },
    settings(): Settings {
      return getSettings();
    },
    async repository(parent: any, args: { repo: Repo, path: string }) {
      const { repo } = args;
      return repo.toModel();
    },
    listRepos(): Repository[] {
      return repStore.getRepositories().map((r) => r.toModel());
    },
    // dir get's a target repository (as a user can expose multiple folders on it's PC) and a relative path
    // and returns a list of all files and folders in that path
    dir(parent: any, args: { repo: Repository, path: string }): Promise<FileInfo[]> {
      const { path, repo } = args;
      return new Promise((resolve, reject) => {
        const targetDir = join(repo.fullpath, path);
        logger.debug("Reading dir", targetDir);
        fs.readdir(targetDir, (err, files) => {
          if (err != null) {
            logger.error("Failed to read dir", {targetDir, err});
            reject(err);
            return;
          }
          const res: FileInfo[] = [];
          logger.debug(`Found ${files.length} files`);
          files.forEach((f) => {
            let fstats;
            try {
              fstats = fs.statSync(join(repo.fullpath, path, f));
            } catch (err) {
              console.error(`Error while listing file: ${path}`, err);
              notify(`Error while listing file: ${path}`, { metaData: err });
              logger.error(`Error while listing file: ${path}`, err);
            }
            if (fstats === undefined) {
              logger.warn("File does not exist", path);
              return; // File does not exist, move on
            }
            let fPath = join(path, f);
            if (fPath.startsWith("/")) {
              // if path starts with "/" the path looks absolute but it's relative so we remove it
              fPath = fPath.slice(1);
            }
            res.push({
              isFolder: !fstats.isFile(),
              name: f,
              path: fPath,
              size: fstats.size > GRAPHQL_INT_MAX ? -1 : fstats.size,
            });
          });
          resolve(res);
        });
      });
    },
    // file returns the content of a file, given the target repository and inner path.
    file(parent: any, args: { repo: Repository, path: string }): Promise<string> {
      const { path, repo } = args;
      return new Promise((resolve, reject) => {
        const fileFullpath = join(repo.fullpath, path);
        logger.debug("Getting file", fileFullpath);
        fs.readFile(fileFullpath, "utf8", (err, data) => {
          if (err != null) {
            logger.error("Failed to read file", fileFullpath);
            reject(err);
            return;
          }
          resolve(data);
        });
      });
    },
    listTree(parent: any, args: { repo: Repository }): string[] {
      const { repo } = args;
      return repo.listTree();
    },
    refreshIndex(parent: any, args: { repo: Repository }): boolean {
      args.repo.reIndex();
      return true;
    },
    getAllPerforceViews: async (): Promise<IPerforceView[]> => {
      const perforceManager = getPerforceManagerSingleton();
      return perforceManager ? perforceManager.getAllViews() : [];
    },
    getPerforceChangelistForFile: async (parent: any, args: {repo: Repository, path: string}): Promise<string> => {
      const perforceManager = getPerforceManagerSingleton();
      const { path, repo } = args;
      const fileFullpath = join(repo.fullpath, path);

      if (!perforceManager) {
        logger.error("Could not get Perforce manager instace");
        return null;
      }

      logger.debug("Getting changelist for file", args);
      return perforceManager.getChangelistForFile(fileFullpath);
    },
    getCommitIdForFile: async (parent: any, args: {provider: any, remoteOrigin: string, repo: Repository, path: string}): Promise<string> => {
      logger.debug("Getting commit ID for file", args);
      const {provider, repo, path, remoteOrigin} = args;
      switch (provider) {
        case "git":
          return getCommitIfRightOrigin(repo, remoteOrigin);
        case "perforce":
          const perforceManager = getPerforceManagerSingleton();
          const filePath = join(repo.fullpath, path);
          const isSameDepot = await perforceManager?.isSameRemoteOrigin(filePath, remoteOrigin);
          if (!isSameDepot) {
            logger.warn("This is not the depot you're looking for", args);
            return null;
          }

          return await perforceManager.getChangelistForFile(filePath);
        default:
          throw new Error(`Unreachable code - got unknown source provider: ${provider}`);
      }
    },
    getFilesTreeFromPerforce: async (parent: any, args: { depot: string, labelOrChangelist: string}): Promise<[string]> => {
      const perforceManager = getPerforceManagerSingleton();
      if (!perforceManager) {
        logger.error("Could not get Perforce manager instace");
        return null;
      }

      logger.debug("Getting file tree for depot", args);
      return await perforceManager.getDepotFileTree(args.depot, args.labelOrChangelist);
    },
    BitbucketOnPrem: async (parent: any):
        Promise<any> => {
      return {};
    },
    langServerConfig: async (parent: any):
        Promise<any> => {
      return {};
    },
    appVersion: async (parent: any): Promise<string> => {
      return process.env.development ? require("../package.json").version : remote.app.getVersion();
    },
    recentLogs: (parent: any): Log[] => {
      const recentLogs = LogsContainer.getLogs();
      LogsContainer.cleanLogs();
      return recentLogs;
    }
  },
  BitbucketOnPrem: {
    fileTree: async (parent: any, { args }: BitBucketOnPremInput): Promise<string[]> =>
      getFileTreeFromBitbucket(args),
    user: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> => getUserFromBitbucket(args),
    projects: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> => getProjectsFromBitbucket(args),
    repos: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> => getReposForProjectFromBitbucket(args),
    commits: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> =>
        getCommitsForRepoFromBitbucket(args),
    commit: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> => getCommitDetailsFromBitbucket(args),
    branches: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> =>
        getBranchesForRepoFromBitbucket(args),
    file: async (parent: any, { args }: BitBucketOnPremInput): Promise<string> =>
        getFileContentFromBitbucket(args)
  },
  LangServerConfig: {
    java: async (parent: any): Promise<JavaLangServerConfig> => {
      return {
        jdkLocation: langServerConfigStore.jdkLocation,
        jdkMinimumVersionRequired: minimumJavaVersionRequired.toString() };
    }
  },
  LangServerOps: {
    setJavaLangServerConfig: async (parent: any, args: { config: JavaLangServerConfig }): Promise<OperationStatus> => {
      try {
        langServerConfigStore.setJdkLocation(args.config.jdkLocation);
      } catch (e) {
        logger.error("Failed to setLangServerConfig", e);
        return {
          isSuccess: false,
          reason: e.message };
      }
      return { isSuccess: true };
    }
  }
};
