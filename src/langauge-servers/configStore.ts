import * as fs from "fs";
import * as https from "https";
import _ = require("lodash");
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
}

export const langServerConfigStore = new LangServerConfigStore();
