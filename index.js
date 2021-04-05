"use strict";
exports.__esModule = true;
var isomorphic_git_1 = require("isomorphic-git");
var path = require("path");
var http = require("isomorphic-git/http/node");
isomorphic_git_1.clone({ fs: require('fs'), http: http, dir: path.join('/tmp/amitush', 'explorook'), url: 'https://github.com/Rookout/explorook.git', depth: 1, ref: '57794118b781be0fcc739a3aa11dff573b85de1d', singleBranch: true });
