import childProcess = require("child_process");
import { platform } from 'os';
import fs = require("fs");
import util = require("util");
const exec = util.promisify(childProcess.exec);
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
        trackRemoteVersion(remotes || [])
        return _.first(remotes)
    } catch (error) {
        notify(error, {
            metaData : { message: "failed to read repository info", repo, error },
            severity: "error"
        });
        return null;
    }
}

const getGitCliVersion = async () => {
  const { stdout } = await exec('git version');
  return stdout;
}

const trackRemoteVersion = async (remotes: { remote: string; url: string;}[]) => {
  for (const { url, remote } of remotes) {
    /* tracing packet data to extract git headers from remote
    * see https://git-scm.com/book/en/v2/Git-Internals-Environment-Variables
    * example output:
    * ~ GIT_TRACE_PACKET=true git ls-remote --heads https://github.com/libgit2/libgit2.git
        14:04:51.830728 pkt-line.c:80           packet:          git< # service=git-upload-pack
        14:04:51.830765 pkt-line.c:80           packet:          git< 0000
        14:04:51.830775 pkt-line.c:80           packet:          git< version 2
        14:04:51.830785 pkt-line.c:80           packet:          git< agent=git/github-gd72361c7e766
        14:04:51.830793 pkt-line.c:80           packet:          git< ls-refs
        14:04:51.830800 pkt-line.c:80           packet:          git< fetch=shallow filter
        14:04:52.213643 pkt-line.c:80           packet:          git< 4a30c53146e7d1068af6f02dba3ef925878d11b8 refs/heads/bindings/libgit2sharp/020_2
        14:04:52.213693 pkt-line.c:80           packet:          git< 921e3a68e26ad23d9c5b389fdc61c9591bdc4cff refs/heads/bindings/libgit2sharp/022_1
        14:04:52.213710 pkt-line.c:80           packet:          git< 634dbfa0207708d39806e33b67dd3d19f9050a12 refs/heads/brianmario/attr-from-tree
    */
    const command = `git ls-remote --heads ${url}`;
    const envVars = Object.assign({}, process.env, { GIT_TRACE_PACKET: true });
    const { stderr } = await exec(command, { env: envVars });
    // read until the first object id
    const oidRegex = /[a-z0-9]{40}/
    const agentRegex = /agent=(.*)/
    const lines = stderr.split(/(?:\r\n|\r|\n)/g)
    let isFilterInCapabilities = false;
    let agent = "<unknown>";
    let headers = ""
    for (const line of lines) {
      if (oidRegex.test(line)) {
        break;
      }
      headers+=line+'\n';
      if (line.toLowerCase().includes('filter')) {
        isFilterInCapabilities = true;
      }
      const [,agentVer] = agentRegex.exec(line) || [];
      agent = agentVer || agent;
    }
    ipcRenderer.send("track", "remote-capabilities", { remote, url, agent, gitCliVersion: await getGitCliVersion(), platform: platform(), headers });
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

export async function cloneRemoteOriginWithCommit(repoUrl: string, commit: string, isDuplicate: boolean) {
    trackRemoteVersion([{ remote: repoUrl, url: repoUrl }])
    logger.debug("Cloning repo", {repoUrl, commit, isDuplicate});
    const protocol = getProtocolFromStore();
    const formattedRepoUri = convertUrlToProtocol(repoUrl, protocol);
    logger.debug("Uri formatted", formattedRepoUri);

    // Assuming the last part of the remote origin url is the name of the repo.
    const repoName = parseRepo(formattedRepoUri).project;
     // If we have two of the same git remote with a different commit we want to create a sub directory.
    const gitRoot = isDuplicate ? path.join(GIT_ROOT, `${TMP_DIR_PREFIX}${uuidv4()}`) : GIT_ROOT;
     // Create the sub directory if needed.
    if (isDuplicate) fs.mkdirSync(gitRoot);

     // Getting the full path of the repo, including the repo name.
    const repoDir = path.join(gitRoot, repoName);

     // If the folder already exists we don't need to clone, just checkout.
    const doesRepoExist = fs.existsSync(repoDir);

    logger.debug("Cloning into", {gitRoot, doesRepoExist});

    if (!doesRepoExist) {
      fs.mkdirSync(repoDir);
      // based on https://stackoverflow.com/questions/3489173/how-to-clone-git-repository-with-specific-revision-changeset
      const cloneCommand = `
        cd "${repoDir}" &&
        git init &&
        git remote add origin ${formattedRepoUri} &&
        git fetch --depth=1 origin ${commit} &&
        git checkout ${commit}`;
      logger.debug("Running command", cloneCommand);
      await exec(cloneCommand);
      return repoDir;
    }

    const command = `
    cd "${repoDir}" &&
    git fetch --depth=1 origin ${commit} &&
    git checkout ${commit}`;

    logger.debug("Running command", command);
    await exec(command);
    return repoDir;
}
// 10GB
const MAX_GIT_FOLDER_SIZE_IN_KB = 10485760;
const packSizeRegex = /size-pack: ([0-9]+)/;

export async function isGitFolderBiggerThanMaxSize(): Promise<boolean> {
    const isDirectory = (source: string) => fs.lstatSync(source).isDirectory();

    const rootDirContent = _.map(fs.readdirSync(GIT_ROOT), dirName => {
        const subdir = path.join(GIT_ROOT, dirName);
        if (dirName.includes(TMP_DIR_PREFIX)) {
            const duplicatedRepoDir = _.head(fs.readdirSync(subdir));
            return path.join(subdir, duplicatedRepoDir);
        }

        return subdir;
    });
    logger.debug("Checking root dir size", rootDirContent);

    const repoDirs = _.filter(rootDirContent, isDirectory);
    const sizePromises = _.map(repoDirs, async dir => {
      const { stdout } = await exec(`cd "${dir}" && git count-objects -v`);
      const [, size] = packSizeRegex.exec(stdout);
      return Number(size);
    });
    const rootSize = _.sum(await Promise.all(sizePromises));
    logger.debug("Root folder size is", rootSize);

    return rootSize > MAX_GIT_FOLDER_SIZE_IN_KB;
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
