import * as path from "path";
import * as rpc from "vscode-ws-jsonrpc";
import {SupportedServerLanguage} from "../common";
import { langServerConfigStore } from "./configStore";
import { launchLanguageServer } from "./languageServer";
import { PYTHON_EXEC_FILENAME } from "./pythonUtils";

export const launchPythonLanguageServer = (socket: rpc.IWebSocket) => {
    if (
        langServerConfigStore.enabledServers[SupportedServerLanguage.python] &&
        langServerConfigStore.serverLocations[SupportedServerLanguage.python]
    ) {
        const pythonExecutable = path.join(langServerConfigStore.serverLocations[SupportedServerLanguage.python], PYTHON_EXEC_FILENAME);
        const args = ["-m", "pylsp"];
        launchLanguageServer(socket, { LanguageName: "Python", langserverCommand: pythonExecutable, langserverCommandArgs: args });
    }
};
