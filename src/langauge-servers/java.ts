import * as path from "path";
import * as rpc from "vscode-ws-jsonrpc";
import {SupportedServerLanguage} from "../common";
import { javaLangServerJarLocation, langServerConfigStore } from "./configStore";
import { JAVA_FILENAME } from "./javaUtils";
import { launchLanguageServer } from "./langaugeServer";

export const launchJavaLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enabledServers[SupportedServerLanguage.java] && langServerConfigStore.serverLocations[SupportedServerLanguage.java]) {
        const args = ["-jar", javaLangServerJarLocation];

        const javaBin = path.join(langServerConfigStore.serverLocations[SupportedServerLanguage.java], "bin", JAVA_FILENAME);

        launchLanguageServer(socket, { LanguageName: "Java", langserverCommand: javaBin, langserverCommandArgs: args });
    }
};
