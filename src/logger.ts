import {Logger} from "log4js";
import {getStoreSafe} from "./explorook-store";
import {getLibraryFolder} from "./utils";

const path = require("path");
const log4js = require("log4js");

const store = getStoreSafe();
let logLevel = store.get("logLevel", null);
if (!logLevel) {
    store.set("logLevel", "error");
    logLevel = "error";
}

log4js.configure({
    appenders: {
            perforce: {type: "file", filename: path.join(getLibraryFolder(), "rookout.log")},
            git: {type: "file", filename: path.join(getLibraryFolder(), "rookout.log")}
        },
    categories: {default: {appenders: ["perforce", "git"], level: logLevel}}
});

export const getLogger = (loggerName: string): Logger => log4js.getLogger(loggerName);
