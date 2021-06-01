import { ApolloServer } from "apollo-server-express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import { readFileSync } from "fs";
import { applyMiddleware } from "graphql-middleware";
import { makeExecutableSchema } from "graphql-tools";
import * as http from "http";
import { join } from "path";
import * as url from "url";
import * as rpc from "vscode-ws-jsonrpc";
import * as WebSocket from "websocket";
import { resolvers } from "./api";
import { notify } from "./exceptionManager";
import { launchJavaLangaugeServer } from "./langauge-servers/java";
import {
  authenticateController,
  authenticateControllerV2,
  authorizationMiddleware,
  configureFirstTimeSettings,
  filterDirTraversal,
  logMiddleware,
  resolveRepoFromId,
  validateBitbucketServerHttps
} from "./middlewares";

const WebSocketServer = require("websocket").server;

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

export const start = (options: StartOptions) => {
  const startedAt = new Date();
  const settings = { ...options, ...defaultOptions };
  const typeDefs = readFileSync(join(__dirname, `../graphql/schema.graphql`), { encoding: "utf8" });

  const reconfigure = (id: string, site: string) => {
    settings.userId = id;
    settings.userSite = site;
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const schemaWithMiddleware = applyMiddleware(schema, logMiddleware, resolveRepoFromId, filterDirTraversal, validateBitbucketServerHttps);

  const app = express();
  const apolloServer = new ApolloServer({
    context: () => ({
      onAddRepoRequest: settings.onAddRepoRequest,
      onRemoveRepoRequest: settings.onRemoveRepoRequest,
      updateGitLoadingState: settings.updateGitLoadingState
    }),
    schema: schemaWithMiddleware,
    subscriptions: false,
    introspection: true,
    formatError: (errors: any) => {
      if (errors && !/repository\s\"(.*)?\"\snot\sfound/.test(errors.toString())) {
        notify(`Explorook returned graphql errors to client: ${errors}`, { metaData: { errors } });
      }
      return errors;
    }
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

  apolloServer.applyMiddleware({ app, path: "/" });

  const httpServer = http.createServer(app);
  httpServer.listen(settings.port);

  startWebSocketServer(httpServer);

  console.log(`Server is running on http://localhost:${settings.port}`);
};

const startWebSocketServer = (httpServer: http.Server) => {
  const wss = new WebSocketServer({
    httpServer,
    autoAcceptConnections: false
  });

  wss.on("request", (request: WebSocket.request) => {
    const pathname = request.resourceURL.href ? url.parse(request.resourceURL.href).pathname : undefined;
    if (!pathname.startsWith("/langServer/")) {
      request.reject();
      return;
    }

    const connection = request.accept(null, request.origin);
    const langName = pathname.replace("/langServer/", "");
    const launchLangServer = getLaunchLanguangeServerFuncByLangName(langName);

    if (!launchLangServer) {
      return closeWebSocket(connection, "Bad Language / Language isnt supported");
    }

    const rpcSocket: rpc.IWebSocket = {
      send: content => connection.send(content, error => {
        if (error) {
          throw error;
        }
      }),
      onMessage: cb => connection.on("message", cb),
      onError: cb => connection.on("error", cb),
      onClose: cb => connection.on("close", cb),
      dispose: () => connection.close()
    };

    if (connection.connected) {
      launchLangServer(rpcSocket);
    }
  });
};

const closeWebSocket = (ws: WebSocket.connection, error: string) => {
  ws.send(error);
  ws.close();
};

const getLaunchLanguangeServerFuncByLangName = (langName: string): ((socket: rpc.IWebSocket) => void) => {
  switch (langName.toLowerCase()) {
    case "java":
      return launchJavaLangaugeServer;
    // Python exists but should not be avilable in this version yet
  }
};
