import React, { Component } from 'react';
import { Close } from '@material-ui/icons';
import { remote, ipcRenderer } from 'electron';
import { Menu, MenuItem, ClickAwayListener } from '@material-ui/core';

export class Header extends Component {
    constructor(props) {
        super(props);
        this.closeWindow = this.closeWindow.bind(this);
        this.state = { 
            version: remote.app.getVersion(),
            anchorEl: null,
            open: false
        }
    }

    closeWindow() {
        const w = remote.getCurrentWindow();
        if (window.process.platform.match("darwin")) {
            remote.app.dock.hide();
        }
        w.hide();
        ipcRenderer.send('hidden');
    }

    onCloseRightClick = e => {
        e.preventDefault();
        this.setState({ open: true, anchorEl: e.currentTarget})
    }

    startDebug = e => {
        ipcRenderer.send('inspect-all')
        this.setState({ open: false })
    }

    render() {
        return (
            <div>
                <div id="close-window-wrapper" onContextMenu={this.onCloseRightClick}>
                    <Close id="close-window-btn" onClick={this.closeWindow}/>
                    <Menu anchorEl={this.state.anchorEl} open={this.state.open}>
                        <MenuItem key="debug" onClick={this.startDebug}>Debug</MenuItem>
                        <MenuItem key="close" onClick={() => this.setState({ open: false })}>Close</MenuItem>
                    </Menu>
                </div>
                <div className="Header flex">
                    <img src="logo.png" className="Header-logo"/>
                    <p className="Header-title" title={this.state.version}>Explorook</p>
                    <p className="gray-shaded" id="version-title">{this.state.version}</p>
                </div>
                <hr className="Header-line"></hr>
            </div>
        );
    }
}