import * as path from "path";
import * as rpc from "vscode-ws-jsonrpc";
import { langServerConfigStore } from "./configStore";
import { launchLanguageServer } from "./langaugeServer";
import { PYTHON_FILENAME } from "./pythonUtils";

export const launchPythonLanguageServer = (socket: rpc.IWebSocket) => {
    if (
        langServerConfigStore.enabledServers["python"] &&
        langServerConfigStore.serverLocations["python"]
    ) {
        const pythonExecutable = path.join(langServerConfigStore.serverLocations["python"], PYTHON_FILENAME);
        const args = ["-m", "pylsp"];
        launchLanguageServer(socket, { LanguageName: "Python", langserverCommand: pythonExecutable, langserverCommandArgs: args });
    }
};
