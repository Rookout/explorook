import _ = require("lodash");
import UrlAssembler = require("url-assembler");
import {notify} from "./exceptionManager";
import { getStoreSafe } from "./explorook-store";
import {getLogger} from "./logger";

const logger = getLogger("bitbucket");
const isNode = () => !(typeof window !== "undefined" && window !== null);
const fetch = isNode() ? require("node-fetch") : window.fetch;
const store = getStoreSafe();

// An id of the repo that is currently being cached (empty if nothing is being cached)
let repoCurrentlyBeingCached: {projectKey: string, repoName: string, commit: string} | null = null;
let abortCache = false;


// So, BitBucket can really perform well when asked for large datasets.
// This saves on tons of time when you fetch large amounts of files instead of the default limit which is 25....
const FETCH_LIMIT = 30000;
// Used to check the bitbucket instance's configured limit in comparison to the default limit, which is 100K
// Documentation: https://confluence.atlassian.com/bitbucketserver070/bitbucket-server-config-properties-996644784.html
// Configuration's name: page.max.directory.recursive.children
const DEFAULT_TREE_FETCH_LIMIT = 100_000;

const FILES_API_TEMPLATE = "/rest/api/1.0/projects/:projectKey/repos/:repoName/files";

enum FILE_TYPE {
    DIRECTORY = "DIRECTORY",
    FILE = "FILE"
}

export interface BitbucketOnPrem {
    url: string;
    accessToken: string;
    projectKey?: string;
    repoName?: string;
    commit?: string;
    branch?: string;
    fileTree?: string[];
    filePath?: string;
    treeSize?: number;
}

export interface BitbucketOnPremRepoProps {
    projectKey: string;
    repoName: string;
    commit: string;
    searchTerm?: string;
    maxResults?: number;
}

export interface BitBucketOnPremInput {
    args: BitbucketOnPrem;
}

export interface BitbucketOnPremTreeInput {
    args: BitbucketOnPremRepoProps;
}

const getRepoId = ({projectKey, repoName, commit}: {projectKey: string, repoName: string, commit: string}) => {
    return `${projectKey}::${repoName}::${commit}`;
};

const getRepoFromId = (id: string): BitbucketOnPremRepoProps => {
    const parts = _.split(id, "::");
    return {
        projectKey: parts[0],
        repoName: parts[1],
        commit: parts[2]
    };
};

// fetchNoCache fetches a resource without loading/saving cache and also avoids using cookies.
// Otherwise, we get inconsistent results from bitbucket API with different tokens
const fetchNoCache = (requestInfo: RequestInfo, requestInit: RequestInit) => {
    requestInit = requestInit || {};
    if (!requestInit?.cache) {
        requestInit.cache = "no-store";
    }
    if (!requestInit?.credentials) {
        requestInit.credentials = "omit";
    }
    return fetch(requestInfo.toString().replace("scm/", "").replace("scm%2F", ""), requestInit);
};

/**
 * Fetch 5 pages of the tree in parallel
 * If a page is beyond the amount of files the repo has, it will return an empty array (the behaviour of the bitbucket api)
 * @param fileTreeUrl
 * @param accessToken
 * @param start
 * @param limit
 * @return Array of file arrays, each array is from a different page of the tree api call
 */
