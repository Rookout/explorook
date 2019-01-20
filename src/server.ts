import * as cors from "cors";
import { GraphQLServer } from "graphql-yoga";
import * as _ from "lodash";
import { join } from "path";
import { resolvers } from "./api";
import { authenticateController, authorizationMiddleware, filterDirTraversal, logMiddleware, resolveRepoFromId } from "./middlewares";

export type onAddRepoRequestHandler = (fullpath: string) => Promise<boolean>;

interface StartOptions {
  accessToken?: string;
  port?: number;
  onAddRepoRequest?: onAddRepoRequestHandler;
}

const defaultOptions: StartOptions = {
  port: 44512
};

export const start = (options: StartOptions) => {
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
  server.express.post("/authorize/:env", authenticateController(settings.accessToken));
  server.express.use(authorizationMiddleware(settings.accessToken));
  try {
    // tslint:disable-next-line:no-console
    server.start({ port: settings.port }, (opts: { port: number }) => console.log(`Server is running on http://localhost:${opts.port}`));
  } catch (error) {
    console.log("couldn't start server", error);
  }
};

