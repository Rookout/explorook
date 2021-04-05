import { checkout, clone, fetch } from "isomorphic-git";
import * as path from 'path'
const http = require("isomorphic-git/http/node");


clone({ fs: require('fs'), http, dir: path.join('/tmp/amitush', 'explorook'), url: 'https://github.com/Rookout/explorook.git', depth: 1, ref: '57794118b781be0fcc739a3aa11dff573b85de1d', singleBranch: true }).then(
  () => {
    fetch({ fs: require('fs'), http, dir: '/tmp/amitush/explorook/', url: 'https://github.com/Rookout/explorook.git', depth: 1, ref: '3bdb0b43e2ec68268e5fcd368ffef026de4961b0', singleBranch: true })
    // TODO: test this works
    checkout()
  }
);