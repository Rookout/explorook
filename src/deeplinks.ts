import {dialog} from "electron";

const path = require("path");

const PROTOCOL = "rookout";



export const initDeeplinks = (app: Electron.App) => {
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
        }
    } else {
        app.setAsDefaultProtocolClient(PROTOCOL);
    }

    app.on("open-url", deeplinkHandler);
};


export const deeplinkHandler = () => {
   dialog.showMessageBoxSync({title: "Rookout Desktop App", message: "Rookout Desktop App is now running"});
};
