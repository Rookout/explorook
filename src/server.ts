import { GraphQLServer } from "graphql-yoga";
import { join } from "path";
import { repoMiddleware, resolvers, traversalMiddleware } from "./api";

const typeDefs = join(__dirname, `../graphql/schema.graphql`);

// 3
const server = new GraphQLServer({
  resolvers,
  typeDefs,
  middlewares: [traversalMiddleware, repoMiddleware],
});

server.express.use((req, res, next) => {
  const token = req.param("token") || req.header("token") || "";
  if (token === "opensesame") {
    next();
  } else {
    //res.send(401);
    next();
  }
});

export const start = () => {
  server.start({ port: 50001 }, (options) => console.log(`Server is running on http://localhost:${options.port}`));
};

