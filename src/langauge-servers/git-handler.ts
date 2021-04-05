import * as common from '../common';
import * as fs from 'fs';
const http = require("isomorphic-git/http/web");
import { findRoot, clone, checkout } from 'isomorphic-git';
import * as igit from 'isomorphic-git';
import * as path from 'path'
import parseRepo = require("parse-repo");
import _ = require('lodash');
import { GIT_ROOT } from '../git';

const getLocalGitRepositoryPathOrNull = async (gitURL : string): Promise<string | null> => {
  const dirents = fs.readdirSync(GIT_ROOT, { withFileTypes: true });
  const wantedRemoteParsed = parseRepo(gitURL);
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const gitPath = path.join(GIT_ROOT, dirent.name);
    const rootGit = await findRoot({ fs, filepath: gitPath });
    const remotes = await igit.listRemotes({ fs, dir: rootGit });
    if (!_.find(remotes, r => {
      const localRemoteParsed = parseRepo(r.url);
      return wantedRemoteParsed.project === localRemoteParsed.project &&
      wantedRemoteParsed.host === localRemoteParsed.host &&
      wantedRemoteParsed.owner === localRemoteParsed.owner
    })) {
      continue;
    }
    return rootGit;
  }
  return null;
}

const cloneRepo = async (gitURL: string, gitCommitOrBranch: string, username: string, password: string): Promise<string> => {
  // TODO make sure no concurrent operations
  const { project } = parseRepo(gitURL);
  const outDir = path.join(GIT_ROOT, project);
  await clone({ fs: require('fs'), http, dir: outDir, url: gitURL, onAuth: () => ({ username, password }), depth: 1, ref: gitCommitOrBranch, singleBranch: true });
  return outDir;
}

const syncGitCommit = async (rootGit: string, gitCommit: string, username: string, password: string): Promise<void> => {
  const gitLog = await igit.log({ fs, dir: rootGit });
  const gitCurrentBranch = await igit.currentBranch({ fs, dir: rootGit });
  if (_.first(gitLog)?.oid === gitCommit || gitCurrentBranch === gitCommit) {
    // current HEAD is good
    return;
  }
  await igit.fetch({ fs: require('fs'), http, dir: rootGit, onAuth: () => ({ username, password }), depth: 1, ref: gitCommit, singleBranch: true });
  await igit.checkout({ fs, dir: rootGit, force: true, ref: 'FETCH_HEAD' });
}

export const syncGitRepository = async (initParams: common.LangServerInitParams) => {
  const { gitURL , gitCommit, username, password } = initParams;
  if (!initParams.isGitRepo) {
    // not yet supported...
    return;
  }
  const gitDirOrNull = await getLocalGitRepositoryPathOrNull(gitURL);
  if (!gitDirOrNull) {
    return await cloneRepo(gitURL, gitCommit, username, password);
  } else {
    await syncGitCommit(gitDirOrNull, gitCommit, username, password);
  }
  // check if repository already cloned locally
  const dirents = fs.readdirSync(GIT_ROOT, { withFileTypes: true });
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const gitPath = path.join(GIT_ROOT, dirent.name);
    const rootGit = await findRoot({ fs, filepath: gitPath });
    const remotes = await igit.listRemotes({ fs, dir: rootGit });
    const wantedRemoteParsed = parseRepo(gitURL);
    if (!_.find(remotes, r => {
      const localRemoteParsed = parseRepo(r.url);
      return wantedRemoteParsed.project === localRemoteParsed.project &&
      wantedRemoteParsed.host === localRemoteParsed.host &&
      wantedRemoteParsed.owner === localRemoteParsed.owner
    })) {
      continue;
    }
    const gitLog = await igit.log({ fs, dir: rootGit });
    const gitCurrentBranch = await igit.currentBranch({ fs, dir: rootGit });
    if (_.first(gitLog)?.oid === gitCommit || gitCurrentBranch === gitCommit) {
      repoFullpath = gitPath;
    } else {
      await igit.checkout({ fs, dir: rootGit, force: true, ref: gitCommit });
      repoFullpath = gitPath;
    }
    break;
  }
  if (!repoFullpath) {
    const { project } = parseRepo(gitURL);
    await clone({ fs: require('fs'), http, dir: path.join(GIT_ROOT, project), url: gitURL, onAuth: () => ({ username, password }), depth: 1, ref: gitCommit, singleBranch: true });
  }
}