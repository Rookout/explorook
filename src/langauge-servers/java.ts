import { JAVA_FILENAME } from './javaUtils';
import { langServerConfigStore, javaLangServerJarLocation } from './configStore';
import { launchLangaugeServer } from './langaugeServer';
import * as rpc from "vscode-ws-jsonrpc";
import * as path from 'path'

export const launchJavaLangaugeServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.doesJavaJarExist() && langServerConfigStore.jdkLocation) {
        const args = ['-jar', javaLangServerJarLocation]

        const javaBin = path.join(langServerConfigStore.jdkLocation, 'bin', JAVA_FILENAME)
    
        launchLangaugeServer(socket, { LangaugeName: 'Java', langserverCommand: javaBin, langserverCommandArgs: args })
    }
}
