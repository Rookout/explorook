import * as cp from "child_process";
import * as fs from "fs";
import _ = require("lodash");
import * as path from "path";
import { getLogger } from "../logger";

const logger = getLogger("langserver");
const isWindows = process.platform.match("win32");
const isMac = process.platform.match("darwin");
const isLinux = process.platform.match("linux");

export const GO_EXEC_FILENAME = isWindows ? "go.exe" : "go";

// -----Windows is not supported as of now

export interface GoRuntime {
    location: string;
    version: string;
}

/**
 * return metadata for all installed Go executables.
 */
export const findGoLocation = (): GoRuntime[] => {
    const goLocations: GoRuntime[] = [];
    const goSet = new Set<string>();

    const goInstallations = fromCommonPlaces();

    updateInstallations(goSet, goInstallations);

    goSet.forEach(goLocation => {
        logger.debug("Go - found candidate installation location", { goLocation });
        console.log("Go - found candidate installation location", { goLocation });

        const goExecutable = path.join(goLocation, GO_EXEC_FILENAME);
        if (fs.existsSync(goExecutable)) {
            const version = checkVersionByCLI(goLocation);

            if (version) {
                goLocations.push({
                    location: goLocation,
                    version
                });
            } else {
                logger.warn("Go - no go exec was found");
            }
        }
    });
    return goLocations;
};

const updateInstallations = (set: Set<string>, newInstallations: string[]) => {
    newInstallations.forEach(goLoc => {set.add(goLoc); console.log(goLoc); });
};

const fromCommonPlaces = (): string[] => {
    const goLocations: string[] = [];


    if (isWindows) {
        const stdout = cp.execSync("cmd /c where go", { encoding: "utf-8", stdio: ["inherit"] });
        const trimmedOutput = _.trim(stdout);
        const locations = _.split(trimmedOutput, /[\n\r]+/);
        locations?.forEach(goLocation => {
            if (fs.existsSync(goLocation)) {
                goLocations.push(path.dirname(goLocation));
            }
        });
    } else if (isLinux || isMac) {
        // common place for Linux and macOS
        ["/usr/local/bin", "/usr/bin"].forEach(goLocation => {
            if (fs.existsSync(goLocation)) {
                goLocations.push(path.dirname(goLocation));
            }
        });
    }

    return goLocations;
};

const parseVersion = (version: string): string => {
    if (!version) {
        return "0";
    }

    if (version.startsWith("go")) {
        return version.slice(2);
    } else {
        return "0";
    }
};

export const getGoVersion = (goExecutableFolder: string): string => checkVersionByCLI(goExecutableFolder);

const checkVersionByCLI = (goLocation: string): string => {
    if (!goLocation) {
        return "0";
    }

    let stdout;
    const goExecutable = path.join(goLocation, GO_EXEC_FILENAME);
    try {
        stdout = cp.execFileSync(goExecutable, ["version"], {encoding: "utf-8"});
    } catch (e) {
        throw new Error("Go install location is invalid");
    }

    const trimmedOutput = _.trim(stdout);
    const splitVersion = _.split(trimmedOutput, " ");
    // Separates it into: ["go", "version", "go<version>"]
    if (_.isEmpty(splitVersion)) {
        return "0";
    }
    return parseVersion(splitVersion[2]);
};
