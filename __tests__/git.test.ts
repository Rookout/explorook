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

const readFileFromRepository = async (repositoryPath: string, filepath: string) => {
  const fullpath = path.join(repositoryPath, filepath);
  return await readfile(fullpath);
}

const readPackageJsonFromRepository = async (repositoryPath: string) => 
    JSON.parse((await readFileFromRepository(repositoryPath, 'package.json')).toString('utf8'))

test('clone repository - no error', async () => {
  const tempDir = await createTmpDirForTest()

  const repoDir = await cloneRemoteOriginWithCommit('https://github.com/Rookout/Explorook.git', '19d140b41a4edd3ffff43465f7324d5cea252327', false, tempDir);

  const dir = await readdir(tempDir);
  const packageFile = await readPackageJsonFromRepository(repoDir)

  expect(packageFile.version).toEqual('1.6.0')
  expect(dir).toEqual(['Explorook']);
})

test('clone repository - ssh', async () => {
  const tempDir = await createTmpDirForTest()

  await cloneRemoteOriginWithCommit('git@github.com:Rookout/explorook.git', '19d140b41a4edd3ffff43465f7324d5cea252327', false, tempDir);

  const dir = await readdir(tempDir);
  expect(dir).toEqual(['explorook']);
})

// clone explorook then checkout another commit.
// the package file should contain a different version
test('change commit repository - file data changes', async () => {
  const tempDir = await createTmpDirForTest()

  const repoDir = await cloneRemoteOriginWithCommit('https://github.com/Rookout/Explorook.git', '19d140b41a4edd3ffff43465f7324d5cea252327', false, tempDir);
  const pkgBefore = await readPackageJsonFromRepository(repoDir)
  const versionBefore = pkgBefore.version;

  await cloneRemoteOriginWithCommit('https://github.com/Rookout/Explorook.git', '55cf9cd0b79f55645616048650d52a6562332f53', false, tempDir);
  const pkgAfter = await readPackageJsonFromRepository(repoDir)
  const versionAfter = pkgAfter.version;

  expect(versionBefore).toEqual("1.6.0");
  expect(versionAfter).toEqual("1.5.1");
})

