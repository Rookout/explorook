import * as path from "path";

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
