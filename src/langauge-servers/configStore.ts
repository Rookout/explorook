import * as cp from "child_process";
import { compare } from "compare-versions";
import * as fs from "fs";
import * as https from "https";
import _ = require("lodash");
import * as path from "path";
import {InputLangServerConfigs, SupportedServerLanguage} from "../common";
import { getStoreSafe, IStore } from "../explorook-store";
import { getLogger } from "../logger";
import { getLibraryFolder } from "../utils";
import {findGoLocation, getGoVersion, GO_EXEC_FILENAME} from "./goUtils";
import { findJavaHomes, getJavaVersion } from "./javaUtils";
import { NODE_EXEC_FILENAME } from "./nodeUtils";
import {findPythonLocation, getPythonVersion, PYTHON_EXEC_FILENAME} from "./pythonUtils";

export const logger = getLogger("langServer");
const langServerExecFolder = path.join(getLibraryFolder(), "languageServers");

const JavaLangServerDownloadURL = "https://get.rookout.com/Language-Servers/Rookout-Java-Language-Server.jar";
export const javaLangServerJarLocation = path.join(langServerExecFolder, "Rookout-Java-Language-Server.jar");
export const langServersNpmInstallationLocation = path.join(langServerExecFolder, "npm_modules");
export const typescriptLangServerExecLocation = path.join(
    langServersNpmInstallationLocation, "node_modules", "typescript-language-server", "lib", "cli.js");

export const isLanguageSupported = (language: string) => _.includes(_.values(SupportedServerLanguage), language);

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

const getLanguageEnableKey = (language: string): string => `enable-${language}-server`;

const getLanguageLocationKey = (language: string): string => `${language}-location`;

class LangServerConfigStore {
    private static installTypeScriptLS() {
        cp.execSync(
            `${NODE_EXEC_FILENAME} install typescript-language-server typescript`,
            { cwd: langServersNpmInstallationLocation, encoding: "utf-8" }
        );
    }

    public serverLocations: {[language: string]: string} = {
        [SupportedServerLanguage.java]: "",
        [SupportedServerLanguage.python]: "",
        [SupportedServerLanguage.go]: ""
    };
    public enabledServers: {[language: string]: boolean} = {
        [SupportedServerLanguage.java]: false,
        [SupportedServerLanguage.python]: false,
        [SupportedServerLanguage.go]: false,
        [SupportedServerLanguage.typescript]: false
    };

    private store: IStore;

    constructor() {
        this.store = getStoreSafe();
        this.ensureLangServerExecFolderExists();

        _.each(_.values(SupportedServerLanguage), (language: string) => {
            this.serverLocations[language] = this.store.get(getLanguageLocationKey(language), "");
            this.enabledServers[language] = this.store.get(getLanguageEnableKey(language), "false") === "true";
        });
    }

    public doesJavaJarExist(): boolean {
        // Make sure the file exists and is not empty (thus invalid)
        return fs.existsSync(javaLangServerJarLocation) && fs.statSync(javaLangServerJarLocation).size > 0;
    }

    public setIsLanguageServerEnabled = async (language: SupportedServerLanguage, isEnabled: boolean) => {
        if (!isLanguageSupported(language)) {
            throw new Error("We do not currently support for a language server for the requested language");
        }
        const languageStoreKey = getLanguageEnableKey(language);
        if (this.enabledServers[language] === isEnabled) {
            return;
        }
        if (isEnabled) {
            await this.installLanguageServer(language);
        }
        // Save the result if nothing failed
        this.enabledServers[language] = isEnabled;
        const isEnabledString = isEnabled ? "true" : "false";
        this.store.set(languageStoreKey, isEnabledString);
    }

