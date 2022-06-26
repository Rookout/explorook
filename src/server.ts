import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer } from "apollo-server-express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import { readFileSync } from "fs";
import { applyMiddleware } from "graphql-middleware";
import * as http from "http";
import * as net from "net";
import { join } from "path";
import * as url from "url";
import * as rpc from "vscode-ws-jsonrpc";
import { Server } from "ws";
import * as WebSocket from "ws";
import { resolvers } from "./api";
import { notify } from "./exceptionManager";
import { launchGoLanguageServer } from "./langauge-servers/go";
import { launchJavaLanguageServer } from "./langauge-servers/java";
import { launchPythonLanguageServer } from "./langauge-servers/python";
import {launchTypescriptLanguageServer} from "./langauge-servers/typescript";
import {
  authenticateController,
  authenticateControllerV2,
  authorizationMiddleware,
  configureFirstTimeSettings,
  filterDirTraversal,
  logMiddleware,
  resolveRepoFromId,
} from "./middlewares";

export type onAddRepoRequestHandler = (fullpath: string, id?: string) => Promise<boolean>;

export type onRemoveRepoRequestHandler = (repId: string) => Promise<boolean>;

export type loadingStateUpdateHandler = (isLoading: boolean, repo: string) => void;

export interface StartOptions {
  accessToken?: string;
  userId?: string;
  userSite?: string;
  port?: number;
  firstTimeLaunch?: boolean;
  onAddRepoRequest?: onAddRepoRequestHandler;
  onRemoveRepoRequest?: onRemoveRepoRequestHandler;
  useTokenAuthorization?: boolean;
  updateGitLoadingState?: loadingStateUpdateHandler;
}

const defaultOptions: StartOptions = {
  port: 44512
};

const corsDomainWhitelist = [
  /^https:\/\/.*\.rookout.com$/,
  /^https:\/\/.*\.rookout-dev.com$/,
  "https://localhost:8080"
];

const corsOptions = {
  origin: corsDomainWhitelist
};

export const start = async (options: StartOptions) => {
  const startedAt = new Date();
  const settings = { ...options, ...defaultOptions };
  const typeDefs = readFileSync(join(__dirname, `../graphql/schema.graphql`), { encoding: "utf8" });

  const reconfigure = (id: string, site: string) => {
    settings.userId = id;
    settings.userSite = site;
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const schemaWithMiddleware = applyMiddleware(schema, logMiddleware, resolveRepoFromId, filterDirTraversal);

  const app = express();
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer({
    context: () => ({
      onAddRepoRequest: settings.onAddRepoRequest,
      onRemoveRepoRequest: settings.onRemoveRepoRequest,
      updateGitLoadingState: settings.updateGitLoadingState
    }),
    schema: schemaWithMiddleware,
    introspection: true,
    formatError: (errors: any) => {
      if (errors && !/repository\s\"(.*)?\"\snot\sfound/.test(errors.toString())) {
        notify(`Explorook returned graphql errors to client: ${errors}`, { metaData: { errors } });
      }
      return errors;
    },
    cache: "bounded"
  });

  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.post("/configure", configureFirstTimeSettings(settings.firstTimeLaunch, startedAt, reconfigure));
  // indicates that the authorization v2 feature is available (automatic)
  app.get("/authorize/v2", (req, res) => res.status(200).send("AVAILABLE"));
  app.post("/authorize/v2", authenticateControllerV2(settings));
  // indicates that the authorization feature is available
  app.get("/authorize/", (req, res) => res.status(200).send("AVAILABLE"));
  app.post("/authorize/:env", authenticateController(settings.accessToken, settings.userId));

  if (options.useTokenAuthorization) {
    app.use(authorizationMiddleware(settings.accessToken));
  }

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/" });
  httpServer.listen(settings.port);


  startWebSocketServer(httpServer);

  console.log(`Server is running on http://localhost:${settings.port}`);
};

const startWebSocketServer = (httpServer: net.Server) => {
  const wss = new Server({
    noServer: true,
    perMessageDeflate: false
  });

  // expecting path /langServer/<lang_name>, e.g /langServer/java
  httpServer.on("upgrade", (request: http.IncomingMessage, socket: net.Socket, head: Buffer, ...args) => {
    const pathname = request.url ? url.parse(request.url).pathname : undefined;

    wss.handleUpgrade(request, socket, head, webSocket => {
      if (!pathname.startsWith("/langServer/")) {
        return closeWebSocket(webSocket, "Endpoint isnt supported");
      }

      const langName = pathname.replace("/langServer/", "");
      const launchLangServer = getLaunchLanguageServerFuncByLangName(langName);

      if (!launchLangServer) {
        return closeWebSocket(webSocket, "Bad Language / Language isnt supported");
      }

      const rpcSocket: rpc.IWebSocket = {
        send: content => webSocket.send(content, error => {
          if (error) {
            throw error;
          }
        }),
        onMessage: cb => webSocket.on("message", cb),
        onError: cb => webSocket.on("error", cb),
        onClose: cb => webSocket.on("close", cb),
        dispose: () => webSocket.close()
      };
      // launch the server when the web socket is opened
      if (webSocket.readyState === webSocket.OPEN) {
        launchLangServer(rpcSocket);
      } else {
        webSocket.on("open", () => launchLangServer(rpcSocket));
      }
    });
  });
};

const closeWebSocket = (ws: WebSocket, error: string) => {
  ws.send(error);
  ws.close();
};

const getLaunchLanguageServerFuncByLangName = (langName: string): ((socket: rpc.IWebSocket) => void) => {
  switch (langName.toLowerCase()) {
    case "java":
      return launchJavaLanguageServer;
    case "python":
      return launchPythonLanguageServer;
    case "go":
      return launchGoLanguageServer;
    case "typescript":
      return launchTypescriptLanguageServer;
  }
};
