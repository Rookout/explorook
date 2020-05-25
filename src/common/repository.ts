import * as git from "isomorphic-git";

export interface Repository {
  repoName: string;
  fullpath: string;
  id: string;
  indexDone?: boolean;
  listTree?(): string[];
  reIndex?(): void;
}

export interface RepositoryV3 {
  repoName: string;
  fullpath: string;
  id: string;
  indexDone?: boolean;
}
