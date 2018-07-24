import React, { Component } from 'react';
import { Folder, Delete, Edit } from "@material-ui/icons"
import { IconButton } from "@material-ui/core"
require = window.require
const { ipcRenderer } = require("electron");

export class ReposListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editMode: false,
            repoNameEdit: props.repo.repoName,
        }
        this.toggleEdit = this.toggleEdit.bind(this);
        // this.saveRepoName = this.saveRepoName.bind(this);
        this.repoNameEdit = this.repoNameEdit.bind(this);
    }

    toggleEdit() {
        // this.setState({ ...this.state, editMode: !this.state.editMode })
    }

    // feature disabled
    // saveRepoName(e) {
    //     switch (e.keyCode) {
    //         case 13: // Enter
    //             ipcRenderer.sendTo(window.indexWorkerId, "edit-repo", { id: this.props.repo.id, repoName: this.state.repoNameEdit })
    //             this.setState({ ...this.state, repoNameEdit: this.state.repoNameEdit, editMode: false })
    //             break;
    //         case 27: // Esc
    //             this.setState({ ...this.state, repoNameEdit: this.props.repo.repoName, editMode: false })
    //             break;
    //         default:
    //             break;
    //     }
    // }

    repoNameEdit(e) {
        this.setState({ ...this.state, repoNameEdit: e.target.value });
    }

    render() {
        const divStyle = {
            display: 'flex',
            height: "40px",
        };
        const repo = this.props.repo;
        return (
            <div style={divStyle}>
                <Folder className="small-icon" />
                {this.state.editMode ? (
                    <input className="repo-name-edit primary" type="text" value={this.state.repoNameEdit} onKeyUp={this.saveRepoName} onChange={this.repoNameEdit} />
                ) : (
                        <p className="gray-shaded repo-name" onDoubleClick={this.toggleEdit} title={repo.fullpath} aria-label={repo.fullpath}>{repo.repoName}</p>
                    )}
                <div id="repo-buttons">
                    {/* feature disabled
                    <IconButton aria-label="Edit" onClick={this.toggleEdit}>
                        <Edit className="small-icon" />
                    </IconButton> */}
                    <Delete aria-label="Delete" style={{cursor: "pointer"}} className="small-icon" onClick={() => this.props.removeClicked(repo.id)} />
                </div>
            </div>
        )
    }
}