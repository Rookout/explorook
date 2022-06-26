import * as path from "path";
import * as rpc from "vscode-ws-jsonrpc";
import {SupportedServerLanguage} from "../common";
import {langServerConfigStore} from "./configStore";
import {GO_FILENAME} from "./goUtils";
import {launchLanguageServer} from "./langaugeServer";

export const launchGoLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enabledServers[SupportedServerLanguage.go] && langServerConfigStore.serverLocations[SupportedServerLanguage.go]) {
        const args = ["run", "golang.org/x/tools/gopls@v0.8.4"];
        const goExecutable = path.join(langServerConfigStore.serverLocations[SupportedServerLanguage.go], GO_FILENAME);
        launchLanguageServer(socket, {
            LanguageName: "Go",
            langserverCommand: goExecutable,
            langserverCommandArgs: args
        });
    }
};
