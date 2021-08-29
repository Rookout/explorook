import { Client, INotifyOpts, NotifiableError } from "@bugsnag/core";
import {getStoreSafe} from "./explorook-store";
const bugsnag = require("@bugsnag/js");
const electron = require('electron');
let app: Electron.App;
// check if not running in headless mode (plain nodejs process)
if (typeof electron !== 'string') {
  app = electron.app || electron.remote.app;
}

let exceptionManagerInstance: Client;

const store = getStoreSafe();

export const initExceptionManager = (getUserID: () => string) => {
    if (!exceptionManagerInstance && app) {
      const releaseStage = app.isPackaged ? 'production' : 'development';
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

export const USER_EMAIL_KEY = "userEmailKey"

export const notify = (error: NotifiableError, opts?: INotifyOpts) => {
    exceptionManagerInstance?.notify(error, opts);
};

export const leaveBreadcrumb = (name: string, metaData?: any, type?: string, timestamp?: string) => {
  exceptionManagerInstance?.leaveBreadcrumb(name, metaData, type, timestamp);
};

export class Logger {

  info(message?: any) {
    exceptionManagerInstance?.leaveBreadcrumb("log", { message }, "info");
    console.info(message);
  }
  warn(message?: any) {
    exceptionManagerInstance?.leaveBreadcrumb("log", { message }, "warn");
    console.warn(message);
  }
  error(message?: any) {
    console.error(message);
  }
  debug(message: string) {
    // ignore
  }
}

