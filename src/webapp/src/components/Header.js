import React, { Component } from 'react';
import { Close } from '@material-ui/icons';
require = window.require;
const { remote, ipcRenderer } = require('electron');

export class Header extends Component {
    constructor(props) {
        super(props);
        this.closeWindow = this.closeWindow.bind(this);
        this.state = { version: ipcRenderer.sendSync("version-request") }
    }

    closeWindow() {
        const w = remote.getCurrentWindow();
        if (window.process.platform.match("darwin")) {
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