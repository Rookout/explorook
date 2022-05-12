import * as path from "path";
import * as rpc from "vscode-ws-jsonrpc";
import { langServerConfigStore } from "./configStore";
import { launchLanguageServer } from "./langaugeServer";
import { PYTHON_FILENAME } from "./pythonUtils";

export const launchPythonLanguageServer = (socket: rpc.IWebSocket) => {
    if (langServerConfigStore.isPythonLanguageServerInstalled() && langServerConfigStore.pythonLocation) {
        const pythonExecutable = path.join(langServerConfigStore.pythonLocation, PYTHON_FILENAME);
        const args = ["-m", "pylsp"];
        launchLanguageServer(socket, { LanguageName: "Python", langserverCommand: pythonExecutable, langserverCommandArgs: args });
    }
};
