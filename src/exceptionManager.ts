import * as BugsnagCore from "@bugsnag/core";
import bugsnag from "@bugsnag/js";
import { app } from "electron";

let exceptionManagerInstance: BugsnagCore.Client;

export const initExceptionManager = () => {
    if (exceptionManagerInstance) {
        exceptionManagerInstance = bugsnag({
            apiKey: "6e673fda179162f48a2c6b5d159552d2",
            appVersion: app.getVersion(),
            appType: "explorook-electron",
            releaseStage: process.env.development ? "development" : "production"
        });
    }
    return exceptionManagerInstance;
};
