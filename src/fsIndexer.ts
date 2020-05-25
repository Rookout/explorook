import path = require("path");
import slash = require("slash");
import { notify } from "./exceptionManager";
const walk = require("walk");

const defaultIgnores = [
  /\.git/,
  /\.svn/,
  /\.hg/,
  /CVS/,
  /\.DS_Store/,
  /site\-packages/,
  /node_modules/,
  /bower_components/,
  /\.venv/,
  /\.idea/,
  /\.project/,
  /\.cache/,
  /\.gradle/,
  /\.idea/,
  /\.kube/,
  /\.vscode/,
  /\.history/,
  /\.eggs/,
];
const ignoreRegex = /.*(\.pyc|\.class|\.jar|\.svg|\.png|\.mxml|\.html|\.css|\.scss)$/i;
// TODO: check performance to the limit and increase as necessary
const listLimit = 50000;

// This worker used to index all the filenames in the repository
// but we changed it to just keep a list of all the files instead.
// the FE will be incharge of the search algorithm itself
export class IndexWorker {
  public indexDone: boolean;
  public indexRunning: boolean;
  public treeList: string[];

  private stopFlag: boolean;
  private rootPath: string;
  private ignores: RegExp[];

  constructor(rootPath: string, ignores?: RegExp[]) {
    this.stopFlag = false;
    this.rootPath = rootPath;
    this.ignores = ignores || defaultIgnores;
    this.indexDone = false;
    this.indexRunning = false;
    this.treeList = [];
  }

  public index() {
    if (this.indexDone || this.indexRunning) {
      return;
    }
    console.time(this.rootPath);
    this.indexRunning = true;
    this.indexDone = false;
    this.stopFlag = false;
    const walker = walk.walk(this.rootPath, { filters: this.ignores });
    walker.on(
      "file",
      (root: string, fileStats: { name: string }, next: () => void) => {
        if (this.stopFlag || this.treeList.length >= listLimit) {
          if (this.treeList.length >= listLimit) {
            this.reportLimitReached();
          }
          walker.emit("stopped");
          return;
        }
        if (ignoreRegex.test(fileStats.name)) {
          return next();
        }
        const filename = path.join(root, fileStats.name);
        const relPath = path.relative(this.rootPath, filename);
        this.treeList.push(slash(relPath));
        next();
      }
    );
    walker.on("stopped", () => {
      this.indexRunning = false;
    });
    walker.on("end", () => {
      console.timeEnd(this.rootPath);
      this.indexDone = true;
      this.indexRunning = false;
    });
  }

  public reportLimitReached(): any {
    const stats = new Map<string, number>();
    this.treeList.forEach((filename) => {
      const ext = path.extname(filename);
      stats.set(ext, (stats.get(ext) || 0) + 1);
    });
    let str = "";
    stats.forEach((count, ext) => {
      str += `${ext}: ${count}\n`;
    });

    notify(`index limit reached. stats:\n${str}`, {
      severity: "warning",
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
