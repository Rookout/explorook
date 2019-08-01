import React, { useState } from 'react';
import { Close } from '@material-ui/icons';
import { remote, ipcRenderer } from 'electron';
import { Menu, MenuItem } from '@material-ui/core';
import { closeWindow } from '../utils';

export const Header = () => {
    const [version, setVersion] = useState(remote.app.getVersion());
    const [anchorEl, setAnchorEl] = useState(null);
    const [open, setOpen] = useState(false);

    const onCloseRightClick = e => {
        e.preventDefault();
        setOpen(true);
        setAnchorEl(e.currentTarget);
    };

    const startDebug = e => {
        ipcRenderer.send("inspect-all");
        setOpen(false);
    };

    return (
        <div>
            <div id="close-window-wrapper" onContextMenu={onCloseRightClick}>
                <Close id="close-window-btn" onClick={closeWindow}/>
                <Menu anchorEl={anchorEl} open={open}>
                    <MenuItem key="debug" onClick={startDebug}>Debug</MenuItem>
                    <MenuItem key="close" onClick={() => setOpen(false)}>Close</MenuItem>
                </Menu>
            </div>
            <div className="Header flex">
                <img src="logo.png" className="Header-logo" />
                <p className="Header-title" title={version}>Explorook</p>
                <p className="gray-shaded" id="version-title">{version}</p>
            </div>
            <hr className="Header-line"></hr>
        </div>
    );
};
