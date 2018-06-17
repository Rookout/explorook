import React, { Component } from 'react';
import { Close } from '@material-ui/icons';
const remote = window.require('electron').remote;

export class Header extends Component {
    constructor(props) {
        super(props);
        this.closeWindow = this.closeWindow.bind(this);
    }

    closeWindow() {
        const w = remote.getCurrentWindow();
        w.close();
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