import * as path from "path";

export const getLibraryFolder = () => {
    switch (process.platform) {
        case "win32":
            return path.join(process.env.APPDATA, "Dynatrace");
        case "darwin":
            return path.join(process.env.HOME, "Library/Application Support/Dynatrace");
        default:
            return path.join(process.env.HOME, ".Dynatrace");
    }
};
