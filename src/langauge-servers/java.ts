import * as path from "path";
import * as rpc from "vscode-ws-jsonrpc";
import { javaLangServerJarLocation, langServerConfigStore } from "./configStore";
import { JAVA_FILENAME } from "./javaUtils";
import { launchLanguageServer } from "./langaugeServer";

export const launchJavaLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enabledServers["java"] && langServerConfigStore.serverLocations["java"]) {
        const args = ["-jar", javaLangServerJarLocation];

        const javaBin = path.join(langServerConfigStore.serverLocations["java"], "bin", JAVA_FILENAME);

        launchLanguageServer(socket, { LanguageName: "Java", langserverCommand: javaBin, langserverCommandArgs: args });
    }
};
