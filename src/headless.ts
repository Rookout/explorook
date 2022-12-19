// set flag
process.env.headless_mode = "true";

import { repStore } from "./repoStore";
import * as graphQlServer from "./server";

// headless mode lets you run Explorook server without GUI

const args = require("args-parser")(process.argv);

if (args.help || args.h) {
    console.log("add repository using --repo=<name>,<path> or -r=<name>,<path> or with the EXPLOROOK_REPO environment variable");
    console.log("customize listen port with --port or -p");
    process.exit(0);
}

if (args.repo || args.r || process.env.EXPLOROOK_REPO) {
    const repoArg = args.repo || args.r || process.env.EXPLOROOK_REPO;
    let repos;

    try { // Allow for multiple repos as an array of objects
        repos = JSON.parse(repoArg);
    } catch (err) {
        const arr = repoArg.split(",");
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
}

process.on("uncaughtException", (error) => {
    console.error("unhandled exception thrown", error);
});

process.on("unhandledRejection", (error) => {
    console.error("unhandled rejection thrown", error);
});

graphQlServer.start({
    port: args.p || args.port || ""
});
