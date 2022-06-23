import * as rpc from "vscode-ws-jsonrpc";
import {SupportedServerLanguage} from "../common";
import {langServerConfigStore} from "./configStore";
import {launchLanguageServer} from "./langaugeServer";

export const launchGoLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enabledServers[SupportedServerLanguage.go] && langServerConfigStore.serverLocations[SupportedServerLanguage.go]) {
        const args = ["run", "golang.org/x/tools/gopls@v0.8.4"];
        launchLanguageServer(socket, {
            LanguageName: "Go",
            langserverCommand: langServerConfigStore.serverLocations[SupportedServerLanguage.go],
            langserverCommandArgs: args
        });
    }
};
