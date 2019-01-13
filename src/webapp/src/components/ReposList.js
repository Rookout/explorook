import React, { Component } from 'react';
import { ReposListItem } from "./RepoListItem"
import { IconButton, Button } from '@material-ui/core';
import { AddCircle } from "@material-ui/icons"
import { Confirm } from './ConfirmModal';
import * as igit from "isomorphic-git";
import { ipcRenderer, remote } from "electron";
import path from "path";
import fs from "fs";
import * as Store from "electron-store";
const dialog = remote.dialog;

const store = new Store({ name: "explorook" })

export class ReposList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            repos: [],
            nonGitFullpath: "",
        }
        ipcRenderer.on('pop-choose-repository', () => {
            this.onPopDialogRequested();
        })
        ipcRenderer.on("refresh-repos", (e, repos) => 
        {
            this.setState({...this.state, repos})
        });
        ipcRenderer.sendTo(window.indexWorkerId, "repos-request");
        this.onRemoveClicked = this.onRemoveClicked.bind(this);
        this.onAddClicked = this.onAddClicked.bind(this);
        this.postDialog = () => {};
    }

    onRemoveClicked(repoId) {
        if (window.confirm("Are you sure you want to delete this repository?")){
            ipcRenderer.sendTo(window.indexWorkerId, "delete-repo", repoId);
        }
    }

    async onPopDialogRequested() {
        const win = remote.getCurrentWindow();
        let reHide = false;
        if (!win.isVisible()) {
            win.show();
            reHide = true;
        }
        await this.onAddClicked();
        if (!reHide) return;
        if (window.process.platform.match("darwin")) {
            remote.app.dock.hide();
        }
        win.hide();
    }

    async shouldWarnNonGit(fullpath) {
        try {
            const gitRoot = await igit.findRoot({ fs, filepath: fullpath });
            if (!gitRoot) { 
                return true;
            }
        } catch (err) {
            return true;
        }
        return false;
    }

    async onAddClicked() {
        const win = remote.getCurrentWindow();
        const folders = dialog.showOpenDialog(win, { properties: ["openDirectory", "multiSelections"] });
        if (!folders) { // user closed dialog without choosing
            return;
        }
        for (let i = 0; i < folders.length; i++) {
            const folder = folders[i];
            const repoName = path.basename(folder);
            const newRepo = { repoName, fullpath: folder };
            const shouldWarn = !store.get("non-git-dialog-never-ask-again", false) && await this.shouldWarnNonGit(folder);
            let shouldAdd = true;
            if (shouldWarn) {
                shouldAdd = await new Promise((resolve) => {
                    this.postDialog = doAdd => {
                        resolve(doAdd)
                        this.setState({ confirmOpen: false }) 
                    }
                    this.setState({ confirmOpen: true, nonGitFullpath: folder });
                })
            }
            if (shouldAdd) {
                ipcRenderer.sendTo(window.indexWorkerId, "add-repo", newRepo);
            }   
        }
    }

    render() {
        const divStyle = {
            display: 'flex',
        };
        return (
            <div>
                <div style={divStyle}>
                    <p className="gray-shaded">Local Repositories</p>
                    <IconButton variant="fab" aria-label="add" onClick={this.onAddClicked}>
                        <AddCircle className="primary" />
                    </IconButton>
                </div>
                <div id="repo-list-container">
                { this.state.repos.length > 0 ?
                    this.state.repos.map(rep => <ReposListItem repo={rep} removeClicked={this.onRemoveClicked} key={rep.id} />)
                    :
                    <>
                        <p style={{ textAlign: "center" }}>
                            <img src="folders.svg" style={{width: 70, textAlign: "center", pointerEvents: "none"}} />
                        </p>
                        <p className="rookout-gray" style={{marginBottom: 0, textAlign: "center", fontSize:"large"}}>
                        Click the + button to add folders that will be
                        </p>
                        <p className="rookout-gray" style={{marginTop: 0, textAlign: "center", fontSize:"large"}}>
                        accessible in app.rookout.com
                        </p>
                    </>
                }
                <Confirm
                    open={this.state.confirmOpen}
                    title="You are about to add a non-git repository"
                    body={
                        <>
                            <p className="gray-shaded" style={{ marginBottom: 0 }}>{`The folder: ${this.state.nonGitFullpath} is not a git repository`}</p>
                            <p className="gray-shaded" style={{ marginTop: 0 }}>{`Are you sure you want to add this folder?`}</p>
                        </>
                    }
                    onClose={() => this.postDialog(false)}
                    onCancel={() => this.postDialog(false)}
                    onAgree={() => this.postDialog(true)} />
                </div>
            </div>
        )
    }
}
