import * as cp from "child_process";
import { compare } from "compare-versions";
import * as fs from "fs";
import * as https from "https";
import _ = require("lodash");
import * as path from "path";
import { getStoreSafe, IStore } from "../explorook-store";
import { getLogger } from "../logger";
import { getLibraryFolder } from "../utils";
import {findGoLocation, getGoVersion} from "./goUtils";
import { findJavaHomes, getJavaVersion } from "./javaUtils";
import {findPythonLocation, getPythonVersion, PIP_FILENAME} from "./pythonUtils";

const isMacOrLinux = !_.isEmpty(process.platform.match("linux")) || !_.isEmpty(process.platform.match("darwin"));

export const logger = getLogger("langServer");
const langServerExecFolder = path.join(getLibraryFolder(), "languageServers");

const JavaLangServerDownloadURL = "https://get.rookout.com/Language-Servers/Rookout-Java-Language-Server.jar";
export const javaLangServerJarLocation = path.join(langServerExecFolder, "Rookout-Java-Language-Server.jar");
export const langServersNpmInstallationLocation = path.join(langServerExecFolder, "npm_modules");
export const javascriptLangServerExecLocation = path.join(langServersNpmInstallationLocation, "node_modules", "quick-lint-js", "quick-lint-js.exe");
export const typescriptLangServerExecLocation = path.join(
    langServersNpmInstallationLocation, "node_modules", "typescript-language-server", "lib", "cli.js");

export const supportedLanguageServers: string[] = ["java", "python", "go", "typescript"];

export const minimumLanguageVersions: {[language: string]: string} = {
    java: "13",
    python: "3.7",
    go: "1.17"
};
const languageToGetVersionFunction: {[language: string]: (location: string) => string} = {
    java: getJavaVersion,
    python: getPythonVersion,
    go: getGoVersion
};

export const maximumLanguageVersions: {[language: string]: string} = {
};

const LANGUAGE_STORE_ENABLE_KEYS: {[language: string]: string} = {
    java: "enable-java-server",
    python: "enable-python-server",
    go: "enable-go-server",
    typescript: "enable-typescript-server"
};

const LANGUAGE_STORE_LOCATION_KEYS: {[language: string]: string} = {
    java: "java-home-location",
    python: "python-location",
    go: "go-location",
};

class LangServerConfigStore {
    private static installPythonLanguageServer(pythonLocation: string) {
        cp.execFileSync(PIP_FILENAME, ["install", "python-lsp-server[all]"], { cwd: pythonLocation, encoding: "utf-8" });
    }

    public serverLocations: {[language: string]: string} = {
        java: "",
        python: "",
        go: ""
    };
    public enabledServers: {[language: string]: boolean} = {
        java: false,
        python: false,
        go: false,
        typescript: false,
        javascript: false
    };

    private store: IStore;

    constructor() {
        this.store = getStoreSafe();
        this.ensureLangServerExecFolderExists();

        this.serverLocations["java"] = this.store.get(LANGUAGE_STORE_LOCATION_KEYS["java"], "");
        this.enabledServers["java"] = this.store.get(LANGUAGE_STORE_ENABLE_KEYS["java"], "false") === "true";

        this.serverLocations["python"] = this.store.get(LANGUAGE_STORE_LOCATION_KEYS["python"], "");
        this.enabledServers["python"] = this.store.get(LANGUAGE_STORE_ENABLE_KEYS["python"], "false") === "true";

        this.serverLocations["go"] = this.store.get(LANGUAGE_STORE_LOCATION_KEYS["go"], "");
        this.enabledServers["go"] = this.store.get(LANGUAGE_STORE_ENABLE_KEYS["go"], "false") === "true" && isMacOrLinux;

        this.enabledServers["typescript"] = this.store.get(LANGUAGE_STORE_ENABLE_KEYS["typescript"], "false") === "true" && isMacOrLinux;
    }

    public doesJavaJarExist(): boolean {
        return fs.existsSync(javaLangServerJarLocation);
    }

