import React, { Component } from 'react';
import { Folder, Delete, Edit } from "@material-ui/icons"
import { IconButton } from "@material-ui/core"

export class ReposListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editMode: false,
            repoNameEdit: props.repo.repoName,
        }
        this.toggleEdit = this.toggleEdit.bind(this);
        this.repoNameEdit = this.repoNameEdit.bind(this);
    }

    toggleEdit() {
        // this.setState({ ...this.state, editMode: !this.state.editMode })
    }

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
                    <Delete aria-label="Delete" style={{cursor: "pointer"}} className="small-icon" onClick={() => this.props.removeClicked(repo.id)} />
                </div>
            </div>
        )
    }
}