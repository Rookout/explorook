import { ipcRenderer } from "electron";
import fs = require("fs");
import _ = require("lodash");
import { Repository } from "./common/repository";
import { getStoreSafe, IStore } from "./explorook-store";
import { IndexWorker } from "./fsIndexer";
import { getRepoId } from "./git";
import { getLogger } from "./logger";

const logger = getLogger("repoStore");

export class Repo {
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

    public reIndex() {
        this.indexer.deleteIndex();
        let retry = 0;
        const maxRetries = 10;
        const indexWhenJobStops = () => {
            retry += 1;
            if (retry === maxRetries) {
                return;
            }
            if (!this.indexer.indexRunning) {
                // wait till index job stops
                return this.indexer.index();
            }
            // didn't get the message yet
            setTimeout(indexWhenJobStops, 150);
        };
        // wait for other io callbacks from fsIndexer to run and evaluate new value of indexRunning flag and stop the indexing job
        setImmediate(indexWhenJobStops);
        return this.indexer.index();
    }

    // used to convert this class to a plain object representation
    // (e.g when passing through electron RPC you don't want to pass this.indexer and all the data it holds [mainly the files tree])
    public toModel(): Repository {
        return {
            repoName: this.repoName,
            fullpath: this.fullpath,
            id: this.id,
            indexDone: this.indexer.indexDone,
            indexLimitReached: !this.indexer.indexDone && !this.indexer.indexRunning
        };
    }
}

// tslint:disable-next-line:max-classes-per-file
class RepoStore {
    private allowIndex: boolean;
    private store: IStore;
    private repos: Repo[];

    constructor() {
        this.store = getStoreSafe();
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
        try {
            const existingRepo = _.find(this.repos, r => r.fullpath === repo.fullpath);
            if (existingRepo) {
                return existingRepo.id;
            }
            fs.statSync(repo.fullpath);
        } catch (e) {
            logger.error("Failed to stats repository", { error: e, path: repo.fullpath });
        }
        if (!repo.id) {
            repo.id = await getRepoId(repo, this.getRepositories().map((r) => r.id));
        }
        const repoObj = new Repo(repo);
        // dedup
        if (this.repos.find(r => r.fullpath === repo.fullpath)) {
          return;
        }
        if (this.allowIndex) {
            // start indexing on next eventloop (so we don't stuck the gui)
            setTimeout(() => repoObj.indexer.index(), 0);
        }
        this.repos.push(repoObj);
        this.save();
        return repo.id;
    }

    public remove(id: string): boolean {
        const removed = _.remove(this.repos, (r) => r.id === id);
        removed.forEach((r) => {
            r.indexer.deleteIndex();
            ipcRenderer.send("track", "repo-remove", { repoName: r.repoName, repoId: r.id });
        });
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

    public getRepoById(id: string): Repo {
        return _.find(this.repos, repo => id === repo.id);
    }

    public reMultipleIndices(ids: string[]) {
        if (_.isEmpty(ids)) {
            return;
        }
        const idSet = new Set(ids);
        _.forEach(this.repos, (repo: Repo) => {
            if (idSet.has(repo.id)) {
                repo.reIndex();
            }
        });
    }
}

export const repStore = new RepoStore();
