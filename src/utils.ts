import * as path from "path";
import {getStoreSafe} from "./explorook-store";

const store = getStoreSafe();

export const getLibraryFolder = () => {
    switch (process.platform) {
        case "win32":
            return path.join(process.env.APPDATA, "Rookout");
        case "darwin":
            return path.join(process.env.HOME, "Library/Application Support/Rookout");
        default:
            return path.join(process.env.HOME, ".Rookout");
    }
};

export const getSettings = (): Settings => {
  const settings: any = {
      BitbucketOnPremServers: store.get("BitbucketOnPremServers", undefined)
  };
  return settings as Settings;
};

const overrideGlobalName = (settingKey: string) => `${settingKey}-is-overriding-global`;

export const setSettings = (settings: Settings): Settings => {
    if (settings.OverrideGlobal) {
        Object.entries(settings).forEach(([key, val]) => {
            store.set(key, val);
            store.set(overrideGlobalName(key), true);
        });
    } else {
        Object.entries(settings).forEach(([key, val]) => {
            if (store.get(overrideGlobalName(key), false)) {
                console.info(`skipping setting ${key}:${val} since it was overriden locally`);
                return;
            }
            store.set(key, val);
        });
    }
    return  getSettings();
};
