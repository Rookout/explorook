import React, { Component } from 'react';
import { Folder } from "@material-ui/icons"
import { ReposListItem } from "./RepoListItem"
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';
import CommentIcon from '@material-ui/icons/Comment';

export class ReposList extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const repos = [{ repoName: "/some/path/to/project" }];
        return (
            <div id="repo-list-container">
                <p className="gray-shaded">Files</p>
                {repos.map(rep => <ReposListItem repoName={rep.repoName} key={rep.repoName} />)}
                {/* <List>
                    {[0, 1, 2, 3].map(value => (
                        <ListItem
                            key={value}
                            role={undefined}
                            dense
                            button
                        >
                            <Folder className="gray-shaded" /> 
                            <ListItemText primary={`Line item ${value + 1}`} />
                            <ListItemSecondaryAction>
                                <IconButton aria-label="Comments">
                                    <CommentIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List> */}
            </div>
        )
    }
}