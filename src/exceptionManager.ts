import { Client, INotifyOpts, NotifiableError } from "@bugsnag/core";
import bugsnag = require("@bugsnag/js");
import { app } from "electron";

let exceptionManagerInstance: Client;

export const initExceptionManager = () => {
    if (!exceptionManagerInstance) {
        exceptionManagerInstance = bugsnag({
            apiKey: "6e673fda179162f48a2c6b5d159552d2",
            appVersion: app.getVersion(),
            appType: "explorook-electron",
            releaseStage: process.env.development ? "development" : "production"
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

