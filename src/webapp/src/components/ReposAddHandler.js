import { useEffect } from 'react'
import { ipcRenderer } from 'electron'
import path from 'path'
import { app, dialog, getCurrentWindow } from '@electron/remote'





export const ReposAddHandler = () => {


    useEffect(() => {
        ipcRenderer.on('pop-choose-repository', () => {
            onPopDialogRequested()
        })
        ipcRenderer.sendTo(window.indexWorkerId, 'repos-request')
    }, [])

    const onPopDialogRequested = async () => {
        const win = getCurrentWindow()
        let reHide = false
        if (!win.isVisible()) {
            win.show()
            reHide = true
        }
        await onAddClicked()
        if (!reHide) return
        if (window.process.platform.match('darwin')) {
            app.dock.hide()
        }
        win.hide()
    }


    const onAddClicked = async () => {
        const win = getCurrentWindow()
        const { filePaths } = await dialog.showOpenDialog(win, {
            properties: ['openDirectory', 'multiSelections'],
        })

        if (!filePaths) return // user closed dialog without choosing

        for (let i = 0; i < filePaths.length; i++) {
            const folder = filePaths[i]
            const repoName = path.basename(folder)
            const newRepo = { repoName, fullpath: folder }
            ipcRenderer.sendTo(window.indexWorkerId, 'add-repo', newRepo)
        }
    }

    return null;
}
