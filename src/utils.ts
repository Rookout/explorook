import * as path from "path";
import { getStoreSafe } from './explorook-store';

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
  const settings: any = {};
  ['PerforceConnectionString', 'PerforceTimeout', 'PerforceUser'].forEach(key => {
    const val = store.get(key, undefined)
    settings[key] = val;
  });
  return settings as Settings;
}

export const setSettings = (settings: Settings): Settings => {
  Object.entries(settings).forEach(([key,val]) => store.set(key, val));
  return  getSettings();
}