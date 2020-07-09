import {Logger} from "log4js";
import {getLibraryFolder} from "./utils";

const path = require("path");
const log4js = require("log4js");

log4js.configure({
    appenders: { perforce: {type: "file", filename: path.join(getLibraryFolder(), "rookout.log")}},
    categories: {default: {appenders: ["perforce"], level: "debug"}}
});

export const getLogger = (loggerName: string): Logger => log4js.getLogger(loggerName);
