export interface Disposable {
    /**
     * Dispose this object.
     */
    dispose(): void;
}

export function create(func: () => void): Disposable {
    return {
        dispose: func
    };
}
