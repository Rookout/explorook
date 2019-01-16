import { repStore } from "./rep-store";
import * as graphQlServer from "./server";

// headless mode lets you run Explorook server without GUI

const args = require("args-parser")(process.argv);

if (args.help || !args.repo) {
    console.log("add repository using --repo=<name>,<path>");
    console.log("customize listen port with --port or -p");
    console.log("customize access token with --token");
    process.exit(0);
}

let repos: Array<any> = [];

try { // Allow for multiple repos as an array of objects
    repos = JSON.parse(args.repo);
} catch (err) {
    const arr = args.repo.split(",");
    const { name, path } = { name: arr[0], path: arr[1] };
    repos = [{ name, path }];
}

repos.forEach((repo: any) => {
    repStore.add({
        fullpath: repo.path,
        repoName: repo.name,
        id: undefined,
    }).catch((err) => {
        throw err;
    });
});

process.on("uncaughtException", (error) => {
    // tslint:disable-next-line:no-console
    console.error("unhandled exception thrown", error);
});

process.on("unhandledRejection", (error) => {
    // tslint:disable-next-line:no-console
    console.error("unhandled rejection thrown", error);
});

graphQlServer.start({ port: args.p || args.port || "", accessToken: args.token || "" });
