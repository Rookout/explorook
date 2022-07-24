export interface Repository {
    repoName: string;
    fullpath: string;
    id: string;
    indexDone?: boolean;
    indexLimitReached?: boolean;
    listTree?(): string[];
    reIndex?(): void;
}
