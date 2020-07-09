import { cloneRemoteOriginWithCommit, GIT_ROOT } from '../src/git'
import * as path from 'path'
import { tmpdir } from 'os'
import * as fs from 'fs'
import { promisify } from 'util'

const uuidv4 = require("uuid/v4");

const readdir = promisify(fs.readdir)
const mkdir = promisify(fs.mkdir)
const readfile = promisify(fs.readFile)

const createTmpDirForTest = async () => {
  const fullpath = path.join(tmpdir(), uuidv4());
  await mkdir(fullpath);
  return fullpath;
}

test('clone repository - no error', async () => {
  const tempDir = await createTmpDirForTest()

  await cloneRemoteOriginWithCommit('https://github.com/Rookout/Explorook.git', '19d140b41a4edd3ffff43465f7324d5cea252327', false, tempDir);

  const dir = await readdir(tempDir);
  expect(dir).toEqual(['Explorook']);
})

// clone explorook then checkout another commit.
// the package file should contain a different version
test('change commit repository - file data changes', async () => {
  const tempDir = await createTmpDirForTest()

  await cloneRemoteOriginWithCommit('https://github.com/Rookout/Explorook.git', '19d140b41a4edd3ffff43465f7324d5cea252327', false, tempDir);
  const pkgBefore = JSON.parse((await readfile(path.join(tempDir, 'Explorook', 'package.json'))).toString('utf8'))
  const versionBefore = pkgBefore.version;

  await cloneRemoteOriginWithCommit('https://github.com/Rookout/Explorook.git', '55cf9cd0b79f55645616048650d52a6562332f53', false, tempDir);
  const pkgAfter = JSON.parse((await readfile(path.join(tempDir, 'Explorook', 'package.json'))).toString('utf8'))
  const versionAfter = pkgAfter.version;

  expect(versionBefore).toEqual("1.6.0");
  expect(versionAfter).toEqual("1.5.1");
})