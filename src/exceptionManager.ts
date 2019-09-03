import { Client, INotifyOpts, NotifiableError } from "@bugsnag/core";
const bugsnag = require("@bugsnag/js");

let exceptionManagerInstance: Client;

export const initExceptionManager = (releaseStage: string, appVersion: string, getUserID: () => string) => {
    if (!exceptionManagerInstance) {
        exceptionManagerInstance = bugsnag({
            onUncaughtException: (err: any) => {
                // override default behaviour to not crash
                // https://docs.bugsnag.com/platforms/javascript/configuration-options/#onuncaughtexception-node-js-only
            },
            apiKey: "6e673fda179162f48a2c6b5d159552d2",
            appType: "explorook-electron",
            appVersion,
            releaseStage,
            beforeSend: (report: any) => {
              if (getUserID) {
                report.updateMetaData("user", {
                  userID: getUserID()
                });
              }
            }
        }, null);
    }
    return exceptionManagerInstance;
};

export const notify = (error: NotifiableError, opts?: INotifyOpts): boolean => {
    if (exceptionManagerInstance) {
        return exceptionManagerInstance.notify(error, opts);
    }
    return true;
};

