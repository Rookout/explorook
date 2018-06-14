// tslint:disable-next-line:no-var-requires
const { GraphQLServer } = require("graphql-yoga");
import { join } from "path";
import { resolvers } from "./api";

const typeDefs = join(__dirname, `../graphql/schema.graphql`)

// 3
const server = new GraphQLServer({
  resolvers,
  typeDefs,
});

export const start = () => {
    server.start(() => console.log(`Server is running on http://localhost:4000`))
};

