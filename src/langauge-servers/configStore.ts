import { getLogger } from './../logger';
import { findJavaHomes } from './javaUtils';
import * as fs from 'fs'
import * as https from 'https'
import Store = require("electron-store");
import _ = require('lodash')

export const javaLangServerJarLocation = 'Rookout-Java-Language-Server.jar'
export const minimumJavaRequired = 13

class LangServerConfigStore {
    private store: Store
    public isDownloadingJavaJar: boolean = false
    public jdkLocation: string

    constructor() {
        this.store = new Store({name: "lang-servers-config"})
        if (!this.doesJavaJarExist()) {
            this.downloadJavaLangServer()
        }

        this.jdkLocation = this.store.get('jdk-bin-location', '')
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

    public findJdkLocation = (location?: string) => {
        if (location) {
            this.jdkLocation = location
            this.store.set('jdk-bin-location', this.jdkLocation)
            return
        }

        debugger
        const jreLocations = findJavaHomes();

        const foundJre = _.find(jreLocations, jre => jre.version >= minimumJavaRequired)

        if (foundJre) {
            this.jdkLocation = foundJre.location
            this.store.set('jdk-bin-location', this.jdkLocation)
        }
    }
}

export const langServerConfigStore = new LangServerConfigStore();