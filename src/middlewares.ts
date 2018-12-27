// configure Sentry
import * as Raven from 'raven-js';
import { IMiddlewareFunction } from "graphql-middleware/dist/types";
import { repStore } from "./rep-store";
import { posix } from "path";
import { GraphQLError } from 'graphql';
import { Repository } from "./common/repository";
import _ = require('lodash');
// using posix api makes paths consistent across different platforms
const join = posix.join;


export const logMiddleware: IMiddlewareFunction = async (resolve, root, args, context, info) => {
  try {
    return await resolve(root, args, context, info)
  } catch (error) {
    // ignore repository not found errors
    if (error && !/repository \"(.*){0,100}?\" not found/.test(error.toString())) {
        Raven.captureException(error, {
            extra: { root, args, context, info }
        })
    }
    throw error
  }
}

// filterRepo makes sure the request sends a valid and existing repo name
// and puts the repository on args
export const resolveRepoFromId: IMiddlewareFunction = (resolve, parent, args, context, info) => {
  const { repoId } = args;
  if (!repoId) return resolve(parent, args, context, info);
  const repos = repStore.getRepositories();
  const targetRepo = _.find(repos, (rep) => rep.id.toLowerCase() === repoId.toLocaleLowerCase());
  if (!targetRepo) {
    throw new GraphQLError(`repository "${repoId}" not found`);
  }
  return resolve(parent, { ...args, repo: targetRepo }, context, info);
};

const isDirTraversal = (dirPath: string, fullpath: string): boolean => {
  return !fullpath.startsWith(dirPath);
};

// Makes sure target path of the request doesn't go backwards (using "../.." syntax or whatever)
// tslint:disable-next-line:max-line-length
export const filterDirTraversal: IMiddlewareFunction = (resolve, parent, args: { repo: Repository, path: string }, context, info) => {
  const { repo, path } = args;
  if (!path || !repo) return resolve(parent, args, context, info);
  const targetPath = join(repo.fullpath, path);
  if (isDirTraversal(repo.fullpath, targetPath)) {
    throw new GraphQLError(`directory traversal detected. "${targetPath}" does not start with ${repo.fullpath}`);
  }
  return resolve(parent, args, context, info);
};