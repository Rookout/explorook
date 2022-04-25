import * as rpc from "@codingame/monaco-jsonrpc";
import * as path from "path";
import { configLocation, javaLangServerJarLocation, langServerConfigStore } from "./configStore";
import { JAVA_FILENAME } from "./javaUtils";
import { launchLangaugeServer } from "./langaugeServer";

export const launchJavaLangaugeServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.doesJavaJarExist() && langServerConfigStore.jdkLocation) {
        const args = ["-Xmx1G", "-jar", javaLangServerJarLocation, "-configuration", configLocation];

        const javaBin = path.join(langServerConfigStore.jdkLocation, "bin", JAVA_FILENAME);

        launchLangaugeServer(socket, { LangaugeName: "Java", langserverCommand: javaBin, langserverCommandArgs: args });
    }
};
