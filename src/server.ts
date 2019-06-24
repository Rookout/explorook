import * as cors from "cors";
import { GraphQLServer } from "graphql-yoga";
import { defaultErrorFormatter } from "graphql-yoga/dist/defaultErrorFormatter";
import { join } from "path";
import { resolvers } from "./api";
import { notify } from "./exceptionManager";
import {
  authenticateController,
  authenticateControllerV2,
  authorizationMiddleware,
  filterDirTraversal,
  logMiddleware,
  resolveRepoFromId, setUserId
} from "./middlewares";

export type onAddRepoRequestHandler = (fullpath: string) => Promise<boolean>;

interface StartOptions {
  accessToken?: string;
  userId?: string;
  site?: string;
  port?: number;
  firstTimeLaunch?: boolean;
  onAddRepoRequest?: onAddRepoRequestHandler;
}

const defaultOptions: StartOptions = {
  port: 44512,
  userId: "anonymous"
};

export const start = (options: StartOptions): Promise<any> => {
  const startedAt = new Date();
  const settings = { ...options, ...defaultOptions };
  const typeDefs = join(__dirname, `../graphql/schema.graphql`);

  const server = new GraphQLServer({
    resolvers,
    typeDefs,
    context: () => ({ onAddRepoRequest: settings.onAddRepoRequest }),
    middlewares: [logMiddleware, resolveRepoFromId, filterDirTraversal],
  });

  server.express.use(cors());
  // indicates that the authorization feature is available
  server.express.get("/authorize/", (req, res) => res.status(200).send("AVAILABLE"));
  server.express.post("/authorize/:env", authenticateController(settings.accessToken, settings.userId));
  // indicates that the authorization v2 feature is available (automatic)
  server.express.get("/authorize/v2", (req, res) => res.status(200).send("AVAILABLE"));
  server.express.post("/authorize/v2/:env", authenticateControllerV2(settings.accessToken, settings.userId, settings.site));
  server.express.post("/configure/set/id", setUserId(settings.firstTimeLaunch, startedAt));

  server.express.use(authorizationMiddleware(settings.accessToken));
  // tslint:disable-next-line:no-console
  return server.start({ port: settings.port, formatError: (errors: any) => {
    notify(`Explorook returned graphql errors to client: ${errors}`, { metaData: { errors }} );
    return defaultErrorFormatter(errors);
  }}, (opts: { port: number }) => console.log(`Server is running on http://localhost:${opts.port}`));
};

