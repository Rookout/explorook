import { langServerConfigStore, javaLangServerJarLocation } from './configStore';
import { launchLangaugeServer } from './langaugeServer';
import * as rpc from "vscode-ws-jsonrpc";

export const launchJavaLangaugeServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.doesJavaJarExist() && langServerConfigStore.jdkLocation) {
        const args = ['-jar', javaLangServerJarLocation]
    
        launchLangaugeServer(socket, { LangaugeName: 'Java', langserverCommand: langServerConfigStore.jdkLocation, langserverCommandArgs: args })
    }
}
