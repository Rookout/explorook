import * as rpc from "vscode-ws-jsonrpc";
import {langServerConfigStore} from "./configStore";
import {launchLanguageServer} from "./langaugeServer";

export const launchTypescriptLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.tsServerInstalled) {
        const args = ["--stdio"];
        launchLanguageServer(socket, {LanguageName: "Typescript", langserverCommand: "typescript-language-server", langserverCommandArgs: args});
    }
};
