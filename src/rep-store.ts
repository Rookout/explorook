import Store = require("electron-store");
import fs = require("fs");
import _ = require("lodash");
import { IndexWorker } from "./fsIndexer";
const uuidv4 = require("uuid/v4");

export interface Repository {
    repoName: string;
    fullpath: string;
    id: string;
    search?(query: string): string[];
}

class Repo {
    public repoName: string;
    public fullpath: string;
    public id: string;
    public indexer: IndexWorker;

    constructor(model: Repository) {
        this.repoName = model.repoName;
        this.fullpath = model.fullpath;
        this.id = model.id;
        this.indexer = new IndexWorker(this.fullpath);
    }

    public search(query: string): string[] {
        return this.indexer.search(query);
    }

    public toModel(): Repository {
        return {
            repoName: this.repoName,
            fullpath: this.fullpath,
            id: this.id,
        };
    }
}

// tslint:disable-next-line:max-classes-per-file
class RepoStore {
    private allowIndex: boolean;
    private store: Store;
    private repos: Repo[];

    constructor() {
        this.store = new Store({ name: "explorook" });
        const models = JSON.parse(this.store.get("repositories", "[]")) as Repository[];
        this.allowIndex = JSON.parse(this.store.get("allow-indexing", "true"));
        this.repos = models.map((m) => new Repo(m));
        if (this.allowIndex) {
            this.repos.forEach((r) => r.indexer.index());
        }
    }

    public getAllowIndex(): boolean {
        return this.allowIndex;
    }

    public setAllowIndex(enable: boolean) {
        if (enable) {
            this.repos.forEach((r) => r.indexer.index());
        } else {
            this.repos.forEach((r) => r.indexer.deleteIndex());
        }
    }

    public save() {
        const models = this.repos.map((r) => r.toModel());
        this.store.set("repositories", JSON.stringify(models));
    }

    public add(repo: Repository): string {
        const exists = fs.existsSync(repo.fullpath);
        if (!exists) {
            return null;
        }
        repo.id = uuidv4();
        const r = new Repo(repo);
        if (this.allowIndex) {
            // start indexing on next eventloop (so we don't stuck the gui)
            setTimeout(() => r.indexer.index(), 0);
        }
        this.repos.push(r);
        this.save();
        return repo.id;
    }

    public remove(id: string): boolean {
        const removed = _.remove(this.repos, (r) => r.id === id);
        removed.forEach((r) => r.indexer.deleteIndex());
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

    public getRepositories(): Repository[] {
        return this.repos;
    }
}

export const repStore = new RepoStore();
