import { Client, INotifyOpts, NotifiableError } from "@bugsnag/core";
import {getStoreSafe} from "./explorook-store";
const bugsnag = require("@bugsnag/js");
const electron = require("electron");
const remote = process.type === "browser" || process.env.headless_mode === "true"
    ? electron
    : require("@electron/remote");

let app: Electron.App;
// check if not running in headless mode (plain nodejs process)
if (typeof electron !== "string") {
  app = electron.app || remote.app;
}

let exceptionManagerInstance: Client;

const store = getStoreSafe();

const ignoredErrors = new Set<string>(["ENOENT", "ENOTDIR", "ENOTEMPTY",
                                              "ENOTFOUND", "ETIMEDOUT", "EACCES", "ECONNRESET"]);
Object.freeze(ignoredErrors); // prevents anyone from changing the object

export const initExceptionManager = (getUserID: () => string) => {
    if (!exceptionManagerInstance && app) {
      const releaseStage = app.isPackaged ? "production" : "development";
      exceptionManagerInstance = bugsnag({
        onUncaughtException: (err: any) => {
          // override default behaviour to not crash
          // https://docs.bugsnag.com/platforms/javascript/configuration-options/#onuncaughtexception-node-js-only
          console.log(err);
        },
        projectRoot: app.getAppPath(),
        apiKey: "6e673fda179162f48a2c6b5d159552d2",
        appType: "explorook-electron",
        appVersion: app.getVersion(),
        releaseStage,
        beforeSend: (report: any) => {
          if (getUserID) {
            report.updateMetaData("user", {
              userID: getUserID()
            });
          }
          const userEmail = store.get(USER_EMAIL_KEY, null);
          if (userEmail) {
            report.updateMetaData("user", { userEmail });
          }
        }
      }, null);
    }
    return exceptionManagerInstance;
};

export const USER_EMAIL_KEY = "userEmailKey";

export const notify = (error: NotifiableError, opts?: INotifyOpts) => {
    // get the error code if exists. If no code exists then notify
    const errorCode = error?.code;
    if (errorCode && ignoredErrors.has(errorCode)) {
      return;
    }
    exceptionManagerInstance?.notify(error, opts);
};

export const leaveBreadcrumb = (name: string, metaData?: any, type?: string, timestamp?: string) => {
  exceptionManagerInstance?.leaveBreadcrumb(name, metaData, type, timestamp);
};

export class Logger {

  public info(message?: any) {
    exceptionManagerInstance?.leaveBreadcrumb("log", { message }, "info");
    console.info(message);
  }
  public warn(message?: any) {
    exceptionManagerInstance?.leaveBreadcrumb("log", { message }, "warn");
    console.warn(message);
  }
  public error(message?: any) {
    console.error(message);
  }
  public debug(message: string) {
    // ignore
  }
  public trace(msg?: string | Error) {
    console.trace(msg || "");
  }
}

