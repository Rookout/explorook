import React, { Component } from 'react';
import { Close } from '@material-ui/icons';
const { remote, ipcRenderer } = window.require('electron');

export class Header extends Component {
    constructor(props) {
        super(props);
        this.closeWindow = this.closeWindow.bind(this);
    }

    closeWindow() {
        const w = remote.getCurrentWindow();
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