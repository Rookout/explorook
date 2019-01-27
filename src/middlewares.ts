import chromeOpn = require("chrome-opn");
import { IpcMessageEvent, ipcRenderer, shell } from "electron";
import { RequestHandler } from "express";
import { GraphQLError } from "graphql";
import { IMiddlewareFunction } from "graphql-middleware/dist/types";
import _ = require("lodash");
import { posix } from "path";
import { Repository } from "./common/repository";
import { initExceptionManager } from "./exceptionManager";
import { repStore } from "./repoStore";
// using posix api makes paths consistent across different platforms
const join = posix.join;

import * as BugsnagCore from "@bugsnag/core";
let exceptionManagerInstance: BugsnagCore.Client;
let exceptionManagerEnabled: boolean;

ipcRenderer.once("exception-manager-enabled-changed", (event: IpcMessageEvent, enabled: boolean) => {
  if (enabled) {
    console.log("enabling bugsnag on main window");
    exceptionManagerEnabled = true;
    exceptionManagerInstance = initExceptionManager();
  } else {
    console.log("bugsnag disabled on main window");
    exceptionManagerEnabled = false;
  }
});


export const logMiddleware: IMiddlewareFunction = async (resolve, root, args, context, info) => {
  try {
    return await resolve(root, args, context, info);
  } catch (error) {
    // ignore repository not found errors
    if (error && !/repository \"(.*){0,100}?\" not found/.test(error.toString())) {
       if (exceptionManagerEnabled && exceptionManagerInstance) {
         exceptionManagerInstance.notify(error, {
           metaData : { root, args, context, info }
         });
       }
    }
    throw error;
  }
};

// filterRepo makes sure the request sends a valid and existing repo name
// and puts the repository on args
export const resolveRepoFromId: IMiddlewareFunction = (resolve, parent, args, context, info) => {
  const { repoId } = args;
  if (!repoId) { return resolve(parent, args, context, info); }
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
export const filterDirTraversal: IMiddlewareFunction = (resolve, parent, args: { repo: Repository, path: string }, context, info) => {
  const { repo, path } = args;
  if (!path || !repo) { return resolve(parent, args, context, info); }
  const targetPath = join(repo.fullpath, path);
  if (isDirTraversal(repo.fullpath, targetPath)) {
    throw new GraphQLError(`directory traversal detected. "${targetPath}" does not start with ${repo.fullpath}`);
  }
  return resolve(parent, args, context, info);
};

type AuthenticateController = (token: string) => RequestHandler;
export const authenticateController: AuthenticateController = (token) => {
  // rookout env to url map
  const envDict = new Map<string, string>();
  envDict.set("development", "https://localhost:8080");
  envDict.set("staging", "https://staging.rookout.com");
  envDict.set("production", "https://app.rookout.com");
  const supportedEnvs = Array.from(envDict.keys());

  return async (req, res) => {
    const env = req.params.env as string;
    if (!_.includes(supportedEnvs, env)) {
      res.status(400).send(`expected env param to be one of [${supportedEnvs}] but got ${env || "nothing"}`);
      return;
    }
    const domain: string = envDict.get(env);
    const targetUrl = `${domain}/authorize/explorook#token=${token}`;
    try {
      await chromeOpn(targetUrl);
    } catch (err) {
      shell.openExternal(targetUrl);
    }
    res.status(200).send("OK");
  };
};

type AuthorizationMiddleware = (token: string) => RequestHandler;
export const authorizationMiddleware: AuthorizationMiddleware = (token) =>
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
  };
