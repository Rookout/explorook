import * as rpc from "vscode-ws-jsonrpc";
import {SupportedServerLanguage} from "../common";
import {langServerConfigStore, typescriptLangServerExecLocation} from "./configStore";
import {launchLanguageServer} from "./languageServer";

export const launchTypescriptLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enabledServers[SupportedServerLanguage.typescript]) {
        const args = ["--stdio"];
        launchLanguageServer(socket, {LanguageName: "Typescript", langserverCommand: typescriptLangServerExecLocation, langserverCommandArgs: args});
    }
};
