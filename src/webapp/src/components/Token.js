import React, { Component } from 'react';
import { Button } from '@material-ui/core';
import { VisibilityOff, Visibility, ContentCopy } from '@material-ui/icons'
import { copyText } from '../utils'
import { ipcRenderer } from "electron";

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
        if (this.state.renderToken === hiddenToken) {
            this.setState({ ...this.state, renderToken: this.state.token });
        } else {
            this.setState({ ...this.state, renderToken: hiddenToken });
        }
    }
    render() {
        return (
            <div>
                <div id="token-title" className="flex">
                    <p className="gray-shaded">Access Token &nbsp;</p>
                </div>
                <div id="token-wrapper">
                    <p id="token-box">{this.state.renderToken}
                    { this.state.renderToken === hiddenToken ?
                    <Visibility onClick={this.onEyeClicked} id="token-show-eye" className="small-icon" />
                    :
                    <VisibilityOff onClick={this.onEyeClicked} id="token-show-eye" className="small-icon" />
                    }</p>
                    <Button onClick={this.onCopyClick} id="copy-token-btn" variant="contained"><ContentCopy style={{ fontSize: 20 }} />&nbsp;Copy</Button>
                </div>
            </div>
        );
    }
}