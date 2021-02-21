import { getLogger } from './../logger';
import { findJavaHomes, getJavaVersion, JAVA_FILENAME } from './javaUtils';
import * as fs from 'fs'
import * as https from 'https'
import * as path from 'path'
import Store = require("electron-store");
import _ = require('lodash')

export const javaLangServerJarLocation = 'Rookout-Java-Language-Server.jar'
export const minimumJavaVersionRequired = 13

class LangServerConfigStore {
    private store: Store
    public isDownloadingJavaJar: boolean = false
    public jdkLocation: string

    constructor() {
        this.store = new Store({name: "lang-servers-config"})
        if (!this.doesJavaJarExist()) {
            this.downloadJavaLangServer()
        }

        this.jdkLocation = this.store.get('java-home-location', '')
        if (!this.jdkLocation) {
            this.findJdkLocation()
        }
    }

    public doesJavaJarExist(): boolean {
        return fs.existsSync(javaLangServerJarLocation)
    }

    // Java ls is about 2.1MB, so expecting a very quick download time
    private downloadJavaLangServer = async () => {
        this.isDownloadingJavaJar = true

        const file = fs.createWriteStream(javaLangServerJarLocation);
        https.get('https://get.rookout.com/Language-Servers/Rookout-Java-Language-Server.jar', (response) => {

            if (response.statusCode !== 200){
                getLogger('langserver').error(JSON.stringify(response))
                return false
            }

            response.pipe(file);
            file.on('finish', () => file.close())
            this.isDownloadingJavaJar = false
            getLogger('langserver').debug('Java - Langserver downloaded successfully')
            
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