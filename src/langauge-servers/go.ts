import * as rpc from "vscode-ws-jsonrpc";
import {langServerConfigStore} from "./configStore";
import {launchLanguageServer} from "./langaugeServer";

export const launchGoLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enableGoServer && langServerConfigStore.goLocation) {
        const args = ["run", "golang.org/x/tools/gopls@v0.8.3"];
        launchLanguageServer(socket, {LanguageName: "Go", langserverCommand: langServerConfigStore.goLocation, langserverCommandArgs: args});
    }
};
