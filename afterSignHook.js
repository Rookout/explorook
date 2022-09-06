// See: https://medium.com/@TwitterArchiveEraser/notarize-electron-apps-7a5f988406db

const fs = require('fs');
const path = require('path');
var electron_notarize = require('electron-notarize');

module.exports = async function (params) {
    // Only notarize the app on Mac OS only.
    if (process.platform !== 'darwin') {
        console.log("MAC Notarization Hook: only running on MAC - skipping")
        return;
    }
    if (params.packager.constructor.name !== "MacPackager") {
        console.log("MAC Notarization Hook: only running after mac packaging - skipping")
        return;
    }
    console.log('afterSign hook triggered');

    // Same appId in electron-builder.
    const appId = 'com.rookout.explorook';
    // This will prevent using the legacy altool to notarize (will be shut down by 2023)
    const tool = "notarytool";

    const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
    console.log(appPath)
    if (!fs.existsSync(appPath)) {
        throw new Error(`Cannot find application at: ${appPath}`);
    }

    console.log(`Notarizing ${appId} found at ${appPath}`);

    try {
        await electron_notarize.notarize({
            appBundleId: appId,
            appPath,
            appleId: process.env.appleId,
            appleIdPassword: process.env.appleIdPassword,
            teamId: process.env.appleTeamId,
            tool
        });
    } catch (error) {
        console.error(error);
        throw error;
    }

    console.log(`Done notarizing ${appId}`);
};
