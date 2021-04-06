import * as fs from 'fs';
const http = require("isomorphic-git/http/web");
import { findRoot, clone, checkout } from 'isomorphic-git';
import * as igit from 'isomorphic-git';
import * as path from 'path'
import parseRepo = require("parse-repo");
import _ = require('lodash');
import { GIT_ROOT } from '../git';
import { getLogger } from '../logger';
const logger = getLogger('git');

const getLocalGitRepositoryPathOrNull = async (gitURL : string): Promise<string | null> => {
  const dirents = fs.readdirSync(GIT_ROOT, { withFileTypes: true });
  const wantedRemoteParsed = parseRepo(gitURL);
  for (const dirent of dirents) {
    try {
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
    } catch (error) {
      logger.error(`Failed to check git dir`, { error, dirent, gitURL })
    }
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
  await igit.fetch({ fs: require('fs'), http, dir: rootGit, onAuth: () => ({ username, password }), depth: 1, ref: gitCommit, singleBranch: true, relative: true });
  await igit.checkout({ fs, dir: rootGit, force: true, ref: gitCommit });
}

export const syncGitRepository = async (initParams: LangServerInitParams): Promise<string> => {
  const { gitURL , gitCommit, username, password } = initParams;
  if (!initParams.isGitRepo) {
    // not yet supported...
    return;
  }
  const gitDirOrNull = await getLocalGitRepositoryPathOrNull(gitURL);
  if (!gitDirOrNull) {
    return await cloneRepo(gitURL, gitCommit, username, password);
  }
  await syncGitCommit(gitDirOrNull, gitCommit, username, password);
  return gitDirOrNull;
}