import { GraphQLServer } from "graphql-yoga";
import { join } from "path";
import { repoMiddleware, resolvers, traversalMiddleware } from "./api";

export const start = (accessToken: string) => {
  const typeDefs = join(__dirname, `../graphql/schema.graphql`);

  const server = new GraphQLServer({
    resolvers,
    typeDefs,
    middlewares: [traversalMiddleware, repoMiddleware],
  });

  server.express.use((req, res, next) => {
    const token = req.param("token") || req.header("token") || "";
    if (token === accessToken) {
      next();
    } else {
      res.send(401);
    }
  });
  server.start({ port: 50001 }, (options) => console.log(`Server is running on http://localhost:${options.port}`));
};

