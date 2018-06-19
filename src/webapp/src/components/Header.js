import React, { Component } from 'react';
import { Close } from '@material-ui/icons';
require = window.require;
const { remote, ipcRenderer } = require('electron');

export class Header extends Component {
    constructor(props) {
        super(props);
        this.closeWindow = this.closeWindow.bind(this);
    }

    closeWindow() {
        const w = remote.getCurrentWindow();
        if (process.platform.match("darwin")) {
            remote.app.dock.hide();
        }
        w.hide();
        ipcRenderer.send('hidden');
    }

    render() {
        return (
            <div>
                <div id="close-window-wrapper">
                    <Close id="close-window-btn" onClick={this.closeWindow}/>
                </div>
                <div className="Header">
                    <p className="Header-title">Rookout File Explorer</p>
                </div>
                <hr className="Header-line"></hr>
            </div>
        );
    }
}