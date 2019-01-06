import { GraphQLServer } from "graphql-yoga";
import { join } from "path";
import * as cors from "cors";
import { resolvers } from "./api";
import { Request, Response, NextFunction } from "express";
import { logMiddleware, filterDirTraversal, resolveRepoFromId } from "./middlewares";

export type onAddRepoRequestHandler = (fullpath: string) => Promise<boolean>;

type StartOptions = {
  accessToken?: string,
  port?: number,
  onAddRepoRequest?: onAddRepoRequestHandler
}

const defaultOptions: StartOptions = {
  port: 44512
}

export const start = (options: StartOptions) => {
  const settings = { ...options, ...defaultOptions }
  const typeDefs = join(__dirname, `../graphql/schema.graphql`);

  const server = new GraphQLServer({
    resolvers,
    typeDefs,
    context: () => ({ onAddRepoRequest: settings.onAddRepoRequest }),
    middlewares: [logMiddleware, resolveRepoFromId, filterDirTraversal],
  });

  server.express.use(cors(), (req: Request, res: Response, next: NextFunction) => {
    if (process.env.EXPLOROOK_NOAUTH) {
      next();
      return;
    }
    const token = req.param("token") || req.header("token") || "";
    if (token === settings.accessToken) {
      next();
    } else {
      res.status(401).send("bad token");
    }
  });
  try {
    // tslint:disable-next-line:no-console
    server.start({ port: settings.port }, (options: { port: number }) => console.log(`Server is running on http://localhost:${options.port}`)); 
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.log("couldn't start server", error);
  }
};

