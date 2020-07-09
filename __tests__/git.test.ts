import { cloneRemoteOriginWithCommit, GIT_ROOT } from '../src/git'
import * as path from 'path'
import { tmpdir } from 'os'
import * as fs from 'fs'
import { promisify } from 'util'
const uuidv4 = require("uuid/v4");
const readdir = promisify(fs.readdir)
const mkdir = promisify(fs.mkdir)

const createTmpDirForTest = async () => {
  const fullpath = path.join(tmpdir(), uuidv4());
  await mkdir(fullpath);
  return fullpath;
}

test('clone repository file exists', async () => {
  const tempDir = await createTmpDirForTest()
  await cloneRemoteOriginWithCommit('https://github.com/Rookout/Explorook.git', '19d140b41a4edd3ffff43465f7324d5cea252327', false, tempDir);
  const dir = await readdir(tempDir);
  expect(dir).toEqual(['Explorook']);
})