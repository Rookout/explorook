import * as fs from "fs";
import _ = require("lodash");
import fetch from "node-fetch";
import * as path from "path";
import { getStoreSafe, IStore } from "../explorook-store";
import { getLogger } from "../logger";
import { getLibraryFolder } from "../utils";
import { findJavaHomes, getJavaVersion } from "./javaUtils";

export const logger = getLogger("langServer");
const langServerExecFolder = path.join(getLibraryFolder(), "languageServers");

const JavaLangServerDownloadURL = "https://get.rookout.com/Language-Servers/Rookout-Java-Language-Server.jar";
export const javaLangServerJarLocation = path.join(langServerExecFolder, "Rookout-Java-Language-Server.jar");
export const minimumJavaVersionRequired = 13;

class LangServerConfigStore {
    public isDownloadingJavaJar: boolean = false;
    public jdkLocation: string;
    private store: IStore;

    constructor() {
        this.store = getStoreSafe();
        this.ensureLangServerExecFolderExists();

        if (!this.doesJavaJarExist()) {
            this.downloadJavaLangServer();
        }

        this.jdkLocation = this.store.get("java-home-location", "");
        if (!this.jdkLocation) {
            this.findJdkLocation();
        }
    }

    public doesJavaJarExist(): boolean {
        return fs.existsSync(javaLangServerJarLocation);
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

        logger.info(`downloading Java LS from ${JavaLangServerDownloadURL}`);

        const file = fs.createWriteStream(javaLangServerJarLocation);
        try {
            const response = await fetch(JavaLangServerDownloadURL);
            if (response.status !== 200) {
                logger.error("Failed to download Java Langserver", response);
                return false;
            }
            await new Promise((resolve, reject) => {
                response.body.pipe(file);
                response.body.on("error", reject);
                file.on("finish", () => {
                    logger.info("Java - Langserver downloaded successfully");
                    resolve();
                });
            });
            return true;
        } catch (err) {
            logger.error("Failed to download Java Langserver", err);
            return false;
        } finally {
            this.isDownloadingJavaJar = false;
            file.close();
        }
    }

    public setJdkLocation = (location: string) => {
        const javaVersion = getJavaVersion(location);
        if (javaVersion >= minimumJavaVersionRequired) {
            this.jdkLocation = location;
            this.store.set("jdk-home-location", this.jdkLocation);
            return;
        } else if (javaVersion) {
            throw new Error("The submitted JRE's version is lower than required JDK " + minimumJavaVersionRequired);
        } else {
            throw new Error("This location is an invalid JRE location");
        }
    }

    private findJdkLocation = () => {
        const jreLocations = findJavaHomes();

        const foundJre = _.find(jreLocations, jre => jre.version >= minimumJavaVersionRequired);

        if (foundJre) {
            this.jdkLocation = foundJre.location;
            this.store.set("java-home-location", this.jdkLocation);
        }
    }
}

export const langServerConfigStore = new LangServerConfigStore();
