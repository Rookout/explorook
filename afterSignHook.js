// See: https://medium.com/@TwitterArchiveEraser/notarize-electron-apps-7a5f988406db

const fs = require('fs');
const path = require('path');
var electron_notarize = require('electron-notarize');

module.exports = async function (params) {
    // Only notarize the app on Mac OS only.
    if (process.platform !== 'darwin') {
        console.log("only running on MAC")
        return;
    }
    if (params.packager.constructor.name !== "MacPackager") {
        console.log("only running after mac packaging")
        return;
    }
    console.log('afterSign hook triggered');

    // Same appId in electron-builder.
    let appId = 'com.rookout.explorook'

    let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
    console.log(appPath)
    if (!fs.existsSync(appPath)) {
        throw new Error(`Cannot find application at: ${appPath}`);
    }

    console.log(`Notarizing ${appId} found at ${appPath}`);

    try {
        await electron_notarize.notarize({
            appBundleId: appId,
            appPath: appPath,
            appleId: process.env.appleId,
            appleIdPassword: process.env.appleIdPassword,
        });
    } catch (error) {
        console.error(error);
        throw error;
    }

    console.log(`Done notarizing ${appId}`);
};