    public isPythonLanguageServerInstalled() {
        try {
            const stdout = cp.execFileSync(PIP_FILENAME, ["show", "python-lsp-server"], { cwd: this.serverLocations["python"], encoding: "utf-8" });
            const trimmedOutput = _.trim(stdout);
            return !trimmedOutput.includes("WARNING: Package(s) not found:");
        } catch (e) {
            return false;
        }
    }

    public async installJavaLanguageServer() {
        if (!this.serverLocations["java"]) {
            this.findJdkLocation();
        }
        if (!this.doesJavaJarExist()) {
            return this.downloadJavaLangServer();
        }
    }

    public installPythonLanguageServerIfNeeded() {
        if (!this.serverLocations["python"]) {
            this.findPythonLocation();
        }
        try {
            const stdout = cp.execFileSync(PIP_FILENAME, ["show", "python-lsp-server"], { cwd: this.serverLocations["python"], encoding: "utf-8" });
            const trimmedOutput = _.trim(stdout);
            if (trimmedOutput.startsWith("WARNING: Package(s) not found:")) {
                LangServerConfigStore.installPythonLanguageServer(this.serverLocations["python"]);
            }
        } catch (e) {
            const trimmedError = _.trim(e.message);
            console.error(trimmedError);
            if (trimmedError.includes("WARNING: Package(s) not found: python-lsp-server")) {
                LangServerConfigStore.installPythonLanguageServer(this.serverLocations["python"]);
            }
        }
    }

    public installGoLanguageServerIfNeeded() {
        if (!this.serverLocations["go"]) {
            this.findGoLocation();
        }
        cp.execFileSync("go", ["install", "golang.org/x/tools/gopls@v0.8.4"], { cwd: this.serverLocations["go"], encoding: "utf-8" });
    }

    public installJavascriptLanguageServerIfNeeded() {
        this.ensureLangServerNpmFolderExists();
        try {
            const stdout = cp.execSync("npm list quick-lint-js", { cwd: langServersNpmInstallationLocation, encoding: "utf-8" });
            const trimmedOutput = _.trim(stdout);
            if (trimmedOutput.includes("(empty)")) {
                cp.execSync(`npm install quick-lint-js`, { cwd: langServersNpmInstallationLocation, encoding: "utf-8" });
            }
        } catch (e) {
            const trimmedError = _.trim(e.stdout?.toString());
            console.error(trimmedError);
            if (trimmedError.includes("(empty)")) {
                cp.execSync("npm install quick-lint-js", { cwd: langServersNpmInstallationLocation, encoding: "utf-8" });
            } else {
                logger.error(trimmedError);
                // Make sure server is not enabled
                throw e;
            }
        }
    }

    public installTypescriptLanguageServerIfNeeded() {
        this.ensureLangServerNpmFolderExists();
        try {
            const stdout = cp.execSync("npm list typescript-language-server", { cwd: langServersNpmInstallationLocation, encoding: "utf-8" });
            const trimmedOutput = _.trim(stdout);
            if (trimmedOutput.includes("(empty)")) {
                // Windows might need npm.cmd
                cp.execSync("npm install typescript-language-server typescript", { cwd: langServersNpmInstallationLocation, encoding: "utf-8" });
            }
        } catch (e) {
            const trimmedError = _.trim(e.stdout?.toString());
            console.error(trimmedError);
            if (trimmedError.includes("(empty)")) {
                cp.execSync("npm install typescript-language-server typescript", { cwd: langServersNpmInstallationLocation, encoding: "utf-8" });
            } else {
                logger.error(trimmedError);
                // Make sure server is not enabled
                throw e;
            }
        }
    }

    public setIsLanguageServerEnabled = async (language: string, isEnabled: boolean) => {
        const languageStoreKey = LANGUAGE_STORE_ENABLE_KEYS[language];
        if (languageStoreKey) {
            if (this.enabledServers[language] === isEnabled) {
                return;
            }
            if (language === "java") {
                if (isEnabled) {
                    await this.installJavaLanguageServer();
                }

            } else if (language === "typescript") {
                const newIsEnabled = isEnabled && isMacOrLinux;
                if (newIsEnabled) {
                    this.installTypescriptLanguageServerIfNeeded();
                }
            } else if (language === "python") {
                if (isEnabled) {
                    this.installPythonLanguageServerIfNeeded();
                }
            } else if (language === "go") {
                const newIsEnabled = isEnabled && isMacOrLinux;
                if (newIsEnabled) {
                    this.installGoLanguageServerIfNeeded();
                }
            }
            // Save the result if nothing failed
            this.enabledServers[language] = isEnabled;
            const isEnabledString = isEnabled ? "true" : "false";
            this.store.set(languageStoreKey, isEnabledString);
        }
    }

