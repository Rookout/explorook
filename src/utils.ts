import _ = require("lodash");
import * as path from "path";
import {leaveBreadcrumb, notify} from "./exceptionManager";
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
  const settings: any = {};
  ["PerforceConnectionString", "PerforceTimeout", "PerforceUser", "BitbucketOnPremServers"].forEach(key => {
      settings[key] = store.get(key, undefined);
  });
  return settings as Settings;
};

const validHttpRegex = /^https?:\/\/(([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})|([\d\w\-_]*(\.[\d\w\-_]+)*))(:([0-9]*))?(\/[A-Za-z0-9]*\/?)*$/;

const areOnPremServersValid = (servers: string[]) => {
    if (!_.isEmpty(servers)) {
        if (_.some(servers, server => !validHttpRegex.test(server))) {
            return false;
        }
        return true;
    }
};

export const setSettings = (settings: Settings): Settings => {
  if (!areOnPremServersValid(settings?.BitbucketOnPremServers)) {
      leaveBreadcrumb("on prem server parsing", {settings});
      notify(new Error("Failed to parse some bitbucket on prem servers"));
      settings = _.omit(settings, "BitbucketOnPremServers");
  }
  Object.entries(settings).forEach(([key, val]) => store.set(key, val));
  return  getSettings();
};
