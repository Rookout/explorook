import { launchLangaugeServer } from './langaugeServer';
import * as rpc from "vscode-ws-jsonrpc";

export const launchJavaLangaugeServer = (socket: rpc.IWebSocket) => {
    const javaLocation = '/Library/Java/JavaVirtualMachines/adoptopenjdk-13.jdk/Contents/Home/bin/java'

    const args = ['-jar', '/Users/gilad/dev/explorook/java-ls.jar']
    
    launchLangaugeServer(socket, { LangaugeName: 'Java', langserverCommand: javaLocation, langserverCommandArgs: args })
}
