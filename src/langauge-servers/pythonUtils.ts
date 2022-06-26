import * as cp from "child_process";
import * as fs from "fs";
import _ = require("lodash");
import * as minimatch from "minimatch";
import * as os from "os";
import * as path from "path";
import { getLogger } from "../logger";

const logger = getLogger("langserver");
export const isWindows = process.platform.match("win32");
const isMac = process.platform.match("darwin");
const isLinux = process.platform.match("linux");
export const PYTHON_FILENAME = isWindows ? "python3.exe" : "python3";
export const PIP_FILENAME = isWindows ? "pip3.exe" : "pip3";

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
        const pythonExecutable = path.join(pythonLocation, PYTHON_FILENAME);

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
        const localAppDataFolder = process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA : path.join(os.homedir(), "AppData", "Local");
        const possibleParentLocations: string[] = [
            process.env.ProgramFiles || undefined, // Python per machine
            process.env.ProgramW6432 || undefined, // Python per machine
            "C:", // Python per machine
            path.join(localAppDataFolder, "Programs"), // Python per user
        ].filter(Boolean) as string[];
        const pythonStoreParents = _.uniq(possibleParentLocations);
        pythonStoreParents.forEach(pythonStoreParent => {
            fs.readdirSync(pythonStoreParent, {withFileTypes: true}).filter(possibleStore => possibleStore.isFile()).forEach(possibleStore => {
                if (minimatch.match([possibleStore.name], "**Python*")) {
                    pythonLocations.push(possibleStore.name);
                }
            });
        });
    }

    // common place for Linux
    if (isLinux || isMac) {
        ["/usr/local/bin", "/usr/bin"].forEach(pythonLocation => {
            if (fs.existsSync(pythonLocation)) {
                pythonLocations.push(pythonLocation);
            }
        });

    }

    return pythonLocations;
};

export const getPythonVersion = (pythonExecutableFolder: string): string => checkVersionByCLI(pythonExecutableFolder);

const checkVersionByCLI = (pythonLocation: string): string => {
    if (!pythonLocation) {
        return "0";
    }

    const pythonExecutable = path.join(pythonLocation, PYTHON_FILENAME);

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
