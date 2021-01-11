import { Repo, repStore } from './repoStore';
/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
//import * as path from 'path';
import * as rpc from "vscode-ws-jsonrpc";
import { RequestMessage } from "vscode-ws-jsonrpc";
import * as bridgeServer from "vscode-ws-jsonrpc/lib/server";
import * as lsp from "vscode-languageserver";
import _ from 'lodash'

console.log("Starting langserver!!!!")
//const pythonLangServer = server.createServerProcess('python', 'python3', ['-m', 'pyls', '-v']);

const definitionsIds = new Set();
interface CustomResultMessage extends RequestMessage {
    type: 'definition' | 'usages'
}

export const launchPythonLangaugeServer = (socket: rpc.IWebSocket) => {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    let repo: Repo = null;

    // start the language server as an external process
    const socketConnection = bridgeServer.createConnection(reader, writer, () => socket.dispose());
    const serverConnection = bridgeServer.createServerProcess('python','pyls');
    

    bridgeServer.forward(socketConnection, serverConnection, message => {
        if (rpc.isRequestMessage(message)) {
            if (message.method === lsp.InitializeRequest.type.method) {
                const initializeParams = message.params as lsp.InitializeParams;
                initializeParams.processId = process.pid;
                
                const repoId = initializeParams.workspaceFolders[0].uri.replace('file:///', '')
                repo = repStore.getRepoById(repoId)
                initializeParams.rootUri = initializeParams.workspaceFolders[0].uri = initializeParams.workspaceFolders[0].name = 'file://' + repo.fullpath
                initializeParams.rootPath = repo.fullpath
            }

            if (message.method === lsp.DefinitionRequest.type.method && message.id) {
                definitionsIds.add(message.id)
                const fileRelativePath = message.params.textDocument.uri.replace('file://', '')
                    message.params.textDocument.uri = 'file://' + repo.fullpath + fileRelativePath
            }

            if (message.method === lsp.FoldingRangeRequest.type.method ||
                message.method === lsp.CodeLensRequest.type.method) {
                    const fileRelativePath = message.params.textDocument.uri.replace('file://', '')
                    message.params.textDocument.uri = 'file://' + repo.fullpath + fileRelativePath
                }
        }

        if (rpc.isNotificationMessage(message)) {
            if (message.method === lsp.DidOpenTextDocumentNotification.type.method || 
                message.method === lsp.DidChangeTextDocumentNotification.type.method) {
                
                    const fileRelativePath = message.params.textDocument.uri.replace('file://', '')
                    message.params.textDocument.uri = 'file://' + repo.fullpath + fileRelativePath
            }
        }

        if (rpc.isResponseMessage(message)) {
            _.map(message.result, lsp.DefinitionRequest)
            if (definitionsIds.has(message.id)) {
                definitionsIds.delete(message.id)
                const newResponseMessage = message as CustomResultMessage
                newResponseMessage.type = 'definition'
                
                newResponseMessage.

                console.log(newResponseMessage)
                return newResponseMessage
            }
        }

        console.log(message)
            
        return message;
    });
}