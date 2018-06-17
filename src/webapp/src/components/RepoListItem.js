import React, { Component } from 'react';
import { Folder, Delete } from "@material-ui/icons"
import { ListItemSecondaryAction, IconButton } from "@material-ui/core"

export class ReposListItem extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const divStyle = {
            display: '-webkit-box',
        };
        return (
            <div style={divStyle}>
                <Folder className="small-icon" />
                <p className="gray-shaded repo-name">{this.props.repoName}</p>
                <IconButton aria-label="Delete" className="delete-button">
                    <Delete className="small-icon" />
                </IconButton>
            </div>
        )
    }
}