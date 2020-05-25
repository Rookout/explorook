import Store = require("electron-store");
import MemStore from "./mem-store";

export class ExplorookStore extends Store {
    constructor(name: string = "explorook") {
        super({
            name
        });
    }

    public getOrCreate(key: string, value: any, onCreated: () => void = null): any {
        const data = this.get(key);
        if (!data) {
            this.set(key, value);
            if (onCreated) {
                onCreated();
            }
            return value;
        }
        return data;
    }
}

export const getStoreSafe = () => {
    try {
        return new Store({ name: "explorook" });
    } catch (error) { // probably headless mode - defaulting to memory store
        // tslint:disable-next-line:no-console
        console.log("couldn't create electron-store. defaulting to memory store (this is normal when running headless mode)");
        return new MemStore();
    }
};