    public validateLanguageLocation = (language: string, location: string) => {
        if (!_.has(this.serverLocations, language)) {
            throw new Error("Language not supported for setting a location");
        }

        const version = languageToGetVersionFunction[language](location);
        if (compare(version, minimumLanguageVersions[language], ">=")) {
            return;
        } else if (version && version !== "0") {
            const errorMsg = `The location requested for ${language} has a version lower than: ${minimumLanguageVersions[language]}`;
            throw new Error(errorMsg);
        } else {
            throw new Error(`Not a valid location for ${language}`);
        }
    }

    public setLocations = (languageLocations: [InputLangServerConfigs]) => {
        _.each(languageLocations, langLocation => {
            this.validateLanguageLocation(langLocation.language, langLocation.location);
        });

        // If we reached here, all locations are valid, so save the values
        _.each(languageLocations, langLocation => {
            this.serverLocations[langLocation.language] = langLocation.location;
            this.store.set(LANGUAGE_STORE_LOCATION_KEYS[langLocation.language], langLocation.location);
        });
    }

    // Since we use fs.createWriteStream() in order to write the downloaded langserver file, it will not
    // not create the directories on its own.
    private ensureLangServerExecFolderExists = () => {
        if (!fs.existsSync(langServerExecFolder)) {
            fs.mkdirSync(langServerExecFolder, { recursive: true });
        }
    }

    private ensureLangServerNpmFolderExists = () => {
        if (!fs.existsSync(langServersNpmInstallationLocation)) {
            fs.mkdirSync(langServersNpmInstallationLocation, { recursive: true });
        }
    }

    // Java ls is about 2.1MB, so expecting a very quick download time
    private downloadJavaLangServer = async () => {
        logger.info(`downloading Java LS from ${JavaLangServerDownloadURL}`);

        return new Promise((resolve, reject) => {
            https.get(JavaLangServerDownloadURL, (response) => {

                if (response.statusCode !== 200) {
                    logger.error("Failed to download Java Language server", {message: response.statusMessage});
                    reject("Failed to download Java Language server");
                } else {
                    const file = fs.createWriteStream(javaLangServerJarLocation);
                    response.pipe(file);
                    file.on("finish", () => {
                        logger.info("Java - Langserver downloaded successfully");
                        resolve();
                    });
                    file.on("error", (error) => reject(error));
                }
            });
        });
    }

    private findJdkLocation = () => {
        const jreLocations = findJavaHomes();

        const foundJre = _.find(jreLocations, jre => compare(jre.version, minimumLanguageVersions["java"], ">="));

        if (foundJre) {
            this.serverLocations["java"] = foundJre.location;
            this.store.set(LANGUAGE_STORE_LOCATION_KEYS["java"], this.serverLocations["java"]);
        }
    }

    private findPythonLocation = () => {
        const pythonLocations = findPythonLocation();
        const foundPython = _.find(pythonLocations, python => compare(python.version, minimumLanguageVersions["python"], ">="));

        if (foundPython) {
            this.serverLocations["python"] = foundPython.location;
            this.store.set(LANGUAGE_STORE_LOCATION_KEYS["python"], this.serverLocations["python"]);
        } else {
            throw new Error("Did not find any suitable python installations");
        }
    }

    private findGoLocation = () => {
        const goLocations = findGoLocation();

        const foundGo = _.find(goLocations, go => compare(go.version, minimumLanguageVersions["go"], ">="));

        if (foundGo) {
            this.serverLocations["go"] = foundGo.location;
            this.store.set(LANGUAGE_STORE_LOCATION_KEYS["go"], this.serverLocations["go"]);
        } else {
            throw new Error("Did not find any suitable go installations");
        }
    }
}

export const langServerConfigStore = new LangServerConfigStore();
