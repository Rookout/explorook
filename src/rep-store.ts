import Store = require("electron-store");   
import fs = require("fs");
import git = require("isomorphic-git");
import _ = require("lodash");
import path = require("path");
import { IndexWorker } from "./fsIndexer";
import MemStore from "./mem-store";

const uuidv4 = require("uuid/v4");

export interface Repository {
    repoName: string;
    fullpath: string;
    id: string;
    listTree?(): string[];
}

interface IStore {
    get(key: string, defaultValue?: string): string
    set(key: string, value: string): void
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

    public listTree(): string[] {
        return this.indexer.treeList;
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
    private store: IStore;
    private repos: Repo[];

    constructor() {
        try {
            this.store = new Store({ name: "explorook" });   
        } catch (error) { // probably headless mode - defaulting to memory store
            console.log("couldn't create electron-store. defaulting to memory store (this is normal when running headless mode)");
            this.store = new MemStore();
        }
        const models = JSON.parse(this.store.get("repositories", "[]")) as Repository[];
        this.allowIndex = JSON.parse(this.store.get("allow-indexing", "true"));
        this.repos = [];
        models.forEach((m) => this.add(m));
    }

    public getAllowIndex(): boolean {
        return this.allowIndex;
    }

    public setAllowIndex(enable: boolean) {
        this.allowIndex = enable;
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

    public async add(repo: Repository): Promise<string> {
        const exists = fs.existsSync(repo.fullpath);
        if (!exists) {
            return null;
        }
        if (!repo.id) {
            repo.id = await this.getRepoId(repo);
        }
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

    public getRepositories(): Repo[] {
        return this.repos;
    }

    private async getRepoId(repo: Repository): Promise<string> {
        // trying to create a unique id with the git remote path and relative filesystem path
        // this way, when different clients share the same workspace they automatically
        // connect to the same repository on different machines
        try {
            const gitRoot = await git.findRoot({ fs, filepath: repo.fullpath });
            const gitRootRelPath = path.relative(gitRoot, repo.fullpath);
            const remote = await git.config({fs, dir: gitRoot, path: "remote.origin.url"});
            return remote.concat("/").concat(gitRootRelPath);
        } catch (error) {
            // no git found
            return uuidv4();
        }
    }
}

export const repStore = new RepoStore();
