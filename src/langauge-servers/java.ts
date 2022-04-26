import * as rpc from "@codingame/monaco-jsonrpc";
import * as path from "path";
import { WORKSPACE } from "../git";
import { configLocation, javaLangServerJarLocation, langServerConfigStore } from "./configStore";
import { JAVA_FILENAME } from "./javaUtils";
import { launchLangaugeServer } from "./langaugeServer";

export const launchJavaLangaugeServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.doesJavaJarExist() && langServerConfigStore.jdkLocation) {
        const args = ["-Xmx512m",
            "-Xms512m",
            "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=,quiet=y",
            "-jar", javaLangServerJarLocation, "-configuration", configLocation];

        const javaBin = path.join(langServerConfigStore.jdkLocation, "bin", JAVA_FILENAME);

        launchLangaugeServer(socket, { LangaugeName: "Java", langserverCommand: javaBin, langserverCommandArgs: args });
    }
};
