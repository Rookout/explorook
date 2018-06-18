import Store = require("electron-store");
import fs = require("fs");
const uuidv4 = require("uuid/v4");
import _ = require("lodash");

const REPOS_KEY = "repos";

export interface Repository {
    repoName: string;
    fullpath: string;
    id: string;
}

class RepoStore {
    private store: Store;
    private repos: Repository[];

    constructor() {
        this.store = new Store({ name: "rookout_explorer" });
        this.repos = JSON.parse(this.store.get(REPOS_KEY, "[]"));
    }

    public save() {
        this.store.set(REPOS_KEY, JSON.stringify(this.repos));
    }

    public add(repo: Repository): string {
        const exists = fs.existsSync(repo.fullpath);
        if (!exists) {
            return null;
        }
        repo.id = uuidv4();
        this.repos.push(repo);
        this.save();
        return repo.id;
    }

    public remove(id: string): boolean {
        const removed = _.remove(this.repos, (r) => r.id === id);
        if (removed) {
            this.save();
        }
        return !!removed;
    }

    public update(id: string, name: string) {
        if (!name) { return; }
        const repo = this.repos.find((r) => r.id === id);
        if (!repo) { return; }
        repo.repoName = name;
        this.save();
    }

    public get(): Repository[] {
        // clone repos map and turn to array.
        return _.cloneDeep(this.repos);
    }
}


export const repStore = new RepoStore();
