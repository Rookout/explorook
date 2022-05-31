import * as path from "path";
import * as rpc from "vscode-ws-jsonrpc";
import { javaLangServerJarLocation, langServerConfigStore } from "./configStore";
import { JAVA_FILENAME } from "./javaUtils";
import { launchLanguageServer } from "./langaugeServer";

export const launchJavaLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.enableJavaServer && langServerConfigStore.doesJavaJarExist() && langServerConfigStore.jdkLocation) {
        const args = ["-jar", javaLangServerJarLocation];

        const javaBin = path.join(langServerConfigStore.jdkLocation, "bin", JAVA_FILENAME);

        launchLanguageServer(socket, { LanguageName: "Java", langserverCommand: javaBin, langserverCommandArgs: args });
    }
};
