import React, { Component } from 'react';
import { Button } from '@material-ui/core';
import { RemoveRedEye, Lock, LockOpen, ContentCopy } from '@material-ui/icons'
import { copyText } from '../utils'
require = window.require;
const { ipcRenderer } = require("electron");

const hiddenToken = "⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎⁎"

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
            <div>
                <div id="token-title" className="flex">
                    <p className="gray-shaded">Access Token &nbsp;</p>
                    { this.state.renderToken === hiddenToken ?
                        <Lock id="token-lock" className="primary" onClick={this.onEyeClicked} />
                        :
                        <LockOpen id="token-lock" className="primary" onClick={this.onEyeClicked} />
                    }
                </div>
                <div id="token-wrapper">
                    <p id="token-box">{this.state.renderToken}<RemoveRedEye onClick={this.onEyeClicked} id="token-show-eye" className="small-icon" /></p>
                    <Button onClick={this.onCopyClick} id="copy-token-btn" variant="contained"><ContentCopy style={{ fontSize: 20 }} />&nbsp;Copy</Button>
                </div>
            </div>
        );
    }
}