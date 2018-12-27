import { GraphQLServer } from "graphql-yoga";
import { join } from "path";
import { resolvers } from "./api";
import { Request, Response, NextFunction } from "express";
import { logMiddleware, filterDirTraversal, resolveRepoFromId } from "./middlewares";

export const start = (accessToken: string, port: number = 44512) => {
  const typeDefs = join(__dirname, `../graphql/schema.graphql`);

  const server = new GraphQLServer({
    resolvers,
    typeDefs,
    middlewares: [logMiddleware, resolveRepoFromId, filterDirTraversal],
  });

  server.express.use((req: Request, res: Response, next: NextFunction) => {
    if (process.env.EXPLOROOK_NOAUTH) {
      next();
      return;
    }
    const token = req.param("token") || req.header("token") || "";
    if (token === accessToken) {
      next();
    } else {
      res.status(401).send("bad token");
    }
  });
  try {
    // tslint:disable-next-line:no-console
    server.start({ port: port }, (options: { port: number }) => console.log(`Server is running on http://localhost:${options.port}`)); 
  } catch (error) {
    // tslint:disable-next-line:no-console
    console.log("couldn't start server", error);
  }
};

