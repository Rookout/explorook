import * as cp from "child_process";
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

export const logger = getLogger("langServer");
const langServerExecFolder = path.join(getLibraryFolder(), "languageServers");

const JavaLangServerDownloadURL = "https://get.rookout.com/Language-Servers/Rookout-Java-Language-Server.jar";
export const javaLangServerJarLocation = path.join(langServerExecFolder, "Rookout-Java-Language-Server.jar");
export const minimumJavaVersionRequired = 13;
export const minimumPythonMajorVersion = 3;
export const minimumPythonMinorVersion = 7;
export const minimumGoMajorVersion = 1;
export const minimumGoMinorVersion = 17;

class LangServerConfigStore {
    private static installPythonLanguageServer(pythonLocation: string) {
        cp.execFileSync(PIP_FILENAME, ["install", "python-lsp-server[all]"], { cwd: pythonLocation, encoding: "utf-8" });
    }

    public isDownloadingJavaJar: boolean = false;
    public jdkLocation: string;
    public pythonLocation: string;
    public goLocation: string;
    public jsServerInstalled: boolean = false;
    private store: IStore;

    constructor() {
        this.store = getStoreSafe();
        this.ensureLangServerExecFolderExists();

        this.jdkLocation = this.store.get("java-home-location", "");
        if (!this.jdkLocation) {
            this.findJdkLocation();
        }

        this.pythonLocation = this.store.get("python-location", "");
        if (!this.pythonLocation) {
            this.findPythonLocation();
        }

        this.goLocation = this.store.get("go-location", "");
        if (!this.goLocation) {
            this.findGoLocation();
        }

        this.installPythonLanguageServerIfNeeded();
        this.installJavascriptLanguageServerIfNeeded();

        if (!this.doesJavaJarExist()) {
            this.downloadJavaLangServer();
        }
    }

    public doesJavaJarExist(): boolean {
        return fs.existsSync(javaLangServerJarLocation);
    }

    public isPythonLanguageServerInstalled() {
        try {
            const stdout = cp.execFileSync(PIP_FILENAME, ["show", "python-lsp-server"], { cwd: this.pythonLocation, encoding: "utf-8" });
            const trimmedOutput = _.trim(stdout);
            return !trimmedOutput.includes("WARNING: Package(s) not found:");
        } catch (e) {
            return false;
        }
    }

    public installPythonLanguageServerIfNeeded() {
        if (!this.pythonLocation) {
            return;
        }
        try {
            const stdout = cp.execFileSync(PIP_FILENAME, ["show", "python-lsp-server"], { cwd: this.pythonLocation, encoding: "utf-8" });
            const trimmedOutput = _.trim(stdout);
            if (trimmedOutput.startsWith("WARNING: Package(s) not found:")) {
                LangServerConfigStore.installPythonLanguageServer(this.pythonLocation);
            }
        } catch (e) {
            const trimmedError = _.trim(e.message);
            console.error(trimmedError);
            if (trimmedError.includes("WARNING: Package(s) not found: python-lsp-server")) {
                LangServerConfigStore.installPythonLanguageServer(this.pythonLocation);
            }
        }
    }

    public installJavascriptLanguageServerIfNeeded() {
        try {
            const stdout = cp.execSync("npm list -g quick-lint-js", { encoding: "utf-8" });
            const trimmedOutput = _.trim(stdout);
            if (trimmedOutput.includes("(empty)")) {
                cp.execSync("npm install -g quick-lint-js");
                this.jsServerInstalled = true;
            } else {
                this.jsServerInstalled = true;
            }
        } catch (e) {
            const trimmedError = _.trim(e.message);
            logger.error(trimmedError);
        }
    }

