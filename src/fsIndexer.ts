import fs = require("fs");
//import _ = require("lodash");
import path = require("path");
const ftsl = require("full-text-search-light");
const walk = require("walk");

// tslint:disable-next-line:max-line-length
const defaultIgnores = [".git", ".svn", ".hg", "CVS", ".DS_Store",
    "site-packages", "node_modules", "bower_components",
    ".venv"];

interface Search {
    add(text: string | object): string;
    search(query: string): string[];
    drop(): void;
}

export class IndexWorker {
    public indexDone: boolean;

    private stopFlag: boolean;
    private rootPath: string;
    private ignores: string[];
    private searchIndex: Search;

    constructor(rootPath: string, ignores?: string[]) {
        this.stopFlag = false;
        this.rootPath = rootPath;
        this.ignores = ignores || defaultIgnores;
        this.indexDone = false;
        this.searchIndex = new ftsl();
    }

    public index() {
        if (this.indexDone) { return; }
        const walker = walk.walk(this.rootPath, { filters: this.ignores });
        walker.on("file", (root: string, fileStats: { name: string }, next: () => void) => {
            const filename = path.join(root, fileStats.name);
            this.searchIndex.add(filename);
            if (!this.stopFlag) {
                next();
            }
        });
        walker.on("end", () => {
            this.indexDone = true;
        });
    }

    public stop() {
        this.stopFlag = false;
    }

    public search(query: string): string[] {
        const queries = query.split(" ");
        let res: string[] = [];
        queries.forEach((q) => {
            res = res.concat(this.searchIndex.search(q));
        });
        res = res.concat(this.searchIndex.search(queries.join("")));
        res.sort(this.genResultsComparer(queries));
        return res;
    }

    private genResultsComparer(queries: string[]): (a: string, b: string) => number {
        return (a: string, b: string): number => {
            if (queries.length <= 1) {
                return 0;
            }
            const aScore = queries.filter((q) => a.toLowerCase().includes(q.toLowerCase())).length;
            const bScore = queries.filter((q) => b.toLowerCase().includes(q.toLowerCase())).length;
            if (bScore > aScore) { return 1; }
            if (aScore > bScore) { return -1; }
            return 0;
        };
    }
}
