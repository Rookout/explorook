import * as lsp from "vscode-languageserver";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as rpc from "vscode-ws-jsonrpc";
import * as bridgeServer from "vscode-ws-jsonrpc/lib/server";
import { repStore } from "../repoStore";
import { syncGitRepository } from "./git-handler";
import { isWindows } from "./javaUtils";
export interface LangServerStartConfig {
    LanguageName: string;
    langserverCommand: string;
    langserverCommandArgs: string[];
}

// The init request from the frontend indicates on which repo should the langserver run:
// the uri is sent like this: "file:///<repo_id>", repo_id is the id in repoStore.
// the repo's fullPath is the one sent to the langserver itself.

// Every other request to the langserver sends which file is it asking about,
// the file's uri is sent like this "file://<relative_path_to_file>".
// But the langserver uses fullPath so we use the repoStore to get it.
export const launchLanguageServer = (socket: rpc.IWebSocket, startConfig: LangServerStartConfig) => {

    // Since we can't know which response is a response to definition,
    // we save up all the messages ids for definitions requests.
    // Since in lsp, a request message and its response has the same message id.
    const definitionsIds = new Set();

    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    let repoFullpath: string = null;

    const langserverProcessName = "Rookout-" + startConfig.LanguageName + "-LangServer";
    const serverConnection = bridgeServer.createServerProcess(
        langserverProcessName, startConfig.langserverCommand, startConfig.langserverCommandArgs);
    const socketConnection = bridgeServer.createConnection(reader, writer, () => { socket.dispose(); serverConnection.dispose(); });


    bridgeServer.forward(socketConnection, serverConnection, async message => {
        if (rpc.isRequestMessage(message)) {
            await handleRequestMessage(message);
        }

        if (rpc.isNotificationMessage(message)) {
            await handleNotificationMessage(message);
        }

        if (rpc.isResponseMessage(message)) {
            await handleResponseMessage(message);
        }

        console.log(message);

        return message;
    });

    // Request message are client -> server messages where the server needs to response to them
    const handleRequestMessage = async (message: rpc.RequestMessage) => {
        if (message.method === lsp.InitializeRequest.type.method) {
            const initializeParams = message.params as lsp.InitializeParams;
            initializeParams.processId = process.pid;

            // init params are costum params we use, in order to pass git repo creds when users want to use langserver with remote git repository.
            // when init params aren't sent from the frontend, it means they use local files.
            const initParams: LangServerInitParams = initializeParams.initializationOptions;

            if (initParams) {
              repoFullpath = await syncGitRepository(initParams);
            } else {
              const repoId = initializeParams.workspaceFolders[0].uri.replace("file:///", "");
              const repo = repStore.getRepoById(repoId.replace("file:///", ""));
              repoFullpath = repo.fullpath;
            }

            repoFullpath = encodeURI(repoFullpath);
            if (isWindows) {
                repoFullpath = repoFullpath.replace("%5C", "\\");
            }

            // rootUri and rootPath are considered deprecated by the vscode's lsp and they are the only way to indicate
            // to the language server the workspace folder
            const rootUri = `file://${repoFullpath}`;
            initializeParams.rootUri = initializeParams.workspaceFolders[0].uri = initializeParams.workspaceFolders[0].name = rootUri;
            initializeParams.rootPath = repoFullpath;
        } else if (message?.params?.textDocument?.uri) {
            message.params.textDocument.uri = getFileFullPath(message.params.textDocument.uri, repoFullpath);
        }

        // Mark the go-to-definition requets in order to catch the responses to them
        if (message.method === lsp.DefinitionRequest.type.method && message.id) {
            definitionsIds.add(message.id);
        }
    };

    // Notification message are client -> server messages where the server DOESNT needs to response to them
    const handleNotificationMessage = (message: rpc.NotificationMessage) => {
        if (message.method === lsp.DidOpenTextDocumentNotification.type.method ||
            message.method === lsp.DidCloseTextDocumentNotification.type.method) {

            message.params.textDocument.uri = getFileFullPath(message.params.textDocument.uri, repoFullpath);
        }

        // The frontend might send didChange requests which are wrong because of monaco-in-react behavior, so we ignore this kind of request
        if (message.method === lsp.DidChangeTextDocumentNotification.type.method) {
            message.method = "rookout-dummy";
        }
    };

    // Reponse message are server -> client messages
    const handleResponseMessage = (message: rpc.ResponseMessage) => {
        if (definitionsIds.has(message.id)) {
            definitionsIds.delete(message.id);

            if (message?.result) {
                message.result = fixDefinitionResultsPath(message.result as any[], repoFullpath);
            }

            return message;
        }

        // disabling capabillities so the client wont send unsupported abilities
        if ((message?.result as any)?.capabilities) {
            (message.result as any).capabilities.hoverProvider = false;
            (message.result as any).capabilities.referencesProvider = false;
            (message.result as any).capabilities.codeLensProvider = false;
        }
    };
};


// The language server returns the full path of the result,
// e.g "file:///Users/gilad/dev/python/functions.py" or "file://C://Java/my-project/Functions.java"
// The repo's fullPath is removed before it is sent to the frontend,
// e.g, if the repo path is "/Users/gilad/dev/python/" (python example), it will be changed to "file:///functions.py"
const fixDefinitionResultsPath = (definitionResults: any[], repoFullPath: string): any[] => {
    return definitionResults.map(result => {
        result.uri = result.uri.replace(repoFullPath, "");
        return result;
    });
};

const getFileFullPath = (relativePath: string, repoFullpath: string): string => {
    return relativePath.replace("file://", "file://" + repoFullpath);
};
