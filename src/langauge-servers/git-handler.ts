import * as fs from 'fs';
const http = require("isomorphic-git/http/web");
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
      const rootGit = await igit.findRoot({ fs, filepath: gitPath });
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
  await igit.clone({ fs: require('fs'), http, dir: outDir, url: gitURL, onAuth: () => ({ username, password }), depth: 1, ref: gitCommitOrBranch, singleBranch: true });
  logger.info('Cloned repo succesfully to ' + outDir);
  return outDir;
}

// TODO: make sure with branch name like `master` that it always fetches the newest code from remote.
const syncGitCommit = async (rootGit: string, gitCommit: string, username: string, password: string): Promise<void> => {
  const fetchRes = await igit.fetch({ fs: require('fs'), http, dir: rootGit, onAuth: () => ({ username, password }), depth: 1, ref: gitCommit, singleBranch: true, relative: true });
  await igit.checkout({ fs, dir: rootGit, force: true, ref: fetchRes.fetchHead || gitCommit });
}

export const syncGitRepository = async (initParams: LangServerInitParams): Promise<string> => {
  const { gitURL , gitCommit, username, password } = initParams;
  if (!initParams.isGitRepo) {
    // not yet supported...
    return;
  }
  const gitDirOrNull = await getLocalGitRepositoryPathOrNull(gitURL);
  if (!gitDirOrNull) {
    logger.info('No cloned repo was found from ' + gitURL + ' , cloning...');

    try {
      return await cloneRepo(gitURL, gitCommit, username, password);
    } catch (e) {
      logger.error('Failed to clone git repo', { e, gitURL, gitCommit });
      throw e;
    }
  }
  
  logger.info('For ' + gitURL +', Cloned Repo was found in ' + gitDirOrNull)
  logger.info('Syncing commit / branch: ' + gitCommit)

  try {
    await syncGitCommit(gitDirOrNull, gitCommit, username, password);
    return gitDirOrNull;
  } catch (e) {
    logger.error('Failed to checkout to commit / branch', { e, gitURL, gitCommit, repoLocation: gitDirOrNull })
    throw e;
  }
}