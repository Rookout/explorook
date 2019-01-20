import fs = require("fs");
import * as igit from "isomorphic-git";
import _ = require("lodash");
import parseRepo = require("parse-repo");
import path = require("path");
import { captureMessage } from "raven-js";
import { Repository } from "./common/repository";
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
        let repoId = `${repoInfo.repository}/${gitRootRelPath}`;
        if (_.includes(idList, repoId)) {
            const branch = await igit.currentBranch({ fs, dir: gitRoot, fullname: false });
            repoId = `${repoId}:${branch}`;
        }
        return repoId;
    } catch (error) {
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
        captureMessage(`Failed to read repository info ${JSON.stringify(repo)}`, {
            extra: { repo, error }
        });
        return null;
    }
}
