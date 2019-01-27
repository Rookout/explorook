import * as BugsnagCore from "@bugsnag/core";
import bugsnag from "@bugsnag/js";
import {app, IpcMessageEvent, ipcRenderer} from "electron";

let exceptionManagerInstance: BugsnagCore.Client | null = null;


ipcRenderer.once("exception-manager-enabled-changed", (event: IpcMessageEvent, enabled: boolean) => {
    if (enabled) {
        console.log("enabling bugsnag");
        exceptionManagerInstance = exceptionManagerInstance = bugsnag({
            apiKey: "6e673fda179162f48a2c6b5d159552d2",
            appVersion: app.getVersion(),
            appType: "explorook-electron",
            releaseStage: process.env.development ? "development" : "production"
        });
    } else {
        console.log("bugsnag disabled");
    }
});


module.exports = exceptionManagerInstance;
