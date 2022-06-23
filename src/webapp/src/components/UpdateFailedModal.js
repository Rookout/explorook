import React, {useEffect, useState} from "react";
import { ipcRenderer } from "electron";
import { getCurrentWindow, BrowserWindow } from "@electron/remote";
import { Confirm } from "./ConfirmModal";

const TWO_DAYS = (1000 * 60 * 60 * 48);

export const UpdateFailedModal = () => {

    const [manualDownload, setManualDownload] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState("");
    const [updateTimer, setUpdateTimer] = useState(null);

    useEffect(() => {
        const init = async (e, args) => {
            if (!updateTimer) {
                setUpdateTimer(new Date());
                setDownloadUrl(args.downloadUrl);
                onPopDialogRequested();
                return;
            }
            if (timeDiff() >= TWO_DAYS) {
                onPopDialogRequested();
                setUpdateTimer(new Date());
            }
        }
        ipcRenderer.on("pop-failed-upgrade", init);
        return () => ipcRenderer.removeListener("pop-failed-upgrade", init);
    }, [updateTimer]);


    const timeDiff = () => {
        const currentTime = new Date();
        return (currentTime.getTime() - updateTimer.getTime());
    }

    const onPopDialogRequested = () => {
        setManualDownload(true);
        const window = getCurrentWindow();
        if (!window.isVisible()) {
            window.show();
        }
    }

    const openDownloadAppLink = () => {
        const window = new BrowserWindow();
        window.loadURL(downloadUrl);
        setManualDownload(false);
        closeDialog();
    }

    const closeDialog = () => {
        const window = getCurrentWindow();
        setManualDownload(false);
        window.hide();
    }

    return (
        <div hidden>
            <Confirm open={manualDownload}
                     showNeverAskAgain={false}
                    title="Hey There!"
                    body={
                        <>
                            <p
                                className='gray-shaded'
                                style={{ marginBottom: 0 }}
                            >We couldn't update your app.</p>
                            <p
                                className='gray-shaded'
                                style={{ marginTop: 0 }}
                            >Would you like to manually download the latest version?</p>
                        </>
                    }
                    onAgree={openDownloadAppLink}
                    onCancel={closeDialog}
            />
        </div>
    )
}
