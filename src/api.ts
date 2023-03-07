import fs = require("fs");
import _ = require("lodash");
import {posix} from "path";
import {
  BitBucketOnPremInput,
  BitbucketOnPremRepoProps,
  BitbucketOnPremTreeInput,
  BitbucketProperties,
  BitbucketPropertiesInput,
  cacheFileTree,
  cancelCacheBitbucketTree,
  cleanBitbucketTreeCache,
  getBitbucketProperties,
  getBranchesForRepoFromBitbucket,
  getCommitDetailsFromBitbucket,
  getCommitsForRepoFromBitbucket,
  getCurrentlyCachedRepo,
  getFileContentFromBitbucket,
  getFileTreeByPath,
  getFileTreeFromBitbucket,
  getFileTreeLargerThan,
  getFileTreePageLimit,
  getIsTreeCached,
  getProjectsFromBitbucket,
  getReposForProjectFromBitbucket,
  getUserFromBitbucket,
  idsOfAllCachedTrees,
  removeFileTreeFromCache,
  searchBitbucketTree
} from "./BitBucketOnPrem";
import {
  EnableOrDisableSingleLanguageServer,
  InputLangServerConfigs,
  LangServerConfig,
  OperationStatus,
  SupportedServerLanguage
} from "./common";
import {Repository} from "./common/repository";
import {notify, USER_EMAIL_KEY} from "./exceptionManager";
import {getStoreSafe} from "./explorook-store";
import {
  getLastCommitDescription as getLastCommitDescription,
} from "./git";
import {
  langServerConfigStore,
  minimumLanguageVersions
} from "./langauge-servers/configStore";
import Log from "./logData";
import {getLogger} from "./logger";
import LogsContainer from "./logsContainer";
import {Repo, repStore} from "./repoStore";
import {onAddRepoRequestHandler, onRemoveRepoRequestHandler} from "./server";

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
    langServerConfig: async (parent: any):
        Promise<any> => {
      return {};
    }
  },
  Query: {
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
    refreshMultipleIndices(parent: any, args: { repoIds: string[] }): boolean {
      repStore.reMultipleIndices(args.repoIds);
      return true;
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
      if (process.env.development || process.env.headless_mode === "true") {
        return require("../package.json")?.version;
      } else if (require("@electron/remote")?.app) {
        return require("@electron/remote").app.getVersion();
      } else {
        // remote should exist. but sometimes it's undefined and breaks tests for some reason, so adding a temp fallback
        return require("../package.json")?.version || "1.8.34";
      }
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
    fileTreePageLimit: async (parent: any, { args }: BitBucketOnPremInput): Promise<number> =>
      getFileTreePageLimit(args),
    isTreeLargerThan: async (parent: any, { args }: BitBucketOnPremInput): Promise<boolean> =>
        getFileTreeLargerThan(args),
    cacheTree: async (parent: any, { args }: BitBucketOnPremInput): Promise<boolean> =>
        cacheFileTree(args),
    cancelCacheTree: async (parent: any): Promise<boolean> =>
        cancelCacheBitbucketTree(),
    removeTreeFromCache: async (parent: any, { args }: BitbucketOnPremTreeInput): Promise<boolean> =>
        removeFileTreeFromCache(args),
    cleanTreeCache: async (parent: any): Promise<boolean> =>
        cleanBitbucketTreeCache(),
    isTreeCached: async (parent: any, { args }: BitbucketOnPremTreeInput): Promise<boolean> =>
        getIsTreeCached(args),
    allCachedRepos: async (parent: any): Promise<BitbucketOnPremRepoProps[]> =>
        idsOfAllCachedTrees(),
    searchTree: async (parent: any, { args }: BitbucketOnPremTreeInput): Promise<string[]> =>
        searchBitbucketTree(args),
    repoBeingCached: async (parent: any): Promise<BitbucketOnPremRepoProps> =>
        getCurrentlyCachedRepo(),
    fileTreeByPath: async (parent: any, { args }: BitBucketOnPremInput): Promise<string[]> =>
        getFileTreeByPath(args),
    user: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> => getUserFromBitbucket(args),
    projects: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> => getProjectsFromBitbucket(args),
    repos: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> => getReposForProjectFromBitbucket(args),
    commits: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> =>
        getCommitsForRepoFromBitbucket(args),
    commit: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> => getCommitDetailsFromBitbucket(args),
    branches: async (parent: any, { args }: BitBucketOnPremInput): Promise<any> =>
        getBranchesForRepoFromBitbucket(args),
    file: async (parent: any, { args }: BitBucketOnPremInput): Promise<string> =>
        getFileContentFromBitbucket(args),
    bitbucketProperties: async (parent: any, { args }: BitbucketPropertiesInput): Promise<BitbucketProperties> =>
        getBitbucketProperties(args)
  },
  LangServerConfig: {
    allLangServerConfigs: async (parent: any): Promise<LangServerConfig[]> => {
      return _.map(SupportedServerLanguage, (language) => ({
        language,
        enabled: langServerConfigStore.enabledServers[language],
        executableLocation: langServerConfigStore.serverLocations[language],
        minVersionRequired: minimumLanguageVersions[language]
      }));
    },
  },
  LangServerOps: {
    setLangServerConfig: async (parent: any, args: { config: [InputLangServerConfigs] }): Promise<OperationStatus> => {
      try {
        langServerConfigStore.setLocations(args.config);
      } catch (e) {
        logger.error("Failed to setLangServerConfig", e);
        return {
          isSuccess: false,
          reason: e.message
        };
      }
      return { isSuccess: true };
    },
    enableOrDisableLanguageServer: async (parent: any, args: { config: EnableOrDisableSingleLanguageServer }): Promise<OperationStatus> => {
      try {
        await langServerConfigStore.setIsLanguageServerEnabled(args.config.language, args.config.enable);
      } catch (e) {
        logger.error(`Failed to enable or disable language server for ${args.config.language}`, e);
        return {
          isSuccess: false,
          reason: e.message
        };
      }
      return { isSuccess: true };
    }
  }
};
