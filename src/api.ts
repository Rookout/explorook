import fs = require("fs");
import _ = require("lodash");
import { posix } from "path";
import { Repository } from "./common/repository";
import { getLastCommitDescription as getLastCommitDescription } from "./git";
import { Repo, repStore } from "./repoStore";
import { onAddRepoRequestHandler } from "./server";
// using posix api makes paths consistent across different platforms
const join = posix.join;

const GRAPHQL_INT_MAX = 2147483647;

interface FileInfo {
  path: string;
  name: string;
  isFolder: boolean;
  size: number;
}

export const resolvers = {
  Repository: {
    lastCommitDescription: async (parent: Repository) => {
      const repo = repStore.getRepositories().find((r) => r.id === parent.id);
      return await getLastCommitDescription(repo);
    },
  },
  Mutation: {
    addRepository: async (parent: any, args: { fullpath: string }, context: { onAddRepoRequest: onAddRepoRequestHandler }): Promise<boolean> => {
      return context.onAddRepoRequest(args.fullpath);
    }
  },
  Query: {
    async repository(parent: any, args: { repo: Repo, path: string }) {
      const { repo } = args;
      return repo.toModel();
    },
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
              size: fstats.size > GRAPHQL_INT_MAX ? -1 : fstats.size,
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
      return repo.listTree();
    },
    refreshIndex(parent: any, args: { repo: Repository }): boolean {
      args.repo.reIndex();
      return true;
    }
  },
};
