import fs = require("fs");
const { exec } = require("child_process");
const GitUrlParse = require("git-url-parse");
import * as igit from "isomorphic-git";
import _ = require("lodash");
import parseRepo = require("parse-repo");
import path = require("path");
// for normalization of windows paths to linux style paths
import slash = require("slash");
import { Repository } from "./common/repository";
import { notify } from "./exceptionManager";
import {repStore} from "./repoStore";
import {getLibraryFolder} from "./utils";
const uuidv4 = require("uuid/v4");
const isGitUrl = require("is-git-url");
const folderDelete = require("folder-delete");

export const GIT_ROOT = path.join(getLibraryFolder(), "git_root");

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
        const remote = await igit.config({fs, dir: gitRoot, path: "remote.origin.url"});
        const gitRootRelPath = path.relative(gitRoot, repo.fullpath);
        const repoInfo = parseRepo(remote);
        let repoId = `${repoInfo.repository}/${slash(gitRootRelPath)}`;
        if (_.includes(idList, repoId)) {
            const branch = await igit.currentBranch({ fs, dir: gitRoot, fullname: false });
            repoId = `${repoId}:${branch}`;
        }
        return repoId;
    } catch (error) {
        if (error && !error.toString().includes("Unable to find git root for")) {
            notify("Failed to generate repo id from git", {
                metaData: { error, repo }
            });
        }
        // no git found
        return uuidv4();
    }
}

export async function getLastCommitDescription(repo: Repository): Promise<igit.CommitDescription> {
    try {
        let gitRoot = null;
        try {
            gitRoot = await igit.findRoot({ fs, filepath: repo.fullpath });
        } catch (err) {
            // not inside a git repository
        }
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

export async function getRemoteOriginForRepo(repo: Repository): Promise<igit.RemoteDescription> {
    try {
        let gitRoot = null;
        try {
            gitRoot = await igit.findRoot({ fs, filepath: repo.fullpath });
        } catch (err) {
            // not inside a git repository
        }
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
    if(!localRemoteOrigin) return null;
    const parsedLocalRemoteOrigin = GitUrlParse(localRemoteOrigin.url);
    const argsParsedRemoteOrigin = GitUrlParse(remoteOrigin);
    return (parsedLocalRemoteOrigin.name === argsParsedRemoteOrigin.name && parsedLocalRemoteOrigin.owner === argsParsedRemoteOrigin.owner) ?
        (await getLastCommitDescription(repo))?.oid : null;
}

export function checkGitRemote(remoteOrigin: string): boolean {
    return isGitUrl(remoteOrigin);
}

export const TMP_DIR_PREFIX = "temp_rookout_";

export async function cloneRemoteOriginWithCommit(repoUrl: string, commit: string, isDuplicate: boolean) {
    // Assuming the last part of the remote origin url is the name of the repo.
     const repoName = parseRepo(repoUrl).project;
     // If we have two of the same git remote with a different commit we want to create a sub directory.
     const gitRoot = isDuplicate ? path.join(GIT_ROOT, `${TMP_DIR_PREFIX}${uuidv4()}`) : GIT_ROOT;
     // Create the sub directory if needed.
     if (isDuplicate) fs.mkdirSync(gitRoot);

     // Getting the full path of the repo, including the repo name.
     const repoDir = path.join(gitRoot, repoName);

     // If the folder already exists we don't need to clone, just checkout.
     const doesRepoExist = fs.existsSync(repoDir);

     const cloneCommand = `cd "${gitRoot}" && git clone ${repoUrl}`;
     const checkoutCommand = `cd "${repoDir}" && git checkout ${commit}`;
     // If the repo already exists we just need to checkout the commit.
     const fullCommand = doesRepoExist ? checkoutCommand : `${cloneCommand} && ${checkoutCommand}`;

     return new Promise<string>((resolve, reject) => {
         exec(fullCommand, (error: any) => {
                 if (error) {
                     reject(error);
                     return;
                 }
                 // Return the path of a successful clone
                 resolve(repoDir);
             });
     });
}
// 10GB
const MAX_GIT_FOLDER_SIZE_IN_KB = 10485760;
const packSizeRegex = /size-pack: ([0-9]+)/;

export async function isGitFolderBiggerThanMaxSize(): Promise<boolean> {
    const isDirectory = (source: string) => fs.lstatSync(source).isDirectory();
    const rootDirContent = _.map(fs.readdirSync(GIT_ROOT), dirName => path.join(GIT_ROOT, dirName));
    const repoDirs = _.filter(rootDirContent, isDirectory);
    const sizePromises = _.map(repoDirs, dir => {
        return new Promise((resolve, reject) => {
            // Using git's pre-counted size to get a rough estimation of the repo sizes.
            exec(`cd "${dir}" && git count-objects -v`, (error: any, stdout: string) => {
                if (error) {
                    reject(error);
                }
                const [,size] = packSizeRegex.exec(stdout);
                // Taking the second group which contains the size in KB.
                resolve(Number(size));
            });
        });
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
