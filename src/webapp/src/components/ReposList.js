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

    onAddClicked() {
        const win = remote.getCurrentWindow();
        const folders = dialog.showOpenDialog(win, { properties: ["openDirectory"] });
        if (!folders) { // user closed dialog without choosing
            return;
        }
        const folder = folders[0];
        const repoName = path.basename(folder);
        const newRepo = { repoName, fullpath: folder };
        ipcRenderer.sendTo(window.indexWorkerId, "add-repo", newRepo);
    }

    render() {
        const divStyle = {
            display: 'flex',
        };
        return (
            <div id="repo-list-container">
                <div style={divStyle}>
                    <p className="gray-shaded">Local Repositories</p>
                    <IconButton variant="fab" aria-label="add" onClick={this.onAddClicked}>
                        <AddCircle className="primary" />
                    </IconButton>
                </div>
                { this.state.repos.length > 0 ?
                    this.state.repos.map(rep => <ReposListItem repo={rep} removeClicked={this.onRemoveClicked} key={rep.id} />)
                    :
                    <p className="gray-shaded" style={{textAlign: "center", fontSize:"x-large"}}>
                    nothing here just yet!
                    </p>
                }
            </div>
        )
    }
}