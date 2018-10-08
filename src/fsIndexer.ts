import path = require("path");
import _ = require("lodash");
const walk = require("walk");

// tslint:disable-next-line:max-line-length
const defaultIgnores = [/\.git/, /\.svn/, /\.hg/, /CVS/, /\.DS_Store/,
    /site\-packages/, /node_modules/, /bower_components/,
    /\.venv/]
// TODO: check performance to the limit and increase as necessary
const listLimit = 20000;

// This worker used to index all the filenames in the repository
// but we changed it to just keep a list of all the files instead.
// the FE will be incharge of the search algorithm itself
export class IndexWorker {
    public indexDone: boolean;
    public indexRunning: boolean;
    public treeList: string[];

    private stopFlag: boolean;
    private rootPath: string;
    private ignores: string[];

    constructor(rootPath: string, ignores?: string[]) {
        this.stopFlag = false;
        this.rootPath = rootPath;
        this.ignores = ignores || defaultIgnores;
        this.indexDone = false;
        this.indexRunning = false;
        this.treeList = [];
    }

    public index() {
        if (this.indexDone || this.indexRunning) { return; }
        this.indexRunning = true;
        this.indexDone = false;
        this.stopFlag = false;
        const walker = walk.walk(this.rootPath, { filters: this.ignores });
        walker.on("file", (root: string, fileStats: { name: string }, next: () => void) => {
            if (this.stopFlag || this.treeList.length >= listLimit) {
                walker.emit("stopped");
                return;
            }
            const filename = path.join(root, fileStats.name);
            const relPath = path.relative(this.rootPath, filename);
            this.treeList.push(relPath);
            next();
        });
        walker.on("stopped", () => {
            this.indexRunning = false;
        });
        walker.on("end", () => {
            this.indexDone = true;
            this.indexRunning = false;
        });
    }

    public deleteIndex() {
        // stops indexing job if it's running
        this.stopFlag = true;
        // delete the index
        this.treeList = [];
        this.indexDone = false;
    }
}
