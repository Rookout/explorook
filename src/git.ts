import { Repository } from "./common/repository";
import path = require("path");
import parseRepo = require('parse-repo');
import { captureMessage } from 'raven-js';
import * as igit from "isomorphic-git";
import fs = require("fs");
import _ = require("lodash");
const uuidv4 = require("uuid/v4");

export async function getRepoId(repo: Repository): Promise<string> {
    // trying to create a unique id with the git remote path and relative filesystem path
    // this way, when different clients share the same workspace they automatically
    // connect to the same repository on different machines
    try {
        const gitRoot = await igit.findRoot({ fs, filepath: repo.fullpath });
        const remote = await igit.config({fs, dir: gitRoot, path: "remote.origin.url"});
        const gitRootRelPath = path.relative(gitRoot, repo.fullpath);
        const repoInfo = parseRepo(remote);
        return `${repoInfo.repository}/${gitRootRelPath}`;
    } catch (error) {
        // no git found
        return uuidv4();
    }
}

export async function getLastCommitDescription(repo: Repository): Promise<igit.CommitDescription> {
    try {
        const gitRoot = await igit.findRoot({ fs, filepath: repo.fullpath });
        if (!gitRoot) return null;
        return _.first((await igit.log({ fs, dir: gitRoot, depth: 1 })))
    } catch(error) {
        captureMessage(`Failed to read repository info ${JSON.stringify(repo)}`, {
            extra: { repo }
        })
        return null;
    }
}