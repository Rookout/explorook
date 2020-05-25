import fs = require("fs");
const GitUrlParse = require("git-url-parse");
import * as igit from "isomorphic-git";
import _ = require("lodash");
import parseRepo = require("parse-repo");
import path = require("path");
// for normalization of windows paths to linux style paths
import slash = require("slash");
import { Repository } from "./common/repository";
import { notify } from "./exceptionManager";
const uuidv4 = require("uuid/v4");

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
            })
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
