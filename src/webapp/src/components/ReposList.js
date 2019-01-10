import React, { Component } from 'react';
import { ReposListItem } from "./RepoListItem"
import { IconButton } from '@material-ui/core';
import { AddCircle } from "@material-ui/icons"
require = window.require;
const { ipcRenderer, remote } = require("electron");
const path = require("path");

const dialog = remote.dialog;

export class ReposList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            repos: [],
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
    }

    onRemoveClicked(repoId) {
        if (window.confirm("Are you sure you want to delete this repository?")){
            ipcRenderer.sendTo(window.indexWorkerId, "delete-repo", repoId);
        }
    }

    onPopDialogRequested() {
        const win = remote.getCurrentWindow();
        let reHide = false;
        if (!win.isVisible()) {
            win.show();
            reHide = true;
        }
        this.onAddClicked();
        if (!reHide) return;
        if (window.process.platform.match("darwin")) {
            remote.app.dock.hide();
        }
        win.hide();
    }

    onAddClicked() {
        const win = remote.getCurrentWindow();
        const folders = dialog.showOpenDialog(win, { properties: ["openDirectory", "multiSelections"] });
        if (!folders) { // user closed dialog without choosing
            return;
        }
        folders.forEach(folder => {
            const repoName = path.basename(folder);
            const newRepo = { repoName, fullpath: folder };
            ipcRenderer.sendTo(window.indexWorkerId, "add-repo", newRepo);
        })
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
                </div>
            </div>
        )
    }
}
