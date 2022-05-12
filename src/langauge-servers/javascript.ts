import * as rpc from "vscode-ws-jsonrpc";
import {langServerConfigStore} from "./configStore";
import {launchLanguageServer} from "./langaugeServer";

export const launchJavascriptLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.jsServerInstalled) {
        const args = ["--lsp-server"];
        launchLanguageServer(socket, {LanguageName: "Javascript", langserverCommand: "quick-lint-js", langserverCommandArgs: args});
    }
};
