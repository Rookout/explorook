import childProcess = require("child_process");
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
import {isNumeric} from "tslint";
import { Repository } from "./common/repository";
import { leaveBreadcrumb, notify } from "./exceptionManager";
import {getStoreSafe} from "./explorook-store";
import {repStore} from "./repoStore";
import {getLibraryFolder} from "./utils";
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

export async function getRepoId(repo: Repository, idList: string[]): Promise<string> {
    // trying to create a unique id with the git remote path and relative filesystem path
    // this way, when different clients share the same workspace they automatically
    // connect to the same repository on different machines
    try {
        const gitRoot = await igit.findRoot({ fs, filepath: repo.fullpath });
        const { url: remote } = await getRemoteOriginForRepo(repo);
        const gitRootRelPath = path.relative(gitRoot, repo.fullpath);
        const repoInfo = parseRepo(remote);
        let repoId = `${repoInfo.repository}/${slash(gitRootRelPath)}`;
        if (_.includes(idList, repoId)) {
            const branch = await igit.currentBranch({ fs, dir: gitRoot, fullname: false });
            repoId = `${repoId}:${branch}`;
        }
        return repoId;
    } catch (error) {
        if (error?.code !== "NotFoundError") {
            notify(error, {
                metaData: { error, repo, message: "Failed to generate repo id from git" }
            });
        }
        // no git found
        return uuidv4();
    }
}

async function getGitRootForPath(filepath: string) {
    try {
        return await igit.findRoot({ fs, filepath });
    } catch (err) {
        leaveBreadcrumb("Failed to find git root", { filepath, err });
        // No git root was found, probably not a git repository
        return null;
    }
}

export async function getLastCommitDescription(repo: Repository): Promise<igit.ReadCommitResult> {
    try {
        const gitRoot = await getGitRootForPath(repo.fullpath);
        if (!gitRoot) { return null; }
        return _.first((await igit.log({ fs, dir: gitRoot, depth: 1 })));
    } catch (error) {
        notify(error, {
            metaData : { message: "failed to read repository info", repo, error },
            severity: "error"
        });
        return null;
    }
}

export async function getRemoteOriginForRepo(repo: Repository): Promise<{ remote: string; url: string; }> {
    try {
        const gitRoot = await getGitRootForPath(repo.fullpath);
        if (!gitRoot) { return null; }
        return _.first((await igit.listRemotes({ fs, dir: gitRoot })));
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
      notify("Failed to remote origin");
      return null;
    }
    const parsedLocalRemoteOrigin = GitUrlParse(localRemoteOrigin.url);
    const argsParsedRemoteOrigin = GitUrlParse(remoteOrigin);
    return (parsedLocalRemoteOrigin.name === argsParsedRemoteOrigin.name && parsedLocalRemoteOrigin.owner === argsParsedRemoteOrigin.owner) ?
        (await getLastCommitDescription(repo))?.oid : null;
}

export function checkGitRemote(remoteOrigin: string): boolean {
    return isGitUrl(remoteOrigin.endsWith(".git") ? remoteOrigin : `${remoteOrigin}.git`);
}

export function convertUrlToProtocol(originalUri: string, format: GitProtocols) {
    const parsedUri = GitUrlParse(originalUri);
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
    return parseInt(protocol, 10)
};

export async function cloneRemoteOriginWithCommit(repoUrl: string, commit: string, isDuplicate: boolean, rootDir: string = GIT_ROOT): Promise<string> {
    const protocol = getProtocolFromStore();
    const formattedRepoUri = convertUrlToProtocol(repoUrl, protocol);
    // Assuming the last part of the remote origin url is the name of the repo.
    const repoName = parseRepo(formattedRepoUri).project;
     // If we have two of the same git remote with a different commit we want to create a sub directory.
    const gitRoot = isDuplicate ? path.join(rootDir, `${TMP_DIR_PREFIX}${uuidv4()}`) : rootDir;
     // Create the sub directory if needed.
    if (isDuplicate) fs.mkdirSync(gitRoot);

     // Getting the full path of the repo, including the repo name.
    const repoDir = path.join(gitRoot, repoName);

     // If the folder already exists we don't need to clone, just checkout.
    const doesRepoExist = fs.existsSync(repoDir);

    if (!doesRepoExist) {
      fs.mkdirSync(repoDir);
      // based on https://stackoverflow.com/questions/3489173/how-to-clone-git-repository-with-specific-revision-changeset
      const cloneCommand = `
        cd "${repoDir}" &&
        git init &&
        git remote add origin ${formattedRepoUri} &&
        git fetch --depth=1 origin ${commit} &&
        git checkout ${commit}`;
      await exec(cloneCommand);
      return repoDir;
    }

    const command = `
    cd "${repoDir}" &&
    git fetch --depth=1 origin ${commit} &&
    git checkout ${commit}`

    await exec(command);
    return repoDir;
}
// 10GB
const MAX_GIT_FOLDER_SIZE_IN_KB = 10485760;
const packSizeRegex = /size-pack: ([0-9]+)/;

export async function isGitFolderBiggerThanMaxSize(): Promise<boolean> {
    const isDirectory = (source: string) => fs.lstatSync(source).isDirectory();
    const rootDirContent = _.map(fs.readdirSync(GIT_ROOT), dirName => path.join(GIT_ROOT, dirName));
    const repoDirs = _.filter(rootDirContent, isDirectory);
    const sizePromises = _.map(repoDirs, async dir => {
      const { stdout } = await exec(`cd "${dir}" && git count-objects -v`);
      const [, size] = packSizeRegex.exec(stdout);
      return Number(size);
    });
    const rootSize = _.sum(await Promise.all(sizePromises));

    return rootSize > MAX_GIT_FOLDER_SIZE_IN_KB;
}

// Get the name of a list of folders under the git root and delete all
export function removeGitReposFromStore(folderNames: string[]) {
    const fullPaths = _.map(folderNames, name => path.join(GIT_ROOT, name));
    _.forEach(fullPaths, dir => {
        const allRepos = repStore.getRepositories();
        const repoToRemove = _.find(allRepos, r => r.fullpath.includes(dir));
        if (repoToRemove) {
            repStore.remove(repoToRemove.id);
        }
        folderDelete(dir, {debugLog: false});
    });
}
