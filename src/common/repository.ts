export interface Repository {
    repoName: string;
    fullpath: string;
    id: string;
    indexDone?: boolean;
    indexRunning?: boolean;
    listTree?(): string[];
    reIndex?(): void;
}
