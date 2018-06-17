import Store = require("electron-store");
import _ = require("lodash");

const REPOS_KEY = "repos";

export interface Repository {
    repoName: string;
    fullpath: string;
}

class RepoStore {
    private store: Store;
    private repos: Repository[];

    constructor() {
        this.store = new Store();
        this.repos = JSON.parse(this.store.get(REPOS_KEY, "[]"));
    }

    public save() {
        this.store.set(REPOS_KEY, JSON.stringify(this.repos));
    }

    public get() {
        return _.cloneDeep(this.repos);
    }
}


export const repStore = new RepoStore();
