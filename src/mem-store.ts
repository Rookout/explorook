// memory store used instead of electron-store when running in headless mode (electron-store doesn't work outside electron)
export default class MemStore {
    store: Map<string, string>;
    constructor() {
        this.store = new Map<string, string>();
    }

    get(key: string, defaultValue: string = undefined): string {
        if (this.store.has(key)) {
            return this.store.get(key);
        }
        return defaultValue;
    }
    set(key: string, value: string) {
        this.store.set(key, value);
    }
}