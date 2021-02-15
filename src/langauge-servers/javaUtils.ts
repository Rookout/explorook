import { getLogger } from './../logger';
import * as path from 'path'
import * as fs from 'fs'
import * as cp from 'child_process'
import * as os from 'os'
import _ = require('lodash')

const isWindows = process.platform.match('win32')
const isMac = process.platform.match('darwin')
const isLinux = process.platform.match('linux')
const JAVA_FILENAME = 'java' + ((process.platform === 'win32') ? '.exe' : '');

export interface JavaRuntime {
    location: string;
    version: number;
}

/**
 * return metadata for all installed JDKs.
 */
export const findJavaHomes = (): JavaRuntime[] => {

    const javaBinLocations: JavaRuntime[] = [];
    const jdkSet = new Set<string>();

    updateJDKs(jdkSet, getJavaLocationsfromEnv("JDK_HOME"));
    updateJDKs(jdkSet, getJavaLocationsfromEnv("JAVA_HOME"));
    updateJDKs(jdkSet, fromCommonPlaces());

    jdkSet.forEach(jdkLocation => {
        getLogger('langserver').debug('Java - found location found', { jdkLocation })
        const javaBin = path.join(jdkLocation, "bin", JAVA_FILENAME)

        if (fs.existsSync(javaBin)){
            const version = getJavaVersion(jdkLocation);

            if (version) {
                javaBinLocations.push({
                    location: javaBin,
                    version
                });
            } else {
                getLogger("langserver").warn("Java - no java exec was found")
            }
        }
    })
    return javaBinLocations;
}

const updateJDKs = (set: Set<string>, newJdks: string[]) => {
    newJdks.forEach(jdkLoc => {set.add(jdkLoc); console.log(jdkLoc)})
}

const getJavaLocationsfromEnv = (name: string): string[] => {
    if (!process.env[name]) {
        return []
    }

    const workspaces = process.env[name].split(path.delimiter);
    const javaLocations = new Array<string>()
    workspaces.forEach(javaLoc => javaLocations.push(javaLoc))

    return javaLocations;
}

const fromCommonPlaces = (): string[] => {
    const javaLocations: string[] = [];

    // common place for mac
    if (isMac) {
        const jvmStore = "/Library/Java/JavaVirtualMachines";
        const subfolder = "Contents/Home";

        const jvms = fs.readdirSync(jvmStore);
        jvms.forEach(jvm => {
            const javaLoc = path.join(jvmStore, jvm, subfolder);
            if (fs.existsSync(javaLoc)) {
                javaLocations.push(javaLoc)
            }
        })
    }

    // common place for Windows
    if (isWindows) {
        const localAppDataFolder = process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA : path.join(os.homedir(), "AppData", "Local");
        const possibleLocations: string[] = [
            process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Java"), // Oracle JDK per machine
            process.env.ProgramW6432 && path.join(process.env.ProgramW6432, "Java"), // Oracle JDK per machine
            process.env.ProgramFiles && path.join(process.env.ProgramFiles, "AdoptOpenJDK"), // AdoptOpenJDK per machine
            process.env.ProgramW6432 && path.join(process.env.ProgramW6432, "AdoptOpenJDK"), // AdoptOpenJDK per machine
            path.join(localAppDataFolder, "Programs", "AdoptOpenJDK"), // AdoptOpenJDK per user
        ].filter(Boolean) as string[];
        const jvmStores = _.uniq(possibleLocations);
        jvmStores.forEach(jvmStore => {
            const jvms = fs.readdirSync(jvmStore);
            jvms.forEach(jvm => {
                const javaLoc = path.join(jvmStore, jvm);
                if (fs.existsSync(javaLoc)) {
                    javaLocations.push(javaLoc)
                }
            })
        })
    }

    // common place for Linux
    if (isLinux) {
        const jvmStore = "/usr/lib/jvm";
        const jvms = fs.readdirSync(jvmStore);

        jvms.forEach(jvm => {
            const javaLoc = path.join(jvmStore, jvm);
            if (fs.existsSync(javaLoc)) {
                javaLocations.push(javaLoc)
            }
        })

    }

    return javaLocations;
}


export const getJavaVersion = (javaPath: string) => {
    let javaVersion = checkVersionInReleaseFile(javaPath);
    if (!javaVersion) {
        javaVersion = checkVersionByCLI(javaPath);
    }
    return javaVersion;
}

const checkVersionInReleaseFile = (javaPath: string): number => {
    if (!javaPath) {
        return 0;
    }
    const releaseFile = path.join(javaPath, "release");
    if (!fs.existsSync(releaseFile)) {
        return 0;
    }

    const content = fs.readFileSync(releaseFile, { encoding: 'utf-8' });
    const regexp = /^JAVA_VERSION="(.*)"/gm;
    const match = regexp.exec(content.toString());
    if (!match) {
        return 0;
    }
    const majorVersion = parseMajorVersion(match[1]);
    return majorVersion;
}

const parseMajorVersion = (version: string): number => {
    if (!version) {
        return 0;
    }
    // Ignore '1.' prefix for legacy Java versions
    if (version.startsWith("1.")) {
        version = version.substring(2);
    }
    // look into the interesting bits now
    const regexp = /\d+/g;
    const match = regexp.exec(version);
    let javaVersion = 0;
    if (match) {
        javaVersion = parseInt(match[0]);
    }
    return javaVersion;
}

const checkVersionByCLI = (javaHome: string): number => {
    if (!javaHome) {
        return 0;
    }

    const javaBin = path.join(javaHome, "bin", JAVA_FILENAME);
    const stdout = cp.execFileSync(javaBin, ["-version"])

    const regexp = /version "(.*)"/g;
    const match = regexp.exec(stdout);
    if (!match) {
        return 0;
    }
    return parseMajorVersion(match[1]);

}