import childProcess = require("child_process");
import { platform } from 'os';
import fs = require("fs");
import util = require("util");
const exec = util.promisify(childProcess.exec);
const spawn = childProcess.spawn;
const GitUrlParse = require("git-url-parse");
import * as igit from "isomorphic-git";
import _ = require("lodash");
import parseRepo = require("parse-repo");
import path = require("path");
// for normalization of windows paths to linux style paths
import slash = require("slash");
import { Repository } from "./common/repository";
import { leaveBreadcrumb, notify } from "./exceptionManager";
import {getStoreSafe} from "./explorook-store";
import {getLogger} from "./logger";
import {repStore} from "./repoStore";
import {getLibraryFolder} from "./utils";
import { ipcRenderer } from "electron";
const uuidv4 = require("uuid/v4");
const isGitUrl = require("is-git-url");
const folderDelete = require("folder-delete");

const TEN_MEGABYTE = 10_485_760;

export interface GitConnectionOptions {
    connectionString: string;
    commit?: string;
}

export enum GitProtocols {
    DEFAULT,
    HTTPS,
    SSH
}

export const GIT_ROOT = path.join(getLibraryFolder(), "git_root");

const store = getStoreSafe();

if (!fs.existsSync(GIT_ROOT)) {
    fs.mkdirSync(GIT_ROOT, {
        recursive: true
    });
}

const logger = getLogger("git");

export async function getRepoId(repo: Repository, idList: string[]): Promise<string> {
    // trying to create a unique id with the git remote path and relative filesystem path
    // this way, when different clients share the same workspace they automatically
    // connect to the same repository on different machines
    try {
        logger.debug("Trying to get git root for repo", repo);
        const gitRoot = await igit.findRoot({ fs, filepath: repo.fullpath });

        const { url: remote } = await getRemoteOriginForRepo(repo);
        logger.debug("Repo remote origin fetched", remote);
        const gitRootRelPath = path.relative(gitRoot, repo.fullpath);
        const repoInfo = parseRepo(remote);
        let repoId = `${repoInfo.repository}/${slash(gitRootRelPath)}`;
        logger.debug("Created repo Id", repoId);
        if (_.includes(idList, repoId)) {
            const branch = await igit.currentBranch({ fs, dir: gitRoot, fullname: false });
            repoId = `${repoId}:${branch}`;
            logger.debug("Found duplicate repos. Using branch", repoId);
        }
        return repoId;
    } catch (error) {
        if (error?.code !== "NotFoundError") {
            notify(error, {
                metaData: { error, repo, message: "Failed to generate repo id from git" }
            });
            logger.error("Failed to generate repo id from git", {error, repo});
        }
        // no git found
        logger.debug("Git not found. creating UUID");
        return uuidv4();
    }
}

async function getGitRootForPath(filepath: string) {
    try {
        logger.debug("Getting git root for path", filepath);
        return await igit.findRoot({ fs, filepath });
    } catch (err) {
        leaveBreadcrumb("Failed to find git root", { filepath, err });
        logger.warn("Failed to find git root", { filepath, err });
        // No git root was found, probably not a git repository
        return null;
    }
}

export async function getLastCommitDescription(repo: Repository): Promise<igit.ReadCommitResult> {
    try {
        logger.debug("Getting last commit description for repo", repo);
        const gitRoot = await getGitRootForPath(repo.fullpath);
        if (!gitRoot) {
            logger.warn("Could find git root when getting last commit description");
            return null;
        }
        return _.first((await igit.log({ fs, dir: gitRoot, depth: 1 })));
    } catch (error) {
        notify(error, {
            metaData : { message: "failed to read repository info", repo, error },
            severity: "error"
        });
        logger.error("Failed to read repository info", {repo, error});
        return null;
    }
}

export async function getRemoteOriginForRepo(repo: Repository): Promise<{ remote: string; url: string; }> {
    try {
        const gitRoot = await getGitRootForPath(repo.fullpath);
        if (!gitRoot) { return null; }
        const remotes = await igit.listRemotes({ fs, dir: gitRoot });
        return _.first(remotes)
    } catch (error) {
        notify(error, {
            metaData : { message: "failed to read repository info", repo, error },
            severity: "error"
        });
        return null;
    }
}

export async function getCommitIfRightOrigin(repo: Repository, remoteOrigin: string): Promise<string> {
    const localRemoteOrigin = await getRemoteOriginForRepo(repo);
    if (!localRemoteOrigin) {
      // this notify is empty but the breadcrumbs tell the story
      notify({message: `Failed to find remote origin for ${repo.id} in ${repo.fullpath}`});
      logger.error("Could not find remote origin for local file", repo, remoteOrigin);
      return null;
    }
    const parsedLocalRemoteOrigin = GitUrlParse(localRemoteOrigin.url);
    const argsParsedRemoteOrigin = GitUrlParse(remoteOrigin);
    logger.debug("Got remote origin for local file", {parsedLocalRemoteOrigin, argsParsedRemoteOrigin});
    return (parsedLocalRemoteOrigin.name === argsParsedRemoteOrigin.name && parsedLocalRemoteOrigin.owner === argsParsedRemoteOrigin.owner) ?
        (await getLastCommitDescription(repo))?.oid : null;
}

export function checkGitRemote(remoteOrigin: string): boolean {
    logger.debug("Checking if remote origin is a valid git URI", remoteOrigin);
    return isGitUrl(remoteOrigin.endsWith(".git") ? remoteOrigin : `${remoteOrigin}.git`);
}