    public setLocations = (languageLocations: [InputLangServerConfigs]) => {
        _.each(languageLocations, langLocation => {
            this.validateLanguageLocation(langLocation.language, langLocation.location);
        });

        // If we reached here, all locations are valid, so save the values
        _.each(languageLocations, langLocation => {
            this.serverLocations[langLocation.language] = langLocation.location;
            this.store.set(getLanguageLocationKey(langLocation.language), langLocation.location);
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
            this.store.set(getLanguageLocationKey("java"), this.serverLocations["java"]);
        }
    }

    private findPythonLocation = () => {
        const pythonLocations = findPythonLocation();
        const foundPython = _.find(pythonLocations, python => compare(python.version, minimumLanguageVersions["python"], ">="));

        if (foundPython) {
            this.serverLocations["python"] = foundPython.location;
            this.store.set(getLanguageLocationKey("python"), this.serverLocations["python"]);
        } else {
            throw new Error("Did not find any suitable python installations");
        }
    }

    private findGoLocation = () => {
        const goLocations = findGoLocation();

        const foundGo = _.find(goLocations, go => compare(go.version, minimumLanguageVersions["go"], ">="));

        if (foundGo) {
            this.serverLocations["go"] = foundGo.location;
            this.store.set(getLanguageLocationKey("go"), foundGo.location);
        } else {
            throw new Error("Did not find any suitable go installations");
        }
    }

    private async installJavaLanguageServer() {
        if (!this.serverLocations["java"]) {
            this.findJdkLocation();
        }
        if (!this.doesJavaJarExist()) {
            return this.downloadJavaLangServer();
        }
    }

    private installPythonLS() {
        const {stderr} = cp.spawnSync(PYTHON_EXEC_FILENAME,
            ["-m", "pip", "install", "python-lsp-server[all]"],
            { cwd: this.serverLocations["python"], encoding: "utf-8" }
        );
        if (stderr) {
            throw new Error(stderr);
        }
    }

    private installPythonLanguageServerIfNeeded() {
        if (!this.serverLocations["python"]) {
            this.findPythonLocation();
        }
        try {
            const { stdout, stderr } = cp.spawnSync(
                PYTHON_EXEC_FILENAME,
                ["-m", "pip", "show", "python-lsp-server"],
                { cwd: this.serverLocations["python"], encoding: "utf-8" }
            );
            const trimmedOutput = _.trim(stdout);
            const trimmedError = _.trim(stderr);
            if (trimmedError.startsWith("WARNING: Package(s) not found:") || trimmedOutput.startsWith("WARNING: Package(s) not found:")) {
                this.installPythonLS();
            }
        } catch (e) {
            const trimmedError = _.trim(e.message);
            console.error(trimmedError);
            if (trimmedError.includes("WARNING: Package(s) not found: python-lsp-server")) {
                this.installPythonLS();
            } else {
                logger.error(trimmedError);
                // Make sure server is not enabled
                throw e;
            }
        }
    }

    private installGoLanguageServerIfNeeded() {
        if (!this.serverLocations["go"]) {
            this.findGoLocation();
        }
        cp.execFileSync(GO_EXEC_FILENAME, ["install", "golang.org/x/tools/gopls@v0.8.4"], { cwd: this.serverLocations["go"], encoding: "utf-8" });
    }

    private installTypescriptLanguageServerIfNeeded() {
        this.ensureLangServerNpmFolderExists();
        try {
            const stdout = cp.execSync(
                `${NODE_EXEC_FILENAME} list typescript-language-server`,
                { cwd: langServersNpmInstallationLocation, encoding: "utf-8" }
            );
            const trimmedOutput = _.trim(stdout);
            if (trimmedOutput.includes("(empty)")) {
                // Windows might need npm.cmd
                LangServerConfigStore.installTypeScriptLS();
            }
        } catch (e) {
            const trimmedError = _.trim(e.stdout?.toString());
            console.error(trimmedError);
            if (trimmedError.includes("(empty)")) {
                LangServerConfigStore.installTypeScriptLS();
            } else {
                logger.error(trimmedError);
                // Make sure server is not enabled
                throw e;
            }
        }
    }

    private installLanguageServer = async (language: SupportedServerLanguage) => {
        switch (language) {
            case SupportedServerLanguage.java:
                return this.installJavaLanguageServer();
            case SupportedServerLanguage.python:
                return this.installPythonLanguageServerIfNeeded();
            case SupportedServerLanguage.go:
                return this.installGoLanguageServerIfNeeded();
            case SupportedServerLanguage.typescript:
                return this.installTypescriptLanguageServerIfNeeded();
            default:
                throw new Error("Unsupported language server");
        }
    }

    private validateLanguageLocation = (language: SupportedServerLanguage, location: string) => {
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
}

export const langServerConfigStore = new LangServerConfigStore();
