import chromeOpn = require("chrome-opn");
import { ipcRenderer, shell } from "electron";
import { RequestHandler } from "express";
import { GraphQLError } from "graphql";
import { IMiddlewareFunction } from "graphql-middleware/dist/types";
import _ = require("lodash");
import { posix } from "path";
import {encryptWithPublicKey} from "./authentication";
import { Repository } from "./common/repository";
import { notify } from "./exceptionManager";
import { repStore } from "./repoStore";
import {StartOptions} from "./server";
// using posix api makes paths consistent across different platforms
const join = posix.join;

export const logMiddleware: IMiddlewareFunction = async (resolve, root, args, context, info) => {
  try {
    return await resolve(root, args, context, info);
  } catch (error) {
    // ignore repository not found errors
    if (error && !/repository \"(.*){0,100}?\" not found/.test(error.toString())) {
      notify(error, {
        metaData : { root, args, context, info }
      });
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

type AuthenticateController = (token: string, userId: string) => RequestHandler;
export const authenticateController: AuthenticateController = (token, userId) => {
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
    const targetUrl = `${domain}/authorize/explorook?user-id=${userId}#token=${token}`;
    ipcRenderer.send("track", "authorize-open-chrome");
    try {
      await chromeOpn(targetUrl);
    } catch (err) {
      ipcRenderer.send("track", "error-open-chrome" , { error: _.toString(err) });
      notify(err);
      shell.openExternal(targetUrl);
    }
    res.status(200).send("OK");
  };
};

type AuthenticateControllerV2 = (settings: StartOptions) => RequestHandler;
export const authenticateControllerV2: AuthenticateControllerV2 = (settings: StartOptions) => {
  return async (req, res) => {
    // Settings are changed during runtime (first launch configuration) and should not be reassigned before
    const {accessToken, userId, userSite}: StartOptions = settings;
    ipcRenderer.send("track", "authorize-encrypted-token");
    if (!accessToken || !userId || !userSite ||
        userSite === "default" ||
        userId.split("-").length === 4) {
      res.status(400).send("missing/incorrect data");
      return;
    }
    const encryptedData = encryptWithPublicKey(accessToken, userId, userSite);
    res.status(200).send(encryptedData.toString("base64"));
  };
};

type ConfigureFirstTimeSettings = (firstTimeLaunch: boolean, serverStartedAt: Date, reconfigure: (id: string, site: string) => void) => RequestHandler;
export const configureFirstTimeSettings: ConfigureFirstTimeSettings = (firstTimeLaunch, serverStartedAt, reconfigure) => {
  return async (req, res) => {
    const TEN_SECONDS_IN_MILLIS = 10 * 1000;
    const serverUptimeInMillis = new Date().getTime() - serverStartedAt.getTime();
    if (!process.env.EXPLOROOK_CONF_MODE) {
      if (!firstTimeLaunch || serverUptimeInMillis > TEN_SECONDS_IN_MILLIS) {
        return res.status(403).send("cannot set user id after first launch");
      }
    }
    const {id, site} = req.body;
    if (!id || !site) {
      return res.status(400).send("missing id/site");
    }
    if (ipcRenderer) {
        // Headless mode does not have ipcRenderer because it runs in Node.
        // Tests use headless mode and will crash here
        ipcRenderer.send("configure-first-launch", id, site);
    }
    reconfigure(id, site);
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
