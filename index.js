// electron-packager automatically looks for index.js at the root folder.
// our app's entry point is in /dist/index.js. I tried to use "main" in package.json
// but it breaks other stuff
require("./dist/index");