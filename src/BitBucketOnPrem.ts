import _ = require("lodash");
import UrlAssembler = require("url-assembler");
import {notify} from "./exceptionManager";
import {getLogger} from "./logger";

const logger = getLogger("bitbucket");
const isNode = () => !(typeof window !== "undefined" && window !== null);
const fetch = isNode() ? require('node-fetch') : window.fetch;

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

// fetchNoCache fetches a resource without loading/saving cache and also avoids using cookies.
// Otherwise we get inconsistent results from bitbucket API with different tokens
const fetchNoCache = (requestInfo: RequestInfo, requestInit: RequestInit) => {
    requestInit = requestInit || {};
    if (!requestInit?.cache) {
        requestInit.cache = 'no-store'
    }
    if (!requestInit?.credentials) {
        requestInit.credentials = 'omit';
    }
    return fetch(requestInfo.toString().replace('scm/', '').replace('scm%2F',''), requestInit);
}

export const getFileTreeFromBitbucket =
    async ({url, accessToken, projectKey, repoName, commit}: BitbucketOnPrem): Promise<string[]> => {
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
        const res = await fetchNoCache(`${fileTreeUrl}&start=${start}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const fileList: any = await res.json();
        if (Array.isArray(fileList.values)) {
            files = [...files, ...fileList.values];
        } else {
            notify("Bitbucket OnPrem files tree request returned an unexpected value", { metaData: { resStatus: res.status, fileList } });
            logger.error("Bitbucket OnPrem files tree request returned an unexpected value", { res, fileList });
            return [];
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
    logger.debug("Getting user from url", {url});
    const userQuery = UrlAssembler(url).template("/rest/api/1.0/users").toString();
    const res = await fetchNoCache(userQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const users = await res.json();
    logger.debug("finished getting users from url", {url, users});
    return users?.values?.[0];
};

export const getProjectsFromBitbucket = async ({url, accessToken}: BitbucketOnPrem) => {
    logger.debug("Getting projects for user", {url});
    const projectsQuery = UrlAssembler(url).template("/rest/api/1.0/projects").toString();
    const res = await fetchNoCache(projectsQuery, {
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
    logger.debug("Finished getting projects for user. Result:\n", JSON.stringify(projects));
    return projects?.values || [];
};

export const getReposForProjectFromBitbucket = async ({url, accessToken, projectKey}: BitbucketOnPrem) => {
    logger.debug("Getting repos", { url, projectKey });
    const reposQuery = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos").param({
        projectKey
    }).toString();
    const res = await fetchNoCache(reposQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const repos = await res.json();
    logger.debug("Finished getting repos", { url, projectKey, repos: JSON.stringify(repos)});
    return repos.values;
};

export const getCommitsForRepoFromBitbucket = async ({url, accessToken, projectKey, repoName}: BitbucketOnPrem) => {
    logger.debug("Getting commits for repo", { url, projectKey, repoName });
    const commitsQuery = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos/:repoName/commits").param({
        projectKey,
        repoName
    }).toString();
    const res = await fetchNoCache(commitsQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const commits = await res.json();
    logger.debug("Finished getting commits for repo", { url, projectKey, repoName, commits: JSON.stringify(commits)});
    return commits.values;
};

export const getBranchesForRepoFromBitbucket = async ({url, accessToken, projectKey, repoName}: BitbucketOnPrem) => {
    logger.debug("Getting branches for repo", { url, projectKey, repoName });
    const branchesQuery = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos/:repoName/branches").param({
        projectKey,
        repoName
    }).toString();
    const res = await fetchNoCache(branchesQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const branches = await res.json();
    logger.debug("Finished getting branches for repo", { url, projectKey, repoName, branches: JSON.stringify(branches) });
    return branches.values;
};

export const getFileContentFromBitbucket = async ({url, accessToken, projectKey, repoName, commit, filePath}: BitbucketOnPrem) => {
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
            const res = await fetchNoCache(fileQuery, {
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
    logger.debug("Getting commit info", { url, projectKey, repoName, commit });
    const commitQuery = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos/:repoName/commits/:commit").param({
        projectKey,
        repoName,
        commit
    });
    const res = await fetchNoCache(commitQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    logger.debug("Finished getting commit info", {url, projectKey, repoName, commit, res});
    return res.json();
};
