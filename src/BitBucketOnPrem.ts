import _ = require("lodash");
import UrlAssembler = require("url-assembler");
import {notify} from "./exceptionManager";
import {getStoreSafe} from "./explorook-store";
import {getLogger} from "./logger";

const store = getStoreSafe();
const logger = getLogger("bitbucket");

export interface BitbucketOnPrem {
    url: string;
    accessToken: string;
    projectKey?: string;
    repoName?: string;
    commit?: string;
    branch?: string;
    fileTree?: string[];
    filePath?: string;
}

export interface BitBucketOnPremInput {
    args: BitbucketOnPrem;
}

export const getFileTreeFromBitbucket =
    async ({url, accessToken, projectKey, repoName, commit}: BitbucketOnPrem): Promise<string[]> => {
    if (!validateUrlIsAuthorized(url)) return null;

    const fileTreeUrl = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos/:repoName/files").param({
        projectKey,
        repoName
    }).query({
        at: commit
    }).toString();

    logger.debug("Getting files for", {projectKey, repoName, url, commit});
    let isLastPage = false;
    let start = 0;
    let files: string[] = [];
    while (!isLastPage) {
        const res = await fetch(`${fileTreeUrl}&start=${start}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const fileList: any = await res.json();
        if (Array.isArray(fileList.values)) {
            files = [...files, ...fileList.values];
        } else {
            logger.error("Bitbucket OnPrem files tree request returned an unexpected value", { res });
        }

        // If there are more files than the limit the API is paged. Get the page starting at the end of this request.
        isLastPage = fileList.isLastPage;
        if (!isLastPage) {
            start = fileList.nextPageStart;
            logger.debug("File tree is paged. Getting next page", {nextPageStart: start});
        }
    }
    logger.debug("Finished getting files for", {projectKey, repoName, url, commit});
    return files;
};

export const getUserFromBitbucket = async ({url, accessToken}: BitbucketOnPrem) => {
    if (!validateUrlIsAuthorized(url)) return null;

    logger.debug("Getting user from url", {url});
    const userQuery = UrlAssembler(url).template("/rest/api/1.0/users").toString();
    const res = await fetch(userQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const users = await res.json();
    logger.debug("finished getting users from url", {url, users});
    return users.values[0];
};

export const getProjectsFromBitbucket = async ({url, accessToken}: BitbucketOnPrem) => {
    if (!validateUrlIsAuthorized(url)) return null;

    logger.debug("Getting projects for user", {url});
    const projectsQuery = UrlAssembler(url).template("/rest/api/1.0/projects").toString();
    const res = await fetch(projectsQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    let projects = [];
    try {
        projects = await res.json();
    } catch (e) {
        logger.error("Failed to parse bitbucket on prem projects", {
            e,
            res
        });
        notify(e);
    }
    logger.debug("Finished getting projects for user", {projects});
    return projects?.values || [];
};

export const getReposForProjectFromBitbucket = async ({url, accessToken, projectKey}: BitbucketOnPrem) => {
    if (!validateUrlIsAuthorized(url)) return null;

    logger.debug("Getting repos", { url, projectKey });
    const reposQuery = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos").param({
        projectKey
    }).toString();
    const res = await fetch(reposQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const repos = await res.json();
    logger.debug("Finished getting repos", { url, projectKey, repos});
    return repos.values;
};

export const getCommitsForRepoFromBitbucket = async ({url, accessToken, projectKey, repoName}: BitbucketOnPrem) => {
    if (!validateUrlIsAuthorized(url)) return null;

    logger.debug("Getting commits for repo", { url, projectKey, repoName });
    const commitsQuery = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos/:repoName/commits").param({
        projectKey,
        repoName
    }).toString();
    const res = await fetch(commitsQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const commits = await res.json();
    logger.debug("Finished getting commits for repo", { url, projectKey, repoName, commits});
    return commits.values;
};

export const getBranchesForRepoFromBitbucket = async ({url, accessToken, projectKey, repoName}: BitbucketOnPrem) => {
    if (!validateUrlIsAuthorized(url)) return null;

    logger.debug("Getting branches for repo", { url, projectKey, repoName });
    const branchesQuery = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos/:repoName/branches").param({
        projectKey,
        repoName
    }).toString();
    const res = await fetch(branchesQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const branches = await res.json();
    logger.debug("Finished getting branches for repo", { url, projectKey, repoName, branches });
    return branches.values;
};

export const getFileContentFromBitbucket = async ({url, accessToken, projectKey, repoName, commit, filePath}: BitbucketOnPrem) => {
    if (!validateUrlIsAuthorized(url)) return null;

    logger.debug("Getting file content", { url, projectKey, repoName, commit, filePath });
    let isLastPage = false;
    let currentLine = 0;
    let fileContent = "";

    while (!isLastPage) {
        try {
            const fileQuery = UrlAssembler(url).template(`/rest/api/1.0/projects/:projectKey/repos/:repoName/browse/${filePath}`).param({
                projectKey,
                repoName
            }).query({
                at: commit,
                start: currentLine
            }).toString();
            const res = await fetch(fileQuery, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            const file = await res.json();
            _.forEach(file.lines, line => {
                fileContent += `${line.text}\r\n`;
            });

            currentLine += file.size;
            isLastPage = file.isLastPage;
        } catch (e) {
            logger.error("Failed to query file content", { url, projectKey, repoName, commit, filePath, e });
            isLastPage = true;
            fileContent = "";
        }
    }

    logger.debug("Finished getting file content", { url, projectKey, repoName, commit, filePath });
    return fileContent;
};

export const getCommitDetailsFromBitbucket = async ({url, accessToken, projectKey, repoName, commit}: BitbucketOnPrem) => {
    if (!validateUrlIsAuthorized(url)) return null;

    logger.debug("Getting commit info", { url, projectKey, repoName, commit });
    const commitQuery = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos/:repoName/commits/:commit").param({
        projectKey,
        repoName,
        commit
    });
    const res = await fetch(commitQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    logger.debug("Finished getting commit info", {url, projectKey, repoName, commit, res});
    return res.json();
};

const validateUrlIsAuthorized = (url: string) => {
    const serverList = store.get("BitbucketOnPremServers", []);
    const isAuthorized = _.some(serverList, server => url.includes(server));
    if (!isAuthorized) {
        logger.warn("Got unauthorized url", { url, serverList });
    }

    return isAuthorized;
};
