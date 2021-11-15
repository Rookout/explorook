import React from "react";
import { Folder, Delete } from "@material-ui/icons"

const divStyle = {
    display: 'flex',
    height: "40px",
};

export const ReposListItem = ({ removeClicked, repo, ...props }) => {
    return (
        <div style={divStyle}>
            <Folder className="small-icon" />
            <p className="gray-shaded repo-name" title={repo.fullpath} aria-label={repo.fullpath}>{repo.repoName}</p>
            <div id="repo-buttons">
                <Delete aria-label="Delete" style={{cursor: "pointer"}} className="small-icon" onClick={() => removeClicked(repo.id)} />
            </div>
        </div>
    )
}
