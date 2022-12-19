import fs = require("fs");
import * as igit from "isomorphic-git";
import _ = require("lodash");
import parseRepo = require("parse-repo");
import path = require("path");
// for normalization of windows paths to linux style paths
import slash = require("slash");
import { Repository } from "./common/repository";
import { leaveBreadcrumb, notify } from "./exceptionManager";
import {getLogger} from "./logger";
import {getLibraryFolder} from "./utils";
const uuidv4 = require("uuid/v4");

export const GIT_ROOT = path.join(getLibraryFolder(), "git_root");

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
        return _.first(remotes);
    } catch (error) {
        notify(error, {
            metaData : { message: "failed to read repository info", repo, error },
            severity: "error"
        });
        return null;
    }
}
