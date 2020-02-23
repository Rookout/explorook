import React, { useState, useEffect } from "react";
import { ReposListItem } from "./RepoListItem";
import { IconButton, Button } from "@material-ui/core";
import { AddCircle } from "@material-ui/icons";
import { Confirm } from "./ConfirmModal";
import * as igit from "isomorphic-git";
import { ipcRenderer, remote } from "electron";
import path from "path";
import fs from "fs";
import * as Store from "electron-store";
const dialog = remote.dialog;

const store = new Store({ name: "explorook" });
let postDialog = () => {};

export const ReposList = ({ ...props }) => {
    const [repos, setRepos] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [nonGitFullpath, setNonGitFullpath] = useState("");

    useEffect(() => {
        ipcRenderer.on("pop-choose-repository", () => {
            onPopDialogRequested();
        });
        ipcRenderer.on("refresh-repos", (e, newRepos) => {
            setRepos(newRepos);
        });
        ipcRenderer.sendTo(window.indexWorkerId, "repos-request");
    }, []);

    const onRemoveClicked = repoId => {
        if (window.confirm("Are you sure you want to delete this repository?")) {
            ipcRenderer.sendTo(window.indexWorkerId, "delete-repo", repoId);
        }
    };

    const onPopDialogRequested = async () => {
        const win = remote.getCurrentWindow();
        let reHide = false;
        if (!win.isVisible()) {
            win.show();
            reHide = true;
        }
        await onAddClicked();
        if (!reHide) { return; }
        if (window.process.platform.match("darwin")) {
            remote.app.dock.hide();
        }
        win.hide();
    };

    const shouldWarnNonGit = async fullpath => {
        try {
            const gitRoot = await igit.findRoot({ fs, filepath: fullpath });
            if (!gitRoot) {
                return true;
            }
        } catch (err) {
            return true;
        }
        return false;
    };

    const onAddClicked = async () => {
        const win = remote.getCurrentWindow();
        const { filePaths } = await dialog.showOpenDialog(win, { properties: ["openDirectory", "multiSelections"] });
        if (!filePaths) { // user closed dialog without choosing
          console.log("hedwig");
            return;
        }
        console.log("hedwig", filePaths);
        for (let i = 0; i < filePaths.length; i++) {
            const folder = filePaths[i];
            const repoName = path.basename(folder);
            const newRepo = { repoName, fullpath: folder };
            const shouldWarn = !store.get("non-git-dialog-never-ask-again", false) && await shouldWarnNonGit(folder);
            let shouldAdd = true;
            if (shouldWarn) {
                shouldAdd = await new Promise((resolve) => {
                    postDialog = doAdd => {
                        resolve(doAdd);
                        setConfirmOpen(false);
                    };
                    setConfirmOpen(true);
                    setNonGitFullpath(folder);
                });
            }
            if (shouldAdd) {
                ipcRenderer.sendTo(window.indexWorkerId, "add-repo", newRepo);
            }
        }
    };

    return (
        <div>
            <div style={{ display: "flex" }}>
                <p className="gray-shaded">Local Repositories</p>
                <IconButton variant="fab" aria-label="add" onClick={onAddClicked}>
                    <AddCircle className="primary" />
                </IconButton>
            </div>
            <div id="repo-list-container">
            { repos.length > 0 ?
                repos.map(rep => <ReposListItem repo={rep} removeClicked={onRemoveClicked} key={rep.id} />)
                :
                <>
                    <p style={{ textAlign: "center" }}>
                        <img src="folders.svg" style={{width: 70, textAlign: "center", pointerEvents: "none"}} />
                    </p>
                    <p className="rookout-gray" style={{marginBottom: 0, textAlign: "center", fontSize: "large"}}>
                    Click the + button to add folders that will be
                    </p>
                    <p className="rookout-gray" style={{marginTop: 0, textAlign: "center", fontSize: "large"}}>
                    accessible in app.rookout.com
                    </p>
                </>
            }
            <Confirm
                open={confirmOpen}
                title="You are about to add a non-git repository"
                body={
                  <>
                      <p className="gray-shaded" style={{ marginBottom: 0 }}>{`The folder: ${nonGitFullpath} is not a git repository`}</p>
                      <p className="gray-shaded" style={{ marginTop: 0 }}>{`Are you sure you want to add this folder?`}</p>
                  </>
                }
                onClose={() => postDialog(false)}
                onCancel={() => postDialog(false)}
                onAgree={() => postDialog(true)} />
            </div>
        </div>
    );
};
