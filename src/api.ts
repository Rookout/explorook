interface Link {
    id: string;
    description: string;
    url: string;
}

const links = [{
    id: "link-0",
    url: "www.howtographql.com",
    description: "Fullstack tutorial for GraphQL",
  }];

export const resolvers = {
    Query: {
      info: () => `This is the API of a Hackernews Clone`,
      // 2
      feed: () => links,
    },
    // 3
    Link: {
      id: (root: Link) => root.id,
      description: (root: Link) => root.description,
      url: (root: Link) => root.url,
    },
  };
