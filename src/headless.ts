import * as graphQlServer from "./server";
import { repStore } from "./rep-store";

// headless mode let's you run Explorook server without the whole GUI

const args = require("args-parser")(process.argv);

if (args.help || !args.repo) {
    console.log("add repository using --repo=<name>,<path>");
    console.log("customize listen port with --port or -p");
    process.exit(0);
}

const arr = args.repo.split(",");
const { name, path } = { name: arr[0], path: arr[1] };
repStore.add({
    fullpath: path,
    repoName: name,
    id: undefined,
}).then((repId: string) => {
}).catch(err => {
    throw err;
});

graphQlServer.start("", args.p || args.port || undefined);
