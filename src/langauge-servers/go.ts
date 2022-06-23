import * as rpc from "vscode-ws-jsonrpc";
import {langServerConfigStore} from "./configStore";
import {launchLanguageServer} from "./langaugeServer";

export const launchGoLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enabledServers["go"] && langServerConfigStore.serverLocations["go"]) {
        const args = ["run", "golang.org/x/tools/gopls@v0.8.4"];
        launchLanguageServer(socket, {
            LanguageName: "Go",
            langserverCommand: langServerConfigStore.serverLocations["go"],
            langserverCommandArgs: args
        });
    }
};