    public setJdkLocation = (location: string) => {
        if (_.isEmpty(location) || _.isEmpty(location.trim())) {
            this.jdkLocation = "";
            this.store.set("java-home-location", "");
            return;
        }
        const javaVersion = getJavaVersion(location);
        if (javaVersion >= minimumJavaVersionRequired) {
            this.jdkLocation = location;
            this.store.set("java-home-location", this.jdkLocation);
            return;
        } else if (javaVersion) {
            throw new Error("The submitted JRE's version is lower than required JDK " + minimumJavaVersionRequired);
        } else {
            throw new Error("This location is an invalid JRE location");
        }
    }

    public setPythonLocation = (location: string) => {
        if (_.isEmpty(location) || _.isEmpty(location.trim())) {
            this.pythonLocation = "";
            this.store.set("python-location", "");
            return;
        }
        const pythonVersion = getPythonVersion(location);
        if (pythonVersion.major >= minimumPythonMajorVersion && pythonVersion.minor >= minimumPythonMinorVersion) {
            this.pythonLocation = location;
            this.store.set("python-location", this.pythonLocation);
            return;
        } else if (pythonVersion) {
            const errorMsg = `The submitted Python version is lower than: ${minimumPythonMajorVersion}.${minimumPythonMinorVersion}`;
            throw new Error(errorMsg);
        } else {
            throw new Error("This location is an invalid Python executable location");
        }
    }

    public setGoLocation = (location: string) => {
        if (_.isEmpty(location) || _.isEmpty(location.trim())) {
            this.goLocation = "";
            this.store.set("go-location", "");
            return;
        }
        const goVersion = getGoVersion(location);
        if (goVersion.major >= minimumGoMajorVersion && goVersion.minor >= minimumGoMinorVersion) {
            this.goLocation = location;
            this.store.set("go-location", this.pythonLocation);
            return;
        } else if (goVersion) {
            const errorMsg = `The submitted Go version is lower than: ${minimumGoMajorVersion}.${minimumGoMinorVersion}`;
            throw new Error(errorMsg);
        } else {
            throw new Error("This location is an invalid Go executable location");
        }
    }

    // Since we use fs.createWriteStream() in order to write the downloaded langserver file, it will not
    // not create the directories on its own.
    private ensureLangServerExecFolderExists = () => {
        if (!fs.existsSync(langServerExecFolder)) {
            fs.mkdirSync(langServerExecFolder, { recursive: true });
        }
    }

    // Java ls is about 2.1MB, so expecting a very quick download time
    private downloadJavaLangServer = async () => {
        this.isDownloadingJavaJar = true;

        logger.info("downloading Java LS from " + JavaLangServerDownloadURL);

        const file = fs.createWriteStream(javaLangServerJarLocation);
        https.get(JavaLangServerDownloadURL, (response) => {

            if (response.statusCode !== 200) {
                logger.error("Failed to download Java Langserver", response);
                return false;
            }

            response.pipe(file);
            file.on("finish", () => file.close());
            this.isDownloadingJavaJar = false;
            logger.info("Java - Langserver downloaded successfully");

            return true;
        });
    }

    private findJdkLocation = () => {
        const jreLocations = findJavaHomes();

        const foundJre = _.find(jreLocations, jre => jre.version >= minimumJavaVersionRequired);

        if (foundJre) {
            this.jdkLocation = foundJre.location;
            this.store.set("java-home-location", this.jdkLocation);
        }
    }

    private findPythonLocation = () => {
        const pythonLocations = findPythonLocation();

        const foundPython = _.find(pythonLocations, python =>
            python.majorVersion >= minimumPythonMajorVersion && python.minorVersion >= minimumPythonMinorVersion);

        if (foundPython) {
            this.pythonLocation = foundPython.location;
            this.store.set("python-location", this.pythonLocation);
        }
    }

    private findGoLocation = () => {
        const goLocations = findGoLocation();

        const foundGo = _.find(goLocations, go =>
            go.majorVersion >= minimumGoMajorVersion && go.minorVersion >= minimumGoMinorVersion);

        if (foundGo) {
            this.goLocation = foundGo.location;
            this.store.set("go-location", this.goLocation);
        }
    }
}

export const langServerConfigStore = new LangServerConfigStore();
