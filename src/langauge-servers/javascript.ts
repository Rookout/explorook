import * as rpc from "vscode-ws-jsonrpc";
import {javascriptLangServerExecLocation, langServerConfigStore} from "./configStore";
import {launchLanguageServer} from "./langaugeServer";

export const launchJavascriptLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enableJavascriptServer && langServerConfigStore.jsServerInstalled) {
        const args = ["--lsp-server"];
        launchLanguageServer(socket, {LanguageName: "Javascript", langserverCommand: javascriptLangServerExecLocation, langserverCommandArgs: args});
    }
};
