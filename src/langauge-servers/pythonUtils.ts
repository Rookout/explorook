import * as cp from "child_process";
import * as fs from "fs";
import _ = require("lodash");
import * as path from "path";
import { getLogger } from "../logger";

const logger = getLogger("langserver");
const isWindows = process.platform.match("win32");
const isMac = process.platform.match("darwin");
const isLinux = process.platform.match("linux");
export const PYTHON_EXEC_FILENAME = isWindows ? "python.exe" : "python3";
export const PIP_EXEC_FILENAME = isWindows ? "pip.exe" : "pip3";

export interface PythonRuntime {
    location: string;
    version: string;
}

/**
 * return metadata for all installed JDKs.
 */
export const findPythonLocation = (): PythonRuntime[] => {
    const pythonLocations: PythonRuntime[] = [];
    const pythonSet = new Set<string>();

    const pythonInstallations = fromCommonPlaces();

    updateInstallations(pythonSet, pythonInstallations);

    pythonSet.forEach(pythonLocation => {
        logger.debug("Python - found candidate installation location", { pythonLocation });
        console.log("Python - found candidate installation location", { pythonLocation });
        const pythonExecutable = path.join(pythonLocation, PYTHON_EXEC_FILENAME);

        if (fs.existsSync(pythonExecutable)) {
            const version = checkVersionByCLI(pythonLocation);

            if (version) {
                pythonLocations.push({
                    location: pythonLocation,
                    version
                });
            } else {
                logger.warn("Python - no python exec was found");
            }
        }
    });
    return pythonLocations;
};

const updateInstallations = (set: Set<string>, newInstallations: string[]) => {
    newInstallations.forEach(pythonLoc => {set.add(pythonLoc); console.log(pythonLoc); });
};

const fromCommonPlaces = (): string[] => {
    const pythonLocations: string[] = [];

    // common place for Windows
    if (isWindows) {
        const stdout = cp.execSync("cmd /c where python", { encoding: "utf-8", stdio: ["inherit"] });
        const trimmedOutput = _.trim(stdout);
        const locations = _.split(trimmedOutput, /[\r\n]+/);
        locations?.forEach(pythonLocation => {
            if (fs.existsSync(pythonLocation)) {
                pythonLocations.push(path.dirname(pythonLocation));
            }
        });
    } else if (isLinux || isMac) {
        // common place for Linux and macOS
        ["/usr/local/bin", "/usr/bin"].forEach(pythonLocation => {
            if (fs.existsSync(pythonLocation)) {
                pythonLocations.push(pythonLocation);
            }
        });

    }

    return pythonLocations;
};

export const getPipLocationFromPythonDirectory = (pythonLocation: string): string => {
    const pipExecLocation = isWindows ? path.join(pythonLocation, "Scripts", PIP_EXEC_FILENAME) : path.join(pythonLocation, PIP_EXEC_FILENAME);
    if (fs.existsSync(pipExecLocation) && (fs.lstatSync(pipExecLocation).isFile() || fs.lstatSync(pipExecLocation).isSymbolicLink())) {
        return path.dirname(pipExecLocation);
    } else {
        throw new Error("Pip not found");
    }
};

export const getPythonVersion = (pythonExecutableFolder: string): string => checkVersionByCLI(pythonExecutableFolder);

const checkVersionByCLI = (pythonLocation: string): string => {
    if (!pythonLocation) {
        return "0";
    }

    const pythonExecutable = path.join(pythonLocation, PYTHON_EXEC_FILENAME);

    let stdout = "";
    try {
        stdout = cp.execFileSync(pythonExecutable, ["--version"], {encoding: "utf-8"});
    } catch (e) {
        throw new Error("Python install location is invalid");
    }

    const trimmedOutput = _.trim(stdout);
    // Separates it into: ["Python", "<version>"]
    const splitVersion = _.split(trimmedOutput, " ");
    if (_.isEmpty(splitVersion)) {
        return "0";
    }
    return splitVersion[1];
};
