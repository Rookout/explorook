// configure Sentry
import * as Raven from 'raven-js';
import { IMiddlewareFunction } from "graphql-middleware/dist/types";
import { repStore } from "./rep-store";
import { posix } from "path";
import { GraphQLError } from 'graphql';
import { Repository } from "./common/repository";
import { RequestHandler } from "express";
import { shell } from "electron";
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

type AuthenticateController = (token: string) => RequestHandler;
export const authenticateController: AuthenticateController = token => {
  const envDic = new Map<string, string>();
  envDic.set('development', 'https://localhost:8080');
  envDic.set('staging', 'https://staging.rookout.com');
  envDic.set('production', 'https://app.rookout.com');
  const supportedEnvs = Array.from(envDic.keys());

  return (req, res) => {
    const env = req.params.env as string;
    if (!_.includes(supportedEnvs, env)) {
      res.status(400).send(`expected env param to be one of [${supportedEnvs}] but got ${env || "nothing"}`)
      return;
    }
    const domain: string = envDic.get(env);
    const targetUrl = `${domain}/authorize/explorook#token=${token}`;
    shell.openExternal(targetUrl);
    res.status(200).send("OK");
  }
}

type AuthorizationMiddleware = (token: string) => RequestHandler;
export const authorizationMiddleware: AuthorizationMiddleware = token =>
  (req, res, next) => {
    if (process.env.EXPLOROOK_NOAUTH) {
      next();
      return;
    }
    const reqToken = req.param("token") || req.header("token") || "";
    if (reqToken === token) {
      next();
    } else {
      res.status(401).send("bad token");
    }
  }