import * as cp from "child_process";
import * as fs from "fs";
import _ = require("lodash");
import { getLogger } from "../logger";

const logger = getLogger("langserver");
const isMac = process.platform.match("darwin");
const isLinux = process.platform.match("linux");

// -----Windows is not supported as of now

export interface GoRuntime {
    location: string;
    minorVersion: number;
    majorVersion: number;
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

        if (fs.existsSync(goLocation)) {
            const version = checkVersionByCLI(goLocation);

            if (version) {
                goLocations.push({
                    location: goLocation,
                    minorVersion: version.minor,
                    majorVersion: version.major
                });
            } else {
                logger.warn("Go - no go exec was found");
            }
        }
    });
    return goLocations;
};

const updateInstallations = (set: Set<string>, newInstallations: string[]) => {
    newInstallations.forEach(pythonLoc => {set.add(pythonLoc); console.log(pythonLoc); });
};

const fromCommonPlaces = (): string[] => {
    const goLocations: string[] = [];

    // common place for Linux
    if (isLinux || isMac) {
        const stdout = cp.execSync("which go", { encoding: "utf-8" });
        const trimmedOutput = _.trim(stdout);
        const locations = _.split(trimmedOutput, /[\n\r]+/);
        locations?.forEach(goLocation => {
            if (fs.existsSync(goLocation)) {
                goLocations.push(goLocation);
            }
        });

    }

    return goLocations;
};

const parseVersion = (version: string): {major: number, minor: number} => {
    if (!version) {
        return {major: 0, minor: 0};
    }

    let cleanVersion = version;
    if (version.startsWith("go")) {
        cleanVersion = version.slice(2);
    }

    try {
        const splitVersion = cleanVersion.split(".");
        return {major: parseInt(splitVersion[0], 10), minor: parseInt(splitVersion[1], 10)};
    } catch (e) {
        logger.error("version cannot be parsed", { version });
        return {major: 0, minor: 0};
    }
};

export const getGoVersion = (goExecutableFolder: string): {major: number, minor: number} => checkVersionByCLI(goExecutableFolder);

const checkVersionByCLI = (goLocation: string): {major: number, minor: number} => {
    if (!goLocation) {
        return {major: 0, minor: 0};
    }


    let stdout = "";
    try {
        stdout = cp.execFileSync(goLocation, ["version"]);
    } catch (e) {
        throw new Error("Go install location is invalid");
    }

    const trimmedOutput = _.trim(stdout);
    const splitVersion = _.split(trimmedOutput, " ");
    if (_.isEmpty(splitVersion)) {
        return {major: 0, minor: 0};
    }
    return parseVersion(splitVersion[2]);
};
