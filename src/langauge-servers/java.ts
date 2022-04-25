import * as rpc from "@codingame/monaco-jsonrpc";
import * as path from "path";
import { WORKSPACE } from "../git";
import { configLocation, javaLangServerJarLocation, langServerConfigStore } from "./configStore";
import { JAVA_FILENAME } from "./javaUtils";
import { launchLangaugeServer } from "./langaugeServer";

export const launchJavaLangaugeServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.doesJavaJarExist() && langServerConfigStore.jdkLocation) {
        const args = [
            "-Declipse.application=org.eclipse.jdt.ls.core.id1",
            "-Dosgi.bundles.defaultStartLevel=4",
            "-Declipse.product=org.eclipse.jdt.ls.core.product",
            "-Dlog.level=ALL",
            "-noverify",
            "-Xmx1G",
            "--add-modules=ALL-SYSTEM",
            "--add-opens",
            "java.base/java.util=ALL-UNNAMED",
            "--add-opens",
            "java.base/java.lang=ALL-UNNAMED",
            "-jar",
            javaLangServerJarLocation,
            "-configuration",
            configLocation,
            "-data",
            WORKSPACE
        ];

        const javaBin = path.join(langServerConfigStore.jdkLocation, "bin", JAVA_FILENAME);

        launchLangaugeServer(socket, { LangaugeName: "Java", langserverCommand: javaBin, langserverCommandArgs: args });
    }
};
