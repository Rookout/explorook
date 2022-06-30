import _ = require("lodash");

const isWindows =  !_.isEmpty(process.platform.match("win32"));
export const NODE_EXEC_FILENAME = isWindows ? "npm.cmd" : "npm";
