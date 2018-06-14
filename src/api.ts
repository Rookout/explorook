interface Link {
  id: string;
  description: string;
  url: string;
}

const links: [Link] = [{
  id: "link-0",
  url: "www.howtographql.com",
  description: "Fullstack tutorial for GraphQL",
}];

let idCount: number = links.length;
export const resolvers = {
  Query: {
    info: () => `This is the API of a Hackernews Clone`,
    // 2
    feed: () => links,
  },
  Mutation: {
    post: (root: Link, args: any) => {
      const link: Link = {
        id: `link-${idCount++}`,
        description: args.description,
        url: args.url,
      };
      links.push(link);
      return link;
    }
  }
};