export function convertUrlToProtocol(originalUri: string, format: GitProtocols) {
    const parsedUri = GitUrlParse(originalUri);
    logger.debug("Converting URI to protocol", {originalUri, format, parsedUri});
    switch (format) {
        case GitProtocols.HTTPS:
            return parsedUri.toString("https");
        case GitProtocols.SSH:
            return parsedUri.toString("ssh");
        case GitProtocols.DEFAULT:
        default:
            return originalUri;
    }
}

export const TMP_DIR_PREFIX = "temp_rookout_";

const getProtocolFromStore = () => {
    const protocol = store.get("gitProtocol", "0");
    return parseInt(protocol, 10);
};

export async function cloneRemoteOriginWithCommit(repoUrl: string, commit: string) {
    const canAuthRes = await canAuthGitRepo(repoUrl);
    if (!canAuthRes.querySuccessful) {
      logger.warn(`UNAUTHORIZED to remote`, { repoUrl, commit });
      return null;
    }
    repoUrl = convertUrlToProtocol(repoUrl, canAuthRes.protocol);
    logger.debug("Cloning repo", { repoUrl, commit });
    const protocol = getProtocolFromStore();
    const formattedRepoUri = convertUrlToProtocol(repoUrl, protocol);
    logger.debug("Uri formatted", formattedRepoUri);

    // Assuming the last part of the remote origin url is the name of the repo.
    const repoName = parseRepo(formattedRepoUri).project;

     // Getting the full path of the repo, including the repo name.
    const repoDir = path.join(GIT_ROOT, repoName);

     // If the folder already exists we don't need to clone, just checkout.
    const doesRepoExist = fs.existsSync(repoDir);

    if (doesRepoExist) {
      logger.debug("fetching latest code", { GIT_ROOT, doesRepoExist });
      await exec("git fetch", { cwd: repoDir, maxBuffer: TEN_MEGABYTE });
    } else {
      logger.debug("cloning into", { GIT_ROOT, doesRepoExist });
      await exec(`git clone ${formattedRepoUri}`, { cwd: GIT_ROOT, maxBuffer: TEN_MEGABYTE });
    }
    logger.debug(`checking out to commit ${commit}`, { commit, GIT_ROOT, doesRepoExist });
    await exec(`git checkout ${commit}`, { cwd: repoDir, maxBuffer: TEN_MEGABYTE });
    return repoDir;
}
// 10GB
const MAX_GIT_FOLDER_SIZE_IN_KB = 10485760;
const packSizeRegex = /size-pack: ([0-9]+)/;

export async function isGitFolderBiggerThanMaxSize(): Promise<{ sizeOverMaxSize: boolean, failedFolders: string[] }> {
    const failedFolders: string[] = [];
    const isDirectory = (source: string) => fs.lstatSync(source).isDirectory();

    const rootDirContent = _.map(fs.readdirSync(GIT_ROOT), dirName => path.join(GIT_ROOT, dirName));
    logger.debug("Checking root dir size", rootDirContent);

    const repoDirs = _.filter(rootDirContent, isDirectory);
    const sizePromises = _.map(repoDirs, async dir => {
      let stdout
      try {
        stdout = await (await exec("git count-objects -v", { cwd: dir })).stdout;
      } catch (error) {
        logger.error("Failed to estimate git repository size", error)
        failedFolders.push(dir);
        return 0;
      }
      const [, size] = packSizeRegex.exec(stdout);
      return Number(size);
    });
    const rootSize = _.sum(await Promise.all(sizePromises));
    logger.debug("Root folder size is", rootSize);

    return { sizeOverMaxSize: rootSize > MAX_GIT_FOLDER_SIZE_IN_KB, failedFolders };
}

// Get the name of a list of folders under the git root and delete all
export function removeGitReposFromStore(folderNames: string[]) {
    const fullPaths = _.map(folderNames, name => path.join(GIT_ROOT, name));
    _.forEach(fullPaths, dir => {
        const allRepos = repStore.getRepositories();
        const repoToRemove = _.find(allRepos, r => r.fullpath.includes(dir));
        if (repoToRemove) {
            logger.debug("Removing git repo", repoToRemove);
            repStore.remove(repoToRemove.id);
        }
        folderDelete(dir, {debugLog: false});
    });
}

const lsRemote = async (url: string) => {
  return new Promise((resolve) => {
    // detached to block stdin - stdio: ignore to prevent stdout from blocking
    const child = childProcess.spawn('git', ['ls-remote', url], { timeout: 10_000, detached: true, stdio: 'ignore' })
    // if the process will need to ask for username+password from stdin it will get an error and exit with error code != 0
    child.on('close', code => {
      resolve(code === 0)
    })
    // somewhy spawn timeout doesnt work in all scenarios
    setTimeout(() => resolve(false), 10_000)
  })
}

export async function canAuthGitRepo(repoUrl: string): Promise<{ querySuccessful: boolean, protocol: GitProtocols }> {
  const sshFormat = convertUrlToProtocol(repoUrl, GitProtocols.SSH);
  const httpFormat = convertUrlToProtocol(repoUrl, GitProtocols.HTTPS);

  if (await lsRemote(sshFormat)) {
    return {
      querySuccessful: true,
      protocol: GitProtocols.SSH
    }
  } else if (await lsRemote(httpFormat)) {
    return {
      querySuccessful: true,
      protocol: GitProtocols.HTTPS
    }
  }

  return { querySuccessful: false, protocol: GitProtocols.DEFAULT };
}

