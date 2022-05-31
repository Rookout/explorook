import * as rpc from "vscode-ws-jsonrpc";
import {langServerConfigStore, typescriptLangServerExecLocation} from "./configStore";
import {launchLanguageServer} from "./langaugeServer";

export const launchTypescriptLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enableTypescriptServer && langServerConfigStore.tsServerInstalled) {
        const args = ["--stdio"];
        launchLanguageServer(socket, {LanguageName: "Typescript", langserverCommand: typescriptLangServerExecLocation, langserverCommandArgs: args});
    }
};
