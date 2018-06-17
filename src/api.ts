import fs = require("fs");
import _ = require("lodash");
import { repStore } from "./rep-store";
import { join } from "path";

const isDirTraversal = (dirPath: string, fullpath: string): boolean => {
  return !fullpath.startsWith(dirPath);
};

export const resolvers = {
  Query: {
    dir(obj: any, args: { repo: string, path: string }): Promise<string[]> {
      const { path, repo } = args;
      return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
          resolve(files);
        });
      });
    },
    file(obj: any, args: { repo: string, path: string }): Promise<string> {
      const { path, repo } = args;
      return new Promise((resolve, reject) => {
        const repos = repStore.get();
        const targetRepo = _.find(repos, (rep) => rep.repoName.toLowerCase() === repo.toLocaleLowerCase());
        if (!targetRepo) {
          reject(`repository "${repo}" not found`);
          return;
        }
        const fileFullpath = join(targetRepo.fullpath, path);
        if (isDirTraversal(targetRepo.fullpath, fileFullpath)) {
          reject(`directory traversal detected. "${fileFullpath}" does not starts with ${targetRepo.fullpath}`);
          return;
        }
        fs.readFile(fileFullpath, "utf8", (err, data) => {
          resolve(data);
        });
      });
    },
  },
};
