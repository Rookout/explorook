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
            repos: ipcRenderer.sendSync("repos-request"),
        }
        ipcRenderer.on("refresh-repos", (e, repos) => 
        {
            this.setState({...this.state, repos})
        });
        this.onRemoveClicked = this.onRemoveClicked.bind(this);
        this.onAddClicked = this.onAddClicked.bind(this);
    }

    onRemoveClicked(repoId) {
        ipcRenderer.send("delete-repo", repoId);
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
        ipcRenderer.send("add-repo", newRepo);
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
                {this.state.repos.map(rep => <ReposListItem repo={rep} removeClicked={this.onRemoveClicked} key={rep.repoName} />)}
            </div>
        )
    }
}