import fs = require("fs");
import { GraphQLError } from "graphql";
import { IMiddlewareFunction } from "graphql-middleware/dist/types";
import _ = require("lodash");
import { posix } from "path";
import { Repository, repStore } from "./rep-store";
// using posix api makes paths consistent across different platforms
const join = posix.join;

interface FileInfo {
  path: string;
  name: string;
  isFolder: boolean;
  size: number;
}

const isDirTraversal = (dirPath: string, fullpath: string): boolean => {
  return !fullpath.startsWith(dirPath);
};

// filterRepo makes sure the request sends a valid and existing repo name
// and puts the repository on args
const filterRepo: IMiddlewareFunction = (resolve, parent, args, context, info) => {
  const { repoId } = args;
  const repos = repStore.getRepositories();
  const targetRepo = _.find(repos, (rep) => rep.id.toLowerCase() === repoId.toLocaleLowerCase());
  if (!targetRepo) {
    throw new GraphQLError(`repository "${repoId}" not found`);
  }
  return resolve(parent, { ...args, repo: targetRepo }, context, info);
};

// Makes sure target path of the request doesn't go backwards (using "../.." syntax or whatever)
// tslint:disable-next-line:max-line-length
const filterDirTraversal: IMiddlewareFunction = (resolve, parent, args: { repo: Repository, path: string }, context, info) => {
  const { repo, path } = args;
  const targetPath = join(repo.fullpath, path);
  if (isDirTraversal(repo.fullpath, targetPath)) {
    throw new GraphQLError(`directory traversal detected. "${targetPath}" does not start with ${repo.fullpath}`);
  }
  return resolve(parent, args, context, info);
};

// Apply both middlewares on resolvers
export const repoMiddleware = {
  Query: {
    file: filterRepo,
    dir: filterRepo,
    listTree: filterRepo,
  }
};

export const traversalMiddleware = {
  Query: {
    file: filterDirTraversal,
    dir: filterDirTraversal,
  }
};

export const resolvers = {
  Query: {
    listRepos(parent: any, args: any): Repository[] {
      return repStore.getRepositories().map((r) => r.toModel());
    },
    // dir get's a target repository (as a user can expose multiple folders on it's PC) and a relative path
    // and returns a list of all files and folders in that path
    dir(parent: any, args: { repo: Repository, path: string }): Promise<FileInfo[]> {
      const { path, repo } = args;
      return new Promise((resolve, reject) => {
        const targetDir = join(repo.fullpath, path);
        fs.readdir(targetDir, (err, files) => {
          if (err != null) {
            reject(err);
            return;
          }
          const res: FileInfo[] = [];
          files.forEach((f) => {
            const fstats = fs.statSync(join(repo.fullpath, path, f));
            let fPath = join(path, f);
            if (fPath.startsWith("/")) {
              // if path starts with "/" the path looks absolute but it's relative so we remove it
              fPath = fPath.slice(1); 
            }
            res.push({
              isFolder: !fstats.isFile(),
              name: f,
              path: fPath,
              size: fstats.size,
            });
          });
          resolve(res);
        });
      });
    },
    // file returns the content of a file, given the target repository and inner path.
    file(parent: any, args: { repo: Repository, path: string }): Promise<string> {
      const { path, repo } = args;
      return new Promise((resolve, reject) => {
        const fileFullpath = join(repo.fullpath, path);
        fs.readFile(fileFullpath, "utf8", (err, data) => {
          if (err != null) {
            reject(err);
            return;
          }
          resolve(data);
        });
      });
    },
    listTree(parent: any, args: { repo: Repository }): string[] {
      const { repo } = args;
      return repo.listTree()
    }
  },
};