const fetchTreeParallel =
    async ({fileTreeUrl, accessToken, start, limit}: {fileTreeUrl: string; accessToken: string; start: number; limit: number}):
        Promise<string[][]> => {
    const requests = _.map([0, 1, 2, 3, 4], async reqIndex => {
        const currentStart = start + (reqIndex * limit);
        const res = await fetchNoCache(`${fileTreeUrl}&start=${currentStart}&limit=${limit}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const fileList: any = await res.json();
        return fileList.values;
    });
    return Promise.all(requests);
};

export const getFileTreeByPath =
    async ({url, accessToken, projectKey, repoName, commit, filePath}: BitbucketOnPrem): Promise<string[]> => {
        const templateUrl: string = addSlugToUrl("rest/api/1.0/projects/:projectKey/repos/:repoName/browse", filePath);
        const fileTreeUrl = UrlAssembler(url).template(templateUrl)
            .param({
                projectKey,
                repoName,
            })
            .query({
                at: commit
            })
            .toString();


        logger.debug("Getting files for", {projectKey, repoName, url, commit, filePath});
        let isLastPage = false;
        let start = 0;
        const files: string[] = [];
        while (!isLastPage) {
            const res = await fetchNoCache(`${fileTreeUrl}&start=${start}&limit=${FETCH_LIMIT}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            const fileTreeResponse: any = await res.json();

            const { children } = fileTreeResponse || {};
            const { values } = children || {};
            if (Array.isArray(values)) {
                for (const item of values) {
                    const { type, path } = item;
                    const { name } = path || {};
                    files.push(`${name}${type === FILE_TYPE.DIRECTORY ? "/" : ""}`);
                }
            } else {
                notify("Bitbucket OnPrem files tree request returned an unexpected value", {metaData: {resStatus: res.status, fileTreeResponse}});
                logger.error("Bitbucket OnPrem files tree request returned an unexpected value", {res, fileTreeResponse});
                return [];
            }

            isLastPage = children.isLastPage;
            if (!isLastPage) {
                start = children.nextPageStart;
                logger.debug("File path is paged. Getting next page", {nextPageStart: start});
            }
        }
        return files;
    };

export const getFileTreeFromBitbucket =
    async ({url, accessToken, projectKey, repoName, commit}: BitbucketOnPrem): Promise<string[]> => {

        const fileTreeUrl = UrlAssembler(url).template(FILES_API_TEMPLATE).param({
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
            const res = await fetchNoCache(`${fileTreeUrl}&start=${start}&limit=${FETCH_LIMIT}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            const fileList: any = await res.json();
            if (Array.isArray(fileList.values)) {
                files = [...files, ...fileList.values];
            } else {
                notify("Bitbucket OnPrem files tree request returned an unexpected value", {metaData: {resStatus: res.status, fileList}});
                logger.error("Bitbucket OnPrem files tree request returned an unexpected value", {res, fileList});
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

export const cacheFileTree = async ({url, accessToken, projectKey, repoName, commit}: BitbucketOnPrem): Promise<boolean> => {
    // If a repo is currently being cached, don't cache another one (log a warning and return false)
    if (repoCurrentlyBeingCached) {
        logger.warn("Cannot cache two repos at the same time");
        return false;
    }
    try {
        // This allows to query explorook about the repo currently being cached
        repoCurrentlyBeingCached = {projectKey, repoName, commit};
        const fileTreeUrl = UrlAssembler(url).template(FILES_API_TEMPLATE).param({
            projectKey,
            repoName
        }).query({
            at: commit
        }).toString();

        logger.debug("Getting files for", {projectKey, repoName, url, commit});
        let isLastPage = false;
        let start = 0;
        let files: string[] = [];
        const limit: number = await getFileTreePageLimit({url, accessToken, projectKey, repoName, commit});
        while (!isLastPage) {
            const filesBatch = await fetchTreeParallel({fileTreeUrl, accessToken, start, limit});
            if (abortCache) {
                logger.debug("Cache aborted via api");
                return false;
            }
            const flatFiles = _.flatten(filesBatch);
            files = _.concat(files, flatFiles);
            isLastPage = flatFiles?.length !== limit * 5;
            if (!isLastPage) {
                start = start + 5 * limit;
            }
        }
        logger.debug("Finished getting files for", {projectKey, repoName, url, commit});
        // Cache the tree
        const currentCachedRepos = JSON.parse(store.get("bitbucketTrees", "{}"));
        const repoId = getRepoId({projectKey, repoName, commit});
        currentCachedRepos[repoId] = files;
        store.set("bitbucketTrees", JSON.stringify(currentCachedRepos));
        return true;
    } finally {
        // Next cache should not be aborted
        abortCache = false;
        // This signals that no repo is currently being cached
        repoCurrentlyBeingCached = null;
    }
};

export const cancelCacheBitbucketTree = async (): Promise<boolean> => {
    if (repoCurrentlyBeingCached) {
        abortCache = true;
        return true;
    } else {
        // Nothing to abort
        return false;
    }
};

export const getIsTreeCached = async ({projectKey, repoName, commit}: BitbucketOnPremRepoProps): Promise<boolean> => {
    logger.debug("Checking if tree is already cached", {projectKey, repoName, commit});
    const currentCachedRepos = JSON.parse(store.get("bitbucketTrees", "{}"));
    const repoId = getRepoId({projectKey, repoName, commit});
    // Check if the tree is already cached
    return currentCachedRepos[repoId] !== undefined;
};

export const idsOfAllCachedTrees = async (): Promise<BitbucketOnPremRepoProps[]> => {
    logger.debug("Getting all the ids of the cached trees");
    const currentCachedRepos = JSON.parse(store.get("bitbucketTrees", "{}"));
    const ids: BitbucketOnPremRepoProps[] = [];
    _.each(currentCachedRepos, (tree, id) => {
        ids.push(getRepoFromId(id));
    });
    return ids;
};

export const removeFileTreeFromCache = async ({projectKey, repoName, commit}: BitbucketOnPremRepoProps): Promise<boolean> => {
    logger.debug("Trying to remove tree from cache", {projectKey, repoName, commit});
    const currentCachedRepos = JSON.parse(store.get("bitbucketTrees", "{}"));
    const repoId = getRepoId({projectKey, repoName, commit});
    // Check if the tree is already cached
    if (!currentCachedRepos[repoId]) {
        logger.debug("Tree is not in cache", {projectKey, repoName, commit});
        return false;
    }
    delete currentCachedRepos[repoId];
    store.set("bitbucketTrees", JSON.stringify(currentCachedRepos));
    logger.debug("Successfully removed tree from cache", {projectKey, repoName, commit});
    return true;
};

export const cleanBitbucketTreeCache = async (): Promise<boolean> => {
    logger.debug("Cleaning tree cache");
    store.set("bitbucketTrees", "{}");
    return true;
};

export const getCurrentlyCachedRepo = async (): Promise<BitbucketOnPremRepoProps> => {
    logger.debug("Checking if a tree is currently being cached");
    return repoCurrentlyBeingCached;
};

export const searchBitbucketTree = async ({projectKey, repoName, commit, searchTerm, maxResults}: BitbucketOnPremRepoProps): Promise<string[]> => {
    logger.debug("searching bitbucket tree", {projectKey, repoName, commit, searchTerm});
    const currentCachedRepos = JSON.parse(store.get("bitbucketTrees", "{}"));
    const repoId = getRepoId({projectKey, repoName, commit});
    // Check if the tree is already cached
    const cachedTree = currentCachedRepos[repoId];
    const results = _.filter(cachedTree, file => _.includes(file?.toLowerCase(), searchTerm?.toLowerCase()));
    // If maxResults is specified, return the first n results (n being maxResults)
    if (maxResults) {
        return _.slice(results, 0, maxResults);
    } else {
        // Return all results
        return results;
    }
};

export const getFileTreePageLimit =
    async ({url, accessToken, projectKey, repoName, commit}: BitbucketOnPrem): Promise<number> => {
        const fileTreeUrl = UrlAssembler(url).template(FILES_API_TEMPLATE).param({
            projectKey,
            repoName
        }).query({
            at: commit,
            limit: DEFAULT_TREE_FETCH_LIMIT
        }).toString();

        logger.debug("Getting Bitbucket server's limit for tree fetching using", { fileTreeUrl });
        const res = await fetchNoCache(fileTreeUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const data: any = await res.json();
        const limit = data.limit;
        logger.debug("Got Bitbucket server's limit for tree fetching", { limit });
        return limit;
    };

export const getFileTreeLargerThan =
    async ({url, accessToken, projectKey, repoName, commit, treeSize}: BitbucketOnPrem): Promise<boolean> => {

        // Check if we get any results when starting from the tree size we check. If values is empty, it means tree is smaller than treeSize
        // Otherwise, tree is larger than treeSize
        const fileTreeUrl = UrlAssembler(url).template(FILES_API_TEMPLATE).param({
                projectKey,
                repoName
            }).query({
                at: commit,
                limit: 10,
                start: treeSize
            }).toString();

        logger.debug("Getting Bitbucket server's limit for tree fetching using", { fileTreeUrl });
        const res = await fetchNoCache(fileTreeUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const data: any = await res.json();
        const largerThanCheckedSize = !_.isEmpty(data.values);
        logger.debug("Checked if tree is larger than specified size", { url, projectKey, repoName, treeSize, largerThanCheckedSize });
        return largerThanCheckedSize;
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
    logger.debug("Getting repos", {url, projectKey});
    const reposQuery = UrlAssembler(url).template("/rest/api/1.0/projects/:projectKey/repos").param({
        projectKey
    }).toString();
    const res = await fetchNoCache(reposQuery, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    const repos = await res.json();
    logger.debug("Finished getting repos", {url, projectKey, repos: JSON.stringify(repos)});
    return repos.values;
};

export const getCommitsForRepoFromBitbucket = async ({url, accessToken, projectKey, repoName}: BitbucketOnPrem) => {
    logger.debug("Getting commits for repo", {url, projectKey, repoName});
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
    logger.debug("Finished getting commits for repo", {url, projectKey, repoName, commits: JSON.stringify(commits)});
    return commits.values;
};

export const getBranchesForRepoFromBitbucket = async ({url, accessToken, projectKey, repoName}: BitbucketOnPrem) => {
    logger.debug("Getting branches for repo", {url, projectKey, repoName});
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
    logger.debug("Finished getting branches for repo", {url, projectKey, repoName, branches: JSON.stringify(branches)});
    return branches.values;
};

export const getFileContentFromBitbucket = async ({url, accessToken, projectKey, repoName, commit, filePath}: BitbucketOnPrem) => {
    logger.debug("Getting file content", {url, projectKey, repoName, commit, filePath});
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
            logger.error("Failed to query file content", {url, projectKey, repoName, commit, filePath, e});
            isLastPage = true;
            fileContent = "";
        }
    }

    logger.debug("Finished getting file content", {url, projectKey, repoName, commit, filePath});
    return fileContent;
};

export const getCommitDetailsFromBitbucket = async ({url, accessToken, projectKey, repoName, commit}: BitbucketOnPrem) => {
    logger.debug("Getting commit info", {url, projectKey, repoName, commit});
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

const addSlugToUrl = (url: string, slug: string): string => {
    if (!slug) {
        return url;
    }
    return `${url}/${slug}`;
};

