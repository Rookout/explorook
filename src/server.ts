// tslint:disable-next-line:no-var-requires
import { GraphQLServer } from "graphql-yoga";
import { join } from "path";
import { resolvers } from "./api";

const typeDefs = join(__dirname, `../graphql/schema.graphql`);

// 3
const server = new GraphQLServer({
  resolvers,
  typeDefs,
});

server.express.use((req, res, next) => {
  const token = req.param("token");
  if (token === "opensesame") {
    next();
  } else {
    res.send(401);
  }
});

export const start = () => {
  server.start(() => console.log(`Server is running on http://localhost:4000`));
};

