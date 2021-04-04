import { getLibraryFolder } from './../utils';
import { getStoreSafe, IStore } from './../explorook-store';
import { getLogger } from './../logger';
import { findJavaHomes, getJavaVersion } from './javaUtils';
import * as fs from 'fs'
import * as https from 'https'
import * as path from 'path'
import _ = require('lodash')

export const logger = getLogger('langServer')
export const JavaLangServerDownloadURL = 'https://get.rookout.com/Language-Servers/Rookout-Java-Language-Server.jar'
export const javaLangServerJarLocation = path.join(getLibraryFolder(), 'languageServers', 'java', 'Rookout-Java-Language-Server.jar')
export const minimumJavaVersionRequired = 13

class LangServerConfigStore {
    private store: IStore
    public isDownloadingJavaJar: boolean = false
    public jdkLocation: string

    constructor() {
        this.store = getStoreSafe()
        if (!this.doesJavaJarExist()) {
            this.downloadJavaLangServer()
        }

        this.jdkLocation = this.store.get('java-home-location', '')
        if (!this.jdkLocation) {
            this.findJdkLocation()
        }
    }

    public doesJavaJarExist(): boolean {
        try {
            return fs.existsSync(javaLangServerJarLocation)
        } catch (e) {
            logger.error(e)
            return false
        }
    }

    // Java ls is about 2.1MB, so expecting a very quick download time
    private downloadJavaLangServer = async () => {
        this.isDownloadingJavaJar = true

        logger.info('downloading Java LS from ' + JavaLangServerDownloadURL)

        const file = fs.createWriteStream(javaLangServerJarLocation);
        https.get(JavaLangServerDownloadURL, (response) => {

            if (response.statusCode !== 200){
                logger.error("Failed to download Java Langserver", response)
                return false
            }

            response.pipe(file);
            file.on('finish', () => file.close())
            this.isDownloadingJavaJar = false
            logger.info('Java - Langserver downloaded successfully')
            
            return true
        })
    }

    public setJdkLocation = (location: string) => {
        const javaVersion = getJavaVersion(location)
        if (javaVersion >= minimumJavaVersionRequired) {
            this.jdkLocation = location
            this.store.set('jdk-home-location', this.jdkLocation)
            return
        } else if (javaVersion){
            throw new Error("The submitted JRE's version is lower than required JDK " + minimumJavaVersionRequired)
        }
        else {
            throw new Error("This location is an invalid JRE location")
        }
    }

    private findJdkLocation = () => {
        const jreLocations = findJavaHomes();

        const foundJre = _.find(jreLocations, jre => jre.version >= minimumJavaVersionRequired)

        if (foundJre) {
            this.jdkLocation = foundJre.location
            this.store.set('java-home-location', this.jdkLocation)
        }
    }
}

export const langServerConfigStore = new LangServerConfigStore();