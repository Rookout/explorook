import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginLandingPageDisabled } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import * as bodyParser from "body-parser";
import * as express from "express";
import { readFileSync } from "fs";
import { applyMiddleware } from "graphql-middleware";
import * as http from "http";
import { join } from "path";
import { resolvers } from "./api";
import {getCorsMiddleware} from "./cors";
import { notify } from "./exceptionManager";
import {
  filterDirTraversal,
  logMiddleware,
  resolveRepoFromId,
} from "./middlewares";

export type onAddRepoRequestHandler = (fullpath: string, id?: string) => Promise<boolean>;

export type onRemoveRepoRequestHandler = (repId: string) => Promise<boolean>;

export interface StartOptions {
  userId?: string;
  port?: number;
  firstTimeLaunch?: boolean;
  onAddRepoRequest?: onAddRepoRequestHandler;
  onRemoveRepoRequest?: onRemoveRepoRequestHandler;
}

const defaultOptions: StartOptions = {
  port: 44512
};


export const start = async (options: StartOptions) => {
  const settings = { ...options, ...defaultOptions };
  const typeDefs = readFileSync(join(__dirname, `../graphql/schema.graphql`), { encoding: "utf8" });

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const schemaWithMiddleware = applyMiddleware(schema, logMiddleware, resolveRepoFromId, filterDirTraversal);

  const app = express();
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer({
    context: () => ({
      onAddRepoRequest: settings.onAddRepoRequest,
      onRemoveRepoRequest: settings.onRemoveRepoRequest
    }),
    schema: schemaWithMiddleware,
    introspection: false,
    plugins: [ApolloServerPluginLandingPageDisabled()],
    formatError: (errors: any) => {
      if (errors && !/repository\s\"(.*)?\"\snot\sfound/.test(errors.toString())) {
        notify(`Explorook returned graphql errors to client: ${errors}`, { metaData: { errors } });
      }
      return errors;
    },
    cache: "bounded"
  });

  app.use(getCorsMiddleware());
  app.use(bodyParser.json());

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/" });
  httpServer.listen(settings.port);

  console.log(`Server is running on http://localhost:${settings.port}`);
};
