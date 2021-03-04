import { launchLangaugeServer } from './langaugeServer';
import * as rpc from "vscode-ws-jsonrpc";

export const launchPythonLangaugeServer = (socket: rpc.IWebSocket) => {
    launchLangaugeServer(socket, { LangaugeName: 'Python', langserverCommand: 'python', langserverCommandArgs: ['pyls'] })
}
