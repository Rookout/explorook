import Store = require("electron-store");

export class ExplorookStore extends Store {
  constructor(name: string = "explorook") {
    super({
      name,
    });
  }

  public getOrCreate(
    key: string,
    value: any,
    onCreated: () => void = null
  ): any {
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
