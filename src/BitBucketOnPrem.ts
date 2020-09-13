import _ = require("lodash");
import {getStoreSafe} from "./explorook-store";
import {getLogger} from "./logger";

const store = getStoreSafe();
const logger = getLogger("bitbucket");

export interface BitbucketOnPrem {
    url: string;
    projectKey: string;
    repoName: string;
    accessToken: string;
    commit?: string;
    branch?: string;
    fileTree?: string[];
    filePath?: string;
}

export const getFileTreeFromBitbucket =
    async (url: string, accessToken: string, projectKey: string, repoName: string, commit: string): Promise<string[]> => {
    if (!validateUrlIsAuthorized(url)) return null;

    const fileQueryUrl = `${url}/rest/api/1.0/projects/${projectKey}/repos/${repoName}/files?at=${commit}`;
    let isLastPage = false;
    let start = 0;
    let files: string[] = [];
    while (!isLastPage) {
        const res = await fetch(`${fileQueryUrl}&start=${start}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const fileList: any = await res.json();
        files = [...files, ...fileList.values];

        // If there are more files than the limit the API is paged. Get the page starting at the end of this request.
        isLastPage = fileList.isLastPage;
        if (!isLastPage) {
            start = fileList.nextPageStart;
        }
    }
    return files;
};

export const getUserFromBitbucket = async (url: string, accessToken: string) => {
    if (!validateUrlIsAuthorized(url)) return null;

    const userQuery = `${url}/rest/api/1.0/users`;
    const res = await fetch(userQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const users = await res.json();
    return users.values[0];
};

export const getProjectsFromBitbucket = async (url: string, accessToken: string) => {
    if (!validateUrlIsAuthorized(url)) return null;

    const projectsQuery = `${url}/rest/api/1.0/projects`;
    const res = await fetch(projectsQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const projects = await res.json();
    return projects.values;
};

export const getReposForProjectFromBitbucket = async (url: string, accessToken: string, projectKey: string) => {
    if (!validateUrlIsAuthorized(url)) return null;

    const reposQuery = `${url}/rest/api/1.0/projects/${projectKey}/repos`;
    const res = await fetch(reposQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const repos = await res.json();
    return repos.values;
};

export const getCommitsForRepoFromBitbucket = async (url: string, accessToken: string, projectKey: string, repoName: string) => {
    if (!validateUrlIsAuthorized(url)) return null;

    const commitsQuery = `${url}/rest/api/1.0/projects/${projectKey}/repos/${repoName}/commits`;
    const res = await fetch(commitsQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const commits = await res.json();
    return commits.values;
};

export const getBranchesForRepoFromBitbucket = async (url: string, accessToken: string, projectKey: string, repoName: string) => {
    if (!validateUrlIsAuthorized(url)) return null;

    const branchesQuery = `${url}/rest/api/1.0/projects/${projectKey}/repos/${repoName}/branches`;
    const res = await fetch(branchesQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const branches = await res.json();
    return branches.values;
};

export const getFileContentFromBitbucket =
    async (url: string, accessToken: string, projectKey: string, repoName: string, commit: string, path: string) => {
    if (!validateUrlIsAuthorized(url)) return null;

    const fileQuery = `${url}/rest/api/1.0/projects/${projectKey}/repos/${repoName}/browse/${path}?at=${commit}`;
    const res = await fetch(fileQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const file = await res.json();
    let fileContent = "";
    _.forEach(file.lines, line => {
        fileContent += `${line.text}\r\n`;
    });
    return fileContent;
};

const validateUrlIsAuthorized = (url: string) => {
    const serverList = store.get("BitbucketOnPremServers", []);
    const isAuthorized = _.some(serverList, server => url.includes(server));
    if (!isAuthorized) {
        logger.warn("Got unauthorized url", { url, serverList });
    }

    return isAuthorized;
};
