// memory store used instead of electron-store when running in headless mode (electron-store doesn't work outside electron)
const singleStore = new Map<string, string>();
export default class MemStore {
    public store: Map<string, string>;
    constructor() {
        this.store = singleStore;
    }

    public get(key: string, defaultValue: string): string {
        if (this.store.has(key)) {
            return this.store.get(key);
        }
        return defaultValue;
    }
    public set(key: string, value: string) {
        this.store.set(key, value);
    }

    public delete(key: string) {
        this.store.delete(key);
    }

    public onDidChange(key: string, callback: (newValue?: string, oldValue?: string) => void): () => null {
        return () => null;
    }
}
