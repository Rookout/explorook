import React, { Component } from 'react';
import { Button, IconButton } from '@material-ui/core';
import { RemoveRedEye, ContentCopy } from '@material-ui/icons'
import { copyText } from '../utils'
require = window.require;
const { ipcRenderer } = require("electron");

const hiddenToken = "****************************************"

export class Token extends Component {
    constructor(props) {
        super(props);
        this.state = {
            token: ipcRenderer.sendSync("token-request"),
            renderToken: hiddenToken,
        }
        this.onCopyClick = this.onCopyClick.bind(this);
        this.onEyeClicked = this.onEyeClicked.bind(this);
    }
    onCopyClick(e) {
        copyText(this.state.token);
    }
    onEyeClicked(e) {
        this.setState({ ...this.state, renderToken: this.state.token });
        setTimeout(() => {
            this.setState({ ...this.state, renderToken: hiddenToken });
        }, 3500)
    }
    render() {
        return (
            <div id="token-wrapper">
                <p id="token-box">{this.state.renderToken}<RemoveRedEye onClick={this.onEyeClicked} id="token-show-eye" className="small-icon" /></p>
                <Button onClick={this.onCopyClick} id="copy-token-btn" variant="contained"><ContentCopy style={{ fontSize: 20 }} />&nbsp;Copy</Button>
            </div>
        );
    }
}